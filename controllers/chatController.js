const axios = require("axios");
const db = require("../config/db");
const { sanitizeInput, sanitizePrompt } = require("../middleware/validate");

const sessionsSelect = "SELECT id, title, is_pinned, created_at FROM chat_sessions WHERE user_id = ? ORDER BY is_pinned DESC, created_at DESC";

exports.showChat = (req, res) => {
    const userId = req.session.userId;

    // Get user's chat sessions for sidebar
    const sql = sessionsSelect;
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
        }, { timeout: 120000 });

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
            sessionsSelect,
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
            sessionsSelect,
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
    const sql = sessionsSelect;

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
            const sessionsSql = sessionsSelect;
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

exports.renameSession = async (req, res) => {
    const userId = req.session.userId;
    const sessionId = parseInt(req.params.id);
    const title = sanitizeInput(req.body.title || "").trim();

    if (!sessionId || !title) {
        return res.status(400).json({ error: "Chat title is required." });
    }

    if (title.length > 60) {
        return res.status(400).json({ error: "Chat title must be 60 characters or fewer." });
    }

    try {
        const [result] = await db.promise().query(
            "UPDATE chat_sessions SET title = ? WHERE id = ? AND user_id = ?",
            [title, sessionId, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Chat not found." });
        }

        res.json({ success: true, title });
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ error: "Failed to rename chat." });
    }
};

exports.pinSession = async (req, res) => {
    const userId = req.session.userId;
    const sessionId = parseInt(req.params.id);
    const isPinned = req.body.is_pinned === true || req.body.is_pinned === "true" || req.body.is_pinned === 1 || req.body.is_pinned === "1";

    if (!sessionId) {
        return res.status(400).json({ error: "Invalid chat session." });
    }

    try {
        const [result] = await db.promise().query(
            "UPDATE chat_sessions SET is_pinned = ? WHERE id = ? AND user_id = ?",
            [isPinned ? 1 : 0, sessionId, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Chat not found." });
        }

        res.json({ success: true, is_pinned: isPinned });
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ error: "Failed to update pinned state." });
    }
};

exports.deleteSession = async (req, res) => {
    const userId = req.session.userId;
    const sessionId = parseInt(req.params.id);

    if (!sessionId) {
        return res.status(400).json({ error: "Invalid chat session." });
    }

    try {
        const [sessions] = await db.promise().query(
            "SELECT id FROM chat_sessions WHERE id = ? AND user_id = ?",
            [sessionId, userId]
        );

        if (sessions.length === 0) {
            return res.status(404).json({ error: "Chat not found." });
        }

        await db.promise().query("DELETE FROM chat_messages WHERE session_id = ?", [sessionId]);
        await db.promise().query("DELETE FROM chat_sessions WHERE id = ? AND user_id = ?", [sessionId, userId]);

        res.json({ success: true, redirect: "/chat" });
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ error: "Failed to delete chat." });
    }
};
