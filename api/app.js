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

// List of allowed origins
const allowedOrigins = [
    'http://localhost:8080',
    'https://iskolar-ni-simeon.onrender.com'
];

// CORS options configuration
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, origin);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'OPTIONS'], // Allow specific HTTP methods
    allowedHeaders: ['Content-Type', 'Authorization'], // Allow specific headers
    credentials: true, // Allow credentials like cookies and authorization headers
};

// Middleware setup
app.use(cors(corsOptions));  // Apply CORS settings to all routes
app.use(express.json());      // Parse JSON request bodies

let privateKey, publicKey;

// Initialize keys
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

console.log("Initializing B2...");
const B2Class = new B2();
console.log("Initializing SQL...");
const SQLClass = new SQL();

(async function initializeApp() {
    await keyManager.initializeKeys();

    app.get('/', (req, res) => {
        res.send("Hello, world!");
    });

    // Define routes
    require('../routes/authenticationRoute.js')(app, keyManager.getPrivateKey(), SQLClass);
    require('../routes/thesisRoute.js')(app, B2Class, SQLClass, JWTMiddleware, keyManager.getPublicKey());
    require('../routes/userRoute.js')(app, B2Class, SQLClass, JWTMiddleware, keyManager.getPublicKey());

})();

app.listen(PORT, function () {
    console.log(`Listening at port ${PORT}`);
});

module.exports = (req, res) => {
    app(req, res);
};
