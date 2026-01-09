require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");

const BOT_TOKEN = process.env.BOT_TOKEN;
const MINI_APP_URL = process.env.MINI_APP_URL || "http://localhost:3000";
const API_URL = process.env.API_URL || "http://localhost:3000";

if (!BOT_TOKEN) {
    console.error("❌ ERROR: BOT_TOKEN not set in .env file!");
    console.log("💡 Please create a .env file with: BOT_TOKEN=your_bot_token_here");
    process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

bot.getMe()
    .then((botInfo) => {
        console.log("✅ Bot started successfully!");
        console.log(`🤖 Bot username: @${botInfo.username}`);
        console.log(`🆔 Bot ID: ${botInfo.id}`);
    })
    .catch((error) => {
        console.error("❌ Failed to connect to Telegram:", error.message);
        console.error("💡 Check your BOT_TOKEN in .env file");
        process.exit(1);
    });

async function sendMainMenu(chatId, message = "Welcome to SMS Number Rental!") {
    try {
        await bot.sendMessage(chatId, message, {
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
    } catch (error) {
        console.error(`❌ Error sending message to chat ${chatId}:`, error.message);
        try {
            await bot.sendMessage(chatId, message || "Welcome to SMS Number Rental!");
        } catch (fallbackError) {
            console.error(`❌ Failed to send fallback message to chat ${chatId}:`, fallbackError.message);
        }
    }
}

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

bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    const username = msg.from?.username || msg.from?.first_name || "User";

    console.log(`📥 /start command received from user ${userId} (${username}) in chat ${chatId}`);

    let welcomeMsg = `👋 Welcome, ${username}!\n\n`;
    welcomeMsg += `📱 SMS Number Rental & Activation\n\n`;
    welcomeMsg += `Click the button below to open the Mini App:`;

    try {
        await bot.sendMessage(chatId, welcomeMsg, {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: "📱 Open Mini App",
                            web_app: { url: MINI_APP_URL }
                        }
                    ]
                ]
            },
            parse_mode: 'Markdown'
        });
        console.log(`✅ Welcome message sent to user ${userId}`);

        if (userId) {
            setTimeout(async () => {
                try {
                    await initializeWallet(userId);
                    const wallet = await getWallet(userId);
                    
                    if (wallet) {
                        const btc = wallet.btc || {};
                        const eth = wallet.eth || {};
                        const usdt = wallet.usdt || {};

                        let addressesMsg = `🔐 Your deposit addresses:\n`;
                        if (btc.address) addressesMsg += `• BTC: \`${btc.address}\`\n`;
                        if (eth.address) addressesMsg += `• ETH: \`${eth.address}\`\n`;
                        if (usdt.address) addressesMsg += `• USDT: \`${usdt.address}\`\n`;

                        await bot.sendMessage(chatId, addressesMsg, { parse_mode: 'Markdown' });
                    }
                } catch (walletError) {
                    console.error(`⚠️ Wallet operations failed for user ${userId}:`, walletError.message);
                }
            }, 500);
        }
    } catch (error) {
        console.error(`❌ Error sending /start response to user ${userId}:`, error.message);
        console.error(`❌ Full error:`, error);
        
        try {
            await bot.sendMessage(chatId, `👋 Welcome, ${username}!\n\n📱 SMS Number Rental & Activation`);
        } catch (simpleError) {
            console.error(`❌ Failed to send even simple message:`, simpleError.message);
        }
    }
});

bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const userId = msg.from?.id;
    const username = msg.from?.username || msg.from?.first_name;

    console.log(`📨 Message received from user ${userId} (${username}):`, text || "(no text)");

    if (text && !text.startsWith("/")) {
        try {
            await sendMainMenu(chatId, "Click the button below to open the Mini App:");
        } catch (error) {
            console.error(`❌ Error handling message from chat ${chatId}:`, error.message);
        }
    }
});

bot.on("polling_error", (error) => {
    console.error("❌ Polling error occurred:");
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    
    if (error.code === 'ETELEGRAM' && error.response?.body?.error_code === 409) {
        console.error("❌ ERROR: Another bot instance is running!");
        console.error("💡 Please stop all other instances of this bot and restart.");
        console.error("💡 On Windows, check with: tasklist | findstr node");
    } else if (error.code === 'ETELEGRAM' && error.response?.body?.error_code === 401) {
        console.error("❌ ERROR: Invalid bot token!");
        console.error("💡 Check your BOT_TOKEN in .env file");
    } else {
        console.error("Full error:", error);
    }
});

bot.onText(/\/test/, async (msg) => {
    const chatId = msg.chat.id;
    try {
        await bot.sendMessage(chatId, "✅ Bot is working! Test message received.");
        console.log(`✅ /test command responded to chat ${chatId}`);
    } catch (error) {
        console.error(`❌ Error responding to /test:`, error.message);
    }
});

console.log("🤖 Telegram Bot is ready!");
console.log(`📱 Mini App URL: ${MINI_APP_URL}`);
console.log("💡 Use /start in Telegram to begin!");
