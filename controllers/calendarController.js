const db = require("../config/db");
const { google } = require("googleapis");
const axios = require("axios");

// ============================================
// OAUTH CONFIGURATIONS FROM ENV
// ============================================
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/auth/google/callback";



// Google OAuth Client helper
function getGoogleOAuthClient() {
    return new google.auth.OAuth2(
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
        GOOGLE_REDIRECT_URI
    );
}

// ============================================
// CALENDAR VIEW & JSON EVENTS
// ============================================

exports.showCalendar = (req, res) => {
    const userId = req.session.userId;
    
    // Fetch user calendar configurations to see what's connected
    const sql = "SELECT provider, email FROM user_calendar_configs WHERE user_id = ?";
    db.query(sql, [userId], (err, configs) => {
        if (err) console.log(err);
        
        const connections = {
            google: configs ? configs.find(c => c.provider === "google") : null,
            outlook: null,
            apple: configs ? configs.find(c => c.provider === "apple") : null
        };
        
        res.render("calendar", {
            connections,
            success: null,
            error: null
        });
    });
};

exports.getEvents = (req, res) => {
    const userId = req.session.userId;
    
    // Fetch assignments
    const assignmentsSql = "SELECT id, title, module, deadline, priority, status FROM assignments WHERE user_id = ?";
    db.query(assignmentsSql, [userId], (err, assignments) => {
        if (err) {
            console.log(err);
            return res.json([]);
        }
        
        // Fetch study sessions
        const sessionsSql = "SELECT id, assignment_id, title, start_time, end_time, status FROM study_sessions WHERE user_id = ?";
        db.query(sessionsSql, [userId], (err, sessions) => {
            if (err) {
                console.log(err);
                return res.json([]);
            }
            
            const events = [];
            
            // Format assignments as calendar events (deadlines are all-day or specific timestamp)
            assignments.forEach(a => {
                let color = "#e74c3c"; // Red for high
                if (a.priority === "medium") color = "#f39c12"; // Orange
                if (a.priority === "low") color = "#3498db"; // Blue
                if (a.status === "completed") color = "#2ecc71"; // Green for completed
                
                events.push({
                    id: `assignment-${a.id}`,
                    title: `[DL] ${a.module}: ${a.title}`,
                    start: a.deadline,
                    color: color,
                    extendedProps: {
                        type: "assignment",
                        dbId: a.id,
                        priority: a.priority,
                        status: a.status,
                        module: a.module
                    }
                });
            });
            
            // Format study sessions as calendar events
            sessions.forEach(s => {
                events.push({
                    id: `session-${s.id}`,
                    title: `📖 Study: ${s.title}`,
                    start: s.start_time,
                    end: s.end_time,
                    color: "#9b59b6", // Purple for study sessions
                    extendedProps: {
                        type: "session",
                        dbId: s.id,
                        status: s.status,
                        assignmentId: s.assignment_id
                    }
                });
            });
            
            res.json(events);
        });
    });
};

// ============================================
// CREATE & DELETE STUDY SESSIONS
// ============================================

exports.createStudySession = (req, res) => {
    const userId = req.session.userId;
    const { title, start_time, end_time, assignment_id } = req.body;
    
    if (!title || !start_time || !end_time) {
        return res.status(400).json({ error: "Missing required fields" });
    }
    
    const sql = "INSERT INTO study_sessions (user_id, assignment_id, title, start_time, end_time) VALUES (?, ?, ?, ?, ?)";
    db.query(sql, [userId, assignment_id || null, title, start_time, end_time], (err, result) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ error: "Database error" });
        }
        
        const sessionId = result.insertId;
        
        // Sync to external calendars asynchronously
        syncEventToAllProviders(userId, {
            title: `📖 Study: ${title}`,
            start: start_time,
            end: end_time
        });
        
        res.json({ success: true, sessionId });
    });
};

exports.deleteStudySession = (req, res) => {
    const userId = req.session.userId;
    const id = parseInt(req.params.id);
    
    const sql = "DELETE FROM study_sessions WHERE id = ? AND user_id = ?";
    db.query(sql, [id, userId], (err) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ error: "Database error" });
        }
        res.json({ success: true });
    });
};

// ============================================
// OAUTH FLOWS: GOOGLE
// ============================================

exports.authGoogle = (req, res) => {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        return res.status(500).send("Google client credentials are not configured in your .env file.");
    }
    const oauth2Client = getGoogleOAuthClient();
    const scopes = [
        "https://www.googleapis.com/auth/calendar.events",
        "https://www.googleapis.com/auth/calendar.readonly"
    ];
    
    const url = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: scopes,
        prompt: "consent"
    });
    res.redirect(url);
};

