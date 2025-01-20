const { importJWK } = require('jose');
const jwt = require('jsonwebtoken');
const jwkToPem = require('jwk-to-pem');
const crypto = require('crypto');
require('dotenv').config();

module.exports = (app, privateKey, sql) => {
    app.post("/login", async (req, res) => {
        console.log('[AUTH]: Starting login process');
        try {
            if (!req.body.credential) {
                console.log('[AUTH]: Missing credentials in request');
                return res.status(400).json({ message: 'Credential is required' });
            }

            console.log('[AUTH]: Fetching Google certificates');
            const response = await fetch('https://www.googleapis.com/oauth2/v3/certs', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                timeout: 5000
            }).catch(error => {
                console.error('Fetch error:', error);
                throw new Error('Failed to fetch Google certificates');
            });

            if (!response.ok) {
                throw new Error(`Google API responded with status: ${response.status}`);
            }
            
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
            console.log('[AUTH]: Creating user JWT');
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

            console.log('[AUTH]: Fetching user saved theses');
            const savedTheses = await sql.getUserSavedTheses(payload.sub);
            console.log('[AUTH]: Adding/Updating user in database');
            await sql.addUser({
                id: payload.sub,
                name: payload.given_name,
                email: payload.email,
                picture: payload.picture
            });

            console.log('[AUTH]: Login successful for user:', payload.sub);
            return res.json({
                token: payload,
                jwtToken: userJWT,
                saved: savedTheses,
                publicKey: publicKeyPem
            });
        } catch (err) {
            console.error('[AUTH-ERROR]: Login failed:', err.message);
            console.error('[AUTH-ERROR]: Stack:', err.stack);
            console.error('Request body:', { 
                hasCredential: !!req.body.credential,
                timestamp: new Date().toISOString()
            });
            return res.status(500).json({ 
                message: 'Authentication failed',
                details: err.message 
            });
        };
    });

    app.post('/guest-login', async (req, res) => {
        console.log('[GUEST-AUTH]: Starting guest login process');
        if (!req.headers.authorization || req.headers.authorization !== process.env.LIBRARY_API_KEY) {
            console.log('[GUEST-AUTH]: Invalid API key');
            console
            return res.status(401).json({ message: 'Invalid API key' });
        }

        try {
            const guestId = `guest-${crypto.randomBytes(8).toString('hex')}`;
            const timestamp = Math.floor(Date.now() / 1000);
            console.log(`[GUEST-AUTH]: Creating guest JWT for ${guestId}`);
            const guestPayload = {
                sub: guestId,
                name: 'Guest User',
                role: 'guest',
                iat: timestamp,
                exp: timestamp + (60 * 60)
            };

            const guestJWT = jwt.sign(
                guestPayload,
                privateKey,
                {
                    algorithm: 'ES256',
                }
            );

            const publicKeyPem = crypto.createPublicKey(privateKey)
                .export({ type: 'spki', format: 'pem' });
            
            console.log('[GUEST-AUTH]: Guest login successful');
            return res.json({
                token: guestPayload,
                jwtToken: guestJWT,
                saved: [],
                publicKey: publicKeyPem,
                expiresIn: 3600
            });
        } catch (err) {
            console.error('Guest login error:', err);
            console.error('Request timestamp:', new Date().toISOString());
            return res.status(500).json({ 
                message: 'Internal server error during guest authentication',
                details: err.message
            });
        }
    });
};