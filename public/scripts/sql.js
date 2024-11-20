const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
require('dotenv').config();

class SQL {
    constructor() {
        this.pool = new Pool({
            user: process.env.DATABASE_USERNAME,
            host: process.env.DATABASE_ENDPOINT,
            database: process.env.DATABASE_NAME,
            password: process.env.DATABASE_PASSWORD,
            port: process.env.DATABASE_PORT,
            ssl: true
        });
        console.log("SQL initialized.");
        
    }
    /**
     * Creates tables needed for the database. Must be initialized--kung na-run na siya one time, okay na.
     */
    async createTables() {
        const createAuthorsTable = `
            CREATE TABLE IF NOT EXISTS authors (
                id VARCHAR PRIMARY KEY,
                name VARCHAR NOT NULL UNIQUE
            );`;

        const createKeywordsTable = `
            CREATE TABLE IF NOT EXISTS keywords (
                id VARCHAR PRIMARY KEY,
                word VARCHAR NOT NULL UNIQUE
            );`;

        const createThesisTable = `
            CREATE TABLE IF NOT EXISTS theses (
                id VARCHAR PRIMARY KEY,
                title VARCHAR UNIQUE,
                year VARCHAR,
                abstract TEXT
            );`;
        
        const createUserTable = `
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR PRIMARY KEY UNIQUE,
                name VARCHAR,
                email VARCHAR
            );`;

        const createThesisAuthorsTable = `
            CREATE TABLE IF NOT EXISTS thesis_authors (
                thesis_id VARCHAR REFERENCES theses(id),
                author_id VARCHAR REFERENCES authors(id),
                PRIMARY KEY (thesis_id, author_id)
            );`;

        const createThesisKeywordsTable = `
            CREATE TABLE IF NOT EXISTS thesis_keywords (
                thesis_id VARCHAR REFERENCES theses(id),
                keyword_id VARCHAR REFERENCES keywords(id),
                PRIMARY KEY (thesis_id, keyword_id)
            );`;
        
        
        const createSavedThesesTable = `
            CREATE TABLE IF NOT EXISTS user_saved_theses (
                user_id VARCHAR REFERENCES "users"(id),
                thesis_id VARCHAR REFERENCES theses(id)
            );`;
    
        const queries = [
            createAuthorsTable,
            createKeywordsTable,
            createThesisTable,
            createUserTable,
            createThesisAuthorsTable,
            createThesisKeywordsTable,
            createSavedThesesTable
        ];

        for (const query of queries) {
            await this.pool.query(query);
        }
    }
    
    // user-related functions
    /**
     * Adds user based on Google's OAuth response.
     * @param {Object} params - parameter for the function.
     * @param {string} params.id - id given by Google OAuth. Different each user, but the same each time.
     * @param {string} params.email - user email.
     */
    async addUser(params) {
        const { id, name, email } = params
        const addUserQuery = `
        INSERT INTO users (id, name, email)
        VALUES ($1, $2, $3)
        ON CONFLICT (id) DO NOTHING;
        `
        const result = await this.pool.query(addUserQuery, [id, name, email])
        if (result.rowCount > 0) {
            return {ok: true, message: "Added user successfully."}
        } else {
            return {ok: false, message: 'Unable to add user.'}
        }
    }
    
    async getUserSavedTheses(userId) {
        const query = `
            SELECT t.*, a.name AS author_name, k.word AS keyword_word
            FROM user_saved_theses ust
            JOIN theses t ON ust.thesis_id = t.id
            LEFT JOIN thesis_authors ta ON t.id = ta.thesis_id
            LEFT JOIN authors a ON ta.author_id = a.id
            LEFT JOIN thesis_keywords tk ON t.id = tk.thesis_id
            LEFT JOIN keywords k ON tk.keyword_id = k.id
            WHERE ust.user_id = $1;
        `;
    
        try {
            const result = await this.pool.query(query, [userId]);
            const formattedResults = this.formatSearchResults(result.rows);
            return {ok: true, data: formattedResults};
        } catch (err) {
            return {ok: false, message: `Unable to fetch saved thesis: ${err}`};
        }
    }
    
