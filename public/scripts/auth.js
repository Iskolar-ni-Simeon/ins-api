const jwt = require('jsonwebtoken');
const { generateKeyPair } = require('crypto');
require('dotenv').config();

const JWTMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Access token required' });
    }
    token = req.headers.authorization.split(" ")[1]

    if (!token) {
        return res.status(401).json({'response' : 'err', 'data' : 'Access token required.'})
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({'response' : 'err', 'data' : 'Invalid or expired token.'})
    }
}

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

module.exports = { JWTMiddleware, generateKey }