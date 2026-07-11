const db = require("../config/db");
const axios = require("axios");
const { sanitizeInput } = require("../middleware/validate");

// Flashcards
exports.showFlashcards = (req, res) => {
    const userId = req.session.userId;

    const sql = "SELECT * FROM flashcards WHERE user_id = ? ORDER BY created_at DESC";
    db.query(sql, [userId], (err, flashcards) => {
        if (err) {
            console.log(err);
            flashcards = [];
        }

        res.render("flashcards", {
            flashcards: flashcards,
            documents: [],
            error: null
        });
    });
};

exports.generateFlashcards = async (req, res) => {
    const userId = req.session.userId;
    const subject = sanitizeInput(req.body.subject) || "General";
    const topic = sanitizeInput(req.body.topic) || "Study Notes";
    const count = Math.min(parseInt(req.body.count) || 5, 15);

    try {
        const response = await axios.post("http://127.0.0.1:5000/generate-flashcards", {
            content: "",
            subject: subject,
            topic: topic,
            count: count
        }, { timeout: 60000 });

        const cards = response.data.flashcards || [];

        // Save flashcards - ensure each is unique
        const savedFronts = new Set();
        for (const card of cards) {
            if (savedFronts.has(card.front)) continue;
            savedFronts.add(card.front);
            const sql = "INSERT INTO flashcards (user_id, subject, topic, front_text, back_text) VALUES (?, ?, ?, ?, ?)";
            await new Promise((resolve) => {
                db.query(sql, [userId, subject, topic, card.front, card.back], (err) => {
                    if (err) console.log("Flashcard save error:", err.message);
                    resolve();
                });
            });
        }

    } catch (error) {
        console.log("AI flashcard generation failed, using local:", error.message);

        // Generate diverse flashcards from knowledge base
        let chunks = [];
        try {
            const { loadKnowledgeChunks, findRelevantChunks } = require("../retrieval");
            const allChunks = loadKnowledgeChunks();
            chunks = findRelevantChunks(`${subject} ${topic}`, allChunks, count + 5);
        } catch (e) {
            console.log("Knowledge base error:", e.message);
        }

        // Generate diverse flashcard types from each chunk
        const cardGenerators = [
            (chunk) => ({
                front: `What is ${chunk.topic}?`,
                back: chunk.explanation || `A concept in ${chunk.subject || subject}.`
            }),
            (chunk) => {
                const example = extractFlashcardField(chunk.content, "Example");
                return {
                    front: `Give an example of ${chunk.topic}.`,
                    back: example || `${chunk.topic} is used in practical ${chunk.subject || subject} scenarios.`
                };
            },
            (chunk) => {
                const mistake = extractFlashcardField(chunk.content, "Common Mistake");
                return {
                    front: `What mistake should you avoid with ${chunk.topic}?`,
                    back: mistake || `Misunderstanding the core concept of ${chunk.topic}.`
                };
            },
            (chunk) => ({
                front: `Why is ${chunk.topic} important in ${chunk.subject || subject}?`,
                back: chunk.explanation ? `Because: ${chunk.explanation}` : `It is fundamental to understanding ${subject}.`
            }),
            (chunk) => ({
                front: `What keywords relate to ${chunk.topic}?`,
                back: chunk.keywords ? chunk.keywords.join(", ") : `${topic}, ${subject}`
            })
        ];

        const savedFronts = new Set();
        let genIdx = 0;

        for (const chunk of chunks) {
            if (savedFronts.size >= count) break;

            const gen = cardGenerators[genIdx % cardGenerators.length];
            const card = gen(chunk);

            if (!savedFronts.has(card.front)) {
                savedFronts.add(card.front);
                const sql = "INSERT INTO flashcards (user_id, subject, topic, front_text, back_text) VALUES (?, ?, ?, ?, ?)";
                await new Promise((resolve) => {
                    db.query(sql, [userId, chunk.subject || subject, chunk.topic || topic, card.front, card.back], (err) => {
                        if (err) console.log("Flashcard save error:", err.message);
                        resolve();
                    });
                });
            }
            genIdx++;
        }
    }

    res.redirect("/flashcards");
};

function extractFlashcardField(content, fieldName) {
    const regex = new RegExp(`^${fieldName}:\\s*(.+)$`, "m");
    const match = content.match(regex);
    return match ? match[1].trim() : null;
}

exports.reviewFlashcard = (req, res) => {
    const userId = req.session.userId;
    const cardId = parseInt(req.params.id);

    const sql = "UPDATE flashcards SET times_reviewed = times_reviewed + 1, last_reviewed = NOW() WHERE id = ? AND user_id = ?";
    db.query(sql, [cardId, userId], (err) => {
        if (err) console.log(err);
        res.json({ success: true });
    });
};

exports.deleteFlashcard = (req, res) => {
    const userId = req.session.userId;
    const cardId = parseInt(req.params.id);

    const sql = "DELETE FROM flashcards WHERE id = ? AND user_id = ?";
    db.query(sql, [cardId, userId], (err) => {
        if (err) console.log(err);
        res.redirect("/flashcards");
    });
};
