/**
 * n8n Integration Routes
 * 
 * This module provides REST API endpoints that bridge the Express backend
 * with n8n webhook workflows. Each route validates the user session,
 * builds the request payload, and forwards it to the appropriate n8n webhook.
 * 
 * Environment Variables Required:
 *   N8N_WEBHOOK_URL - Base URL of n8n webhooks (default: http://localhost:5678/webhook)
 *   N8N_API_KEY     - API key for authenticating with n8n webhooks
 */

const express = require("express");
const router = express.Router();
const axios = require("axios");
const { requireAuth } = require("../middleware/auth");
const { sanitizeInput, sanitizePrompt } = require("../middleware/validate");

// n8n configuration
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || "http://localhost:5678/webhook";
const N8N_API_KEY = process.env.N8N_API_KEY || "study-buddy-n8n-key";
const N8N_TIMEOUT = 120000; // 2 minutes

/**
 * Helper: Call n8n webhook with authentication and error handling
 */
async function callN8nWebhook(endpoint, data, method = "POST") {
    const url = `${N8N_WEBHOOK_URL}/${endpoint}`;

    const config = {
        method,
        url,
        headers: {
            "Content-Type": "application/json",
            "X-API-Key": N8N_API_KEY
        },
        timeout: N8N_TIMEOUT
    };

    if (method === "POST") {
        config.data = data;
    } else {
        config.params = data;
    }

    const response = await axios(config);
    return response.data;
}

// =====================================================
// API 1: Document Upload & Indexing
// POST /api/upload-document
// =====================================================
router.post("/upload-document", requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const documentId = parseInt(req.body.documentId);

        if (!documentId) {
            return res.status(400).json({
                status: "error",
                message: "documentId is required"
            });
        }

        const result = await callN8nWebhook("upload-document", {
            userId,
            documentId
        });

        res.json(result);
    } catch (error) {
        console.error("n8n upload-document error:", error.message);
        res.status(500).json({
            status: "error",
            message: "Document indexing failed. Please try again."
        });
    }
});

// =====================================================
// API 2: RAG Chat
// POST /api/chat
// =====================================================
router.post("/chat", requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const question = sanitizePrompt(sanitizeInput(req.body.question || ""));
        const conversationId = parseInt(req.body.conversationId) || null;

        if (!question) {
            return res.status(400).json({
                status: "error",
                message: "Question is required"
            });
        }

        const result = await callN8nWebhook("chat", {
            userId,
            question,
            conversationId
        });

        res.json(result);
    } catch (error) {
        console.error("n8n chat error:", error.message);
        res.status(500).json({
            status: "error",
            message: "AI chat service is unavailable. Please try again.",
            answer: "I'm unable to connect to the AI service right now. Please make sure all services are running."
        });
    }
});

// =====================================================
// API 3: Generate Summary
// POST /api/generate-summary
// =====================================================
router.post("/generate-summary", requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const documentId = parseInt(req.body.documentId);

        if (!documentId) {
            return res.status(400).json({
                status: "error",
                message: "documentId is required"
            });
        }

        const result = await callN8nWebhook("generate-summary", {
            userId,
            documentId
        });

        res.json(result);
    } catch (error) {
        console.error("n8n generate-summary error:", error.message);
        res.status(500).json({
            status: "error",
            message: "Summary generation failed. Please try again."
        });
    }
});

// =====================================================
// API 4: Generate Flashcards
// POST /api/generate-flashcards
// =====================================================
router.post("/generate-flashcards", requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const documentId = parseInt(req.body.documentId) || null;
        const subject = sanitizeInput(req.body.subject || "General");
        const topic = sanitizeInput(req.body.topic || "Study Notes");
        const count = Math.min(Math.max(parseInt(req.body.count) || 5, 1), 20);

        const result = await callN8nWebhook("generate-flashcards", {
            userId,
            documentId,
            subject,
            topic,
            count
        });

        res.json(result);
    } catch (error) {
        console.error("n8n generate-flashcards error:", error.message);
        res.status(500).json({
            status: "error",
            message: "Flashcard generation failed. Please try again."
        });
    }
});

