const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const config = require('./config');

class Database {
    constructor() {
        // Create data directory if it doesn't exist
        const dataDir = path.dirname(config.DB_PATH);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        this.db = new sqlite3.Database(config.DB_PATH);
        this.createTables();
    }
    
    createTables() {
        // User activity table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS user_activity (
                user_id INTEGER,
                chat_id INTEGER,
                message_count INTEGER DEFAULT 0,
                last_message_time INTEGER,
                is_banned INTEGER DEFAULT 0,
                ban_until INTEGER,
                PRIMARY KEY (user_id, chat_id)
            )
        `);
        
        // Spam logs table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS spam_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                chat_id INTEGER,
                message_text TEXT,
                detected_at INTEGER,
                action_taken TEXT
            )
        `);
    }
    
    getUserActivity(userId, chatId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                "SELECT * FROM user_activity WHERE user_id = ? AND chat_id = ?",
                [userId, chatId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }
    
    updateUserActivity(userId, chatId, messageCount, timestamp) {
        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT OR REPLACE INTO user_activity 
                 (user_id, chat_id, message_count, last_message_time) 
                 VALUES (?, ?, ?, ?)`,
                [userId, chatId, messageCount, timestamp],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }
    
    banUser(userId, chatId, duration) {
        const banUntil = Math.floor(Date.now() / 1000) + duration;
        return new Promise((resolve, reject) => {
            this.db.run(
                `UPDATE user_activity 
                 SET is_banned = 1, ban_until = ? 
                 WHERE user_id = ? AND chat_id = ?`,
                [banUntil, userId, chatId],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
    }
    
    unbanUser(userId, chatId) {
        return new Promise((resolve, reject) => {
            this.db.run(
                `UPDATE user_activity 
                 SET is_banned = 0, ban_until = NULL 
                 WHERE user_id = ? AND chat_id = ?`,
                [userId, chatId],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
    }
    
    logSpam(userId, chatId, messageText, action) {
        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT INTO spam_logs 
                 (user_id, chat_id, message_text, detected_at, action_taken) 
                 VALUES (?, ?, ?, ?, ?)`,
                [userId, chatId, messageText, Math.floor(Date.now() / 1000), action],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }
    
    close() {
        this.db.close();
    }
}

module.exports = Database;
