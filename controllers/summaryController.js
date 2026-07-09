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
        const rawContent = doc.content || "";

        if (!rawContent || rawContent.length < 50) {
            return res.redirect("/summaries");
        }

        // Clean content - remove meaningless headers/footers/page numbers
        const cleanedContent = cleanDocumentContent(rawContent);

        if (cleanedContent.length < 30) {
            // If cleaning removed everything, use raw content
            return handleSummaryGeneration(userId, documentId, doc, rawContent, res);
        }

        return handleSummaryGeneration(userId, documentId, doc, cleanedContent, res);
    });
};

async function handleSummaryGeneration(userId, documentId, doc, content, res) {
    try {
        const response = await axios.post("http://127.0.0.1:5000/generate-summary", {
            content: content.substring(0, 5000),
            title: doc.original_name
        }, { timeout: 60000 });

        const summaryText = response.data.summary;
        const keyPoints = response.data.key_points || [];

        // Save summary
        const saveSql = "INSERT INTO study_summaries (user_id, document_id, title, summary_text, key_points) VALUES (?, ?, ?, ?, ?)";
        db.query(saveSql, [userId, documentId, `Summary: ${doc.original_name}`, summaryText, JSON.stringify(keyPoints)], (err) => {
            if (err) console.log("Save summary error:", err.message);
            res.redirect("/summaries");
        });

    } catch (error) {
        console.log("AI summary failed, using local:", error.message);

        // Generate summary locally from cleaned content
        const basicSummary = generateLocalSummary(content, doc.original_name);
        const saveSql = "INSERT INTO study_summaries (user_id, document_id, title, summary_text, key_points) VALUES (?, ?, ?, ?, ?)";
        db.query(saveSql, [userId, documentId, `Summary: ${doc.original_name}`, basicSummary.summary, JSON.stringify(basicSummary.key_points)], (err) => {
            if (err) console.log("Save summary error:", err.message);
            res.redirect("/summaries");
        });
    }
}

// Clean document content - removes headers, footers, page numbers, and other noise
function cleanDocumentContent(content) {
    const lines = content.split(/\r?\n/);

    const cleaned = lines.filter(line => {
        const trimmed = line.trim();
        // Skip empty lines
        if (trimmed.length === 0) return false;
        // Skip very short lines (likely page numbers, headers)
        if (trimmed.length < 15) return false;
        // Skip pure numbers (page numbers)
        if (/^\d+$/.test(trimmed)) return false;
        // Skip common header/footer patterns
        if (/^(page\s*\d|footer|header|copyright|all rights reserved|\d+\s*of\s*\d+)/i.test(trimmed)) return false;
        // Skip formatting lines
        if (/^[-=_*#]{3,}$/.test(trimmed)) return false;
        // Skip date-only lines
        if (/^\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}$/.test(trimmed)) return false;
        return true;
    });

    return cleaned.join("\n");
}

exports.showSummary = (req, res) => {
    const userId = req.session.userId;
    const summaryId = parseInt(req.params.id);

    if (!summaryId || isNaN(summaryId)) {
        return res.redirect("/summaries");
    }

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

        // Handle key_points - mysql2 may auto-parse JSON columns
        if (typeof summary.key_points === "string") {
            try {
                summary.key_points = JSON.parse(summary.key_points);
            } catch (e) {
                summary.key_points = [];
            }
        }
        if (!Array.isArray(summary.key_points)) {
            summary.key_points = [];
        }

        res.render("summary-detail", { summary });
    });
};

