const { v4: uuid4 } = require('uuid');
const multer = require('multer');
const upload = multer();


module.exports = (app, B2, SQL, JWTMiddleware, publicKey) => {
    app.get('/search', JWTMiddleware(publicKey), async (req, res, next) => {
        try {
            const SQLParams = {
                title: req.query.q || "",
            };
            const result = await SQL.search(SQLParams)
            if (!result.ok) return res.status(500).json({data: result.message});
            return res.json(result);
        } catch (error) {
            console.error("Error occurred during search:", error);
            return res.status(500).json({ error: `Internal server error: ${err}`});
        }
    });

    app.get('/thesis', JWTMiddleware(publicKey), async (req, res, next) => {
        try {
            const uuid = req.query.uuid;
            const result = await SQL.thesisInfo(uuid)
            if (!result.ok) return res.status(500).json({data: result.message});
            return res.json(result);
        } catch (error) {
            console.error("Error occurred:", error);
            return res.status(500).json({ error: `Internal server error: ${err}`});
        }
    });

    app.get('/accessthesis', JWTMiddleware(publicKey), async (req, res, next) => {
        try {
            const linkParameters = {
                key: req.query.uuid, 
                expiresIn: 3600
            };
            const result = await B2.getAccessLink(linkParameters)
            if (!result.ok) return res.status(500).json({data: result.message});
            return res.json(result)
        } catch (err) {
            console.error('Error: ', err)
            return res.status(500).json({ error: `Internal server error: ${err}`});
        }
    });

    app.post('/addthesis', JWTMiddleware(publicKey), upload.single('file'), async (req, res, next) => {
        try {
            const key = uuid4();
            const fileUploadParams = {
                fileContent: req.file.buffer,
                key: key
            }
            const SQLUpdateParams = req.body
            SQLUpdateParams.id = key

            const fileStatus = await B2.uploadFile(fileUploadParams)
            if (!fileStatus.ok) return res.status(500).json({data: fileStatus.message});
            const databaseStatus = await SQL.addThesis(SQLUpdateParams)
            if (!databaseStatus.ok) return res.status(500).json({data: databaseStatus.message});
            return res.json({file: fileStatus, database: databaseStatus});
        } catch (err) {
            console.error('Error: ', err)
            return res.status(500).json({ error: `Internal server error: ${err}`});
        }
    });

    app.post('/delete', JWTMiddleware(publicKey), async (req, res, next) => {
        try {
            const uuid = req.body.uuid;
            if (!uuid) {
                return res.status(400).json({ error: 'UUID is required' });
            }
    
            const fileStatus = await B2.deleteFile(uuid);
            if (!fileStatus.ok) return res.status(500).json({ data: fileStatus.message });
            const databaseStatus = await SQL.deleteThesis(uuid);
            if (!databaseStatus.ok) return res.status(500).json({ data: databaseStatus.message });
            return res.json({ file: fileStatus, database: databaseStatus });
        } catch (err) {
            console.error('Error: ', err);
            return res.status(500).json({ error: `Internal server error: ${err}` });
        }
    });
    
    app.get("/author", JWTMiddleware(publicKey), async (req, res, next) => {
        try {
            const author = req.query.uuid;
            const results = await SQL.getAuthorInfo(author);
            if (!results.ok) return res.status(500).json({data: results.message});
            return res.json(results);
        } catch (err) {
            return res.status(500).json({'error': err})
        }
    });

    app.get("/keyword", JWTMiddleware(publicKey), async (req, res, next) => {
        try {
            const keyword = req.query.uuid;
            const results = await SQL.getKeywordInfo(keyword);
            if (!results.ok) return res.status(500).json({data: results.message});
            return res.json(results);
        } catch (err) {
            return res.status(500).json({'error': err})
        }
    });
    
    app.post('/advanced', JWTMiddleware(publicKey), async (req, res, next) => {
        var authors = req.body.authors || "";
        var keywords = req.body.keywords || "";
        var absContains = req.body.absContains || "";
        var titleContains = req.body.titleContains || "";
        var beforeYear = req.body.beforeYear || 0;
        var afterYear = req.body.afterYear || 9999;

        if (typeof authors === 'string') {
            authors = authors.split(/,\s*/);
        }
        if (typeof keywords === 'string') {
            keywords = keywords.split(/,\s*/);
        }

        console.log(authors, keywords, absContains, titleContains, beforeYear, afterYear); // Log parameters

        const SQLParams = {
            authors: authors,
            keywords: keywords,
            absContains: absContains,
            titleContains: titleContains,
            beforeYear: beforeYear,
            afterYear: afterYear
        };
        try {
            const result = await SQL.advancedSearch(SQLParams);
            if (!result.ok) return res.status(500).json({data: result.message});
            return res.json(result);
        } catch (err) {
            return res.status(500).json({error: err})
        }
    });
}
