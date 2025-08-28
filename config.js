require('dotenv').config();

module.exports = {
    // Telegram Bot Token
    BOT_TOKEN: process.env.BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE',
    
    // Admin IDs
    ADMIN_IDS: process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',').map(Number) : [123456789],
    
    // Spam detection settings
    MAX_MESSAGES_PER_MINUTE: parseInt(process.env.MAX_MESSAGES_PER_MINUTE) || 5,
    BAN_DURATION: parseInt(process.env.BAN_DURATION) || 3600, // 1 hour in seconds
    SPAM_KEYWORDS: [
        'buy now', 'discount', 'limited offer', 
        'make money', 'earn cash', 'investment',
        'bitcoin', 'crypto', 'free money'
    ],
    
    // Database configuration
    DB_PATH: process.env.DB_PATH || './data/bot_data.sqlite'
};
