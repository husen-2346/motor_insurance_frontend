const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const session = require("express-session");

const app = express();
const PORT = 5000;

/* =========================
   MIDDLEWARE
========================= */
// ✅ FIXED: Allow multiple origins (localhost and 127.0.0.1, multiple ports)
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like Postman, curl, or mobile apps)
        if (!origin) return callback(null, true);

        // Allow any localhost or 127.0.0.1 on ports 5500-5510, plus the deployed frontend
        const allowedOrigins = [
            'https://motor-insurance-4sk1.onrender.com', // Deployed Frontend
            'http://localhost:5500',
            'http://127.0.0.1:5500',
            'http://localhost:5501',
            'http://127.0.0.1:5501',
            'http://localhost:5502',
            'http://127.0.0.1:5502',
            'http://localhost:5503',
            'http://127.0.0.1:5503',
        ];

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.log('⚠️  CORS blocked origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    name: "insure.sid",
    secret: "insure-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 1000 * 60 * 60 // 1 hour
    }
}));

/* =========================
   DATABASE
========================= */
const db = new sqlite3.Database("./insurance.db", err => {
    if (err) console.error(err);
    else console.log("✅ Database connected");
});

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS applications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT NOT NULL,
            email TEXT NOT NULL,
            vehicle_type TEXT NOT NULL,
            make TEXT NOT NULL,
            model TEXT NOT NULL,
            year TEXT NOT NULL,
            registration_number TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS admin (
            id INTEGER PRIMARY KEY,
            username TEXT UNIQUE,
            password TEXT
        )
    `);

    db.run(`
        INSERT OR IGNORE INTO admin (id, username, password)
        VALUES (1, 'admin', 'admin123')
    `);
});

/* =========================
   AUTH MIDDLEWARE
========================= */
function requireAdmin(req, res, next) {
    console.log('🔒 Checking admin session:', req.session.admin ? 'Authenticated ✅' : 'Not authenticated ❌');
    if (req.session.admin) next();
    else res.sendStatus(401);
}

/* =========================
   SUBMIT APPLICATION
========================= */
app.post("/apply", (req, res) => {
    console.log('📝 Application submission received:', req.body);

    const {
        name, phone, email,
        vehicle_type, make, model, year, registration_number
    } = req.body;

    // Validation
    if (!name || !phone || !email || !vehicle_type || !make || !model || !year) {
        console.log('❌ Validation failed - missing required fields');
        return res.status(400).json({
            success: false,
            message: "All fields except registration number are required"
        });
    }

    db.run(
        `INSERT INTO applications
         (name, phone, email, vehicle_type, make, model, year, registration_number)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, phone, email, vehicle_type, make, model, year, registration_number || null],
        function (err) {
            if (err) {
                console.error("❌ Database error:", err);
                return res.status(500).json({
                    success: false,
                    message: "Database error"
                });
            }

            console.log(`✅ New application submitted - ID: ${this.lastID}, Name: ${name}`);
            res.json({
                success: true,
                id: this.lastID
            });
        }
    );
});

/* =========================
   ADMIN LOGIN
========================= */
app.post("/admin/login", (req, res) => {
    console.log('🔐 Login attempt:', { username: req.body.username });

    const { username, password } = req.body;

    if (!username || !password) {
        console.log('❌ Login failed: Missing credentials');
        return res.status(400).json({
            success: false,
            message: "Username and password required"
        });
    }

    db.get(
        "SELECT * FROM admin WHERE username=? AND password=?",
        [username, password],
        (err, row) => {
            if (err) {
                console.error("❌ Database error:", err);
                return res.status(500).json({
                    success: false,
                    message: "Server error"
                });
            }

            if (!row) {
                console.log('❌ Login failed: Invalid credentials');
                return res.status(401).json({
                    success: false,
                    message: "Invalid credentials"
                });
            }

            req.session.admin = true;
            console.log("✅ Admin logged in successfully");
            res.json({ success: true });
        }
    );
});

/* =========================
   CHECK SESSION
========================= */
app.get("/admin/check", (req, res) => {
    const isAuth = req.session.admin ? true : false;
    console.log('🔍 Session check:', isAuth ? 'Authenticated ✅' : 'Not authenticated ❌');

    if (isAuth) {
        res.sendStatus(200);
    } else {
        res.sendStatus(401);
    }
});

/* =========================
   LOGOUT
========================= */
app.get("/admin/logout", (req, res) => {
    req.session.destroy(err => {
        if (err) console.error("❌ Logout error:", err);
        res.clearCookie("insure.sid");
        console.log("✅ Admin logged out");
        res.sendStatus(200);
    });
});

/* =========================
   GET APPLICATIONS (PROTECTED)
========================= */
app.get("/admin/data", requireAdmin, (req, res) => {
    db.all(
        "SELECT * FROM applications ORDER BY created_at DESC",
        [],
        (err, rows) => {
            if (err) {
                console.error("❌ Database error:", err);
                return res.status(500).json({
                    success: false,
                    message: "Database error"
                });
            }

            console.log(`📊 Sending ${rows.length} applications to admin`);
            res.json(rows);
        }
    );
});

/* =========================
   START SERVER
========================= */
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════╗
║   🚗 INSURE - Motor Vehicle Insurance      ║
║   ✅ Server running on port ${PORT}            ║
║   📝 Admin credentials:                    ║
║      Username: admin                       ║
║      Password: admin123                    ║
╚════════════════════════════════════════════╝
    `);
});
//