exports.authGoogleCallback = async (req, res) => {
    const userId = req.session.userId;
    const code = req.query.code;
    
    if (!code) {
        return res.redirect("/calendar");
    }
    
    try {
        const oauth2Client = getGoogleOAuthClient();
        const { tokens } = await oauth2Client.getToken(code);
        
        // Fetch user profile to get email
        oauth2Client.setCredentials(tokens);
        const calendar = google.calendar({ version: "v3", auth: oauth2Client });
        const primaryCal = await calendar.calendars.get({ calendarId: "primary" });
        const email = primaryCal.data.id;
        
        // Save tokens in database
        const sql = `INSERT INTO user_calendar_configs (user_id, provider, email, access_token, refresh_token) 
                     VALUES (?, 'google', ?, ?, ?) 
                     ON DUPLICATE KEY UPDATE email = ?, access_token = ?, refresh_token = ?`;
        db.query(sql, [
            userId, email, tokens.access_token, tokens.refresh_token || null,
            email, tokens.access_token, tokens.refresh_token || null
        ], (err) => {
            if (err) console.log(err);
            res.redirect("/calendar");
        });
    } catch (error) {
        console.log("Google Auth Callback Error:", error.message);
        res.redirect("/calendar");
    }
};



// ============================================
// APPLE CLOUDFLOW (CALDAV)
// ============================================

exports.connectApple = (req, res) => {
    const userId = req.session.userId;
    const { email, app_password } = req.body;
    
    if (!email || !app_password) {
        return res.redirect("/calendar");
    }
    
    // Save Apple settings directly
    const sql = `INSERT INTO user_calendar_configs (user_id, provider, email, app_password) 
                 VALUES (?, 'apple', ?, ?) 
                 ON DUPLICATE KEY UPDATE email = ?, app_password = ?`;
    db.query(sql, [userId, email, app_password, email, app_password], (err) => {
        if (err) console.log(err);
        res.redirect("/calendar");
    });
};

exports.disconnectProvider = (req, res) => {
    const userId = req.session.userId;
    const provider = req.params.provider;
    
    const sql = "DELETE FROM user_calendar_configs WHERE user_id = ? AND provider = ?";
    db.query(sql, [userId, provider], (err) => {
        if (err) console.log(err);
        res.redirect("/calendar");
    });
};

// ============================================
// INTERNAL SYNC ENGINE
// ============================================

async function syncEventToAllProviders(userId, event) {
    const sql = "SELECT * FROM user_calendar_configs WHERE user_id = ?";
    db.query(sql, [userId], async (err, configs) => {
        if (err || !configs) return;
        
        for (const config of configs) {
            if (config.provider === "google") {
                await syncToGoogle(config, event);

            } else if (config.provider === "apple") {
                await syncToApple(config, event);
            }
        }
    });
}

// Google Calendar Sync helper
async function syncToGoogle(config, event) {
    try {
        const oauth2Client = getGoogleOAuthClient();
        oauth2Client.setCredentials({
            access_token: config.access_token,
            refresh_token: config.refresh_token
        });
        
        const calendar = google.calendar({ version: "v3", auth: oauth2Client });
        await calendar.events.insert({
            calendarId: "primary",
            requestBody: {
                summary: event.title,
                start: { dateTime: new Date(event.start).toISOString() },
                end: { dateTime: new Date(event.end || event.start).toISOString() }
            }
        });
    } catch (err) {
        console.log("Failed syncing to Google Calendar:", err.message);
    }
}



