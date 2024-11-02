const express = require('express');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const S3 = require('./public/scripts/s3.js');
const RDS = require('./public/scripts/rds.js');
const { JWTMiddleware, generateKey } = require('./public/scripts/auth.js');

const app = express();
const PORT = 5000;

app.use(express.json());

console.log("Initializing S3...");
const s3 = new S3();
console.log("Initializing RDS...");
const rds = new RDS();

let privateKey, publicKey;

async function initializeKeys() {
    console.log("Creating private/public keys...");
    try {
        const data = await generateKey();
        privateKey = data.privateKey; 
        publicKey = data.publicKey; 
    } catch (error) {
        console.error("Error generating keys:", error);
    }
}

initializeKeys();

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

app.post("/login", async (req, res) => {
    try {
        const response = await fetch('https://www.googleapis.com/oauth2/v3/certs');
        const keys = await response.json();
        
        const decodedToken = jwt.decode(req.body.credential, { complete: true });
        if (decodedToken.payload.aud !== process.env.GOOGLE_OAUTH_CLIENT_ID) {
            return res.status(401).json({ error: 'Invalid audience' });
        }
        const key = keys.keys.find(k => k.kid === decodedToken.header.kid);
        if (!key) {
            throw new Error('Public key not found');
        }
        const verifiedToken = jwt.verify(req.body.credential, key);
        return res.json({ token: verifiedToken });
    } catch (err) {
        console.error('Token validation error: ', err);
        return res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, function() {
    console.log(`Listening at port ${PORT}`);
});