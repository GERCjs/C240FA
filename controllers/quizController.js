const db = require("../config/db");
const axios = require("axios");
const { sanitizeInput } = require("../middleware/validate");

// =====================
// SHOW ALL QUIZZES
// =====================
exports.showQuizzes = (req, res) => {
    const userId = req.session.userId;

    const quizSql = "SELECT * FROM quizzes WHERE user_id = ? ORDER BY created_at DESC";
    db.query(quizSql, [userId], (err, quizzes) => {
        if (err) {
            console.log("Error fetching quizzes:", err.message);
            quizzes = [];
        }

        const attemptSql = `
            SELECT qa.*, q.title as quiz_title
            FROM quiz_attempts qa
            JOIN quizzes q ON qa.quiz_id = q.id
            WHERE qa.user_id = ?
            ORDER BY qa.completed_at DESC
            LIMIT 10
        `;
        db.query(attemptSql, [userId], (err, attempts) => {
            if (err) {
                console.log("Error fetching attempts:", err.message);
                attempts = [];
            }

            res.render("quizzes", {
                quizzes: quizzes,
                attempts: attempts,
                error: null,
                success: req.query.success || null
            });
        });
    });
};

// =====================
// GENERATE QUIZ (AI or LOCAL)
// =====================
exports.generateQuiz = async (req, res) => {
    const userId = req.session.userId;
    const subject = sanitizeInput(req.body.subject);
    const topic = sanitizeInput(req.body.topic);
    const questionCount = Math.min(Math.max(parseInt(req.body.question_count) || 5, 3), 10);
    const quizType = req.body.quiz_type || "mcq";
    const difficulty = req.body.difficulty || "medium";

    if (!subject || !topic) {
        return res.redirect("/quizzes");
    }

    try {
        // Try AI-powered quiz generation via RAG Python API
        const response = await axios.post("http://127.0.0.1:5000/generate-quiz", {
            subject: subject,
            topic: topic,
            count: questionCount,
            type: quizType
        }, { timeout: 60000 });

        const questions = response.data.questions;

        if (!questions || questions.length === 0) {
            throw new Error("AI returned empty questions");
        }

        // Validate and normalize questions
        const validatedQuestions = validateQuestions(questions, quizType);
        const title = `${subject} - ${topic}`;

        const sql = "INSERT INTO quizzes (user_id, title, subject, topic, question_count, quiz_type, questions) VALUES (?, ?, ?, ?, ?, ?, ?)";
        db.query(sql, [userId, title, subject, topic, validatedQuestions.length, quizType, JSON.stringify(validatedQuestions)], (err, result) => {
            if (err) {
                console.log("Error saving quiz:", err.message);
                return res.redirect("/quizzes");
            }
            res.redirect(`/quizzes/${result.insertId}`);
        });

    } catch (error) {
        console.log("AI quiz generation failed, using local fallback:", error.message);

        // Generate quiz locally from knowledge base
        const questions = generateLocalQuiz(subject, topic, questionCount, quizType, difficulty);
        const title = `${subject} - ${topic}`;

        const sql = "INSERT INTO quizzes (user_id, title, subject, topic, question_count, quiz_type, questions) VALUES (?, ?, ?, ?, ?, ?, ?)";
        db.query(sql, [userId, title, subject, topic, questions.length, quizType, JSON.stringify(questions)], (err, result) => {
            if (err) {
                console.log("Error saving quiz:", err.message);
                return res.redirect("/quizzes");
            }
            res.redirect(`/quizzes/${result.insertId}`);
        });
    }
};

// =====================
// TAKE QUIZ (SHOW QUIZ PAGE)
// =====================
exports.showQuiz = (req, res) => {
    const userId = req.session.userId;
    const quizId = parseInt(req.params.id);

    if (!quizId || isNaN(quizId)) {
        return res.redirect("/quizzes");
    }

    const sql = "SELECT * FROM quizzes WHERE id = ? AND user_id = ?";
    db.query(sql, [quizId, userId], (err, results) => {
        if (err || results.length === 0) {
            return res.redirect("/quizzes");
        }

        const quiz = results[0];
        // mysql2 auto-parses JSON columns, so handle both cases
        if (typeof quiz.questions === "string") {
            try {
                quiz.questions = JSON.parse(quiz.questions);
            } catch (e) {
                quiz.questions = [];
            }
        }
        if (!Array.isArray(quiz.questions)) {
            quiz.questions = [];
        }

        // Calculate timer: 2 min per MCQ, 3 min per short answer
        let timerMinutes = 0;
        quiz.questions.forEach(q => {
            timerMinutes += q.type === "short_answer" ? 3 : 2;
        });

        res.render("quiz-take", {
            quiz: quiz,
            timerMinutes: timerMinutes
        });
    });
};

