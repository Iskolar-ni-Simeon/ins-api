const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const { B2 } = require('../public/scripts/b2.js');
const { SQL } = require('../public/scripts/sql.js');
const { JWTMiddleware } = require('../public/scripts/auth.js');
const privateKey = process.env.PRIVATE_KEY.replace(/\\n/g, '\n');
const publicKey = process.env.PUBLIC_KEY.replace(/\\n/g, '\n');

console.log('[INIT]: Starting server initialization');

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
    'http://localhost:8080',
    'http://localhost:3000',
    'http://localhost:5173',
    'https://iskolar-ni-simeon.vercel.app',
    'https://iskolarnisimeon.site',
    'https://beta.iskolarnisimeon.site',
    'http://iskolar-ni-simeon.vercel.app',
    'http://iskolarnisimeon.site',
    'http://beta.iskolarnisimeon.site'
];

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`Origin ${origin} not allowed by CORS`));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use((req, res, next) => {
    console.log(`[REQUEST]: ${req.method} ${req.path} from ${req.ip}`);
    next();
});

app.use(express.json());
app.use(cookieParser());
console.log('[INIT]: Initializing B2 service...');
const B2Class = new B2();
console.log('[INIT]: Initializing SQL service...');
const SQLClass = new SQL();

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('[ERROR]: Middleware caught error:', err);
    console.error('[ERROR]: Stack trace:', err.stack);
    res.status(500).json({ 
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

(async function initializeApp() {
    console.log('[INIT]: Setting up routes...');
    app.get('/', (req, res) => {
        res.redirect('https://github.com/dwnppoalt/iskolar-ni-simeon');
    });
    require('../routes/authenticationRoute.js')(app, privateKey, SQLClass);
    require('../routes/thesisRoute.js')(app, B2Class, SQLClass, JWTMiddleware, publicKey);
    require('../routes/userRoute.js')(app, B2Class, SQLClass, JWTMiddleware, publicKey);
    console.log('[INIT]: Routes initialized successfully');
})();

app.listen(PORT, '0.0.0.0', () => {
    console.log('[SERVER]: Running on http://localhost:' + PORT);
});

module.exports = (req, res) => {
    app(req, res);
};
