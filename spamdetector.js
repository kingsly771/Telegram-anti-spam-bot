const config = require('./config');

class SpamDetector {
    constructor(database) {
        this.db = database;
    }
    
    async isSpam(userId, chatId, messageText) {
        const currentTime = Math.floor(Date.now() / 1000);
        const userActivity = await this.db.getUserActivity(userId, chatId);
        
        // Check if user is banned
        if (userActivity && userActivity.is_banned) {
            if (userActivity.ban_until > currentTime) {
                return { banned: true, reason: "User is temporarily banned" };
            } else {
                // Unban user if ban period is over
                await this.db.unbanUser(userId, chatId);
            }
        }
        
        // Check message frequency
        if (userActivity) {
            const timeDiff = currentTime - userActivity.last_message_time;
            if (timeDiff < 60) { // Within same minute
                const messageCount = userActivity.message_count + 1;
                await this.db.updateUserActivity(userId, chatId, messageCount, currentTime);
                
                if (messageCount > config.MAX_MESSAGES_PER_MINUTE) {
                    return { spam: true, reason: "Message rate limit exceeded" };
                }
            } else {
                // Reset counter for new minute
                await this.db.updateUserActivity(userId, chatId, 1, currentTime);
            }
        } else {
            // First message from this user
            await this.db.updateUserActivity(userId, chatId, 1, currentTime);
        }
        
        // Check for spam keywords
        const lowerMessage = messageText.toLowerCase();
        for (const keyword of config.SPAM_KEYWORDS) {
            if (lowerMessage.includes(keyword)) {
                return { spam: true, reason: `Spam keyword detected: ${keyword}` };
            }
        }
        
        // Check for excessive links
        const linkCount = (messageText.match(/https?:\/\/[^\s]+/g) || []).length;
        if (linkCount > 2) {
            return { spam: true, reason: "Excessive links detected" };
        }
        
        // Check for excessive capital letters
        const totalLength = messageText.length;
        const upperCount = (messageText.match(/[A-Z]/g) || []).length;
        if (totalLength > 10 && (upperCount / totalLength) > 0.7) {
            return { spam: true, reason: "Excessive capital letters" };
        }
        
        return { spam: false };
    }
}

module.exports = SpamDetector;
