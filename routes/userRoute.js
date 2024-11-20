/**
 * Checked: 03/11/2024, 9:47PM
 * Functional: ALL
 */

module.exports = (app, B2, SQL, JWTMiddleware, publicKey) => {
    app.get('/userlibrary', JWTMiddleware(publicKey), async (req, res, next) => {
        try {
            const userId = req.query.id;
            const results = await SQL.getUserSavedTheses(userId);
            if (!results.ok) return res.status(500).json({data: results.message});
            return res.json(results);
        } catch (err) {
            return res.status(500).json({'error': err})
        }
    });

    app.post('/userlibrary', JWTMiddleware(publicKey), async (req, res, next) => {
        try {
            const thesisId = req.body.thesisId
            const userId = req.body.userId;
            console.log(req.body);
            if (req.body.method === "add") {
                    const results = await SQL.addThesisToSaved({
                    userId: userId,
                    thesisId: thesisId
                });
                if (!results.ok) return res.status(500).json({data: results.message});
                console.log(results);
                return res.json(results);
            } else if (req.body.method === "remove") {
                const results = await SQL.removeThesisFromSaved({
                    userId: userId,
                    thesisId: thesisId
                });
                if (!results.ok) return res.status(500).json({data: results.message});
                console.log(results);
                return res.json(results);
            }
            
        } catch (err) {
            return res.status(500).json({'error': err})
        }
    })
}