// =====================================================
// API 5: Generate Quiz
// POST /api/generate-quiz
// =====================================================
router.post("/generate-quiz", requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const documentId = parseInt(req.body.documentId) || null;
        const subject = sanitizeInput(req.body.subject || "");
        const topic = sanitizeInput(req.body.topic || "");
        const questionCount = Math.min(Math.max(parseInt(req.body.questionCount) || 10, 3), 20);
        const quizType = ["mcq", "short_answer", "mixed"].includes(req.body.quizType)
            ? req.body.quizType
            : "mixed";

        if (!subject || !topic) {
            return res.status(400).json({
                status: "error",
                message: "Subject and topic are required"
            });
        }

        const result = await callN8nWebhook("generate-quiz", {
            userId,
            documentId,
            subject,
            topic,
            questionCount,
            quizType
        });

        res.json(result);
    } catch (error) {
        console.error("n8n generate-quiz error:", error.message);
        res.status(500).json({
            status: "error",
            message: "Quiz generation failed. Please try again."
        });
    }
});

// =====================================================
// API 6: Submit & Grade Quiz
// POST /api/submit-quiz
// =====================================================
router.post("/submit-quiz", requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const quizId = parseInt(req.body.quizId);
        const answers = req.body.answers || {};
        const timeTakenSeconds = parseInt(req.body.timeTakenSeconds) || 0;

        if (!quizId) {
            return res.status(400).json({
                status: "error",
                message: "quizId is required"
            });
        }

        const result = await callN8nWebhook("submit-quiz", {
            userId,
            quizId,
            answers,
            timeTakenSeconds
        });

        res.json(result);
    } catch (error) {
        console.error("n8n submit-quiz error:", error.message);
        res.status(500).json({
            status: "error",
            message: "Quiz grading failed. Please try again."
        });
    }
});

// =====================================================
// API 7: Generate Study Plan
// POST /api/study-plan
// =====================================================
router.post("/study-plan", requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const assignments = req.body.assignments || [];
        const availableHoursPerDay = parseFloat(req.body.availableHoursPerDay) || 3;
        const startDate = req.body.startDate || new Date().toISOString().split("T")[0];
        const preferences = req.body.preferences || {};

        if (!assignments.length) {
            return res.status(400).json({
                status: "error",
                message: "At least one assignment is required"
            });
        }

        const result = await callN8nWebhook("study-plan", {
            userId,
            assignments: assignments.map(a => ({
                title: sanitizeInput(a.title || ""),
                module: sanitizeInput(a.module || ""),
                description: sanitizeInput(a.description || ""),
                deadline: a.deadline || "",
                priority: a.priority || "medium",
                status: a.status || "pending"
            })),
            availableHoursPerDay,
            startDate,
            preferences
        });

        res.json(result);
    } catch (error) {
        console.error("n8n study-plan error:", error.message);
        res.status(500).json({
            status: "error",
            message: "Study plan generation failed. Please try again."
        });
    }
});

// =====================================================
// API 8: Dashboard Statistics
// GET /api/dashboard
// =====================================================
router.get("/dashboard", requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;

        const result = await callN8nWebhook("dashboard", { userId }, "GET");

        res.json(result);
    } catch (error) {
        console.error("n8n dashboard error:", error.message);
        res.status(500).json({
            status: "error",
            message: "Dashboard data unavailable."
        });
    }
});

// =====================================================
// Health Check
// GET /api/health
// =====================================================
router.get("/health", async (req, res) => {
    try {
        // Test n8n connectivity
        await axios.get(`${N8N_WEBHOOK_URL}/../healthz`, { timeout: 5000 });
        res.json({ status: "healthy", n8n: "connected" });
    } catch (error) {
        res.json({ status: "degraded", n8n: "disconnected", message: error.message });
    }
});

module.exports = router;