    /**
     * Adds theses to user's "library."
     * @param {Object} params - parameters for the function.
     * @param {string} params.userId - user's ID given by Google OAuth.
     * @param {string} params.thesisId - thesis' unique version 4 UUID. 
     */
    async addThesisToSaved(params) {
        const { userId, thesisId } = params;
        const thesisExistsQuery = `
            SELECT * FROM theses WHERE id = $1;
        `;
        
        try {
            const thesisResult = await this.pool.query(thesisExistsQuery, [thesisId]);
            
            if (thesisResult.rowCount === 0) {
                return { success: false, message: 'Thesis does not exist.' };
            }
            
            const insertQuery = `
                INSERT INTO user_saved_theses (user_id, thesis_id)
                VALUES ($1, $2)
                ON CONFLICT DO NOTHING;
            `;
    
            const insertResult = await this.pool.query(insertQuery, [userId, thesisId]);
    
            if (insertResult.rowCount > 0) {
                return { ok: true, message: 'Thesis saved successfully.' };
            } else {
                return { ok: true, message: 'Thesis already saved.' };
            }
        } catch (err) {
            return {ok: false, message: `Could not save thesis: ${err}`}
        }
    }    

    /**
     * Removes a thesis from the user's "library"
     * @param {Object} params - parameters for the function.
     * @param {string} params.userId - user's ID given by Google OAuth.
     * @param {string} params.thesesId - thesis' unique version 4 UUID. 
     */
    async removeThesisFromSaved(params) {
        const { userId, thesisId } = params;
        const deleteQuery = `
            DELETE FROM user_saved_theses
            WHERE user_id = $1 AND thesis_id = $2;
        `;

        try {
            const deleteResult = await this.pool.query(deleteQuery, [userId, thesisId]);
            
            if (deleteResult.rowCount > 0) {
                return { ok: true, message: 'Thesis removed successfully.' };
            } else {
                return { ok: false, message: 'Thesis not found in library.' };
            }
        } catch (err) {
            return {ok: false, message: `Could not remove thesis: ${err}`}
        }
    }

    // thesis related functions

    /**
     * Adds thesis to the `theses` table.
     * @param {Object} params - parameters for the function.
     * @param {string} params.title - thesis' title.
     * @param {Array} params.authors - thesis' author/s.
     * @param {Array} params.keywords - keywords that describes the thesis. Commonly found in abstract pages.
     * @param {string} params.id - unique version 4 UUID that gives the thesis its identification.
     * @param {string} params.year - the year the thesis is published.
     * @param {string} params.abstract - Thesis' abstract, usually around 200-300 words.
     */
    async addThesis(params) {
        const { title, authors, abstract, keywords, id, year } = params;
    
        const thesisInsertQuery = `
            INSERT INTO theses (id, title, abstract, year)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (id) DO NOTHING;`;
    
        await this.pool.query(thesisInsertQuery, [id, title, abstract, year]);
    
        for (const name of authors) {
            const authorSelectQuery = `
                SELECT id FROM authors WHERE name = $1;`;
            const authorResult = await this.pool.query(authorSelectQuery, [name]);
            
            let authorId;
            if (authorResult.rowCount > 0) {
                authorId = authorResult.rows[0].id;
            } else {
                authorId = uuidv4();
                const authorInsertQuery = `
                    INSERT INTO authors (id, name)
                    VALUES ($1, $2)
                    ON CONFLICT (name) DO NOTHING;`;
                
                await this.pool.query(authorInsertQuery, [authorId, name]);
            }

            const thesisAuthorInsertQuery = `
                INSERT INTO thesis_authors (thesis_id, author_id)
                VALUES ($1, $2)
                ON CONFLICT (thesis_id, author_id) DO NOTHING;`;
            await this.pool.query(thesisAuthorInsertQuery, [id, authorId]);
        }
    
        for (const word of keywords) {
            const keywordSelectQuery = `
                SELECT id FROM keywords WHERE word = $1;`;
            const keywordResult = await this.pool.query(keywordSelectQuery, [word]);
            
            let keywordId;
            if (keywordResult.rowCount > 0) {
                keywordId = keywordResult.rows[0].id;
            } else {
                keywordId = uuidv4(); 
                const keywordInsertQuery = `
                    INSERT INTO keywords (id, word)
                    VALUES ($1, $2)
                    ON CONFLICT (word) DO NOTHING;`;
                
                await this.pool.query(keywordInsertQuery, [keywordId, word]);
            }
    
            const thesisKeywordInsertQuery = `
                INSERT INTO thesis_keywords (thesis_id, keyword_id)
                VALUES ($1, $2)
                ON CONFLICT (thesis_id, keyword_id) DO NOTHING;`;
            
            await this.pool.query(thesisKeywordInsertQuery, [id, keywordId]);
        }
    
        return { ok: true, message: 'Added thesis successfully.'};
    }
    
