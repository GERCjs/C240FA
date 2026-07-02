const db = require("../config/db");
const axios = require("axios");
const { sanitizeInput } = require("../middleware/validate");

exports.showSummaries = (req, res) => {
    const userId = req.session.userId;

    const sql = `
        SELECT ss.*, d.original_name as document_name
        FROM study_summaries ss
        LEFT JOIN documents d ON ss.document_id = d.id
        WHERE ss.user_id = ?
        ORDER BY ss.created_at DESC
    `;
    db.query(sql, [userId], (err, summaries) => {
        if (err) {
            console.log(err);
            summaries = [];
        }

        // Get user's documents for the generate form
        const docSql = "SELECT id, original_name FROM documents WHERE user_id = ?";
        db.query(docSql, [userId], (err, documents) => {
            if (err) documents = [];

            res.render("summaries", {
                summaries: summaries,
                documents: documents,
                error: null
            });
        });
    });
};

exports.generateSummary = async (req, res) => {
    const userId = req.session.userId;
    const documentId = parseInt(req.body.document_id);

    if (!documentId) {
        return res.redirect("/summaries");
    }

    // Get document content
    const sql = "SELECT * FROM documents WHERE id = ? AND user_id = ?";
    db.query(sql, [documentId, userId], async (err, results) => {
        if (err || results.length === 0) {
            return res.redirect("/summaries");
        }

        const doc = results[0];
        const content = doc.content || "";

        if (!content || content.length < 50) {
            return res.redirect("/summaries");
        }

        try {
            const response = await axios.post("http://127.0.0.1:5000/generate-summary", {
                content: content.substring(0, 5000),
                title: doc.original_name
            }, { timeout: 60000 });

            const summaryText = response.data.summary;
            const keyPoints = response.data.key_points || [];

            // Save summary
            const saveSql = "INSERT INTO study_summaries (user_id, document_id, title, summary_text, key_points) VALUES (?, ?, ?, ?, ?)";
            db.query(saveSql, [userId, documentId, `Summary: ${doc.original_name}`, summaryText, JSON.stringify(keyPoints)], (err, result) => {
                if (err) console.log(err);
                res.redirect("/summaries");
            });

        } catch (error) {
            console.log(error.message);

            // Generate basic summary locally
            const basicSummary = generateLocalSummary(content, doc.original_name);
            const saveSql = "INSERT INTO study_summaries (user_id, document_id, title, summary_text, key_points) VALUES (?, ?, ?, ?, ?)";
            db.query(saveSql, [userId, documentId, `Summary: ${doc.original_name}`, basicSummary.summary, JSON.stringify(basicSummary.key_points)], (err) => {
                if (err) console.log(err);
                res.redirect("/summaries");
            });
        }
    });
};

exports.showSummary = (req, res) => {
    const userId = req.session.userId;
    const summaryId = parseInt(req.params.id);

    const sql = `
        SELECT ss.*, d.original_name as document_name
        FROM study_summaries ss
        LEFT JOIN documents d ON ss.document_id = d.id
        WHERE ss.id = ? AND ss.user_id = ?
    `;
    db.query(sql, [summaryId, userId], (err, results) => {
        if (err || results.length === 0) {
            return res.redirect("/summaries");
        }

        const summary = results[0];
        summary.key_points = summary.key_points ? JSON.parse(summary.key_points) : [];

        res.render("summary-detail", { summary });
    });
};

exports.exportSummary = (req, res) => {
    const userId = req.session.userId;
    const summaryId = parseInt(req.params.id);

    const sql = "SELECT * FROM study_summaries WHERE id = ? AND user_id = ?";
    db.query(sql, [summaryId, userId], (err, results) => {
        if (err || results.length === 0) {
            return res.redirect("/summaries");
        }

        const summary = results[0];
        const keyPoints = summary.key_points ? JSON.parse(summary.key_points) : [];

        // Export as text file
        let exportContent = `# ${summary.title}\n\n`;
        exportContent += `Generated: ${new Date(summary.created_at).toLocaleDateString()}\n\n`;
        exportContent += `## Summary\n\n${summary.summary_text}\n\n`;

        if (keyPoints.length > 0) {
            exportContent += `## Key Points\n\n`;
            keyPoints.forEach((point, i) => {
                exportContent += `${i + 1}. ${point}\n`;
            });
        }

        res.setHeader("Content-Type", "text/plain");
        res.setHeader("Content-Disposition", `attachment; filename="${summary.title.replace(/[^a-zA-Z0-9]/g, "_")}.txt"`);
        res.send(exportContent);
    });
};

