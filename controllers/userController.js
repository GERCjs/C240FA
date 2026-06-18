const bcrypt = require("bcrypt");

const User =
require("../models/userModel");

exports.showRegister = (
    req,
    res
) => {

    res.render("register");

};

exports.register = async (
    req,
    res
) => {

    const {
        name,
        email,
        password
    } = req.body;

    User.findByEmail(
        email,
        async (
            err,
            results
        ) => {

            if (err) {

                console.log(err);

                return res.send(
                    "Database Error"
                );
            }

            if (
                results.length > 0
            ) {

                return res.send(
                    "Email already exists"
                );
            }

            const hashedPassword =
                await bcrypt.hash(
                    password,
                    10
                );

            User.createUser(
                name,
                email,
                hashedPassword,
                (
                    err,
                    result
                ) => {

                    if (err) {

                        console.log(
                            err
                        );

                        return res.send(
                            "Registration Failed"
                        );
                    }

                    res.redirect(
                        "/login"
                    );

                }
            );

        }
    );

    

};

exports.showLogin = (
        req,
        res
    ) => {

        res.render(
            "login"
        );

    };

    exports.login = (
    req,
    res
) => {

    const {
        email,
        password
    } = req.body;

    User.findByEmail(
        email,
        async (
            err,
            results
        ) => {

            if (err) {

                console.log(err);

                return res.send(
                    "Database Error"
                );

            }

            if (
                results.length === 0
            ) {

                return res.send(
                    "User Not Found"
                );

            }

            const user =
                results[0];

            const match =
                await bcrypt.compare(
                    password,
                    user.password
                );

            if (!match) {

                return res.send(
                    "Incorrect Password"
                );

            }

            req.session.userId =
                user.id;

            req.session.userName =
                user.name;

            res.redirect(
                "/chat"
            );

        }
    );

};