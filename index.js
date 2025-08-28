const TelegramBot = require('node-telegram-bot-api');
const Database = require('./database');
const SpamDetector = require('./spamDetector');
const config = require('./config');

// Initialize bot
const bot = new TelegramBot(config.BOT_TOKEN, { polling: true });
const db = new Database();
const spamDetector = new SpamDetector(db);

console.log('🤖 Anti-Spam Bot is running...');

// Handle incoming messages
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const messageText = msg.text || '';
    const messageId = msg.message_id;
    
    // Ignore messages from bots
    if (msg.from.is_bot) {
        return;
    }
    
    try {
        // Check for spam
        const spamCheck = await spamDetector.isSpam(userId, chatId, messageText);
        
        if (spamCheck.spam || spamCheck.banned) {
            // Take action against spam
            await handleSpam(chatId, userId, messageId, spamCheck.reason);
            
            // Log the spam detection
            await db.logSpam(userId, chatId, messageText, "Message deleted");
        }
        
        // Handle commands
        if (messageText.startsWith('/')) {
            await handleCommand(messageText, chatId, userId, msg);
        }
        
    } catch (error) {
        console.error('Error processing message:', error);
    }
});

async function handleSpam(chatId, userId, messageId, reason) {
    try {
        // Delete the spam message
        await bot.deleteMessage(chatId, messageId);
        
        // Warn user
        const message = `⚠️ Anti-Spam System:\nYour message was deleted because: ${reason}\nContinued spamming will result in a ban.`;
        
        await bot.sendMessage(chatId, message);
        
        // Ban user if this is a repeated offense
        await bot.banChatMember(chatId, userId, { 
            until_date: Math.floor(Date.now() / 1000) + config.BAN_DURATION 
        });
        
    } catch (error) {
        console.error('Error handling spam:', error);
    }
}

async function handleCommand(command, chatId, userId, msg) {
    // Check if user is admin
    if (!config.ADMIN_IDS.includes(userId)) {
        await bot.sendMessage(chatId, "❌ You don't have permission to use commands.");
        return;
    }
    
    const commandText = command.toLowerCase().trim();
    
    if (commandText.startsWith('/stats')) {
        await bot.sendMessage(chatId, "📊 Bot is active and monitoring for spam.");
    
    } else if (commandText.startsWith('/ban')) {
        const parts = commandText.split(' ');
        if (parts.length > 1) {
            const targetUserId = parseInt(parts[1]);
            const duration = parts[2] ? parseInt(parts[2]) : config.BAN_DURATION;
            
            try {
                await bot.banChatMember(chatId, targetUserId, { 
                    until_date: Math.floor(Date.now() / 1000) + duration 
                });
                await bot.sendMessage(chatId, `✅ User ${targetUserId} has been banned for ${duration} seconds.`);
            } catch (error) {
                await bot.sendMessage(chatId, `❌ Error banning user: ${error.message}`);
            }
        }
    
    } else if (commandText.startsWith('/unban')) {
        const parts = commandText.split(' ');
        if (parts.length > 1) {
            const targetUserId = parseInt(parts[1]);
            
            try {
                await bot.unbanChatMember(chatId, targetUserId);
                await db.unbanUser(targetUserId, chatId);
                await bot.sendMessage(chatId, `✅ User ${targetUserId} has been unbanned.`);
            } catch (error) {
                await bot.sendMessage(chatId, `❌ Error unbanning user: ${error.message}`);
            }
        }
    
    } else if (commandText === '/start') {
        await bot.sendMessage(chatId, "🤖 Anti-Spam Bot Activated!\nI will monitor this chat for spam messages.");
    }
}

// Handle errors
bot.on('error', (error) => {
    console.error('Bot error:', error);
});

// Handle polling error
bot.on('polling_error', (error) => {
    console.error('Polling error:', error);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down bot...');
    bot.stopPolling();
    db.close();
    process.exit(0);
});

// Export for testing
module.exports = { bot, db, spamDetector };
