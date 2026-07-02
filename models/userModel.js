const db = require("../config/db");

class User {

    static createUser(name, email, password, callback) {
        const sql = `
            INSERT INTO users (name, email, password, role)
            VALUES (?, ?, ?, 'student')
        `;
        db.query(sql, [name, email, password], callback);
    }

    static findByEmail(email, callback) {
        const sql = "SELECT * FROM users WHERE email = ?";
        db.query(sql, [email], callback);
    }

    static findById(id, callback) {
        const sql = "SELECT id, name, email, role, created_at FROM users WHERE id = ?";
        db.query(sql, [id], callback);
    }

    static getAllUsers(callback) {
        const sql = "SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC";
        db.query(sql, callback);
    }

    static deleteUser(id, callback) {
        const sql = "DELETE FROM users WHERE id = ?";
        db.query(sql, [id], callback);
    }
}

module.exports = User;