    /**
     * Searches for related thesis based on the input given.
     * @param {Object} params - parameters for the function.
     * @param {string} params.title - query for searching thesis.
     * @param {string} params.author - finds thesis with author's name.
     * @returns {Promise<Object>} - returns the search results.
     */
    async search(params) {
        const {title, author} = params;
        const query = `
            SELECT f.*, a.name AS author_name, k.word AS keyword_word
            FROM theses f
            LEFT JOIN thesis_authors ta ON f.id = ta.thesis_id
            LEFT JOIN authors a ON ta.author_id = a.id
            LEFT JOIN thesis_keywords tk ON f.id = tk.thesis_id
            LEFT JOIN keywords k ON tk.keyword_id = k.id
            WHERE f.title ILIKE $1
            ${author ? 'AND a.name ILIKE $2' : ''};
        `;
    
        const values = [`%${title}%`];
        if (author) {
            values.push(`%${author}%`);
        }
    
        try {
            const result = await this.pool.query(query, values);
            const formattedResults = this.formatSearchResults(result.rows);
            return {ok: true, data: formattedResults};
        } catch (err) {
            return {ok: false, message: err};
        }
    }

    formatSearchResults(rows) {
        const results = {};
        
        rows.forEach(row => {
            if (!results[row.id]) {
                results[row.id] = {
                    id: row.id,
                    title: row.title,
                    authors: [],
                    year: row.year,
                    abstract: row.abstract, 
                    keywords: [] 
                };
            }
    
            if (row.author_name) {
                results[row.id].authors.push(row.author_name);
            }

            if (row.keyword_word) {
                results[row.id].keywords.push(row.keyword_word); // Populate keywords
            }
        });
    
        const formattedResults = Object.values(results).map(thesis => ({
            ...thesis,
            authors: [...new Set(thesis.authors)],
            keywords: [...new Set(thesis.keywords)], // Ensure unique keywords
        }));
        return formattedResults;
    }

    /**
     * Deletes a thesis based on its unique UUID.
     * @param {string} uuid - unique version 4 UUID of the thesis.
     */
    async deleteThesis(uuid) {
        const deleteThesisSavedQuery = `
            DELETE FROM user_saved_theses WHERE thesis_id = $1`
        const deleteThesisAuthorsQuery = `
            DELETE FROM thesis_authors WHERE thesis_id = $1;`;
        const deleteThesisKeywordsQuery = `
            DELETE FROM thesis_keywords WHERE thesis_id = $1;`;
        const deleteThesisQuery = `
            DELETE FROM theses WHERE id = $1;`;
        
        await this.pool.query(deleteThesisAuthorsQuery, [uuid]);
        await this.pool.query(deleteThesisKeywordsQuery, [uuid]);
        await this.pool.query(deleteThesisSavedQuery, [uuid]);
        const result = await this.pool.query(deleteThesisQuery, [uuid]);
        
        if (result.rowCount > 0) {
            return {ok: true, message: 'Deleted thesis successfully.'}
        } else {
            return {ok: false, message: 'Unable to delete thesis.'}
        }
    }

