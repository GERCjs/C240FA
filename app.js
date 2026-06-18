const express = require("express");

const app = express();

const userController =
    require("./controllers/userController");

app.set("view engine", "ejs");

app.use(
    express.urlencoded({
        extended: true
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on URL address: http://localhost:${PORT}/`));