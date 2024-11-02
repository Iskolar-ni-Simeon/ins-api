const express = require('express');
const path = require('path');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const jwkToPem = require('jwk-to-pem');

const S3 = require('./public/scripts/s3.js');
const RDS = require('./public/scripts/rds.js');
const { generateKey, JWTMiddleware } = require('./public/scripts/auth.js');

const app = express();
const PORT = 5000;

// Correctly set allowed origins as an array of strings
const allowedOrigins = [
    'http://localhost:8080',
    'https://iskolar-ni-simeon.vercel.app'
];

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, origin); // Allow the request
        } else {
            callback(new Error('Not allowed by CORS')); // Reject the request
        }
    },
    methods: ['GET', 'POST', 'OPTIONS'], // Include OPTIONS method
    credentials: true,
};

let privateKey, publicKey;
async function initializeKeys() {
    console.log("Creating private/public keys...");
    try {
        const data = await generateKey();
        privateKey = data.privateKey; 
        publicKey = data.publicKey; 
        console.log('Keys initialized successfully.');
    } catch (error) {
        console.error("Error generating keys:", error);
    }
}



// Apply CORS middleware globally
app.use(cors(corsOptions));
app.use(express.json());

console.log("Initializing S3...");
const s3 = new S3();
console.log("Initializing RDS...");
const rds = new RDS();

/**
 * to-do: 
 * /login - POST
 * 
 * USER-RELATED ROUTES:
 * /adduser - POST
 * /userlibrary - POST (for adding) & GET (for getting, no shit sherlock)
 * 
 * THESIS-RELATED ROUTES:
 * /search - GET
 * /thesis - POST (for adding, again) & GET (for getting info, again, no shit)
 * /delete - POST (isama na dito yung pagdelete ng file sa S3. )
 * 
 * FILE-RELATED ROUTES:
 * /upload - POST
 * /accessthesisfile - GET (gumawa na lang ng button na "Access this file" para hindi constantly kumukuha ng link sa S3.)
 * 
 * DON'T FORGET: ILAGAY YUNG decodeJWT MIDDLEWARE PLSPLSPLSPLSPLSPLS
 * MAG-GENERATE NG BAGONG BEARER TOKEN SA 'Iskolar ni Simeon'.
 */
console.log(publicKey);
initializeKeys().then(() => {
    setupRoutes();
})
function setupRoutes() {
    app.post("/login", async (req, res) => {
        console.log(req.body)
        try {
            const response = await fetch('https://www.googleapis.com/oauth2/v3/certs');
            const keys = await response.json();

            const decodedToken = jwt.decode(req.body.credential, { complete: true });
            console.log(decodedToken)
            if (decodedToken.payload.aud !== process.env.GOOGLE_OAUTH_CLIENT_ID) {
                return res.status(401).json({ error: 'Invalid audience' });
            }
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

            return res.json({ token: verifiedToken, jwtToken: userJWT});
        } catch (err) {
            console.error('Token validation error: ', err);
            return res.status(500).json({ error: err.message });
        }
    });

    app.get('/test', JWTMiddleware(publicKey), (req, res, next) => {
        res.send("IT WORKS!!!!");
    })
}
app.listen(PORT, function() {
    console.log(`Listening at port ${PORT}`);
});