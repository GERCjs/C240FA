const db = require("../config/db");

class User {

    static createUser(
        name,
        email,
        password,
        callback
    ) {

        const sql = `
            INSERT INTO users
            (
                name,
                email,
                password
            )
            VALUES
            (
                ?,
                ?,
                ?
            )
        `;

        db.query(
            sql,
            [
                name,
                email,
                password
            ],
            callback
        );
    }

    static findByEmail(
        email,
        callback
    ) {

        const sql = `
            SELECT *
            FROM users
            WHERE email = ?
        `;

        db.query(
            sql,
            [email],
            callback
        );
    }

}

module.exports = User;