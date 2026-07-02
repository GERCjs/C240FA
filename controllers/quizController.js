const db = require("../config/db");
const axios = require("axios");
const { sanitizeInput } = require("../middleware/validate");

exports.showQuizzes = (req, res) => {
    const userId = req.session.userId;

    const quizSql = "SELECT * FROM quizzes WHERE user_id = ? ORDER BY created_at DESC";
    db.query(quizSql, [userId], (err, quizzes) => {
        if (err) {
            console.log(err);
            quizzes = [];
        }

        // Get quiz attempts for performance tracking
        const attemptSql = `
            SELECT qa.*, q.title as quiz_title
            FROM quiz_attempts qa
            JOIN quizzes q ON qa.quiz_id = q.id
            WHERE qa.user_id = ?
            ORDER BY qa.completed_at DESC
            LIMIT 10
        `;
        db.query(attemptSql, [userId], (err, attempts) => {
            if (err) attempts = [];

            res.render("quizzes", {
                quizzes: quizzes,
                attempts: attempts,
                error: null
            });
        });
    });
};

exports.generateQuiz = async (req, res) => {
    const userId = req.session.userId;
    const subject = sanitizeInput(req.body.subject);
    const topic = sanitizeInput(req.body.topic);
    const questionCount = parseInt(req.body.question_count) || 5;
    const quizType = req.body.quiz_type || "mcq";

    if (!subject || !topic) {
        return res.redirect("/quizzes");
    }

    try {
        const response = await axios.post("http://127.0.0.1:5000/generate-quiz", {
            subject: subject,
            topic: topic,
            count: Math.min(questionCount, 10),
            type: quizType
        }, { timeout: 60000 });

        const questions = response.data.questions;
        const title = `${subject} - ${topic} Quiz`;

        // Save quiz
        const sql = "INSERT INTO quizzes (user_id, title, subject, topic, question_count, quiz_type, questions) VALUES (?, ?, ?, ?, ?, ?, ?)";
        db.query(sql, [userId, title, subject, topic, questions.length, quizType, JSON.stringify(questions)], (err, result) => {
            if (err) {
                console.log(err);
                return res.redirect("/quizzes");
            }
            res.redirect(`/quizzes/${result.insertId}`);
        });

    } catch (error) {
        console.log(error.message);

        // Generate basic quiz locally as fallback
        const questions = generateLocalQuiz(subject, topic, questionCount, quizType);
        const title = `${subject} - ${topic} Quiz`;

        const sql = "INSERT INTO quizzes (user_id, title, subject, topic, question_count, quiz_type, questions) VALUES (?, ?, ?, ?, ?, ?, ?)";
        db.query(sql, [userId, title, subject, topic, questions.length, quizType, JSON.stringify(questions)], (err, result) => {
            if (err) {
                console.log(err);
                return res.redirect("/quizzes");
            }
            res.redirect(`/quizzes/${result.insertId}`);
        });
    }
};

exports.showQuiz = (req, res) => {
    const userId = req.session.userId;
    const quizId = parseInt(req.params.id);

    const sql = "SELECT * FROM quizzes WHERE id = ? AND user_id = ?";
    db.query(sql, [quizId, userId], (err, results) => {
        if (err || results.length === 0) {
            return res.redirect("/quizzes");
        }

        const quiz = results[0];
        quiz.questions = JSON.parse(quiz.questions);

        res.render("quiz-take", {
            quiz: quiz
        });
    });
};

