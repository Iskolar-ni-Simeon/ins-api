const jwt = require('jsonwebtoken');
const { generateKeyPair } = require('crypto');
require('dotenv').config();


const JWTMiddleware = (publicKey) => {
    return (req, res, next) => {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Access token required' });
        }
        const token = authHeader.split(" ")[1];

        if (!token) {
            return res.status(401).json({'response' : 'err', 'data' : 'Access token required.'});
        }
        
        console.log('Verifying token:', token);

        try {
            const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
            req.user = decoded;
            next();
        } catch (err) {
            console.error('Token validation error: ', err);
            return res.status(403).json({'response' : 'err', 'data' : 'Invalid or expired token.'});
        }
    };
};

function generateKey() {
    return new Promise((resolve, reject) => {
        generateKeyPair('rsa', {
            modulusLength: 2048,
        }, (err, pub, priv) => {
            if (err) {
                console.error('Error generating keys:', err);
                return reject(err);
            }
            resolve({
                publicKey: pub.export({ type: 'spki', format: 'pem' }),
                privateKey: priv.export({ type: 'pkcs8', format: 'pem' }),
            });
        });
    });
}

module.exports = { generateKey, JWTMiddleware }