// Flashcards
exports.showFlashcards = (req, res) => {
    const userId = req.session.userId;

    const sql = "SELECT * FROM flashcards WHERE user_id = ? ORDER BY created_at DESC";
    db.query(sql, [userId], (err, flashcards) => {
        if (err) {
            console.log(err);
            flashcards = [];
        }

        // Get documents for generation form
        const docSql = "SELECT id, original_name FROM documents WHERE user_id = ?";
        db.query(docSql, [userId], (err, documents) => {
            if (err) documents = [];

            res.render("flashcards", {
                flashcards: flashcards,
                documents: documents,
                error: null
            });
        });
    });
};

exports.generateFlashcards = async (req, res) => {
    const userId = req.session.userId;
    const documentId = parseInt(req.body.document_id);
    const subject = sanitizeInput(req.body.subject) || "General";
    const topic = sanitizeInput(req.body.topic) || "Study Notes";

    let content = "";

    if (documentId) {
        const [docs] = await db.promise().query("SELECT content FROM documents WHERE id = ? AND user_id = ?", [documentId, userId]).catch(() => [[]]);
        if (docs.length > 0) content = docs[0].content || "";
    }

    try {
        const response = await axios.post("http://127.0.0.1:5000/generate-flashcards", {
            content: content.substring(0, 3000),
            subject: subject,
            topic: topic,
            count: 5
        }, { timeout: 60000 });

        const cards = response.data.flashcards || [];

        // Save flashcards
        for (const card of cards) {
            const sql = "INSERT INTO flashcards (user_id, document_id, subject, topic, front_text, back_text) VALUES (?, ?, ?, ?, ?, ?)";
            await db.promise().query(sql, [userId, documentId || null, subject, topic, card.front, card.back]).catch(e => console.log(e));
        }

    } catch (error) {
        console.log(error.message);

        // Generate basic flashcards from knowledge base
        const { loadKnowledgeChunks, findRelevantChunks } = require("../retrieval");
        const chunks = loadKnowledgeChunks();
        const relevant = findRelevantChunks(`${subject} ${topic}`, chunks, 5);

        for (const chunk of relevant) {
            const sql = "INSERT INTO flashcards (user_id, document_id, subject, topic, front_text, back_text) VALUES (?, ?, ?, ?, ?, ?)";
            await db.promise().query(sql, [userId, documentId || null, chunk.subject, chunk.topic, `What is ${chunk.topic}?`, chunk.explanation || chunk.content.substring(0, 200)]).catch(e => console.log(e));
        }
    }

    res.redirect("/flashcards");
};

exports.reviewFlashcard = (req, res) => {
    const userId = req.session.userId;
    const cardId = parseInt(req.params.id);

    const sql = "UPDATE flashcards SET times_reviewed = times_reviewed + 1, last_reviewed = NOW() WHERE id = ? AND user_id = ?";
    db.query(sql, [cardId, userId], (err) => {
        if (err) console.log(err);
        res.json({ success: true });
    });
};

// Local summary generator fallback
function generateLocalSummary(content, title) {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const keyPoints = sentences.slice(0, 5).map(s => s.trim());
    const summary = sentences.slice(0, 10).join(". ").trim() + ".";

    return {
        summary: summary.length > 100 ? summary : `Summary of ${title}: ${content.substring(0, 500)}`,
        key_points: keyPoints.length > 0 ? keyPoints : ["Document content extracted for review"]
    };
}
