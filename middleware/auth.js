/**
 * Authentication middleware
 * Protects routes that require login
 */
exports.requireAuth = (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect("/login");
    }
    next();
};

/**
 * Admin authorization middleware
 * Requires user to have admin role
 */
exports.requireAdmin = (req, res, next) => {
    if (req.session.userRole !== "admin") {
        return res.status(403).render("error", {
            title: "Access Denied",
            message: "You do not have permission to access this page.",
            code: 403
        });
    }
    next();
};
