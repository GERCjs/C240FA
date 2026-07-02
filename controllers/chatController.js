const axios = require("axios");
const db = require("../config/db");
const { sanitizeInput, sanitizePrompt } = require("../middleware/validate");

exports.showChat = (req, res) => {
    const userId = req.session.userId;

    // Get user's chat sessions for sidebar
    const sql = "SELECT id, title, created_at FROM chat_sessions WHERE user_id = ? ORDER BY created_at DESC";
    db.query(sql, [userId], (err, sessions) => {
        if (err) {
            console.log(err);
            sessions = [];
        }

        res.render("chat", {
            sessions: sessions || [],
            currentSession: null,
            messages: [],
            question: null,
            answer: null
        });
    });
};

exports.askQuestion = async (req, res) => {
    const userId = req.session.userId;
    const question = sanitizePrompt(sanitizeInput(req.body.question));

    if (!question) {
        return res.redirect("/chat");
    }

    try {
        // Create or get session
        let sessionId = req.body.session_id;

        if (!sessionId) {
            // Create new session with question as title
            const title = question.substring(0, 100);
            const createSql = "INSERT INTO chat_sessions (user_id, title) VALUES (?, ?)";
            const [result] = await db.promise().query(createSql, [userId, title]);
            sessionId = result.insertId;
        }

        // Save user message
        const saveUserMsg = "INSERT INTO chat_messages (session_id, sender, message) VALUES (?, 'user', ?)";
        await db.promise().query(saveUserMsg, [sessionId, question]);

        // Get conversation history for context
        const historySQL = "SELECT sender, message FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC LIMIT 10";
        const [history] = await db.promise().query(historySQL, [sessionId]);

        // Build context from history for follow-up support
        let contextMessages = history.map(m => `${m.sender}: ${m.message}`).join("\n");

        // Call Flask RAG API
        const response = await axios.post("http://127.0.0.1:5000/chat", {
            question: question,
            context: contextMessages
        }, { timeout: 60000 });

        const answer = response.data.answer;
        const sources = response.data.sources || [];

        // Save AI response
        const saveAiMsg = "INSERT INTO chat_messages (session_id, sender, message) VALUES (?, 'ai', ?)";
        await db.promise().query(saveAiMsg, [sessionId, answer]);

        // Get all messages for this session
        const [messages] = await db.promise().query(
            "SELECT sender, message, created_at FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC",
            [sessionId]
        );

        // Get sessions for sidebar
        const [sessions] = await db.promise().query(
            "SELECT id, title, created_at FROM chat_sessions WHERE user_id = ? ORDER BY created_at DESC",
            [userId]
        );

        res.render("chat", {
            sessions: sessions,
            currentSession: sessionId,
            messages: messages,
            question: question,
            answer: answer,
            sources: sources
        });

    } catch (error) {
        console.log(error.message);

        // Get sessions for sidebar even on error
        const [sessions] = await db.promise().query(
            "SELECT id, title, created_at FROM chat_sessions WHERE user_id = ? ORDER BY created_at DESC",
            [userId]
        ).catch(() => [[]]);

        res.render("chat", {
            sessions: sessions || [],
            currentSession: null,
            messages: [],
            question: question,
            answer: "Unable to connect to AI service. Please make sure the RAG server is running.",
            sources: []
        });
    }
};

exports.newSession = (req, res) => {
    res.redirect("/chat");
};

exports.getHistory = (req, res) => {
    const userId = req.session.userId;
    const sql = "SELECT id, title, created_at FROM chat_sessions WHERE user_id = ? ORDER BY created_at DESC";

    db.query(sql, [userId], (err, sessions) => {
        if (err) {
            return res.json({ error: "Failed to load history" });
        }
        res.json({ sessions });
    });
};

exports.getSession = (req, res) => {
    const userId = req.session.userId;
    const sessionId = parseInt(req.params.id);

    // Verify session belongs to user
    const verifySql = "SELECT id FROM chat_sessions WHERE id = ? AND user_id = ?";
    db.query(verifySql, [sessionId, userId], (err, results) => {
        if (err || results.length === 0) {
            return res.redirect("/chat");
        }

        // Get messages
        const msgSql = "SELECT sender, message, created_at FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC";
        db.query(msgSql, [sessionId], (err, messages) => {
            if (err) messages = [];

            // Get sessions for sidebar
            const sessionsSql = "SELECT id, title, created_at FROM chat_sessions WHERE user_id = ? ORDER BY created_at DESC";
            db.query(sessionsSql, [userId], (err, sessions) => {
                if (err) sessions = [];

                res.render("chat", {
                    sessions: sessions,
                    currentSession: sessionId,
                    messages: messages,
                    question: null,
                    answer: null,
                    sources: []
                });
            });
        });
    });
};
