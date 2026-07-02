const bcrypt = require("bcrypt");
const User = require("../models/userModel");
const { sanitizeInput, isValidEmail, isNonEmpty } = require("../middleware/validate");

exports.showRegister = (req, res) => {
    res.render("register", { error: null });
};

exports.register = async (req, res) => {
    const name = sanitizeInput(req.body.name);
    const email = sanitizeInput(req.body.email);
    const password = req.body.password;

    // Validation
    if (!isNonEmpty(name) || !isValidEmail(email) || !isNonEmpty(password)) {
        return res.render("register", { error: "Please fill in all fields with valid data." });
    }

    if (password.length < 6) {
        return res.render("register", { error: "Password must be at least 6 characters." });
    }

    User.findByEmail(email, async (err, results) => {
        if (err) {
            console.log(err);
            return res.render("register", { error: "Database error. Please try again." });
        }

        if (results.length > 0) {
            return res.render("register", { error: "Email already exists." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        User.createUser(name, email, hashedPassword, (err, result) => {
            if (err) {
                console.log(err);
                return res.render("register", { error: "Registration failed. Please try again." });
            }
            res.redirect("/login");
        });
    });
};

exports.showLogin = (req, res) => {
    res.render("login", { error: null });
};

exports.login = (req, res) => {
    const email = sanitizeInput(req.body.email);
    const password = req.body.password;

    if (!isValidEmail(email) || !isNonEmpty(password)) {
        return res.render("login", { error: "Please enter a valid email and password." });
    }

    User.findByEmail(email, async (err, results) => {
        if (err) {
            console.log(err);
            return res.render("login", { error: "Database error. Please try again." });
        }

        if (results.length === 0) {
            return res.render("login", { error: "User not found." });
        }

        const user = results[0];
        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.render("login", { error: "Incorrect password." });
        }

        req.session.userId = user.id;
        req.session.userName = user.name;
        req.session.userRole = user.role || "student";

        res.redirect("/dashboard");
    });
};

exports.logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) console.log(err);
        res.redirect("/");
    });
};
