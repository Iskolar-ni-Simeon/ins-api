const { importJWK } = require('jose');
const jwt = require('jsonwebtoken');
const jwkToPem = require('jwk-to-pem');
require('dotenv').config();

module.exports = (app, privateKey, sql) => {
    app.post("/login", async (req, res) => {
        if (req.body.signinas === "guest"){
            const {API_KEY} = req.body;
            
            if (API_KEY === (process.env.LIBRARY_API_KEY)) {
                console.log(API_KEY)
                console.log(process.env.LIBRARY_API_KEY)
            try {
                const jwtToken = jwt.sign (
                    {
                        userId: "guest",
                        iat: Math.floor(Date.now() / 1000),
                        exp: Math.floor(Date.now() / 1000) + 60 * 60
                    },
                    privateKey,
                    {
                        algorithm: 'ES256',
                    }
                );

                 return res.json({
                    data: {
                        jwtToken: jwtToken
                    }
                });
            } catch (err) {
                    console.error('Error: ', err);
                    return res.status(500).json({ error: err.message });
                }
            }
        } else {
            try {
                const response = await fetch('https://www.googleapis.com/oauth2/v3/certs');
                const keys = await response.json();
                
                const decodedToken = jwt.decode(req.body.credential, { complete: true });
                if (!decodedToken || !decodedToken.header || !decodedToken.header.kid) {
                    return res.status(401).json({ message: 'Invalid token' });
                }
    
                const oauthToken = decodedToken.payload.aud;
                if (oauthToken !== process.env.GOOGLE_OAUTH_CLIENT_ID) {
                    return res.status(401).json({ message: 'Invalid token' });
                }
    
                const key = keys.keys.find(k => k.kid === decodedToken.header.kid);
                if (!key) {
                    return res.status(401).json({ message: 'Invalid token' });
                }
    
                const publicKeyPem = jwkToPem(key);
    
                const publicKey = await importJWK(key, 'ES256');
                const payload = await jwt.verify(req.body.credential, publicKey);
                const userJWT = jwt.sign(
                    {
                        userId: payload.sub,
                        name: payload.given_name,
                        picture: payload.picture,
                        iat: Math.floor(Date.now() / 1000),
                        exp: Math.floor(Date.now() / 1000) + 60 * 60
                    },
                    privateKey,
                    {
                        algorithm: 'ES256',
                    }
                );
    
                const savedTheses = await sql.getUserSavedTheses(payload.sub);
                await sql.addUser({
                    id: payload.sub,
                    name: payload.given_name,
                    email: payload.email,
                    picture: payload.picture
                });
    
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
        }
    });
};
//isubo isubo ang ulo ng 
// ughhhhhh// iyahhhhh
// Sir D. vs Boss R nagjack en poy