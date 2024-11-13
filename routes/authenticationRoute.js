const jwt = require('jsonwebtoken');
const jwkToPem = require('jwk-to-pem');

module.exports = (app, privateKey, sql) => {
    app.post("/login", async (req, res) => {
        try {
            const response = await fetch('https://www.googleapis.com/oauth2/v3/certs');
            const keys = await response.json();

            const decodedToken = jwt.decode(req.body.credential, { complete: true });
            
            const key = keys.keys.find(k => k.kid === decodedToken.header.kid);
            if (!key) {
                throw new Error('Public key not found');
            }
            const publicKeyPem = jwkToPem(key); 
            const verifiedToken = jwt.verify(req.body.credential, publicKeyPem);
            const userJWT = jwt.sign(
                {
                    userId: verifiedToken.sub,
                    name: verifiedToken.given_name,
                    picture: verifiedToken.picture,
                    iat: Math.floor(Date.now() / 1000), // Issued at
                    exp: Math.floor(Date.now() / 1000) + (60 * 60) // Expiration time
                },
                privateKey,
                {
                    algorithm: 'RS256',
                }
            );
            console.log(decodedToken);
            await sql.addUser({id: verifiedToken.sub, email: verifiedToken.email, name: verifiedToken.name});
            const savedTheses = await sql.getUserSavedTheses(verifiedToken.sub);
            return res.json({ token: verifiedToken, jwtToken: userJWT, saved: savedTheses});
        } catch (err) {
            console.error('Token validation error: ', err);
            return res.status(500).json({ error: err.message });
        }
    });
}