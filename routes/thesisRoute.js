const { v4: uuid4 } = require('uuid');

module.exports = (app, B2, SQL, JWTMiddleware, publicKey) => {
    app.get('/search', JWTMiddleware(publicKey), async (req, res, next) => {
        console.log('[SEARCH]: New search request with query:', req.query.q);
        try {
            const SQLParams = {
                query: req.query.q || "",
                beforeYear: req.query.beforeYear || 0,
                afterYear: req.query.afterYear || 9999,
            };
            console.log(req.query.q);
            const result = await SQL.unifiedSearch(SQLParams)

            if (!result.ok) return res.status(500).json({ data: result.message });
            console.log('[SEARCH]: Found results:', result.data?.length || 0);
            return res.json(result);
        } catch (error) {
            console.error('[SEARCH-ERROR]:', error);
            console.error('Search parameters:', req.query);
            return res.status(500).json({ error: `Internal server error: ${error}` });
        }
    });

    app.get('/thesis', JWTMiddleware(publicKey), async (req, res, next) => {
        console.log('[THESIS]: Fetching thesis info for UUID:', req.query.uuid);
        try {
            const uuid = req.query.uuid;
            const result = await SQL.thesisInfo(uuid)
            if (!result.ok) return res.status(500).json({ data: result.message });
            return res.json(result);
        } catch (error) {
            console.error('Error in GET /thesis:', error);
            console.error('Requested UUID:', req.query.uuid);
            return res.status(500).json({ error: `Internal server error: ${error}` });
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
            console.error('Error in GET /accessthesis:', err);
            console.error('Access parameters:', { uuid: req.query.uuid });
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
            console.error('Error in GET /author:', err);
            console.error('Author UUID:', req.query.uuid);
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
            console.error('Error in GET /keyword:', err);
            console.error('Keyword UUID:', req.query.uuid);
            return res.status(500).json({ 'error': err })
        }
    });
}