exports.exportSummary = (req, res) => {
    const userId = req.session.userId;
    const summaryId = parseInt(req.params.id);

    if (!summaryId || isNaN(summaryId)) {
        return res.redirect("/summaries");
    }

    const sql = "SELECT * FROM study_summaries WHERE id = ? AND user_id = ?";
    db.query(sql, [summaryId, userId], (err, results) => {
        if (err || results.length === 0) {
            return res.redirect("/summaries");
        }

        const summary = results[0];

        // Handle key_points - mysql2 may auto-parse JSON columns
        let keyPoints = summary.key_points;
        if (typeof keyPoints === "string") {
            try {
                keyPoints = JSON.parse(keyPoints);
            } catch (e) {
                keyPoints = [];
            }
        }
        if (!Array.isArray(keyPoints)) {
            keyPoints = [];
        }

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

        const safeFilename = (summary.title || "summary").replace(/[^a-zA-Z0-9 ]/g, "_").substring(0, 50);
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${safeFilename}.txt"`);
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
    const documentId = parseInt(req.body.document_id) || null;
    const subject = sanitizeInput(req.body.subject) || "General";
    const topic = sanitizeInput(req.body.topic) || "Study Notes";
    const count = Math.min(parseInt(req.body.count) || 5, 15);

    let content = "";

    if (documentId) {
        const docSql = "SELECT content FROM documents WHERE id = ? AND user_id = ?";
        const docs = await new Promise((resolve) => {
            db.query(docSql, [documentId, userId], (err, results) => {
                resolve(err ? [] : results);
            });
        });
        if (docs.length > 0) content = docs[0].content || "";
    }

    try {
        const response = await axios.post("http://127.0.0.1:5000/generate-flashcards", {
            content: content.substring(0, 3000),
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
            const sql = "INSERT INTO flashcards (user_id, document_id, subject, topic, front_text, back_text) VALUES (?, ?, ?, ?, ?, ?)";
            await new Promise((resolve) => {
                db.query(sql, [userId, documentId, subject, topic, card.front, card.back], (err) => {
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
                const sql = "INSERT INTO flashcards (user_id, document_id, subject, topic, front_text, back_text) VALUES (?, ?, ?, ?, ?, ?)";
                await new Promise((resolve) => {
                    db.query(sql, [userId, documentId, chunk.subject || subject, chunk.topic || topic, card.front, card.back], (err) => {
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

// Local summary generator fallback - extracts meaningful content
function generateLocalSummary(content, title) {
    // Clean up the content - remove headers, footers, page numbers, and short lines
    const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

    // Filter out meaningless lines (headers, footers, page numbers, short fragments)
    const meaningfulLines = lines.filter(line => {
        // Skip very short lines (likely headers/footers/page numbers)
        if (line.length < 20) return false;
        // Skip lines that are just numbers (page numbers)
        if (/^\d+$/.test(line)) return false;
        // Skip common header/footer patterns
        if (/^(page|footer|header|copyright|all rights reserved)/i.test(line)) return false;
        if (/^\d+\s*\/\s*\d+$/.test(line)) return false; // "1 / 10" page indicators
        // Skip lines that are just formatting
        if (/^[-=_*]{3,}$/.test(line)) return false;
        return true;
    });

    // Extract sentences from meaningful content
    const fullText = meaningfulLines.join(" ");
    const sentences = fullText
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => s.length > 30 && s.length < 500);

    // Group sentences by topic/concept for key points
    const keyPoints = [];
    const seen = new Set();

    for (const sentence of sentences) {
        // Normalize for dedup
        const normalized = sentence.toLowerCase().substring(0, 40);
        if (seen.has(normalized)) continue;
        seen.add(normalized);

        // Pick sentences that explain concepts (contain keywords like "is", "means", "refers to", "used for")
        if (/\b(is|are|means|refers to|used for|defined as|allows|enables|helps|provides|involves)\b/i.test(sentence)) {
            keyPoints.push(sentence.substring(0, 150));
            if (keyPoints.length >= 8) break;
        }
    }

    // If we didn't find concept sentences, take the most substantive sentences
    if (keyPoints.length < 3) {
        const substantive = sentences
            .filter(s => s.length > 50)
            .sort((a, b) => b.length - a.length)
            .slice(0, 8);
        for (const s of substantive) {
            if (keyPoints.length >= 8) break;
            const normalized = s.toLowerCase().substring(0, 40);
            if (!seen.has(normalized)) {
                seen.add(normalized);
                keyPoints.push(s.substring(0, 150));
            }
        }
    }

    // Build summary paragraph from the best content
    const summaryParts = [];
    const usedForSummary = new Set();

    // First, try to get an overview sentence
    for (const sentence of sentences) {
        if (summaryParts.length >= 5) break;
        const norm = sentence.toLowerCase().substring(0, 40);
        if (usedForSummary.has(norm)) continue;

        // Prioritize sentences that describe the document topic
        if (sentence.length > 40) {
            usedForSummary.add(norm);
            summaryParts.push(sentence);
        }
    }

    const summary = summaryParts.length > 0
        ? summaryParts.join(". ").trim() + "."
        : `This document covers concepts related to ${title}. ` + (keyPoints.length > 0 ? keyPoints.slice(0, 3).join(". ") + "." : "Review the document for detailed information.");

    return {
        summary: summary.length > 50 ? summary : `Summary of ${title}: The document contains study material covering key concepts and explanations relevant to the topic.`,
        key_points: keyPoints.length > 0 ? keyPoints : [
            "Document contains study material",
            "Review the content for detailed concepts",
            "Key information has been extracted for study"
        ]
    };
}
