const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const B2 = require('./public/scripts/b2.js');
const SQL = require('./public/scripts/sql.js');
const { generateKey, JWTMiddleware } = require('./public/scripts/auth.js');

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
 * /thesis - POST (for adding, again) & GET (for getting info, again, no shit) /upload - POST
 * /delete - POST (isama na dito yung pagdelete ng file sa S3. )
 * 
 * FILE-RELATED ROUTES:
 * /accessthesis - GET (gumawa na lang ng button na "Access this file" para hindi constantly kumukuha ng link sa S3.)
 * 
 * DON'T FORGET: ILAGAY YUNG decodeJWT MIDDLEWARE PLSPLSPLSPLSPLSPLS
 * MAG-GENERATE NG BAGONG BEARER TOKEN SA 'Iskolar ni Simeon'.
 */
initializeKeys().then(() => {
    console.log(userJWT);
    console.log('keys initialized')
    require('./routes/authenticationRoute.js')(app, privateKey, SQLClass);
    require('./routes/thesisRoute.js')(app, B2Class, SQLClass, JWTMiddleware, publicKey);
    require('./routes/userRoute.js')(app, B2Class, SQLClass, JWTMiddleware, publicKey);

})


app.listen(PORT, function() {
    console.log(`Listening at port ${PORT}`);
});