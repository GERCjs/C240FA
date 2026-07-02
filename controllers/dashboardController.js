const db = require("../config/db");

exports.showDashboard = (req, res) => {
    const userId = req.session.userId;

    // Get upcoming deadlines
    const deadlineSql = `
        SELECT title, module, deadline, priority, status
        FROM assignments
        WHERE user_id = ? AND status != 'completed' AND deadline >= NOW()
        ORDER BY deadline ASC
        LIMIT 5
    `;

    // Get recent chats
    const chatSql = `
        SELECT id, title, created_at
        FROM chat_sessions
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 5
    `;

    // Get quiz performance
    const quizSql = `
        SELECT qa.percentage, qa.score, qa.total, qa.completed_at, q.title as quiz_title
        FROM quiz_attempts qa
        JOIN quizzes q ON qa.quiz_id = q.id
        WHERE qa.user_id = ?
        ORDER BY qa.completed_at DESC
        LIMIT 5
    `;

    // Get document count
    const docSql = "SELECT COUNT(*) as count FROM documents WHERE user_id = ?";

    // Get overdue assignments
    const overdueSql = `
        SELECT COUNT(*) as count
        FROM assignments
        WHERE user_id = ? AND status != 'completed' AND deadline < NOW()
    `;

    // Get study progress (flashcards reviewed, quizzes taken)
    const progressSql = `
        SELECT
            (SELECT COUNT(*) FROM quiz_attempts WHERE user_id = ?) as quizzes_taken,
            (SELECT COUNT(*) FROM flashcards WHERE user_id = ? AND times_reviewed > 0) as cards_reviewed,
            (SELECT COUNT(*) FROM study_summaries WHERE user_id = ?) as summaries_created,
            (SELECT COALESCE(AVG(percentage), 0) FROM quiz_attempts WHERE user_id = ?) as avg_quiz_score
    `;

    db.query(deadlineSql, [userId], (err, deadlines) => {
        if (err) deadlines = [];

        db.query(chatSql, [userId], (err, recentChats) => {
            if (err) recentChats = [];

            db.query(quizSql, [userId], (err, quizPerformance) => {
                if (err) quizPerformance = [];

                db.query(docSql, [userId], (err, docResult) => {
                    const documentCount = (docResult && docResult[0]) ? docResult[0].count : 0;

                    db.query(overdueSql, [userId], (err, overdueResult) => {
                        const overdueCount = (overdueResult && overdueResult[0]) ? overdueResult[0].count : 0;

                        db.query(progressSql, [userId, userId, userId, userId], (err, progressResult) => {
                            const progress = (progressResult && progressResult[0]) ? progressResult[0] : {
                                quizzes_taken: 0,
                                cards_reviewed: 0,
                                summaries_created: 0,
                                avg_quiz_score: 0
                            };

                            res.render("dashboard", {
                                deadlines,
                                recentChats,
                                quizPerformance,
                                documentCount,
                                overdueCount,
                                progress
                            });
                        });
                    });
                });
            });
        });
    });
};
