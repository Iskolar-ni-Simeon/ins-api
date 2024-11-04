const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const B2 = require('../public/scripts/b2.js');
const SQL = require('../public/scripts/sql.js');
const { generateKey, JWTMiddleware } = require('../public/scripts/auth.js');
const keyManager = require('../public/scripts/keymanager.js'); 

const app = express();
const PORT = 5000;

const allowedOrigins = [
    'http://localhost:8080',
    'https://iskolar-ni-simeon.vercel.app'
];

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, origin);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
};

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

app.use(cors(corsOptions));
app.use(express.json());    

console.log("Initializing B2...");
const B2Class = new B2();
console.log("Initializing SQL...");
const SQLClass = new SQL();

(async function initializeApp() {
    // Ensure keys are initialized before using them
    await keyManager.initializeKeys();

    const userJWT = jwt.sign(
        {
            userId: '6478217814931353',
            name: "JHAL ALBERT BERIOSO",
            picture: "SAMPLE",
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (1000 * 60 * 60 * 24 * 7)
        },
        keyManager.getPrivateKey(), // Access private key from KeyManager
        {
            algorithm: 'RS256',
        }
    );
    console.log(userJWT);
    console.log('Keys are ready');

    // Define routes after keys are initialized
    app.get('/', (req, res) => {
        res.send("Hello, world!");
    });

    require('../routes/authenticationRoute.js')(app, keyManager.getPrivateKey(), SQLClass);
    require('../routes/thesisRoute.js')(app, B2Class, SQLClass, JWTMiddleware, keyManager.getPublicKey());
    require('../routes/userRoute.js')(app, B2Class, SQLClass, JWTMiddleware, keyManager.getPublicKey());

})();

app.listen(PORT, function() {
    console.log(`Listening at port ${PORT}`);
});

module.exports = (req, res) => {
    app(req, res);
};