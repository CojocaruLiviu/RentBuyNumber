require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");

// Bot token - read from environment variable
const BOT_TOKEN = process.env.BOT_TOKEN;
const MINI_APP_URL = process.env.MINI_APP_URL || "http://localhost:3000";
const API_URL = process.env.API_URL || "http://localhost:3000";

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

// Function to initialize wallet for user
async function initializeWallet(userId) {
    try {
        const response = await axios.post(`${API_URL}/api/wallet/${userId}/init`);
        if (response.data.success) {
            console.log(`✅ Wallet initialized for user ${userId}`);
            return true;
        }
    } catch (error) {
        console.error(`❌ Failed to initialize wallet for user ${userId}:`, error.message);
        return false;
    }
    return false;
}

// Function to fetch wallet for user
async function getWallet(userId) {
    try {
        const response = await axios.get(`${API_URL}/api/wallet/${userId}`);
        if (response.data && response.data.wallet) {
            return response.data.wallet;
        }
    } catch (error) {
        console.error(`❌ Failed to fetch wallet for user ${userId}:`, error.message);
    }
    return null;
}

// START COMMAND
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const username = msg.from.username || msg.from.first_name;

    // Initialize wallet for user
    await initializeWallet(userId);

    // Fetch wallet to show addresses
    const wallet = await getWallet(userId);

    let welcomeMsg = `👋 Welcome, ${username}!\n\n`;
    welcomeMsg += `📱 SMS Number Rental & Activation\n\n`;

    if (wallet) {
        const btc = wallet.btc || {};
        const eth = wallet.eth || {};
        const usdt = wallet.usdt || {};

        welcomeMsg += `🔐 Your deposit addresses:\n`;
        if (btc.address) welcomeMsg += `• BTC: \`${btc.address}\`\n`;
        if (eth.address) welcomeMsg += `• ETH: \`${eth.address}\`\n`;
        if (usdt.address) welcomeMsg += `• USDT: \`${usdt.address}\`\n`;
        welcomeMsg += `\n`;
    } else {
        welcomeMsg += `💰 Your wallet has been initialized!\n\n`;
    }

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
