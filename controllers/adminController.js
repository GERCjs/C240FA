const db = require("../config/db");

exports.showDashboard = (req, res) => {
    // Get overall stats
    const statsSql = `
        SELECT
            (SELECT COUNT(*) FROM users) as total_users,
            (SELECT COUNT(*) FROM chat_sessions) as total_sessions,
            (SELECT COUNT(*) FROM chat_messages) as total_messages,
            (SELECT COUNT(*) FROM quizzes) as total_quizzes,
            (SELECT COUNT(*) FROM quiz_attempts) as total_attempts,
            (SELECT COUNT(*) FROM assignments) as total_assignments
    `;

    db.query(statsSql, (err, results) => {
        const stats = (results && results[0]) ? results[0] : {};

        res.render("admin/dashboard", { stats });
    });
};

exports.manageUsers = (req, res) => {
    const sql = `
        SELECT u.id, u.name, u.email, u.role, u.created_at,
            (SELECT COUNT(*) FROM chat_sessions WHERE user_id = u.id) as chat_count,
            (SELECT COUNT(*) FROM quiz_attempts WHERE user_id = u.id) as quiz_count
        FROM users u
        ORDER BY u.created_at DESC
    `;

    db.query(sql, (err, users) => {
        if (err) {
            console.log(err);
            users = [];
        }
        res.render("admin/users", { users });
    });
};

exports.deleteUser = (req, res) => {
    const userId = parseInt(req.params.id);

    // Don't allow deleting yourself
    if (userId === req.session.userId) {
        return res.redirect("/admin/users");
    }

    const sql = "DELETE FROM users WHERE id = ?";
    db.query(sql, [userId], (err) => {
        if (err) console.log(err);
        res.redirect("/admin/users");
    });
};

exports.viewAnalytics = (req, res) => {
    // Chat analytics - messages per day for last 7 days
    const chatAnalyticsSql = `
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM chat_messages
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY DATE(created_at)
        ORDER BY date ASC
    `;

    // Quiz analytics
    const quizAnalyticsSql = `
        SELECT
            COALESCE(AVG(percentage), 0) as avg_score,
            COUNT(*) as total_attempts,
            MAX(percentage) as highest_score,
            MIN(percentage) as lowest_score
        FROM quiz_attempts
    `;

    // Most active users
    const activeUsersSql = `
        SELECT u.name, COUNT(cm.id) as message_count
        FROM users u
        LEFT JOIN chat_sessions cs ON u.id = cs.user_id
        LEFT JOIN chat_messages cm ON cs.id = cm.session_id
        GROUP BY u.id, u.name
        ORDER BY message_count DESC
        LIMIT 10
    `;

    db.query(chatAnalyticsSql, (err, chatData) => {
        if (err) chatData = [];

        db.query(quizAnalyticsSql, (err, quizData) => {
            const quizStats = (quizData && quizData[0]) ? quizData[0] : {};

            db.query(activeUsersSql, (err, activeUsers) => {
                if (err) activeUsers = [];

                res.render("admin/analytics", {
                    chatData,
                    quizStats,
                    activeUsers
                });
            });
        });
    });
};
