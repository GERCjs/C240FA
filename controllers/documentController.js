const db = require("../config/db");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

exports.showDocuments = (req, res) => {
    const userId = req.session.userId;

    const sql = "SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC";
    db.query(sql, [userId], (err, documents) => {
        if (err) {
            console.log(err);
            documents = [];
        }

        res.render("documents", {
            documents: documents,
            error: null,
            success: null
        });
    });
};

exports.uploadDocument = async (req, res) => {
    const userId = req.session.userId;

    if (!req.file) {
        return res.render("documents", {
            documents: [],
            error: "Please select a valid file (PDF, TXT, MD, or DOCX).",
            success: null
        });
    }

    const file = req.file;
    const ext = path.extname(file.originalname).toLowerCase();

    try {
        let content = "";

        // Extract content based on file type
        if (ext === ".txt" || ext === ".md") {
            content = fs.readFileSync(file.path, "utf8");
        } else if (ext === ".pdf") {
            const pdfParse = require("pdf-parse");
            const dataBuffer = fs.readFileSync(file.path);
            const pdfData = await pdfParse(dataBuffer);
            content = pdfData.text;
        } else if (ext === ".docx") {
            // Basic text extraction for docx
            content = "[DOCX content - requires indexing]";
        }

        // Save to database
        const sql = "INSERT INTO documents (user_id, filename, original_name, file_type, file_size, content) VALUES (?, ?, ?, ?, ?, ?)";
        db.query(sql, [userId, file.filename, file.originalname, ext, file.size, content], async (err, result) => {
            if (err) {
                console.log(err);
                return redirectWithDocuments(req, res, "Failed to save document.", null);
            }

            const docId = result.insertId;

            // Try to index document in RAG pipeline
            try {
                await axios.post("http://127.0.0.1:5000/index-document", {
                    document_id: docId,
                    content: content,
                    filename: file.originalname
                }, { timeout: 30000 });

                // Update indexed status
                const updateSql = "UPDATE documents SET indexed = 1 WHERE id = ?";
                db.query(updateSql, [docId]);

            } catch (indexError) {
                console.log("Indexing skipped:", indexError.message);
            }

            redirectWithDocuments(req, res, null, `"${file.originalname}" uploaded successfully.`);
        });

    } catch (error) {
        console.log(error);
        redirectWithDocuments(req, res, "Failed to process the document.", null);
    }
};

exports.deleteDocument = (req, res) => {
    const userId = req.session.userId;
    const docId = parseInt(req.params.id);

    // Get filename to delete physical file
    const getSql = "SELECT filename FROM documents WHERE id = ? AND user_id = ?";
    db.query(getSql, [docId, userId], (err, results) => {
        if (err || results.length === 0) {
            return res.redirect("/documents");
        }

        const filename = results[0].filename;
        const filePath = path.join(__dirname, "..", "uploads", filename);

        // Delete from database
        const deleteSql = "DELETE FROM documents WHERE id = ? AND user_id = ?";
        db.query(deleteSql, [docId, userId], (err) => {
            if (err) console.log(err);

            // Delete physical file
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }

            res.redirect("/documents");
        });
    });
};

function redirectWithDocuments(req, res, error, success) {
    const userId = req.session.userId;
    const sql = "SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC";
    db.query(sql, [userId], (err, documents) => {
        if (err) documents = [];
        res.render("documents", { documents, error, success });
    });
}
