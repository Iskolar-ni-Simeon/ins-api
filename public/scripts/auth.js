const jwt = require('jsonwebtoken');
const { generateKeyPairSync } = require('crypto');
require('dotenv').config();


const JWTMiddleware = (publicKey) => {
    
    return (req, res, next) => {
        
        if (!publicKey) {
            return res.status(500).json({ message: 'Public key is required for verification' });
        }
        console.log(`headers: ${JSON.stringify(req.headers)}`);
        console.log(`cookies: ${JSON.stringify(req.cookies)}`);
        const authHeader = req.cookies.authorization ? req.cookies.authorization : req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ message: 'Access token required' });
        }

        try {
            const decoded = jwt.verify(authHeader, publicKey, { algorithms: ['ES256'] });
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