// Apple Calendar (iCloud CalDAV Integration via discovery + PUT)
async function syncToApple(config, event) {
    const cleanId = `ai-study-buddy-${Date.now()}`;
    const startStr = new Date(event.start).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const endStr = new Date(event.end || event.start).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    
    // Simple iCalendar payload
    const icsContent = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//AI Study Buddy//EN",
        "BEGIN:VEVENT",
        `UID:${cleanId}`,
        `DTSTART:${startStr}`,
        `DTEND:${endStr}`,
        `SUMMARY:${event.title}`,
        "END:VEVENT",
        "END:VCALENDAR"
    ].join("\r\n");

    try {
        const authBase64 = Buffer.from(`${config.email}:${config.app_password}`).toString("base64");
        
        console.log(`[iCloud Sync] Initiating CalDAV discovery for ${config.email}...`);
        
        // 1. Discover the correct CalDAV partition host and user DSID (principal)
        const response = await axios({
            method: 'propfind',
            url: 'https://caldav.icloud.com/',
            headers: {
                'Authorization': `Basic ${authBase64}`,
                'Depth': '0',
                'Content-Type': 'text/xml; charset=utf-8'
            },
            data: `<?xml version="1.0" encoding="utf-8" ?>
                <D:propfind xmlns:D="DAV:">
                    <D:prop>
                        <D:current-user-principal/>
                    </D:prop>
                </D:propfind>`
        });
        
        console.log("[iCloud Sync] CalDAV discovery response received.");
        
        // Extract host from final redirected response
        const finalUrl = response.request.res.responseUrl || 'https://caldav.icloud.com/';
        const urlObj = new URL(finalUrl);
        const correctHost = urlObj.host; // e.g. pXX-caldav.icloud.com
        
        // Parse DSID from XML response
        const xmlData = response.data;
        const principalMatch = xmlData.match(/\/([0-9]+)\/principal\//);
        
        if (!principalMatch) {
            throw new Error("Could not discover principal ID (DSID) from iCloud response.");
        }
        
        const dsid = principalMatch[1];
        console.log(`[iCloud Sync] Discovered principal DSID: ${dsid} on host: ${correctHost}`);
        
        // 2. Discover default calendar collection ID (to avoid 404 on accounts without 'home')
        console.log(`[iCloud Sync] Discovering calendar collections for DSID ${dsid}...`);
        const calListResponse = await axios({
            method: 'propfind',
            url: `https://${correctHost}/${dsid}/calendars/`,
            headers: {
                'Authorization': `Basic ${authBase64}`,
                'Depth': '1',
                'Content-Type': 'text/xml; charset=utf-8'
            }
        });
        
        const calData = calListResponse.data;
        const hrefRegex = new RegExp(`\\/${dsid}\\/calendars\\/([^\\/<]+)\\/`, 'g');
        let match;
        let calendarId = 'home'; // default fallback
        
        const foundIds = [];
        while ((match = hrefRegex.exec(calData)) !== null) {
            const id = match[1];
            if (!['inbox', 'outbox', 'notification', 'tasks', 'dropbox', 'freebusy'].includes(id.toLowerCase())) {
                foundIds.push(id);
            }
        }
        
        if (foundIds.length > 0) {
            calendarId = foundIds[0];
            console.log(`[iCloud Sync] Detected user calendar collection ID: ${calendarId}`);
        }
        
        // 3. Put the calendar event (.ics) to the discovered user calendar on the correct partition host
        console.log(`[iCloud Sync] Sending PUT request for event ${cleanId} to ${correctHost}/${calendarId}...`);
        await axios.put(`https://${correctHost}/${dsid}/calendars/${calendarId}/${cleanId}.ics`, icsContent, {
            headers: {
                Authorization: `Basic ${authBase64}`,
                "Content-Type": "text/calendar; charset=utf-8"
            }
        });
        console.log("[iCloud Sync] Event successfully created on iCloud Calendar!");
    } catch (err) {
        console.log("[iCloud Sync] Failed syncing to iCloud Calendar:", err.message, err.response ? `Status: ${err.response.status} Data: ${JSON.stringify(err.response.data)}` : "");
    }
}

exports.handleCalendarAI = async (req, res) => {
    const userId = req.session.userId;
    const { query, current_time } = req.body;

    if (!query) {
        return res.status(400).json({ error: "Query is required" });
    }

    try {
        const response = await axios.post("http://127.0.0.1:5000/calendar-ai", {
            query,
            current_time
        });

        const data = response.data;
        if (data.action === "create_event" || data.action === "daily_plan") {
            const events = data.events || [];
            for (const evt of events) {
                const sql = "INSERT INTO study_sessions (user_id, title, start_time, end_time, status) VALUES (?, ?, ?, ?, 'scheduled')";
                await db.promise().query(sql, [userId, evt.title, evt.start_time, evt.end_time]);
                
                // Sync to external calendar connections asynchronously
                syncEventToAllProviders(userId, {
                    title: evt.title,
                    start: evt.start_time,
                    end: evt.end_time
                });
            }
        }

        res.json({
            success: true,
            action: data.action,
            reply: data.reply,
            events: data.events
        });
    } catch (error) {
        console.error("AI Calendar Planner Error:", error.message);
        res.status(500).json({ error: "Failed to communicate with AI planner" });
    }
};
