const jwt = require('jsonwebtoken');
const { generateKeyPairSync } = require('crypto');
require('dotenv').config();


const JWTMiddleware = (publicKey) => {
    return (req, res, next) => {
        if (!publicKey) {
            return res.status(500).json({ message: 'Public key is required for verification' });
        }
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Access token required' });
        }

        const token = authHeader.split(" ")[1];
        try {
            const decoded = jwt.verify(token, publicKey, { algorithms: ['ES256'] });
            req.user = decoded;
            next();
        } catch (err) {
            console.error('Token validation error: ', err);
            if (err.name === 'TokenExpiredError') {
                return res.status(403).json({ response: 'err', data: 'Token expired.' });
            }
            return res.status(403).json({ response: 'err', data: 'Invalid token.' });
        }
    };
};

module.exports = { JWTMiddleware }