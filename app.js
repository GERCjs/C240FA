const express = require("express");

const app = express();

const path = require("path");

app.use(
    express.static(
        path.join(
            __dirname,
            "public"
        )
    )
);

const session =
    require(
        "express-session"
    );

const userController = require("./controllers/userController");
const chatController = require("./controllers/chatController");

app.set("view engine", "ejs");

app.use(
    express.urlencoded({
        extended: true
    })
);

app.use(
    session({

        secret:
            "c240_ai_secret",

        resave: false,

        saveUninitialized: false

    })
);

app.get("/", (req, res) => {

    res.render("index");

});

app.get(
    "/register",
    userController.showRegister
);

app.post(
    "/register",
    userController.register
);

app.get(
    "/login",
    userController.showLogin
);

app.post(
    "/login",
    userController.login
);

app.get(
    "/chat",
    chatController.showChat
);

app.post(
    "/chat",
    chatController.askQuestion
);
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on URL address: http://localhost:${PORT}/`));