// =====================
// SUBMIT QUIZ & GRADE
// =====================
exports.submitQuiz = (req, res) => {
    const userId = req.session.userId;
    const quizId = parseInt(req.params.id);

    if (!quizId || isNaN(quizId)) {
        return res.redirect("/quizzes");
    }

    const sql = "SELECT * FROM quizzes WHERE id = ? AND user_id = ?";
    db.query(sql, [quizId, userId], (err, results) => {
        if (err || results.length === 0) {
            return res.redirect("/quizzes");
        }

        const quiz = results[0];
        let questions;
        // mysql2 auto-parses JSON columns, so handle both cases
        if (typeof quiz.questions === "string") {
            try {
                questions = JSON.parse(quiz.questions);
            } catch (e) {
                return res.redirect("/quizzes");
            }
        } else {
            questions = quiz.questions;
        }
        if (!Array.isArray(questions)) {
            return res.redirect("/quizzes");
        }

        const answers = req.body.answers || {};

        // Grade each question
        let score = 0;
        const total = questions.length;
        const graded = questions.map((q, index) => {
            const userAnswer = (answers[`q${index}`] || "").trim();
            let correct = false;

            if (q.type === "mcq") {
                // MCQ: compare selected letter with correct_answer letter
                correct = userAnswer.toUpperCase() === (q.correct_answer || "").toUpperCase();
            } else if (q.type === "true_false") {
                correct = userAnswer.toLowerCase() === (q.correct_answer || "").toLowerCase();
            } else {
                // Short answer: keyword matching (50% threshold)
                correct = gradeShortAnswer(userAnswer, q.correct_answer || "");
            }

            if (correct) score++;

            return {
                question: q.question,
                type: q.type,
                options: q.options || null,
                user_answer: userAnswer,
                correct_answer: q.correct_answer,
                explanation: q.explanation || "",
                is_correct: correct
            };
        });

        const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

        // Save attempt to database
        const attemptSql = "INSERT INTO quiz_attempts (user_id, quiz_id, answers, score, total, percentage) VALUES (?, ?, ?, ?, ?, ?)";
        db.query(attemptSql, [userId, quizId, JSON.stringify(graded), score, total, percentage], (err) => {
            if (err) console.log("Error saving attempt:", err.message);

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

// =====================
// SHOW RESULTS HISTORY
// =====================
exports.showResults = (req, res) => {
    const userId = req.session.userId;
    const quizId = parseInt(req.params.id);

    if (!quizId || isNaN(quizId)) {
        return res.redirect("/quizzes");
    }

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
            if (typeof a.answers === "string") {
                try {
                    a.answers = JSON.parse(a.answers);
                } catch (e) {
                    a.answers = [];
                }
            }
            if (!Array.isArray(a.answers)) {
                a.answers = [];
            }
        });

        res.render("quiz-results-history", {
            attempts: attempts,
            quizTitle: attempts[0].quiz_title,
            quizId: quizId
        });
    });
};

// =====================
// DELETE QUIZ
// =====================
exports.deleteQuiz = (req, res) => {
    const userId = req.session.userId;
    const quizId = parseInt(req.params.id);

    if (!quizId || isNaN(quizId)) {
        return res.redirect("/quizzes");
    }

    // Delete attempts first, then the quiz
    const deleteAttemptsSql = "DELETE FROM quiz_attempts WHERE quiz_id = ? AND user_id = ?";
    db.query(deleteAttemptsSql, [quizId, userId], (err) => {
        if (err) console.log("Error deleting attempts:", err.message);

        const deleteQuizSql = "DELETE FROM quizzes WHERE id = ? AND user_id = ?";
        db.query(deleteQuizSql, [quizId, userId], (err) => {
            if (err) {
                console.log("Error deleting quiz:", err.message);
            }
            res.redirect("/quizzes?success=Quiz deleted");
        });
    });
};

// =====================
// HELPER: Grade Short Answer
// =====================
function gradeShortAnswer(userAnswer, correctAnswer) {
    if (!userAnswer || !correctAnswer) return false;

    const userLower = userAnswer.toLowerCase().trim();
    const correctLower = correctAnswer.toLowerCase().trim();

    // Exact match
    if (userLower === correctLower) return true;

    // Keyword matching: at least 50% of keywords present
    const correctKeywords = correctLower.split(/[\s,;.]+/).filter(w => w.length > 2);
    const userWords = userLower.split(/[\s,;.]+/);

    if (correctKeywords.length === 0) return false;

    const matches = correctKeywords.filter(keyword =>
        userWords.some(word => word.includes(keyword) || keyword.includes(word))
    );

    return matches.length >= Math.ceil(correctKeywords.length * 0.5);
}

// =====================
// HELPER: Validate Questions
// =====================
function validateQuestions(questions, quizType) {
    return questions.map(q => {
        const validated = {
            type: q.type || quizType || "mcq",
            question: q.question || "Question not available",
            correct_answer: q.correct_answer || "",
            explanation: q.explanation || ""
        };

        if (validated.type === "mcq") {
            validated.options = Array.isArray(q.options) && q.options.length >= 2
                ? q.options
                : ["Option A", "Option B", "Option C", "Option D"];
            // Ensure correct_answer is a letter
            if (!["A", "B", "C", "D"].includes(validated.correct_answer.toUpperCase())) {
                validated.correct_answer = "A";
            }
        }

        return validated;
    });
}

// =====================
// LOCAL FALLBACK QUIZ GENERATOR (diverse questions)
// =====================
function generateLocalQuiz(subject, topic, count, type, difficulty) {
    let chunks = [];
    try {
        const { loadKnowledgeChunks, findRelevantChunks } = require("../retrieval");
        chunks = loadKnowledgeChunks();
        chunks = findRelevantChunks(`${subject} ${topic}`, chunks, 10);
    } catch (err) {
        console.log("Knowledge base not available:", err.message);
    }

    const questions = [];
    const usedQuestions = new Set(); // Track generated questions to avoid duplicates

    // Question template generators - each produces a unique question
    const mcqGenerators = [
        // Type 1: Definition question
        (chunk) => ({
            type: "mcq",
            question: `What is the correct definition of "${chunk.topic}" in ${chunk.subject || subject}?`,
            options: shuffleWithCorrect(
                chunk.explanation ? chunk.explanation.substring(0, 80) : `A concept in ${subject}`,
                [
                    "A method for managing computer hardware resources",
                    "A networking protocol used for internet communication",
                    "A design pattern for graphical user interfaces"
                ]
            ),
            correct_answer: "A",
            explanation: chunk.explanation || `${chunk.topic} is a key concept in ${subject}.`
        }),
        // Type 2: Example-based question
        (chunk) => {
            const example = extractField(chunk.content, "Example");
            return {
                type: "mcq",
                question: `Which example correctly demonstrates "${chunk.topic}"?`,
                options: shuffleWithCorrect(
                    example || `Using ${chunk.topic} in a practical scenario`,
                    [
                        "Running a hardware diagnostic test",
                        "Configuring a network switch port",
                        "Installing an operating system update"
                    ]
                ),
                correct_answer: "A",
                explanation: example ? `Example: ${example}` : `${chunk.topic} is applied in ${subject}.`
            };
        },
        // Type 3: Common mistake question
        (chunk) => {
            const mistake = extractField(chunk.content, "Common Mistake");
            return {
                type: "mcq",
                question: `What is a common mistake when working with "${chunk.topic}"?`,
                options: shuffleWithCorrect(
                    mistake || `Misunderstanding the core purpose of ${chunk.topic}`,
                    [
                        "Using the correct syntax at all times",
                        "Reading documentation before starting",
                        "Testing code after every change"
                    ]
                ),
                correct_answer: "A",
                explanation: mistake ? `Common mistake: ${mistake}` : `Understanding pitfalls helps avoid errors.`
            };
        },
        // Type 4: Purpose/usage question
        (chunk) => ({
            type: "mcq",
            question: `What is the primary purpose of ${chunk.topic} in ${chunk.subject || subject}?`,
            options: shuffleWithCorrect(
                chunk.explanation ? chunk.explanation.split(".")[0] : `To implement key functionality`,
                [
                    "To manage physical hardware connections",
                    "To encrypt all user passwords automatically",
                    "To replace manual documentation processes"
                ]
            ),
            correct_answer: "A",
            explanation: chunk.explanation || `${chunk.topic} serves an important role in ${subject}.`
        }),
        // Type 5: True characteristic question
        (chunk) => ({
            type: "mcq",
            question: `Which statement about "${chunk.topic}" is TRUE?`,
            options: shuffleWithCorrect(
                chunk.explanation ? chunk.explanation.substring(0, 90) : `It is a core concept in ${subject}`,
                [
                    `It is only used in advanced enterprise systems`,
                    `It was deprecated and is no longer recommended`,
                    `It requires expensive specialized hardware to use`
                ]
            ),
            correct_answer: "A",
            explanation: chunk.explanation || `This is a fundamental concept in ${subject}.`
        }),
        // Type 6: Keyword relationship question
        (chunk) => ({
            type: "mcq",
            question: `Which keywords are most closely related to "${chunk.topic}"?`,
            options: shuffleWithCorrect(
                (chunk.keywords && chunk.keywords.length > 0) ? chunk.keywords.slice(0, 3).join(", ") : `${topic}, ${subject}`,
                [
                    "router, firewall, packet",
                    "RAM, processor, motherboard",
                    "pixel, resolution, display"
                ]
            ),
            correct_answer: "A",
            explanation: `${chunk.topic} relates to: ${(chunk.keywords && chunk.keywords.length > 0) ? chunk.keywords.join(", ") : topic}`
        })
    ];

    const shortAnswerGenerators = [
        (chunk) => ({
            type: "short_answer",
            question: `Explain the concept of "${chunk.topic}" in your own words.`,
            correct_answer: chunk.explanation || `${chunk.topic} is a concept in ${subject}.`,
            explanation: chunk.explanation || `Understanding ${chunk.topic} is essential.`
        }),
        (chunk) => {
            const example = extractField(chunk.content, "Example");
            return {
                type: "short_answer",
                question: `Give an example of how "${chunk.topic}" is used in practice.`,
                correct_answer: example || `${chunk.topic} can be applied in real-world ${subject} scenarios.`,
                explanation: example ? `Example: ${example}` : `Practical application is key.`
            };
        },
        (chunk) => {
            const mistake = extractField(chunk.content, "Common Mistake");
            return {
                type: "short_answer",
                question: `What common mistake should you avoid when working with "${chunk.topic}"?`,
                correct_answer: mistake || `A common mistake is misunderstanding the purpose of ${chunk.topic}.`,
                explanation: mistake || `Being aware of common pitfalls helps you learn better.`
            };
        },
        (chunk) => ({
            type: "short_answer",
            question: `Why is "${chunk.topic}" important for students learning ${chunk.subject || subject}?`,
            correct_answer: chunk.explanation || `${chunk.topic} is foundational to understanding ${subject}.`,
            explanation: `Understanding fundamentals builds stronger knowledge.`
        }),
        (chunk) => ({
            type: "short_answer",
            question: `How does "${chunk.topic}" relate to other concepts in ${chunk.subject || subject}?`,
            correct_answer: `${chunk.topic} connects to ${(chunk.keywords && chunk.keywords.length > 0) ? chunk.keywords.slice(0, 3).join(", ") : topic} in ${subject}.`,
            explanation: `Concepts in ${subject} build on each other.`
        })
    ];

    const trueFalseGenerators = [
        (chunk) => ({
            type: "mcq",
            question: `True or False: ${chunk.explanation ? chunk.explanation.split(".")[0] + "." : `${chunk.topic} is a concept in ${subject}.`}`,
            options: ["True", "False"],
            correct_answer: "A",
            explanation: chunk.explanation || `This statement about ${chunk.topic} is correct.`
        }),
        (chunk) => {
            const mistake = extractField(chunk.content, "Common Mistake");
            return {
                type: "mcq",
                question: `True or False: ${mistake || `${chunk.topic} requires no prior knowledge to understand.`}`,
                options: ["True", "False"],
                correct_answer: mistake ? "A" : "B",
                explanation: mistake || `Most concepts build on foundational knowledge.`
            };
        }
    ];

    // Generate questions from chunks with variety
    if (chunks.length > 0) {
        let generatorIndex = 0;

        for (let i = 0; i < chunks.length && questions.length < count; i++) {
            const chunk = chunks[i];

            if (type === "mcq") {
                const gen = mcqGenerators[generatorIndex % mcqGenerators.length];
                const q = gen(chunk);
                const key = q.question.substring(0, 50);
                if (!usedQuestions.has(key)) {
                    usedQuestions.add(key);
                    questions.push(q);
                    generatorIndex++;
                }
            } else if (type === "short_answer") {
                const gen = shortAnswerGenerators[generatorIndex % shortAnswerGenerators.length];
                const q = gen(chunk);
                const key = q.question.substring(0, 50);
                if (!usedQuestions.has(key)) {
                    usedQuestions.add(key);
                    questions.push(q);
                    generatorIndex++;
                }
            } else if (type === "mixed") {
                // Alternate between MCQ, short answer, and true/false
                const mixType = generatorIndex % 3;
                let q;
                if (mixType === 0) {
                    const gen = mcqGenerators[Math.floor(generatorIndex / 3) % mcqGenerators.length];
                    q = gen(chunk);
                } else if (mixType === 1) {
                    const gen = shortAnswerGenerators[Math.floor(generatorIndex / 3) % shortAnswerGenerators.length];
                    q = gen(chunk);
                } else {
                    const gen = trueFalseGenerators[Math.floor(generatorIndex / 3) % trueFalseGenerators.length];
                    q = gen(chunk);
                }
                const key = q.question.substring(0, 50);
                if (!usedQuestions.has(key)) {
                    usedQuestions.add(key);
                    questions.push(q);
                }
                generatorIndex++;
            }
        }

        // If we still need more, loop through chunks again with different generators
        let pass = 1;
        while (questions.length < count && pass < 3) {
            for (let i = 0; i < chunks.length && questions.length < count; i++) {
                const chunk = chunks[i];
                const genIdx = (generatorIndex + pass * 2) % mcqGenerators.length;

                if (type === "short_answer") {
                    const gen = shortAnswerGenerators[genIdx % shortAnswerGenerators.length];
                    const q = gen(chunk);
                    const key = q.question.substring(0, 50);
                    if (!usedQuestions.has(key)) {
                        usedQuestions.add(key);
                        questions.push(q);
                    }
                } else {
                    const gen = mcqGenerators[genIdx];
                    const q = gen(chunk);
                    const key = q.question.substring(0, 50);
                    if (!usedQuestions.has(key)) {
                        usedQuestions.add(key);
                        questions.push(q);
                    }
                }
                generatorIndex++;
            }
            pass++;
        }
    }

    // Final fallback if still not enough questions
    while (questions.length < count) {
        const idx = questions.length;
        if (type === "short_answer") {
            questions.push({
                type: "short_answer",
                question: `Describe how ${topic} is applied in ${subject}. (Question ${idx + 1})`,
                correct_answer: `${topic} is applied in ${subject} through practical implementation and understanding of core principles.`,
                explanation: `This tests your ability to articulate concepts in ${subject}.`
            });
        } else {
            questions.push({
                type: "mcq",
                question: `In ${subject}, which of the following best describes an aspect of ${topic}? (Question ${idx + 1})`,
                options: [
                    `A key principle used in ${subject} for ${topic}`,
                    "A deprecated hardware standard",
                    "An unrelated networking concept",
                    "None of the above"
                ],
                correct_answer: "A",
                explanation: `${topic} is a fundamental part of ${subject}.`
            });
        }
    }

    // Shuffle final questions for variety
    return shuffleArray(questions).slice(0, count);
}

// Helper: Extract a specific field from chunk content
function extractField(content, fieldName) {
    const regex = new RegExp(`^${fieldName}:\\s*(.+)$`, "m");
    const match = content.match(regex);
    return match ? match[1].trim() : null;
}

// Helper: Shuffle array (Fisher-Yates)
function shuffleArray(arr) {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Helper: Create options array with correct answer at position A
function shuffleWithCorrect(correctOption, distractors) {
    // Randomly pick 3 distractors and shuffle them
    const picked = shuffleArray(distractors).slice(0, 3);
    return [correctOption, ...picked];
}
