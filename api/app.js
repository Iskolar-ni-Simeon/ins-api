const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const {B2} = require('../public/scripts/b2.js');
const {SQL} = require('../public/scripts/sql.js');
const { JWTMiddleware } = require('../public/scripts/auth.js');
const privateKey = process.env.PRIVATE_KEY.replace(/\\n/g, '\n');
const publicKey = process.env.PUBLIC_KEY.replace(/\\n/g, '\n');

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
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
};

app.use(cors(corsOptions)); 
app.use(express.json());
app.options('*', cors(corsOptions));
app.use(cookieParser());

console.log("Initializing B2...");
const B2Class = new B2();
console.log("Initializing SQL...");
const SQLClass = new SQL();


(async function initializeApp() {

    app.get('/', (req, res) => {
        res.send("Hello, world!");
    });
    require('../routes/authenticationRoute.js')(app, privateKey, SQLClass);
    require('../routes/thesisRoute.js')(app, B2Class, SQLClass, JWTMiddleware, publicKey);
    require('../routes/userRoute.js')(app, B2Class, SQLClass, JWTMiddleware, publicKey);
})();

app.listen(PORT, function () {
    console.log(`Listening at port ${PORT}`);
});

module.exports = (req, res) => {
    app(req, res);
};
