/**
 * Checked: 03/11/2024, 9:47PM
 * Functional: ALL
 */

module.exports = (app, B2, SQL, JWTMiddleware, publicKey) => {
    app.get('/userlibrary', JWTMiddleware(publicKey), async (req, res, next) => {
        try {
            const checkedUserId = req.user.userId;
            const userId = req.query.id;
            if (userId !== checkedUserId) {
                return res.status(401).json({'result' : 'Invalid userId'})
            }
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
            const checkedUserId = req.user.userId;
            const userId = req.body.userId;
            console.log(`userid: ${userId}, jwt: ${checkedUserId}`);
            if (userId !== checkedUserId) {
                return res.status(401).json({'result' : 'Invalid userId'})
            }
            if (req.body.method === "add") {
                    const results = await SQL.addThesisToSaved({
                    userId: userId,
                    thesisId: thesisId
                });
                if (!results.ok) return res.status(500).json({data: results.message});
                return res.json(results);
            } else if (req.body.method === "remove") {
                const results = await SQL.removeThesisFromSaved({
                    userId: userId,
                    thesisId: thesisId
                });
                if (!results.ok) return res.status(500).json({data: results.message});
                return res.json(results);
            }
            
        } catch (err) {
            return res.status(500).json({'error': err})
        }
        
    })
}