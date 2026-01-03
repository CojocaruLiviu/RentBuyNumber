require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");

// Bot token - read from environment variable
const BOT_TOKEN = process.env.BOT_TOKEN;
const MINI_APP_URL = process.env.MINI_APP_URL || "http://localhost:3000";

if (!BOT_TOKEN) {
    console.error("❌ ERROR: BOT_TOKEN not set in .env file!");
    console.log("💡 Please create a .env file with: BOT_TOKEN=your_bot_token_here");
    process.exit(1);
}

// Create bot
const bot = new TelegramBot(BOT_TOKEN, { polling: true });
console.log("✅ Bot started successfully!");

// Send main menu with Mini App button
function sendMainMenu(chatId, message = "Welcome to SMS Number Rental!") {
    bot.sendMessage(chatId, message, {
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: "📱 Open Mini App",
                        web_app: { url: MINI_APP_URL }
                    }
                ]
            ]
        }
    });
}

// START COMMAND
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const username = msg.from.username || msg.from.first_name;

    let welcomeMsg = `👋 Welcome, ${username}!\n\n`;
    welcomeMsg += `📱 SMS Number Rental & Activation\n\n`;
    welcomeMsg += `Click the button below to open the Mini App:`;

    sendMainMenu(chatId, welcomeMsg);
});

// Handle all other messages
bot.on("message", (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // If user sends any text, show menu again
    if (text && !text.startsWith("/")) {
        sendMainMenu(chatId, "Click the button below to open the Mini App:");
    }
});

// Handle errors
bot.on("polling_error", (error) => {
    if (error.code === 'ETELEGRAM' && error.response?.body?.error_code === 409) {
        console.error("❌ ERROR: Another bot instance is running!");
        console.error("💡 Please stop all other instances of this bot and restart.");
    } else {
        console.error("Polling error:", error.message || error);
    }
});

console.log("🤖 Telegram Bot is ready!");
console.log(`📱 Mini App URL: ${MINI_APP_URL}`);
console.log("💡 Use /start in Telegram to begin!");