exports.submitQuiz = (req, res) => {
    const userId = req.session.userId;
    const quizId = parseInt(req.params.id);

    const sql = "SELECT * FROM quizzes WHERE id = ? AND user_id = ?";
    db.query(sql, [quizId, userId], (err, results) => {
        if (err || results.length === 0) {
            return res.redirect("/quizzes");
        }

        const quiz = results[0];
        const questions = JSON.parse(quiz.questions);
        const answers = req.body.answers || {};

        // Grade the quiz
        let score = 0;
        const total = questions.length;
        const graded = questions.map((q, index) => {
            const userAnswer = answers[`q${index}`] || "";
            let correct = false;

            if (q.type === "mcq") {
                correct = userAnswer === q.correct_answer;
            } else {
                // Short answer - simple keyword matching
                const keywords = (q.correct_answer || "").toLowerCase().split(/\s+/);
                const userWords = userAnswer.toLowerCase().split(/\s+/);
                const matches = keywords.filter(k => userWords.includes(k));
                correct = matches.length >= Math.ceil(keywords.length * 0.5);
            }

            if (correct) score++;

            return {
                question: q.question,
                user_answer: userAnswer,
                correct_answer: q.correct_answer,
                explanation: q.explanation || "",
                is_correct: correct
            };
        });

        const percentage = Math.round((score / total) * 100);

        // Save attempt
        const attemptSql = "INSERT INTO quiz_attempts (user_id, quiz_id, answers, score, total, percentage) VALUES (?, ?, ?, ?, ?, ?)";
        db.query(attemptSql, [userId, quizId, JSON.stringify(graded), score, total, percentage], (err, result) => {
            if (err) console.log(err);

            res.render("quiz-results", {
                quiz: quiz,
                graded: graded,
                score: score,
                total: total,
                percentage: percentage
            });
        });
    });
};

exports.showResults = (req, res) => {
    const userId = req.session.userId;
    const quizId = parseInt(req.params.id);

    const sql = `
        SELECT qa.*, q.title as quiz_title
        FROM quiz_attempts qa
        JOIN quizzes q ON qa.quiz_id = q.id
        WHERE qa.quiz_id = ? AND qa.user_id = ?
        ORDER BY qa.completed_at DESC
    `;
    db.query(sql, [quizId, userId], (err, attempts) => {
        if (err || attempts.length === 0) {
            return res.redirect("/quizzes");
        }

        attempts.forEach(a => {
            a.answers = JSON.parse(a.answers);
        });

        res.render("quiz-results-history", {
            attempts: attempts,
            quizTitle: attempts[0].quiz_title
        });
    });
};

// Local fallback quiz generator using knowledge base content
function generateLocalQuiz(subject, topic, count, type) {
    const { loadKnowledgeChunks, findRelevantChunks } = require("../retrieval");
    const chunks = loadKnowledgeChunks();
    const relevant = findRelevantChunks(`${subject} ${topic}`, chunks, 3);

    const questions = [];

    if (relevant.length > 0) {
        relevant.forEach((chunk, i) => {
            if (questions.length >= count) return;

            if (type === "mcq" || type === "mixed") {
                questions.push({
                    type: "mcq",
                    question: `What is the main concept of "${chunk.topic}"?`,
                    options: [
                        chunk.explanation || "Correct answer",
                        "An unrelated database concept",
                        "A networking protocol",
                        "A hardware component"
                    ],
                    correct_answer: "A",
                    explanation: chunk.explanation || `This relates to ${chunk.topic}.`
                });
            }

            if ((type === "short_answer" || type === "mixed") && questions.length < count) {
                questions.push({
                    type: "short_answer",
                    question: `Explain in your own words: ${chunk.topic}`,
                    correct_answer: chunk.explanation || chunk.topic,
                    explanation: chunk.explanation || `Key concept: ${chunk.topic}`
                });
            }
        });
    }

    // Fill remaining with generic questions
    while (questions.length < count) {
        questions.push({
            type: type === "short_answer" ? "short_answer" : "mcq",
            question: `What do you know about ${topic} in ${subject}?`,
            options: type !== "short_answer" ? ["A concept in " + subject, "Not related", "Unknown term", "None of the above"] : undefined,
            correct_answer: type !== "short_answer" ? "A" : `${topic} is a concept in ${subject}`,
            explanation: `${topic} is a fundamental concept in ${subject}.`
        });
    }

    return questions.slice(0, count);
}
