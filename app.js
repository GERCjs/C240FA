require("dotenv").config();

const express = require("express");
const app = express();
const path = require("path");
const session = require("express-session");

// Controllers
const userController = require("./controllers/userController");
const chatController = require("./controllers/chatController");
const assignmentController = require("./controllers/assignmentController");
const quizController = require("./controllers/quizController");

const summaryController = require("./controllers/summaryController");
const dashboardController = require("./controllers/dashboardController");
const adminController = require("./controllers/adminController");
const calendarController = require("./controllers/calendarController");

// n8n API Routes
const n8nRoutes = require("./routes/n8nRoutes");

// Middleware
const { requireAuth, requireAdmin } = require("./middleware/auth");

// View engine
app.set("view engine", "ejs");

// Static files
app.use(express.static(path.join(__dirname, "public")));

// Body parsing
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session
app.use(session({
    secret: process.env.SESSION_SECRET || "c240_ai_secret",
    resave: false,
    saveUninitialized: false
}));

// Make session data available in all views
app.use((req, res, next) => {
    res.locals.user = req.session.userId ? {
        id: req.session.userId,
        name: req.session.userName,
        role: req.session.userRole
    } : null;
    next();
});

// =====================
// n8n API ROUTES
// =====================
app.use("/api", n8nRoutes);

// =====================
// PUBLIC ROUTES
// =====================

app.get("/", (req, res) => {
    res.render("index");
});

app.get("/register", userController.showRegister);
app.post("/register", userController.register);
app.get("/login", userController.showLogin);
app.post("/login", userController.login);
app.get("/logout", userController.logout);

// =====================
// AUTHENTICATED ROUTES
// =====================

// Dashboard
app.get("/dashboard", requireAuth, dashboardController.showDashboard);

// Chat
app.get("/chat", requireAuth, chatController.showChat);
app.post("/chat", requireAuth, chatController.askQuestion);
app.post("/chat/new", requireAuth, chatController.newSession);
app.get("/chat/history", requireAuth, chatController.getHistory);
app.get("/chat/session/:id", requireAuth, chatController.getSession);

// Assignments
app.get("/assignments", requireAuth, assignmentController.showAssignments);
app.post("/assignments", requireAuth, assignmentController.createAssignment);
app.post("/assignments/:id/update", requireAuth, assignmentController.updateAssignment);
app.post("/assignments/:id/delete", requireAuth, assignmentController.deleteAssignment);
app.post("/assignments/:id/plan", requireAuth, assignmentController.generateStudyPlan);

// Quizzes
app.get("/quizzes", requireAuth, quizController.showQuizzes);
app.post("/quizzes/generate", requireAuth, quizController.generateQuiz);
app.get("/quizzes/:id", requireAuth, quizController.showQuiz);
app.post("/quizzes/:id/submit", requireAuth, quizController.submitQuiz);
app.get("/quizzes/:id/results", requireAuth, quizController.showResults);
app.post("/quizzes/:id/delete", requireAuth, quizController.deleteQuiz);



// Flashcards
app.get("/flashcards", requireAuth, summaryController.showFlashcards);
app.post("/flashcards/generate", requireAuth, summaryController.generateFlashcards);
app.post("/flashcards/:id/review", requireAuth, summaryController.reviewFlashcard);
app.post("/flashcards/:id/delete", requireAuth, summaryController.deleteFlashcard);

// Calendar & Sync
app.get("/calendar", requireAuth, calendarController.showCalendar);
app.get("/calendar/events", requireAuth, calendarController.getEvents);
app.get("/calendar/analytics", requireAuth, calendarController.getStudyAnalytics);
app.post("/calendar/sessions", requireAuth, calendarController.createStudySession);
app.post("/calendar/sessions/:id/update", requireAuth, calendarController.updateStudySession);
app.post("/calendar/sessions/:id/delete", requireAuth, calendarController.deleteStudySession);
app.post("/calendar/pomodoro", requireAuth, calendarController.logPomodoroSession);
app.post("/calendar/ai", requireAuth, calendarController.handleCalendarAI);
app.get("/auth/google", requireAuth, calendarController.authGoogle);
app.get("/auth/google/callback", requireAuth, calendarController.authGoogleCallback);
app.post("/calendar/connect/apple", requireAuth, calendarController.connectApple);
app.post("/calendar/disconnect/:provider", requireAuth, calendarController.disconnectProvider);

// =====================
// ADMIN ROUTES
// =====================

app.get("/admin", requireAuth, requireAdmin, adminController.showDashboard);
app.get("/admin/users", requireAuth, requireAdmin, adminController.manageUsers);
app.post("/admin/users/:id/delete", requireAuth, requireAdmin, adminController.deleteUser);
app.get("/admin/analytics", requireAuth, requireAdmin, adminController.viewAnalytics);

// =====================
// ERROR HANDLING
// =====================

// 404 handler
app.use((req, res) => {
    res.status(404).render("error", {
        title: "Page Not Found",
        message: "The page you are looking for does not exist.",
        code: 404
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render("error", {
        title: "Server Error",
        message: "Something went wrong. Please try again later.",
        code: 500
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on URL address: http://localhost:${PORT}/`));

module.exports = app;
