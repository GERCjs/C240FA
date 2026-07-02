const db = require("../config/db");
const axios = require("axios");
const { sanitizeInput, isNonEmpty, isValidDate, isValidPriority } = require("../middleware/validate");

exports.showAssignments = (req, res) => {
    const userId = req.session.userId;

    const sql = "SELECT * FROM assignments WHERE user_id = ? ORDER BY deadline ASC";
    db.query(sql, [userId], (err, assignments) => {
        if (err) {
            console.log(err);
            assignments = [];
        }

        // Separate into categories
        const now = new Date();
        const upcoming = assignments.filter(a => new Date(a.deadline) > now && a.status !== "completed");
        const overdue = assignments.filter(a => new Date(a.deadline) <= now && a.status !== "completed");
        const completed = assignments.filter(a => a.status === "completed");

        res.render("assignments", {
            assignments,
            upcoming,
            overdue,
            completed,
            error: null,
            success: null
        });
    });
};

exports.createAssignment = (req, res) => {
    const userId = req.session.userId;
    const title = sanitizeInput(req.body.title);
    const module = sanitizeInput(req.body.module);
    const description = sanitizeInput(req.body.description);
    const deadline = req.body.deadline;
    const priority = req.body.priority;

    // Validation
    if (!isNonEmpty(title) || !isNonEmpty(module) || !isValidDate(deadline) || !isValidPriority(priority)) {
        return res.redirect("/assignments");
    }

    const sql = "INSERT INTO assignments (user_id, title, module, description, deadline, priority) VALUES (?, ?, ?, ?, ?, ?)";
    db.query(sql, [userId, title, module, description, deadline, priority], (err, result) => {
        if (err) {
            console.log(err);
        }
        res.redirect("/assignments");
    });
};

exports.updateAssignment = (req, res) => {
    const userId = req.session.userId;
    const id = parseInt(req.params.id);
    const status = req.body.status;

    const validStatuses = ["pending", "in_progress", "completed"];
    if (!validStatuses.includes(status)) {
        return res.redirect("/assignments");
    }

    const sql = "UPDATE assignments SET status = ? WHERE id = ? AND user_id = ?";
    db.query(sql, [status, id, userId], (err) => {
        if (err) console.log(err);
        res.redirect("/assignments");
    });
};

exports.deleteAssignment = (req, res) => {
    const userId = req.session.userId;
    const id = parseInt(req.params.id);

    const sql = "DELETE FROM assignments WHERE id = ? AND user_id = ?";
    db.query(sql, [id, userId], (err) => {
        if (err) console.log(err);
        res.redirect("/assignments");
    });
};

exports.generateStudyPlan = async (req, res) => {
    const userId = req.session.userId;
    const id = parseInt(req.params.id);

    // Get assignment details
    const sql = "SELECT * FROM assignments WHERE id = ? AND user_id = ?";
    db.query(sql, [id, userId], async (err, results) => {
        if (err || results.length === 0) {
            return res.redirect("/assignments");
        }

        const assignment = results[0];
        const daysUntilDeadline = Math.ceil((new Date(assignment.deadline) - new Date()) / (1000 * 60 * 60 * 24));

        try {
            const response = await axios.post("http://127.0.0.1:5000/generate-plan", {
                title: assignment.title,
                module: assignment.module,
                description: assignment.description || "",
                days_remaining: daysUntilDeadline,
                priority: assignment.priority
            }, { timeout: 60000 });

            const plan = response.data.plan;

            // Save plan to assignment
            const updateSql = "UPDATE assignments SET study_plan = ? WHERE id = ? AND user_id = ?";
            db.query(updateSql, [plan, id, userId], (err) => {
                if (err) console.log(err);
                res.redirect("/assignments");
            });

        } catch (error) {
            console.log(error.message);
            // Generate a basic plan locally if AI is unavailable
            const basicPlan = generateBasicPlan(assignment, daysUntilDeadline);
            const updateSql = "UPDATE assignments SET study_plan = ? WHERE id = ? AND user_id = ?";
            db.query(updateSql, [basicPlan, id, userId], (err) => {
                if (err) console.log(err);
                res.redirect("/assignments");
            });
        }
    });
};

// Fallback plan generator
function generateBasicPlan(assignment, daysRemaining) {
    const steps = [];
    if (daysRemaining <= 0) {
        steps.push("⚠️ This assignment is overdue. Focus on completing it immediately.");
        steps.push("Day 1: Review requirements and outline key sections.");
        steps.push("Day 2: Complete the main content and submit.");
    } else if (daysRemaining <= 3) {
        steps.push("Day 1: Review all requirements and gather materials.");
        steps.push("Day 2: Draft and complete the main work.");
        steps.push("Day 3: Review, proofread, and submit.");
    } else {
        const researchDays = Math.ceil(daysRemaining * 0.2);
        const workDays = Math.ceil(daysRemaining * 0.5);
        const reviewDays = daysRemaining - researchDays - workDays;

        steps.push(`Days 1-${researchDays}: Research and gather resources for "${assignment.title}".`);
        steps.push(`Days ${researchDays + 1}-${researchDays + workDays}: Work on the main content.`);
        steps.push(`Days ${researchDays + workDays + 1}-${daysRemaining}: Review, refine, and submit.`);
    }

    return steps.join("\n");
}
