const sqlite3 = require('sqlite3').verbose();
const { promisify } = require('util');
const logger = require('../utils/logger');

// Define your database file path
const dbFilePath = 'database/users.db';

// Open the database connection
const db = new sqlite3.Database(dbFilePath, (err) => {
    if (err) {
        logger.error('❌ Error opening database:', err);
    } else {
        logger.info('✅ Database connected.');
    }
});

db.serialize(() => {
    // Create or modify the "users" table
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            telegram_id TEXT PRIMARY KEY,
            address TEXT UNIQUE,
            username TEXT,
            tip_count INTEGER DEFAULT 0,
            warnings INTEGER DEFAULT 0,
            last_tip_date TEXT DEFAULT '',
            last_tip_time INTEGER DEFAULT 0,
            hourly_tip_count INTEGER DEFAULT 0,
            tip_count_received INTEGER DEFAULT 0,
            tip_count_sent INTEGER DEFAULT 0,
            registration_date INTEGER DEFAULT 0,
            bio TEXT,
            isAdmin INTEGER DEFAULT 0 -- Add the 'isAdmin' column with a default value of 0
        )
    `);

    // Create the "tips" table
    db.run(`
        CREATE TABLE IF NOT EXISTS tips (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            telegram_id TEXT NOT NULL,
            tip_time INTEGER NOT NULL
        )
    `);

    // Create the "profiles" table
    db.run(`
        CREATE TABLE IF NOT EXISTS profiles (
            telegram_id TEXT PRIMARY KEY,
            bio TEXT
        )
    `);

    // Create the "user_rewards" table to track the tokens awarded to users
    db.run(`
        CREATE TABLE IF NOT EXISTS user_rewards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            telegram_id TEXT NOT NULL,
            token_type TEXT NOT NULL,
            awarded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Check if the columns exist, and if not, add them
    db.all("PRAGMA table_info(users)", [], (err, rows) => {
        if (err) {
            console.error("Failed to fetch table info:", err);
            return;
        }

        const hasLastTipTime = rows.some(row => row.name === "last_tip_time");
        const hasHourlyTipCount = rows.some(row => row.name === "hourly_tip_count");
        const hasWarnings = rows.some(row => row.name === "warnings");
        const hasLastTokenType = rows.some(row => row.name === "last_token_type");
        const hasIsAdmin = rows.some(row => row.name === "isAdmin"); // Check if 'isAdmin' column exists
        const hasLastTipDate = rows.some(row => row.name === "last_tip_date");


        if (!hasLastTipTime) {
            db.run("ALTER TABLE users ADD COLUMN last_tip_time INTEGER DEFAULT 0");
        }

        if (!hasHourlyTipCount) {
            db.run("ALTER TABLE users ADD COLUMN hourly_tip_count INTEGER DEFAULT 0");
        }

        if (!hasWarnings) {
            db.run("ALTER TABLE users ADD COLUMN warnings INTEGER DEFAULT 0");
        }

        if (!hasLastTokenType) {
            db.run("ALTER TABLE users ADD COLUMN last_token_type TEXT");
        }

        if (!hasIsAdmin) {
            db.run("ALTER TABLE users ADD COLUMN isAdmin INTEGER DEFAULT 0"); // Add the 'isAdmin' column if it doesn't exist
        }


        if (!hasLastTipDate) {
            db.run("ALTER TABLE users ADD COLUMN last_tip_date TEXT DEFAULT ''");
        }
    });
});

// Promisify the asynchronous functions
db.runAsync = promisify(db.run).bind(db);
db.getAsync = promisify(db.get).bind(db);
db.allAsync = promisify(db.all).bind(db);

// Export the database object for use in other modules
module.exports = db;