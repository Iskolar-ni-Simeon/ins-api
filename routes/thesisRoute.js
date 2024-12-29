const { v4: uuid4 } = require('uuid');

module.exports = (app, B2, SQL, JWTMiddleware, publicKey) => {
    app.get('/search', JWTMiddleware(publicKey), async (req, res, next) => {
        try {
            const SQLParams = {
                query: req.query.q || "",
                beforeYear: req.query.beforeYear || null,
                afterYear: req.query.afterYear || null,
            };
            console.log(req.query.q);
            const result = await SQL.unifiedSearch(SQLParams)

            if (!result.ok) return res.status(500).json({ data: result.message });
            return res.json(result);
        } catch (error) {
            console.error("Error occurred during search:", error);
            return res.status(500).json({ error: `Internal server error: ${err}` });
        }
    });

    app.get('/thesis', JWTMiddleware(publicKey), async (req, res, next) => {
        try {
            const uuid = req.query.uuid;
            const result = await SQL.thesisInfo(uuid)
            if (!result.ok) return res.status(500).json({ data: result.message });
            return res.json(result);
        } catch (error) {
            console.error("Error occurred:", error);
            return res.status(500).json({ error: `Internal server error: ${err}` });
        }
    });

    app.get('/accessthesis', JWTMiddleware(publicKey), async (req, res, next) => {
        try {
            const linkParameters = {
                key: req.query.uuid,
                expiresIn: 3600
            };
            const result = await B2.getAccessLink(linkParameters)
            if (!result.ok) return res.status(500).json({ data: result.message });
            return res.json(result)
        } catch (err) {
            console.error('Error: ', err)
            return res.status(500).json({ error: `Internal server error: ${err}` });
        }
    });

    app.get("/author", JWTMiddleware(publicKey), async (req, res, next) => {
        try {
            const author = req.query.uuid;
            const results = await SQL.getAuthorInfo(author);
            if (!results.ok) return res.status(500).json({ data: results.message });
            return res.json(results);
        } catch (err) {
            return res.status(500).json({ 'error': err })
        }
    });

    app.get("/keyword", JWTMiddleware(publicKey), async (req, res, next) => {
        try {
            const keyword = req.query.uuid;
            const results = await SQL.getKeywordInfo(keyword);
            if (!results.ok) return res.status(500).json({ data: results.message });
            return res.json(results);
        } catch (err) {
            return res.status(500).json({ 'error': err })
        }
    });
}
