/**
 * Input validation and sanitization helpers
 */

// Sanitize string input - removes potential XSS and injection
function sanitizeInput(input) {
    if (typeof input !== "string") return "";
    return input
        .trim()
        .replace(/[<>]/g, "")
        .replace(/javascript:/gi, "")
        .replace(/on\w+=/gi, "");
}

// Validate email format
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Validate non-empty string
function isNonEmpty(value) {
    return typeof value === "string" && value.trim().length > 0;
}

// Validate date string
function isValidDate(dateStr) {
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
}

// Validate priority value
function isValidPriority(priority) {
    return ["low", "medium", "high"].includes(priority);
}

// Prevent prompt injection - strips known attack patterns
function sanitizePrompt(input) {
    if (typeof input !== "string") return "";
    const blocked = [
        /ignore\s+(all\s+)?previous\s+instructions/gi,
        /you\s+are\s+now/gi,
        /disregard\s+(all\s+)?previous/gi,
        /system\s*:\s*/gi,
        /\[INST\]/gi,
        /<<SYS>>/gi
    ];
    let cleaned = input;
    blocked.forEach(pattern => {
        cleaned = cleaned.replace(pattern, "");
    });
    return cleaned.trim();
}

module.exports = {
    sanitizeInput,
    isValidEmail,
    isNonEmpty,
    isValidDate,
    isValidPriority,
    sanitizePrompt
};