    /**
     * Gets the thesis' information based on its UUID.
     * @param {string} uuid - unique version 4 UUID of the thesis. 
     * @returns {Promise<Object>} - information of the thesis.
     */
    async thesisInfo(uuid) {
        const thesisInformationQuery = `
            SELECT t.id, t.title, t.year, t.abstract, 
                   a.id AS author_id, a.name AS author_name, 
                   k.id AS keyword_id, k.word AS keyword_word
            FROM theses t
            LEFT JOIN thesis_authors ta ON t.id = ta.thesis_id
            LEFT JOIN authors a ON ta.author_id = a.id
            LEFT JOIN thesis_keywords tk ON t.id = tk.thesis_id
            LEFT JOIN keywords k ON tk.keyword_id = k.id
            WHERE t.id = $1;
        `;
        try {
            const result = await this.pool.query(thesisInformationQuery, [uuid]);
            const formattedResults = this.formatThesisInfo(result.rows);
            return {ok: true, data: formattedResults};
        } catch (err) {
            return {ok: false, message: `Could not get thesis information: ${err}`}
        }
    }

    formatThesisInfo(rows) {
        if (rows.length === 0) {
            return null;
        }

        const thesis = {
            id: rows[0].id,
            title: rows[0].title,
            year: rows[0].year,
            abstract: rows[0].abstract,
            authors: [],
            keywords: []
        };

        rows.forEach(row => {
            if (row.author_id && row.author_name) {
                thesis.authors.push({ id: row.author_id, name: row.author_name });
            }
            if (row.keyword_id && row.keyword_word) {
                thesis.keywords.push({ id: row.keyword_id, keyword: row.keyword_word });
            }
        });

        thesis.authors = [...new Set(thesis.authors.map(a => JSON.stringify(a)))].map(a => JSON.parse(a));
        thesis.keywords = [...new Set(thesis.keywords.map(k => JSON.stringify(k)))].map(k => JSON.parse(k));

        return thesis;
    }

    /**
     * Gets keyword information and associated theses based on keyword UUID.
     * @param {string} keywordId - unique version 4 UUID of the keyword.
     * @returns {Promise<Object>} - keyword information and associated theses.
     */
    async getKeywordInfo(keywordId) {
        const keywordInfoQuery = `
            SELECT t.*, a.name AS author_name, k.word AS keyword_word
            FROM keywords k
            LEFT JOIN thesis_keywords tk ON k.id = tk.keyword_id
            LEFT JOIN theses t ON tk.thesis_id = t.id
            LEFT JOIN thesis_authors ta ON t.id = ta.thesis_id
            LEFT JOIN authors a ON ta.author_id = a.id
            WHERE k.id = $1;
        `;
        try {
            const result = await this.pool.query(keywordInfoQuery, [keywordId]);
            if (result.rowCount === 0) {
                return {ok: false, message: 'Keyword not found.'};
            }
            const formattedResults = this.formatSearchResults(result.rows);
            return {
                ok: true,
                data: {
                    word: result.rows[0].keyword_word,
                    theses: formattedResults
                }
            };
        } catch (err) {
            return {ok: false, message: `Could not get keyword information: ${err}`};
        }
    }

