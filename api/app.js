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


app.use(cors(corsOptions)); 
app.use(express.json());
app.use(cors())
app.use(cookieParser());
if (process.env.NODE_ENV === "development"){
    app.use(
      cors({
        origin: "https://localhost:8080",
        credentials: true,
      })
    );
  }
  
  if (process.env.NODE_ENV === "production"){
    app.use(
      cors({
        origin: "https://iskolar-ni-simeon.vercel.app",
        credentials: true,
      })
    );
  }
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
