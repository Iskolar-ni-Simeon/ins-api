const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

class RDS {
    constructor() {
        this.pool = new Pool({
            user: process.env.DATABASE_USERNAME,
            host: process.env.DATABASE_ENDPOINT,
            database: process.env.DATABASE_NAME,
            password: process.env.DATABASE_PASSWORD,
            port: process.env.DATABASE_PORT,
            connectionTimeoutMillis: 20000
        });
        console.log("RDS initialized.");
        
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
                pages VARCHAR,
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
        return result.rowCount > 0
    }
    
    async getUserSavedTheses(params) {
        const {userId} = params
        const query = `
            SELECT t.id, t.title, t.year, t.pages
            FROM user_saved_theses ust
            JOIN theses t ON ust.thesis_id = t.id
            WHERE ust.user_id = $1;
        `;
    
        try {
            const result = await this.pool.query(query, [userId]);
    
            if (result.rowCount > 0) {
                return result.rows;
            } else {
                return []; 
            }
        } catch (error) {
            console.error('Error retrieving saved theses:', error);
            throw new Error('Could not retrieve saved theses');
        }
    }
    
    /**
     * Adds theses to user's "library."
     * @param {Object} params - parameters for the function.
     * @param {string} params.userId - user's ID given by Google OAuth.
     * @param {string} params.thesesId - thesis' unique version 4 UUID. 
     */
    async addThesisToSaved(params) {
        const {userId, thesisId} = params
        const thesisExistsQuery = `
            SELECT 1 FROM theses WHERE id = $1;
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
                console.log(`Thesis with ID ${thesisId} saved for user ${userId}.`);
                return { success: true, message: 'Thesis saved successfully.' };
            } else {
                console.log(`Thesis with ID ${thesisId} was already saved by user ${userId}.`);
                return { success: false, message: 'Thesis already saved.' };
            }
        } catch (error) {
            console.error('Error saving thesis:', error);
            throw new Error('Could not save thesis');
        }
    }

    // thesis related functions

    /**
     * Adds thesis to the `theses` table.
     * @param {Object} params - parameters for the function.
     * @param {string} params.title - thesis' title.
     * @param {Array} params.authors - thesis' author/s.
     * @param {string} params.pages - how many pages the thesis is.
     * @param {Array} params.keywords - keywords that describes the thesis. Commonly found in abstract pages.
     * @param {string} params.id - unique version 4 UUID that gives the thesis its identification.
     * @param {string} params.year - the year the thesis is published.
     */
    async addThesis(params) {
        const { title, authors, pages, abstract, keywords, id, year } = params;
    
        const thesisInsertQuery = `
            INSERT INTO theses (id, title, pages, abstract, year)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (id) DO NOTHING;`;
    
        await this.pool.query(thesisInsertQuery, [id, title, pages, abstract, year]);
    
        for (const name of authors) {
            const authorSelectQuery = `
                SELECT id FROM authors WHERE name = $1;`;
            const authorResult = await this.pool.query(authorSelectQuery, [name]);
            
            let authorId;
            if (authorResult.rowCount > 0) {
                authorId = authorResult.rows[0].id;
                console.log(`Author already exists: ${name} with ID: ${authorId}`);
            } else {
                authorId = uuidv4();
                const authorInsertQuery = `
                    INSERT INTO authors (id, name)
                    VALUES ($1, $2)
                    ON CONFLICT (name) DO NOTHING;`;
                
                console.log(`Inserting new author: ${name} with ID: ${authorId}`);
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
                console.log(`Keyword already exists: ${word} with ID: ${keywordId}`);
            } else {
                keywordId = uuidv4(); 
                const keywordInsertQuery = `
                    INSERT INTO keywords (id, word)
                    VALUES ($1, $2)
                    ON CONFLICT (word) DO NOTHING;`;
                
                console.log(`Inserting new keyword: ${word} with ID: ${keywordId}`);
                await this.pool.query(keywordInsertQuery, [keywordId, word]);
            }
    
            const thesisKeywordInsertQuery = `
                INSERT INTO thesis_keywords (thesis_id, keyword_id)
                VALUES ($1, $2)
                ON CONFLICT (thesis_id, keyword_id) DO NOTHING;`;
            
            await this.pool.query(thesisKeywordInsertQuery, [id, keywordId]);
        }
    
        return { result: 'ok' };
    }
    
    /**
     * Searches for related thesis based on the input given.
     * @param {Object} params - parameters for the function.
     * @param {string} params.title - query for searching thesis.
     * @param {string} params.author - finds thesis with author's name.
     * @returns {Promise<Object>} - returns the search results.
     */
    async search(params) {
        const {title, author} = params
        const query = `
            SELECT f.*, a.name AS author_name, k.word AS keyword_word
            FROM theses f
            LEFT JOIN thesis_authors ta ON f.id = ta.thesis_id
            LEFT JOIN authors a ON ta.author_id = a.id
            LEFT JOIN thesis_keywords tk ON f.id = tk.thesis_id
            LEFT JOIN keywords k ON tk.keyword_id = k.id
            WHERE f.title ILIKE $1`;
    
        const values = [`%${title}%`];
    
        try {
            let result;
            if (author) {
                const authorFilter = ` AND a.name ILIKE $2`;
                result = await this.pool.query(query + authorFilter, [...values, `%${author}%`]);
            } else {
                result = await this.pool.query(query, values);
            }
    
            const formattedResults = this.formatSearchResults(result.rows);
    
            return formattedResults;
        } catch (error) {
            console.error("Database query error:", error);
            throw error;
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
                    keywords: [],
                    year: row.year,
                    pages: row.pages
                };
            }
    
            if (row.author_name) {
                results[row.id].authors.push(row.author_name);
            }
            if (row.keyword_word) {
                results[row.id].keywords.push(row.keyword_word);
            }
        });
    
        const formattedResults = Object.values(results).map(thesis => ({
            ...thesis,
            authors: [...new Set(thesis.authors)],
            keywords: [...new Set(thesis.keywords)],
        }));
        return formattedResults;
    }

    /**
     * Deletes a thesis based on its unique UUID.
     * @param {string} uuid - unique version 4 UUID of the thesis.
     */
    async delete(uuid) {
        const deleteThesisAuthorsQuery = `
            DELETE FROM thesis_authors WHERE thesis_id = $1;`;
        const deleteThesisKeywordsQuery = `
            DELETE FROM thesis_keywords WHERE thesis_id = $1;`;
        const deleteThesisQuery = `
            DELETE FROM theses WHERE id = $1;`;
        
        await this.pool.query(deleteThesisAuthorsQuery, [uuid]);
        await this.pool.query(deleteThesisKeywordsQuery, [uuid]);
        const result = await this.pool.query(deleteThesisQuery, [uuid]);
        
        return result.rowCount > 0;
    }

}

module.exports = RDS