/**
 * Checked: 03/11/2024, 9:47PM
 * Functional: ALL
 */

module.exports = (app, B2, SQL, JWTMiddleware, publicKey) => {
    app.get('/userlibrary', JWTMiddleware(publicKey), async (req, res, next) => {
        console.log('[USER]: Fetching library for user:', req.query.id);
        try {
            const userId = req.query.id;
            const results = await SQL.getUserSavedTheses(userId);
            if (!results.ok) return res.status(500).json({ data: results.message });
            console.log('[USER]: Library fetch successful');
            return res.json(results);
        } catch (err) {
            console.error('[USER-ERROR]: Library fetch failed:', err);
            console.error('Error in GET /userlibrary:', err);
            return res.status(500).json({ 'error': err })
        }
    });

    app.post('/userlibrary', JWTMiddleware(publicKey), async (req, res, next) => {
        console.log('[USER]: Library operation:', req.body.method);
        console.log('[USER]: Thesis:', req.body.thesisId);
        try {
            const thesisId = req.body.thesisId
            const userId = req.body.userId;
            if (req.body.method === "add") {
                const results = await SQL.addThesisToSaved({
                    userId: userId,
                    thesisId: thesisId
                });
                if (!results.ok) return res.status(500).json({ data: results.message });
                return res.json(results);
            } else if (req.body.method === "remove") {
                const results = await SQL.removeThesisFromSaved({
                    userId: userId,
                    thesisId: thesisId
                });
                if (!results.ok) return res.status(500).json({ data: results.message });
                return res.json(results);
            }

        } catch (err) {
            console.error('Error in POST /userlibrary:', err);
            return res.status(500).json({ 'error': err })
        }
    })
}