    /**
     * Gets author information and associated theses based on author UUID.
     * @param {string} authorId - unique version 4 UUID of the author.
     * @returns {Promise<Object>} - author information and associated theses.
     */
    async getAuthorInfo(authorId) {
        const authorInfoQuery = `
            SELECT 
                t.id AS thesis_id, 
                t.title, 
                t.year, 
                t.abstract,
                main_a.name AS author_name,
                k.word AS keyword_word,
                co_a.name AS co_author_name
            FROM authors main_a
            LEFT JOIN thesis_authors ta ON main_a.id = ta.author_id
            LEFT JOIN theses t ON ta.thesis_id = t.id
            LEFT JOIN thesis_keywords tk ON t.id = tk.thesis_id
            LEFT JOIN keywords k ON tk.keyword_id = k.id
            LEFT JOIN thesis_authors co_ta ON t.id = co_ta.thesis_id
            LEFT JOIN authors co_a ON co_ta.author_id = co_a.id
            WHERE main_a.id = $1;
        `;
        try {
            const result = await this.pool.query(authorInfoQuery, [authorId]);
            if (result.rowCount === 0) {
                return { ok: false, message: 'Author not found.' };
            }
            const thesesMap = new Map();
    
            result.rows.forEach(row => {
                if (!thesesMap.has(row.thesis_id)) {
                    thesesMap.set(row.thesis_id, {
                        id: row.thesis_id,
                        title: row.title,
                        year: row.year,
                        abstract: row.abstract,
                        authors: new Set(),
                        keywords: new Set(),
                    });
                }
    
                const thesis = thesesMap.get(row.thesis_id);
    
                if (row.co_author_name) {
                    thesis.authors.add(row.co_author_name);
                }

                if (row.keyword_word) {
                    thesis.keywords.add(row.keyword_word);
                }
            });
    
            const formattedTheses = Array.from(thesesMap.values()).map(thesis => ({
                ...thesis,
                authors: Array.from(thesis.authors),
                keywords: Array.from(thesis.keywords),
            }));
    
            return {
                ok: true,
                data: {
                    name: result.rows[0].author_name,
                    theses: formattedTheses,
                },
            };
        } catch (err) {
            return { ok: false, message: `Could not get author information: ${err.message}` };
        }
    }

    /** Advanced search function
     * @param {Object} params - parameters for the function.
     * @param {string} params.titleContains - keyword to search for in the title.
     * @param {string} params.absContains - keyword to search for in the abstract.
     * @param {Array} params.authors - list of authors to search for.
     * @param {Array} params.keywords - list of keywords to search for.
     * @param {string} params.beforeYear - year to search for theses published before.
     * @param {string} params.afterYear - year to search for theses published after.
     * @returns {Promise<Object>} - search results. 
     */
    async advancedSearch(params) {
        const {titleContains = "", absContains = "", authors = [], keywords = [], beforeYear = 0, afterYear = 9999} = params;

        const query = `
            SELECT t.*, a.name AS author_name, k.word AS keyword_word, co_a.name AS co_author_name
            FROM theses t
            LEFT JOIN thesis_authors ta ON t.id = ta.thesis_id
            LEFT JOIN authors a ON ta.author_id = a.id
            LEFT JOIN thesis_keywords tk ON t.id = tk.thesis_id
            LEFT JOIN keywords k ON tk.keyword_id = k.id
            LEFT JOIN thesis_authors co_ta ON t.id = co_ta.thesis_id
            LEFT JOIN authors co_a ON co_ta.author_id = co_a.id
            WHERE t.title ILIKE $1
            AND t.abstract ILIKE $2
        `;

        const values = [`%${titleContains}%`, `%${absContains}%`];

        try {
            const result = await this.pool.query(query, values);

            const filteredResults = result.rows.filter(row => {
                const thesisYear = parseInt(row.year, 10);
                const matchesAuthors = authors.length === 0 || authors.some(author => {
                    const match = (row.author_name && row.author_name.toLowerCase().includes(author.toLowerCase())) ||
                                  (row.co_author_name && row.co_author_name.toLowerCase().includes(author.toLowerCase()));
                    return match;
                });
                const matchesKeywords = keywords.length === 0 || keywords.some(keyword => {
                    const match = row.keyword_word && row.keyword_word.includes(keyword);
                    return match;
                });
                const matchesYear = thesisYear >= beforeYear && thesisYear <= afterYear;
                return matchesYear && matchesAuthors && matchesKeywords;
            });

            const formattedResults = this.formatSearchResults(filteredResults);
            return {ok: true, data: formattedResults};
        } catch (err) {
            return {ok: false, message: err};
        }
    }
}

module.exports = { SQL };