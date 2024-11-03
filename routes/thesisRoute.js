const { v4: uuid4 } = require('uuid');
const multer = require('multer');
const upload = multer();

/**
 * Checked: 03/11/2024, 9:31PM
 * Functional: ALL
 */

module.exports = (app, B2, SQL, JWTMiddleware, publicKey) => {
    app.get('/search', JWTMiddleware(publicKey), async (req, res, next) => {
        try {
            const SQLParams = {
                title: req.query.q || "",
                author: req.query.author || ""
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
            const uuid = req.body.thesisId;
            const fileStatus = await B2.deleteFile(uuid);
            if (!fileStatus.ok) return res.status(500).json({data: fileStatus.message});
            const databaseStatus = await SQL.deleteThesis(uuid);
            if (!databaseStatus.ok) return res.status(500).json({data: databaseStatus.message});
            return res.json({file: fileStatus, database: databaseStatus});
        } catch (err) {
            console.error('Error: ', err)
            return res.status(500).json({ error: `Internal server error: ${err}`});
        }

    });
}
