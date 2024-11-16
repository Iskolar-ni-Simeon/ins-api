const { importJWK } = require('jose');
const jwt = require('jsonwebtoken');
const jwkToPem = require('jwk-to-pem');

module.exports = (app, privateKey, sql) => {
    app.post("/login", async (req, res) => {
        try {
            const response = await fetch('https://www.googleapis.com/oauth2/v3/certs');
            const keys = await response.json();

            const decodedToken = jwt.decode(req.body.credential, { complete: true });
            if (!decodedToken || !decodedToken.header || !decodedToken.header.kid) {
                return res.status(401).json({ message: 'Invalid token' });
            }

            const key = keys.keys.find(k => k.kid === decodedToken.header.kid);
            if (!key) {
                return res.status(401).json({ message: 'Invalid token' });
            }

            const publicKeyPem = jwkToPem(key);

            const publicKey = await importJWK(key, 'ES256');
            const payload = await jwt.verify(req.body.credential, publicKey);

            console.log(payload);

            // Step 7: Create your own JWT using the private key and payload
            const userJWT = jwt.sign(
                {
                    userId: payload.sub,
                    name: payload.given_name,
                    picture: payload.picture,
                    iat: Math.floor(Date.now() / 1000),
                    exp: Math.floor(Date.now() / 1000) + 60 * 60 // 1 hour expiration
                },
                privateKey,
                {
                    algorithm: 'ES256', // ES256 is used for JWT with ES key pairs
                }
            );

            // Step 8: Get user saved theses from the database
            const savedTheses = await sql.getUserSavedTheses(payload.sub);

            // Step 9: Store user information in your database
            await sql.addUser({
                id: payload.sub,
                name: payload.given_name,
                email: payload.email,
                picture: payload.picture
            });

            // Step 10: Respond with user information, saved theses, and the created JWT
            return res.json({
                token: payload, 
                jwtToken: userJWT, 
                saved: savedTheses, 
                publicKey: publicKeyPem
            });

        } catch (err) {
            console.error('Error: ', err);
            return res.status(500).json({ error: err.message });
        }
    });
};
