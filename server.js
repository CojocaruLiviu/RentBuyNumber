require("dotenv").config();

const path = require("path");
const { existsSync } = require("fs");

let initialDbUrl = process.env.DATABASE_URL || "file:./dateev.db";

// Extract path and resolve to absolute
const dbPath = initialDbUrl.replace(/^file:/, "").replace(/^\/+/, "");
const absoluteDbPath = path.isAbsolute(dbPath) 
    ? path.normalize(dbPath) 
    : path.resolve(__dirname, dbPath);

// Ensure directory exists
const dbDir = path.dirname(absoluteDbPath);
if (!existsSync(dbDir)) {
    require("fs").mkdirSync(dbDir, { recursive: true });
}

// Set DATABASE_URL to absolute path BEFORE Prisma imports
process.env.DATABASE_URL = `file:${path.normalize(absoluteDbPath)}`;

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const fs = require("fs").promises;
const crypto = require("crypto");
const { ethers } = require("ethers");
const { PrismaClient } = require("@prisma/client");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
const Database = require("better-sqlite3");

const app = express();
const PORT = process.env.PORT || 3000;
const REACT_APP_API_URL = process.env.REACT_APP_API_URL || `https://smsback.workdomain.site`;
const HERO_SMS_API_KEY = process.env.HERO_SMS_API_KEY;
const HERO_SMS_API_URL = process.env.HERO_SMS_API_URL || "https://hero-sms.com/stubs/handler_api.php";

const DATABASE_URL = process.env.DATABASE_URL;

// Verify it's set before creating adapter
if (!process.env.DATABASE_URL || typeof process.env.DATABASE_URL !== 'string' || process.env.DATABASE_URL.trim() === '') {
    throw new Error(`DATABASE_URL must be a non-empty string before creating Prisma adapter. Got: ${typeof process.env.DATABASE_URL}`);
}

// Log DATABASE_URL for debugging
console.log("📝 DATABASE_URL set to:", process.env.DATABASE_URL);
console.log("📝 DATABASE_URL type:", typeof process.env.DATABASE_URL);
console.log("📝 Absolute DB path:", absoluteDbPath);
console.log("📝 Adapter will use URL:", `file:${absoluteDbPath}`);

if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL is undefined right before adapter creation!");
    process.env.DATABASE_URL = DATABASE_URL; // Re-set it
}

// Ensure DATABASE_URL is definitely a valid string
const currentDbUrl = process.env.DATABASE_URL;
if (!currentDbUrl || typeof currentDbUrl !== 'string') {
    console.error("❌ DATABASE_URL validation failed:", currentDbUrl, typeof currentDbUrl);
    process.env.DATABASE_URL = DATABASE_URL;
    console.log("🔄 Reset DATABASE_URL to:", process.env.DATABASE_URL);
}

let adapter;
try {
    const adapterConfig = {
        url: `file:${absoluteDbPath}`
    };
    const adapterOptions = {};
    
    // Create adapter factory with config containing URL
    adapter = new PrismaBetterSqlite3(adapterConfig, adapterOptions);
    
    const originalConnect = adapter.connect.bind(adapter);
    adapter.connect = function() {
        process.env.DATABASE_URL = `file:${absoluteDbPath}`;
        return originalConnect();
    };
    
    console.log("✅ Adapter created with config URL:", adapterConfig.url);
} catch (error) {
    console.error("❌ Error creating Prisma adapter:", error);
    console.error("DATABASE_URL at time of error:", process.env.DATABASE_URL);
    throw error;
}

process.env.DATABASE_URL = `file:${absoluteDbPath}`;
const prisma = new PrismaClient({ adapter });

process.env.DATABASE_URL = `file:${absoluteDbPath}`;

try {
    if (adapter && typeof adapter === 'object') {
        console.log("✅ Adapter created, DATABASE_URL available:", process.env.DATABASE_URL);
    }
} catch (e) {
    console.warn("⚠️ Could not verify adapter config:", e.message);
}

// Helper function to get or create user with balance 0 USDT
async function getOrCreateUser(userId) {
    try {
        const userIdStr = userId.toString();
        console.log(`[getOrCreateUser] Checking for user: ${userIdStr}`);
        
        // Check if user exists
        let user = await prisma.users.findUnique({
            where: { idTelegram: userIdStr }
        });

        if (user) {
            console.log(`[getOrCreateUser] User ${userIdStr} already exists with ID: ${user.id}`);
            return user;
        }

        // If user doesn't exist, create new user with balance 0
        console.log(`[getOrCreateUser] Creating new user: ${userIdStr}`);
            user = await prisma.users.create({
                data: {
                idTelegram: userIdStr,
                    SummDolar: 0
                }
            });
        
        console.log(`✅ New user created: ${userId} with balance 0 USDT (DB ID: ${user.id})`);
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const verifyUser = await prisma.users.findUnique({
            where: { idTelegram: userIdStr }
        });
        
        if (verifyUser) {
            console.log(`[getOrCreateUser] ✅ Verified: User ${userIdStr} saved successfully (ID: ${verifyUser.id}, Balance: ${verifyUser.SummDolar})`);
        } else {
            console.error(`[getOrCreateUser] ❌ WARNING: User ${userIdStr} was not found after creation!`);
            console.error(`[getOrCreateUser] ❌ This indicates the write operation may have failed silently.`);
        }

        return user;
    } catch (error) {
        console.error(`❌ Error getting/creating user ${userId}:`, error);
        console.error(`❌ Error details:`, {
            message: error.message,
            code: error.code,
            meta: error.meta
        });
        throw error;
    }
}

// Increase header size limits to prevent 431 error
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// CORS configuration
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Serve static files
app.use(express.static(path.join(__dirname, "frontend", "build")));

// Check API key
if (!HERO_SMS_API_KEY) {
    console.warn("⚠️ WARNING: HERO_SMS_API_KEY not set. API endpoints will return errors.");
}

async function heroSmsRequest(action, params = {}) {
    if (!HERO_SMS_API_KEY) {
        return { error: "API key not configured" };
    }

    try {
        // Build query parameters: action and api_key first, then other params
        const queryParams = new URLSearchParams({
            action: action,
            api_key: HERO_SMS_API_KEY
        });

        // Add additional parameters
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== null) {
                queryParams.append(key, params[key]);
            }
        });

        // Use browser-like headers to bypass Cloudflare
        const response = await axios.get(`${HERO_SMS_API_URL}?${queryParams.toString()}`, {
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Cache-Control': 'max-age=0',
                'Referer': 'https://hero-sms.com/'
            },
            maxRedirects: 5,
            validateStatus: function (status) {
                return status >= 200 && status < 400;
            }
        });
        
        // Check if response is HTML (Cloudflare challenge page)
        const contentType = response.headers['content-type'] || '';
        if (contentType.includes('text/html') || typeof response.data === 'string') {
            const responseText = typeof response.data === 'string' ? response.data : String(response.data);
            
            // Check if it's a Cloudflare challenge page
            if (responseText.includes('Just a moment') || responseText.includes('cf-challenge') || 
                responseText.includes('challenge-platform') || responseText.includes('Enable JavaScript')) {
                console.warn("⚠️ Cloudflare challenge detected for action:", action);
                return { 
                    error: "Cloudflare protection detected. The API may need a few moments to process. Please try again.",
                    cloudflare: true
                };
            }
        }
        
        // Hero-SMS API can return JSON or plain text
        let data = response.data;
        
        // Try to parse as JSON first
        if (typeof data === 'string') {
            const trimmed = data.trim();
            // Check if it's JSON
            if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                try {
                    data = JSON.parse(trimmed);
                    return { data: data, isJson: true };
                } catch (e) {
                    // Not valid JSON, treat as text
                    data = trimmed;
                }
            } else {
                data = trimmed;
            }
        }
        
        // Check for error responses (text format)
        if (typeof data === 'string') {
            if (data.startsWith("ERROR") || data.startsWith("BAD") || data.startsWith("NO_") || 
                data.startsWith("BANNED") || data.startsWith("ACCOUNT_INACTIVE")) {
                return { error: data };
            }
        }
        
        return { data: data, isJson: typeof data === 'object' };
    } catch (error) {
        // Check response data for Cloudflare challenge
        if (error.response && error.response.data) {
            const responseData = typeof error.response.data === 'string' ? error.response.data : String(error.response.data);
            if (responseData.includes('Just a moment') || responseData.includes('cf-challenge') ||
                responseData.includes('challenge-platform') || responseData.includes('Enable JavaScript')) {
                console.warn("⚠️ Cloudflare challenge detected in error response for action:", action);
                return { 
                    error: "Cloudflare protection detected. Please wait a moment and try again.",
                    cloudflare: true
                };
            }
        }
        
        console.error("Hero-SMS API error for action:", action, "Error:", error.response?.status, error.message);
        return { 
            error: error.response?.data?.message || error.message || "API request failed",
            status: error.response?.status 
        };
    }
}

// Parse balance response (format: "ACCESS_BALANCE:123.45" or JSON)
function parseBalance(response) {
    if (response.error) return null;
    
    // If response is an object (JSON format)
    if (typeof response.data === 'object' && response.data !== null) {
        if (typeof response.data.balance === 'number') {
            return response.data.balance;
        }
        if (typeof response.data.data === 'number') {
            return response.data.data;
        }
    }
    
    // Handle string format: "ACCESS_BALANCE:123.45"
    if (typeof response.data === 'string') {
        const parts = response.data.split(":");
        if (parts[0] === "ACCESS_BALANCE" && parts[1]) {
            return parseFloat(parts[1]);
        }
    }
    
    return null;
}

// Parse countries response (format: "0:Russia:RU,1:USA:US,..." or JSON array/object)
function parseCountries(response) {
    if (response.error) return [];
    
    // If response is already an array (JSON format), return it
    if (Array.isArray(response.data)) {
        return response.data;
    }
    
    // If response is an object with countries array
    if (typeof response.data === 'object' && response.data !== null) {
        // Check for nested arrays
        if (Array.isArray(response.data.countries)) {
            return response.data.countries;
        }
        if (Array.isArray(response.data.data)) {
            return response.data.data;
        }
        
        // Handle object with numeric keys (like {'106': {id: 106, eng: 'Swaziland', ...}, ...})
        // This is the format returned by Hero-SMS API
        const countries = [];
        const keys = Object.keys(response.data);
        
        // Check if it's an object with country objects as values
        if (keys.length > 0 && typeof response.data[keys[0]] === 'object' && response.data[keys[0]].id) {
            keys.forEach(key => {
                const country = response.data[key];
                if (country && country.id && country.visible !== 0) {
                    // Use English name as primary, fallback to Russian or ID
                    const name = country.eng || country.rus || country.name || `Country ${country.id}`;
                    // Try to get country code from common properties or use ID
                    const code = country.code || country.iso || country.id.toString();
                    countries.push({
                        id: country.id.toString(),
                        name: name,
                        code: code,
                        rus: country.rus,
                        eng: country.eng,
                        visible: country.visible,
                        rent: country.rent,
                        retry: country.retry
                    });
                }
            });
            return countries;
        }
    }
    
    // Handle string format: "0:Russia:RU,1:USA:US,..."
    if (typeof response.data === 'string') {
        const countries = [];
        const parts = response.data.split(",");
        parts.forEach(part => {
            const [id, name, code] = part.split(":");
            if (id && name && code) {
                countries.push({ id, name, code });
            }
        });
        return countries;
    }
    
    return [];
}

// Parse services response (format: "service1:count:price,service2:count:price,..." or JSON array/object)
function parseServices(response) {
    if (response.error) return [];
    
    // If response is already an array (JSON format), map code to id
    if (Array.isArray(response.data)) {
        return response.data.map(service => ({
            id: service.code || service.id,
            name: service.name || service.code || service.id,
            code: service.code,
            count: service.count || 0,
            price: service.price || 0
        }));
    }
    
    // If response is an object with services array
    if (typeof response.data === 'object' && response.data !== null) {
        // Check for nested arrays
        if (Array.isArray(response.data.services)) {
            // Format: {"status":"success","services":[{"code":"tg","name":"Telegram"},...]}
            // Map code to id for consistency
            return response.data.services.map(service => ({
                id: service.code || service.id,
                name: service.name || service.code || service.id,
                code: service.code,
                count: service.count || 0,
                price: service.price || 0
            }));
        }
        if (Array.isArray(response.data.data)) {
            // Map code to id if present
            return response.data.data.map(service => ({
                id: service.code || service.id,
                name: service.name || service.code || service.id,
                code: service.code,
                count: service.count || 0,
                price: service.price || 0
            }));
        }
        
        // Handle object with service keys (like {'telegram': {count: 100, price: 5.0}, ...})
        const services = [];
        const keys = Object.keys(response.data);
        
        // Check if it's an object with service objects as values
        if (keys.length > 0) {
            keys.forEach(key => {
                const serviceData = response.data[key];
                // Handle different object structures
                if (typeof serviceData === 'object' && serviceData !== null) {
                    // Format: {service: {count: 100, price: 5.0}}
                    if (typeof serviceData.count !== 'undefined' || typeof serviceData.price !== 'undefined') {
                        services.push({
                            id: key,
                            name: key,
                            count: parseInt(serviceData.count || 0),
                            price: parseFloat(serviceData.price || 0)
                        });
                    }
                    // Format: {service: {name: 'Telegram', ...}}
                    else if (serviceData.name || serviceData.id) {
                        services.push({
                            id: serviceData.id || key,
                            name: serviceData.name || key,
                            count: parseInt(serviceData.count || 0),
                            price: parseFloat(serviceData.price || 0)
                        });
                    }
                }
                // Handle simple key-value pairs where value might be a number (price or count)
                else if (typeof serviceData === 'number') {
                    services.push({
                        id: key,
                        name: key,
                        count: 0,
                        price: parseFloat(serviceData)
                    });
                }
            });
            if (services.length > 0) {
                return services;
            }
        }
    }
    
    // Handle string format: "service1:count:price,service2:count:price,..."
    if (typeof response.data === 'string') {
        const services = [];
        if (response.data === "NO_NUMBERS" || response.data === "BAD_ACTION" || response.data.startsWith("ERROR")) {
            return [];
        }
        
        const parts = response.data.split(",");
        parts.forEach(part => {
            const [service, count, price] = part.split(":");
            if (service && count && price) {
                services.push({ 
                    id: service, 
                    name: service, 
                    count: parseInt(count) || 0, 
                    price: parseFloat(price) || 0
                });
            }
        });
        return services;
    }
    
    return [];
}

// Parse number response (format: "ACCESS_NUMBER:id:number" or "ACCESS_RENT:id:number" or JSON)
function parseNumber(response) {
    if (response.error) return null;
    
    // If response is an object (JSON format)
    if (typeof response.data === 'object' && response.data !== null) {
        if (response.data.id && response.data.number) {
            return {
                success: true,
                id: response.data.id.toString(),
                number: response.data.number.toString()
            };
        }
        if (response.data.data && response.data.data.id && response.data.data.number) {
            return {
                success: true,
                id: response.data.data.id.toString(),
                number: response.data.data.number.toString()
            };
        }
    }
    
    // Handle string format: "ACCESS_NUMBER:id:number" or "ACCESS_RENT:id:number"
    if (typeof response.data === 'string') {
        const parts = response.data.split(":");
        if ((parts[0] === "ACCESS_NUMBER" || parts[0] === "ACCESS_RENT") && parts.length >= 3) {
            return {
                success: true,
                id: parts[1],
                number: parts[2]
            };
        }
    }
    
    return null;
}

// API Routes

// Get account balance
app.get("/api/balance", async (req, res) => {
    const result = await heroSmsRequest("getBalance");
    if (result.error) {
        // Return specific status for Cloudflare protection
        if (result.cloudflare) {
            return res.status(503).json({ 
                error: result.error,
                cloudflare: true,
                retryAfter: 60 // Suggest retry after 60 seconds
            });
        }
        return res.status(400).json({ error: result.error });
    }
    
    const balance = parseBalance(result);
    if (balance === null) {
        return res.status(400).json({ error: "Failed to parse balance. Response: " + (result.data || "empty") });
    }
    
    res.json({ balance: balance, currency: "USD" });
});

// Get available countries
app.get("/api/countries", async (req, res) => {
    const result = await heroSmsRequest("getCountries");
    if (result.error) {
        console.error("Error fetching countries:", result.error);
        return res.status(400).json({ error: result.error });
    }
    
    try {
        const countries = parseCountries(result);
        if (!Array.isArray(countries) || countries.length === 0) {
            console.warn("No countries found or invalid format. Response data:", typeof result.data, result.data);
            return res.status(400).json({ 
                error: "Failed to load countries. Invalid response format.",
                debug: typeof result.data === 'object' ? "Response is object, not string" : "Response format not recognized"
            });
        }
        res.json({ data: countries });
    } catch (error) {
        console.error("Error parsing countries:", error);
        return res.status(500).json({ 
            error: "Failed to parse countries response",
            details: error.message 
        });
    }
});

// Get services for a country
app.get("/api/services/:countryId", async (req, res) => {
    const { countryId } = req.params;
    
    console.log(`Fetching services for country: ${countryId}`);
    
    // Try getServicesList with country parameter first
    let result = await heroSmsRequest("getServicesList", { country: countryId });
    console.log("getServicesList response:", result.error ? result.error : "Success", typeof result.data);
    
    // If that fails or returns BAD_ACTION, try getNumbersStatus
    if (result.error || 
        (typeof result.data === 'string' && (result.data === "BAD_ACTION" || result.data.startsWith("ERROR"))) ||
        !result.data || 
        (Array.isArray(result.data) && result.data.length === 0) || 
        (typeof result.data === 'object' && Object.keys(result.data).length === 0)) {
        console.log("getServicesList returned empty/error, trying getNumbersStatus");
        result = await heroSmsRequest("getNumbersStatus", { country: countryId });
        console.log("getNumbersStatus response:", result.error ? result.error : "Success", typeof result.data);
    }
    
    if (result.error) {
        console.error("Error fetching services for country:", countryId, result.error);
        return res.status(400).json({ error: result.error });
    }
    
    try {
        const services = parseServices(result);
        console.log(`Parsed ${services.length} services for country ${countryId}`);
        if (services.length > 0) {
            console.log("Sample services (first 3):", services.slice(0, 3).map(s => ({ id: s.id, name: s.name })));
        }
        if (!Array.isArray(services) || services.length === 0) {
            console.warn("No services found for country:", countryId);
            console.warn("Raw response data type:", typeof result.data);
            console.warn("Raw response data sample:", typeof result.data === 'object' ? 
                JSON.stringify(result.data).substring(0, 200) : result.data?.substring(0, 200));
        }
        res.json({ data: services });
    } catch (error) {
        console.error("Error parsing services:", error);
        console.error("Response data:", result.data);
        return res.status(500).json({ 
            error: "Failed to parse services response",
            details: error.message 
        });
    }
});

// Get services list (all services)
app.get("/api/services", async (req, res) => {
    const { country } = req.query;
    const params = country ? { country: country } : {};
    
    const result = await heroSmsRequest("getServicesList", params);
    
    if (result.error) {
        console.error("Error fetching services list:", result.error);
        return res.status(400).json({ error: result.error });
    }
    
    try {
        const services = parseServices(result);
        res.json({ data: services });
    } catch (error) {
        console.error("Error parsing services:", error);
        return res.status(500).json({ 
            error: "Failed to parse services response",
            details: error.message 
        });
    }
});

// Rent a number
app.post("/api/rent", async (req, res) => {
    const { countryId, hours } = req.body;
    
    if (!countryId) {
        return res.status(400).json({ error: "countryId is required" });
    }

    const result = await heroSmsRequest("rentNumber", {
        country: countryId,
        hours: hours || 24
    });

    if (result.error) {
        return res.status(400).json({ error: result.error });
    }
    
    const numberData = parseNumber(result);
    if (!numberData) {
        return res.status(400).json({ error: "Failed to parse number response" });
    }
    
    res.json({ 
        success: true,
        id: numberData.id,
        number: numberData.number,
        country: countryId,
        hours: hours || 24
    });
});

// Get price for a service in a country
app.get("/api/price", async (req, res) => {
    const { countryId, service } = req.query;
    
    if (!countryId || !service) {
        return res.status(400).json({ error: "countryId and service are required" });
    }

    // Decode URL-encoded service name (e.g., "Claude+" from "Claude ")
    const decodedService = decodeURIComponent(service);
    console.log(`Fetching price for country: ${countryId}, service: ${decodedService}`);

    // Format: ?action=getPrices&api_key=KEY&country=2&service=tg
    // Note: API expects service code (like "tg"), not display name (like "Telegram")
    // Try with the service as-is first (might be a code), then try lowercase
    let serviceToTry = decodedService;
    const result = await heroSmsRequest("getPrices", {
        country: countryId,
        service: serviceToTry
    });

    if (result.error) {
        console.error("Error from API:", result.error);
        return res.status(400).json({ error: result.error });
    }
    
    // Response format: {"2":{"tg":{"cost":2,"count":0,"physicalCount":0}}}
    // OR error format: {"status":"false","msg":"service is incorrect"}
    try {
        let priceData = result.data;
        
        // If it's a string, try to parse as JSON
        if (typeof priceData === 'string') {
            try {
                priceData = JSON.parse(priceData);
            } catch (parseError) {
                console.error("Failed to parse JSON string:", parseError);
                console.error("Raw response:", priceData);
                return res.status(400).json({ error: "Invalid JSON response from API" });
            }
        }
        
        console.log("Price data received:", JSON.stringify(priceData));
        
        // Check for error response format
        if (priceData && typeof priceData === 'object' && priceData.status === "false") {
            const errorMsg = priceData.msg || "Service is incorrect";
            console.error("API returned error:", errorMsg);
            
            // Try with lowercase service name (API might expect lowercase codes)
            if (serviceToTry !== serviceToTry.toLowerCase()) {
                console.log(`Retrying with lowercase service: ${serviceToTry.toLowerCase()}`);
                const retryResult = await heroSmsRequest("getPrices", {
                    country: countryId,
                    service: serviceToTry.toLowerCase()
                });
                
                if (!retryResult.error && retryResult.data) {
                    let retryPriceData = retryResult.data;
                    if (typeof retryPriceData === 'string') {
                        try {
                            retryPriceData = JSON.parse(retryPriceData);
                        } catch (e) {
                            // Ignore parse error, use original error
                        }
                    }
                    
                    // If retry succeeded (no error status), use that result
                    if (retryPriceData && typeof retryPriceData === 'object' && retryPriceData.status !== "false") {
                        priceData = retryPriceData;
                        serviceToTry = serviceToTry.toLowerCase();
                    } else {
                        return res.status(400).json({ 
                            error: errorMsg,
                            hint: "Service name might need to be in lowercase or use service code (e.g., 'tg' instead of 'Telegram')"
                        });
                    }
                } else {
                    return res.status(400).json({ 
                        error: errorMsg,
                        hint: "Service name might need to be in lowercase or use service code (e.g., 'tg' instead of 'Telegram')"
                    });
                }
            } else {
                return res.status(400).json({ 
                    error: errorMsg,
                    hint: "Service name might need to be in lowercase or use service code (e.g., 'tg' instead of 'Telegram')"
                });
            }
        }
        
        // Extract price info from nested structure
        if (typeof priceData === 'object' && priceData !== null) {
            const countryKey = countryId.toString();
            
            // Check if country key exists in response
            if (!priceData[countryKey]) {
                console.warn(`Country key ${countryKey} not found in response. Available keys:`, Object.keys(priceData));
                // Try to find any country key if exact match fails
                const availableCountryKeys = Object.keys(priceData).filter(key => key !== 'status' && key !== 'msg');
                if (availableCountryKeys.length > 0) {
                    const firstCountryKey = availableCountryKeys[0];
                    console.log(`Trying with country key: ${firstCountryKey}`);
                    if (priceData[firstCountryKey]) {
                        const countryData = priceData[firstCountryKey];
                        // Try to find service - check exact match first, then try case-insensitive
                        let serviceData = countryData[serviceToTry] || countryData[decodedService] || countryData[service];
                        
                        // If not found, try to find by matching any key (case-insensitive)
                        if (!serviceData) {
                            const serviceKeys = Object.keys(countryData);
                            const matchingKey = serviceKeys.find(key => 
                                key.toLowerCase() === serviceToTry.toLowerCase() ||
                                key.toLowerCase() === decodedService.toLowerCase() || 
                                key.toLowerCase() === service.toLowerCase()
                            );
                            if (matchingKey) {
                                serviceData = countryData[matchingKey];
                                console.log(`Found service with key: ${matchingKey}`);
                            }
                        }
                        
                        if (serviceData && typeof serviceData === 'object') {
                            return res.json({
                                success: true,
                                country: countryId,
                                service: serviceToTry,
                                cost: serviceData.cost || 0,
                                count: serviceData.count || 0,
                                physicalCount: serviceData.physicalCount || 0
                            });
                        }
                    }
                }
                return res.status(400).json({ 
                    error: "Service not found for this country",
                    debug: `Country ${countryKey} not found. Available: ${Object.keys(priceData).join(', ')}`
                });
            }
            
            const countryData = priceData[countryKey];
            
            // Try exact match first
            let serviceData = countryData[serviceToTry] || countryData[decodedService] || countryData[service];
            
            // If not found, try case-insensitive match
            if (!serviceData) {
                const serviceKeys = Object.keys(countryData);
                const matchingKey = serviceKeys.find(key => 
                    key.toLowerCase() === serviceToTry.toLowerCase() ||
                    key.toLowerCase() === decodedService.toLowerCase() || 
                    key.toLowerCase() === service.toLowerCase()
                );
                if (matchingKey) {
                    serviceData = countryData[matchingKey];
                    console.log(`Found service with key: ${matchingKey} (case-insensitive match)`);
                }
            }
            
            if (serviceData && typeof serviceData === 'object') {
                return res.json({
                    success: true,
                    country: countryId,
                    service: serviceToTry,
                    cost: serviceData.cost || 0,
                    count: serviceData.count || 0,
                    physicalCount: serviceData.physicalCount || 0
                });
            } else {
                console.warn(`Service ${serviceToTry} not found in country ${countryKey}`);
                console.warn("Available services:", Object.keys(countryData));
                return res.status(400).json({ 
                    error: "Service not found for this country",
                    debug: `Service '${serviceToTry}' not found. Available: ${Object.keys(countryData).join(', ')}`
                });
            }
        }
        
        console.error("Unexpected response format:", typeof priceData, priceData);
        return res.status(400).json({ error: "Failed to parse price data - unexpected format" });
    } catch (error) {
        console.error("Error parsing price:", error);
        console.error("Response data:", result.data);
        return res.status(500).json({ 
            error: "Failed to parse price response",
            details: error.message 
        });
    }
});

// Get number for activation
app.post("/api/activate", async (req, res) => {
    const { countryId, service, useV2, maxPrice } = req.body;
    
    if (!countryId || !service) {
        return res.status(400).json({ error: "countryId and service are required" });
    }

    // Use V2 if requested, otherwise use V1
    const action = useV2 ? "getNumberV2" : "getNumber";
    
    // Format: ?action=getNumber&api_key=KEY&country=2&service=tg&maxPrice=2
    const params = {
        country: countryId,
        service: service
    };
    
    // Add maxPrice if provided
    if (maxPrice !== undefined && maxPrice !== null) {
        params.maxPrice = maxPrice;
    }
    
    const result = await heroSmsRequest(action, params);

    if (result.error) {
        return res.status(400).json({ error: result.error });
    }
    
    // Response format: "ACCESS_NUMBER:id:number" or "NO_NUMBERS"
    const numberData = parseNumber(result);
    if (!numberData) {
        return res.status(400).json({ error: result.data || "Failed to get number" });
    }
    
    res.json({ 
        success: true,
        id: numberData.id,
        number: numberData.number,
        country: countryId,
        service: service
    });
});

// Get activation status
app.get("/api/status/:activationId", async (req, res) => {
    const { activationId } = req.params;
    const { v2 } = req.query;
    
    // Use V2 if requested
    const action = v2 === 'true' ? "getStatusV2" : "getStatus";
    
    // Format: ?action=getStatus&api_key=KEY&id=12345
    const result = await heroSmsRequest(action, { id: activationId });
    
    if (result.error) {
        return res.status(400).json({ error: result.error });
    }
    
    // If JSON response (V2)
    if (result.isJson) {
        return res.json(result.data);
    }
    
    // Format: "STATUS_WAIT_CODE" or "STATUS_OK:code" or "STATUS_CANCEL"
    if (typeof result.data === 'string') {
        if (result.data.startsWith("STATUS_OK")) {
            const code = result.data.split(":")[1];
            res.json({ status: "OK", code: code });
        } else if (result.data === "STATUS_WAIT_CODE") {
            res.json({ status: "WAIT_CODE" });
        } else if (result.data === "STATUS_CANCEL") {
            res.json({ status: "CANCEL" });
        } else {
            res.json({ status: result.data });
        }
    } else {
        res.json(result.data);
    }
});

// Get SMS code (same as status, but returns code if available)
app.get("/api/sms/:activationId", async (req, res) => {
    const { activationId } = req.params;
    const result = await heroSmsRequest("getStatus", { id: activationId });
    
    if (result.error) {
        return res.status(400).json({ error: result.error });
    }
    
    // Format: "STATUS_OK:code"
    if (result.data.startsWith("STATUS_OK")) {
        const code = result.data.split(":")[1];
        res.json({ code: code, status: "OK" });
    } else {
        res.json({ status: result.data, code: null });
    }
});

// Cancel activation
app.post("/api/cancel/:activationId", async (req, res) => {
    const { activationId } = req.params;
    // Format: ?action=setStatus&api_key=KEY&id=12345&status=8
    // Status 8 = cancel activation
    const result = await heroSmsRequest("setStatus", { 
        id: activationId,
        status: 8
    });
    
    if (result.error) {
        return res.status(400).json({ error: result.error });
    }
    
    // Response: "ACCESS_CANCEL" on success
    if (result.data === "ACCESS_CANCEL") {
        res.json({ success: true, message: "Activation cancelled" });
    } else {
        res.json({ success: false, message: result.data });
    }
});

// Get rented numbers
app.get("/api/rented", async (req, res) => {
    // Note: Hero-SMS might use different action name, adjust if needed
    const result = await heroSmsRequest("getRentList");
    
    if (result.error) {
        return res.status(400).json({ error: result.error });
    }
    
    if (result.data === "NO_RENT" || result.data === "NO_NUMBERS") {
        return res.json({ data: [] });
    }
    
    // Parse rented numbers (format: "id:number:service:time,..." or JSON)
    let numbers = [];
    
    // Handle JSON response
    if (typeof result.data === 'object' && result.data !== null) {
        if (Array.isArray(result.data)) {
            numbers = result.data;
        } else if (Array.isArray(result.data.data)) {
            numbers = result.data.data;
        } else if (result.data.rented) {
            numbers = Array.isArray(result.data.rented) ? result.data.rented : [];
        }
    }
    // Handle string format: "id:number:service:time,..."
    else if (typeof result.data === 'string') {
        const parts = result.data.split(",");
        parts.forEach(part => {
            const [id, number, service, time] = part.split(":");
            if (id && number) {
                numbers.push({ 
                    id, 
                    number, 
                    service: service || "All", 
                    time: time || "N/A",
                    expires: time || null
                });
            }
        });
    }
    
    res.json({ data: numbers });
});

// Get SMS messages for a rented number
app.get("/api/rented/:rentId/sms", async (req, res) => {
    const { rentId } = req.params;
    
    // Use getStatus to get SMS for rented number
    const result = await heroSmsRequest("getStatus", { id: rentId });
    
    if (result.error) {
        return res.status(400).json({ error: result.error });
    }
    
    // Format: "STATUS_WAIT_CODE" or "STATUS_OK:code" or multiple codes
    if (typeof result.data === 'string') {
        const messages = [];
        if (result.data.startsWith("STATUS_OK")) {
            const parts = result.data.split(":");
            if (parts.length > 1) {
                // Multiple codes might be separated
                const codes = parts.slice(1);
                codes.forEach((code, index) => {
                    messages.push({
                        id: index + 1,
                        code: code.trim(),
                        text: code.trim(),
                        timestamp: new Date().toISOString()
                    });
                });
            }
        } else if (result.data === "STATUS_WAIT_CODE") {
            return res.json({ data: [], status: "WAIT_CODE" });
        } else if (result.data.includes(":")) {
            // Try to parse as code
            const code = result.data.split(":")[1];
            if (code) {
                messages.push({
                    id: 1,
                    code: code.trim(),
                    text: code.trim(),
                    timestamp: new Date().toISOString()
                });
            }
        }
        return res.json({ data: messages, status: messages.length > 0 ? "OK" : "WAIT_CODE" });
    }
    
    // JSON response
    if (result.isJson) {
        return res.json(result.data);
    }
    
    res.json({ data: [], status: "UNKNOWN" });
});

// Extend rental period (setStatus with status=1)
app.post("/api/rented/:rentId/extend", async (req, res) => {
    const { rentId } = req.params;
    const { hours } = req.body;
    
    // Format: ?action=setStatus&api_key=KEY&id=123456789&status=1
    // Status 1 = extend rental
    const result = await heroSmsRequest("setStatus", { 
        id: rentId,
        status: 1
    });
    
    if (result.error) {
        return res.status(400).json({ error: result.error });
    }
    
    // Response: "ACCESS_READY" or similar on success
    if (result.data && (result.data.includes("ACCESS") || result.data === "OK")) {
        res.json({ 
            success: true, 
            message: "Rental extended successfully",
            data: result.data
        });
    } else {
        res.json({ 
            success: false, 
            message: result.data || "Failed to extend rental",
            data: result.data
        });
    }
});

// Get active activations
app.get("/api/activations", async (req, res) => {
    const result = await heroSmsRequest("getActiveActivations");
    
    if (result.error) {
        return res.status(400).json({ error: result.error });
    }
    
    // Parse activations if needed
    res.json({ data: result.data });
});

// Get history
app.get("/api/history", async (req, res) => {
    const result = await heroSmsRequest("getHistory");
    
    if (result.error) {
        return res.status(400).json({ error: result.error });
    }
    
    res.json({ data: result.data });
});

// Get operators
app.get("/api/operators", async (req, res) => {
    const { countryId } = req.query;
    const params = countryId ? { country: countryId } : {};
    
    const result = await heroSmsRequest("getOperators", params);
    
    if (result.error) {
        return res.status(400).json({ error: result.error });
    }
    
    res.json({ data: result.data });
});

// Get prices
app.get("/api/prices", async (req, res) => {
    const { countryId, service } = req.query;
    const params = {};
    if (countryId) params.country = countryId;
    if (service) params.service = service;
    
    const result = await heroSmsRequest("getPrices", params);
    
    if (result.error) {
        return res.status(400).json({ error: result.error });
    }
    
    res.json({ data: result.data });
});

// Get top countries by service
app.get("/api/top-countries/:service", async (req, res) => {
    const { service } = req.params;
    const { freePrice } = req.query;
    
    const params = { service: service };
    if (freePrice === 'true') {
        params.freePrice = true;
    }
    
    const result = await heroSmsRequest("getTopCountriesByService", params);
    
    if (result.error) {
        return res.status(400).json({ error: result.error });
    }
    
    // This returns JSON format
    res.json({ data: result.data });
});

// Get top countries by service rank
app.get("/api/top-countries-rank/:service", async (req, res) => {
    const { service } = req.params;
    const { freePrice } = req.query;
    
    const params = { service: service };
    if (freePrice === 'true') {
        params.freePrice = true;
    }
    
    const result = await heroSmsRequest("getTopCountriesByServiceRank", params);
    
    if (result.error) {
        return res.status(400).json({ error: result.error });
    }
    
    // This returns JSON format
    res.json({ data: result.data });
});

// Wallet management
const WALLETS_DIR = path.join(__dirname, "@wallets");

// Ensure wallets directory exists
async function ensureWalletsDir() {
    if (!existsSync(WALLETS_DIR)) {
        await fs.mkdir(WALLETS_DIR, { recursive: true });
    }
}

// Initialize wallets directory on server start
ensureWalletsDir().catch(err => {
    console.error("Failed to create wallets directory:", err);
});

// Get wallet file path
function getWalletPath(userId) {
    return path.join(WALLETS_DIR, `${userId}.json`);
}

// Default wallet structure (per coin: address + balance + privateKey)
const DEFAULT_WALLET = {
    btc: { address: "", balance: "0", privateKey: "" },
    eth: { address: "", balance: "0", privateKey: "" },
    usdt: { address: "", balance: "0", privateKey: "" }
};

// Generate a deterministic private key (64 hex chars = 32 bytes) based on userId and symbol
function generatePrivateKey(symbol, userId) {
    // Use a different seed for private key to ensure it's different from address
    const hash = crypto
        .createHash("sha256")
        .update(`${symbol}:${userId}:telegram-wallet-private-key`)
        .digest("hex");
    // Return 64 hex characters (32 bytes) for private key
    return hash;
}

// Generate a pseudo-address that looks like an EVM address (NOT a real wallet, but stable per user+coin)
function generateWalletAddress(symbol, userId) {
    const hash = crypto
        .createHash("sha256")
        .update(`${symbol}:${userId}:telegram-wallet`)
        .digest("hex");
    // Take first 40 hex chars to form 0x + 40 hex address
    return `0x${hash.slice(0, 40)}`;
}

// Normalize wallet to ensure it has address + balance + privateKey for each coin
function normalizeWallet(rawWallet, userId) {
    const wallet = rawWallet || {};

    const normalizeCoin = (key) => {
        const value = wallet[key];
        // If already in { address, balance, privateKey } format
        if (value && typeof value === "object" && ("balance" in value || "address" in value || "privateKey" in value)) {
            return {
                address: value.address || generateWalletAddress(key, userId),
                balance: value.balance !== undefined ? value.balance.toString() : "0",
                privateKey: value.privateKey || generatePrivateKey(key, userId)
            };
        }
        // Legacy format: simple number/string
        if (value !== undefined && value !== null) {
            return {
                address: generateWalletAddress(key, userId),
                balance: value.toString(),
                privateKey: generatePrivateKey(key, userId)
            };
        }
        // No value yet: use default
        return {
            address: generateWalletAddress(key, userId),
            balance: "0",
            privateKey: generatePrivateKey(key, userId)
        };
    };

    return {
        btc: normalizeCoin("btc"),
        eth: normalizeCoin("eth"),
        usdt: normalizeCoin("usdt")
    };
}

// BSC Configuration pentru verificare balance real
const BSC_RPC = process.env.BSC_RPC_URL || "https://bsc-dataseed1.binance.org/";
const USDT_CONTRACT_BSC = "0x55d398326f99059fF775485246999027B3197955"; // USDT pe BSC
const ERC20_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)"
];

// Provider pentru BSC (lazy initialization)
let bscProvider = null;
function getBSCProvider() {
    if (!bscProvider) {
        bscProvider = new ethers.JsonRpcProvider(BSC_RPC);
    }
    return bscProvider;
}

/**
 * Verifică balance-ul real USDT de pe blockchain (BSC)
 */
async function getRealUSDTBalance(address) {
    try {
        if (!address || !ethers.isAddress(address)) {
            console.warn(`[getRealUSDTBalance] Adresă invalidă: ${address}`);
            return null;
        }

        const provider = getBSCProvider();
        const normalizedAddress = ethers.getAddress(address);
        const usdtContract = new ethers.Contract(USDT_CONTRACT_BSC, ERC20_ABI, provider);

        const [balance, decimals] = await Promise.all([
            usdtContract.balanceOf(normalizedAddress),
            usdtContract.decimals()
        ]);

        const formattedBalance = ethers.formatUnits(balance, decimals);
        const balanceNumber = parseFloat(formattedBalance);

        console.log(`[getRealUSDTBalance] ✅ Balance real pentru ${normalizedAddress}: ${formattedBalance} USDT`);

        return {
            balance: formattedBalance,
            balanceNumber: balanceNumber,
            balanceRaw: balance.toString(),
            decimals: Number(decimals)
        };
    } catch (error) {
        console.error(`[getRealUSDTBalance] ❌ Eroare la verificarea balance-ului real pentru ${address}:`, error.message);
        // Nu aruncăm eroarea, returnăm null pentru a nu bloca request-ul
        return null;
    }
}

// Get user wallet
app.get("/api/wallet/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        
        if (!userId || userId === "undefined") {
            return res.status(400).json({ error: "User ID is required" });
        }

        // Ensure user exists in database with balance 0 USDT
        const user = await getOrCreateUser(userId);

        await ensureWalletsDir();
        const walletPath = getWalletPath(userId);

        // Check if wallet exists
        let wallet;
        if (!existsSync(walletPath)) {
            // Create default wallet
            wallet = normalizeWallet({}, userId);
            await fs.writeFile(walletPath, JSON.stringify(wallet, null, 2), "utf8");
        } else {
        // Read existing wallet and normalize (handles legacy format)
        const walletData = await fs.readFile(walletPath, "utf8");
            wallet = normalizeWallet(JSON.parse(walletData), userId);

        // Persist normalized structure
        await fs.writeFile(walletPath, JSON.stringify(wallet, null, 2), "utf8");
        }

        // Verifică balance-ul real USDT de pe blockchain și sincronizează
        let realUSDTBalance = 0;
        if (wallet.usdt && wallet.usdt.address && ethers.isAddress(wallet.usdt.address)) {
            try {
                console.log(`[WALLET] Verificare balance real USDT pentru user ${userId}, adresă: ${wallet.usdt.address}`);
                const realBalance = await getRealUSDTBalance(wallet.usdt.address);
                
                if (realBalance) {
                    realUSDTBalance = realBalance.balanceNumber;
                    
                    if (realBalance.balanceNumber !== parseFloat(wallet.usdt.balance || "0")) {
                        console.log(`[WALLET] 🔄 Sincronizare balance: ${wallet.usdt.balance} -> ${realBalance.balance} USDT`);
                        // Actualizează balance-ul cu valoarea reală de pe blockchain
                        wallet.usdt.balance = realBalance.balance;
                        // Salvează în fișier
                        await fs.writeFile(walletPath, JSON.stringify(wallet, null, 2), "utf8");
                        console.log(`[WALLET] ✅ Balance sincronizat cu blockchain`);
                    } else {
                        console.log(`[WALLET] ✅ Balance deja sincronizat: ${realBalance.balance} USDT`);
                    }
                }
            } catch (error) {
                console.error(`[WALLET] ⚠️ Eroare la sincronizarea balance-ului real:`, error.message);
                // Continuă cu balance-ul din fișier dacă verificarea eșuează
                // Folosim balance-ul din fișier ca fallback
                realUSDTBalance = parseFloat(wallet.usdt.balance || "0");
            }
        } else {
            // Dacă nu avem adresă validă, folosim balance-ul din fișier
            realUSDTBalance = parseFloat(wallet.usdt?.balance || "0");
        }

        // Calculăm total balance = SummDolar (suma de bază) + balance USDT real de pe blockchain
        const baseBalance = user.SummDolar || 0;
        const totalBalance = baseBalance + realUSDTBalance;
        
        console.log(`[WALLET] 💰 Total balance calculat: ${baseBalance} (SummDolar) + ${realUSDTBalance} (USDT real) = ${totalBalance} USD`);

        res.json({ 
            success: true, 
            wallet,
            totalBalance: totalBalance // Total balance in USD from database
        });
    } catch (error) {
        console.error("Error getting wallet:", error);
        res.status(500).json({ error: "Failed to get wallet", details: error.message });
    }
});

// Create or update wallet
app.post("/api/wallet/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        const { btc, eth, usdt } = req.body;

        if (!userId || userId === "undefined") {
            return res.status(400).json({ error: "User ID is required" });
        }

        // Ensure user exists in database with balance 0 USDT
        await getOrCreateUser(userId);

        await ensureWalletsDir();
        const walletPath = getWalletPath(userId);

        // Load existing or default wallet and normalize
        let wallet;
        if (existsSync(walletPath)) {
            const walletData = await fs.readFile(walletPath, "utf8");
            wallet = normalizeWallet(JSON.parse(walletData), userId);
        } else {
            wallet = normalizeWallet({}, userId);
        }

        // Update wallet values if provided (expecting balances)
        if (btc !== undefined) wallet.btc.balance = btc.toString();
        if (eth !== undefined) wallet.eth.balance = eth.toString();
        if (usdt !== undefined) wallet.usdt.balance = usdt.toString();

        // Save wallet
        await fs.writeFile(walletPath, JSON.stringify(wallet, null, 2), "utf8");

        res.json({ success: true, wallet });
    } catch (error) {
        console.error("Error saving wallet:", error);
        res.status(500).json({ error: "Failed to save wallet", details: error.message });
    }
});

// Update wallet (partial update)
app.put("/api/wallet/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        const updates = req.body;

        if (!userId || userId === "undefined") {
            return res.status(400).json({ error: "User ID is required" });
        }

        // Ensure user exists in database with balance 0 USDT
        await getOrCreateUser(userId);

        await ensureWalletsDir();
        const walletPath = getWalletPath(userId);

        // Load existing or default wallet and normalize
        let wallet;
        if (existsSync(walletPath)) {
            const walletData = await fs.readFile(walletPath, "utf8");
            wallet = normalizeWallet(JSON.parse(walletData), userId);
        } else {
            wallet = normalizeWallet({}, userId);
        }

        // Update only provided fields (balances)
        if (updates.btc !== undefined) wallet.btc.balance = updates.btc.toString();
        if (updates.eth !== undefined) wallet.eth.balance = updates.eth.toString();
        if (updates.usdt !== undefined) wallet.usdt.balance = updates.usdt.toString();

        // Save wallet
        await fs.writeFile(walletPath, JSON.stringify(wallet, null, 2), "utf8");

        res.json({ success: true, wallet });
    } catch (error) {
        console.error("Error updating wallet:", error);
        res.status(500).json({ error: "Failed to update wallet", details: error.message });
    }
});

// Initialize wallet (called on app start)
app.post("/api/wallet/:userId/init", async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId || userId === "undefined") {
            return res.status(400).json({ error: "User ID is required" });
        }

        // Ensure user exists in database with balance 0 USDT
        await getOrCreateUser(userId);

        await ensureWalletsDir();
        const walletPath = getWalletPath(userId);

        console.log("[WALLET_INIT] Request to init wallet for user:", userId);
        console.log("[WALLET_INIT] Wallet path:", walletPath);

        // If wallet doesn't exist, create it
        if (!existsSync(walletPath)) {
            let wallet = normalizeWallet({}, userId);
            await fs.writeFile(walletPath, JSON.stringify(wallet, null, 2), "utf8");
            console.log("[WALLET_INIT] Wallet file created for user:", userId);
            return res.json({ success: true, wallet, created: true });
        }

        // Return existing wallet (normalized)
        const walletData = await fs.readFile(walletPath, "utf8");
        let wallet = normalizeWallet(JSON.parse(walletData), userId);

        // Persist normalized structure
        await fs.writeFile(walletPath, JSON.stringify(wallet, null, 2), "utf8");
        
        console.log("[WALLET_INIT] Wallet already exists for user:", userId);
        res.json({ success: true, wallet, created: false });
    } catch (error) {
        console.error("[WALLET_INIT] Error initializing wallet for user:", req.params.userId, error);
        res.status(500).json({ error: "Failed to initialize wallet", details: error.message });
    }
});

// Initialize user (called when mini app opens)
// This ensures the user exists in the database
app.post("/api/user/init/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        
        if (!userId || userId === "undefined") {
            return res.status(400).json({ error: "User ID is required" });
        }

        // Ensure user exists in database with balance 0 USDT
        const user = await getOrCreateUser(userId);
        
        console.log(`✅ User initialized: ${userId} (exists: ${!!user})`);
        
        res.json({ 
            success: true, 
            user: {
                id: user.id,
                idTelegram: user.idTelegram,
                balance: user.SummDolar
            },
            created: user.createdAt.getTime() === user.updatedAt.getTime() // New user if created = updated
        });
    } catch (error) {
        console.error("❌ Error initializing user:", error);
        res.status(500).json({ error: "Failed to initialize user", details: error.message });
    }
});

// Health check
app.get("/api/health", (req, res) => {
    res.json({ 
        status: "ok", 
        apiConfigured: !!HERO_SMS_API_KEY,
        apiUrl: HERO_SMS_API_URL,
        timestamp: new Date().toISOString()
    });
});

// Serve React app for all other routes
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "frontend", "build", "index.html"));
});

// Initialize Prisma connection and start server
async function startServer() {
    try {
        // Ensure DATABASE_URL is set before connecting (adapter reads it during connect)
        // Use the absolute path that was set earlier, don't overwrite it
        if (!process.env.DATABASE_URL) {
            // Fallback: reconstruct absolute path if somehow lost
            const fallbackPath = path.join(__dirname, "prisma", "dev.db");
            const fallbackDbPath = path.isAbsolute(fallbackPath) ? fallbackPath : path.resolve(__dirname, fallbackPath);
            process.env.DATABASE_URL = `file:${fallbackDbPath}`;
        }
        
        // Ensure DATABASE_URL is a string and in correct format
        const dbUrl = String(process.env.DATABASE_URL);
        if (!dbUrl.startsWith('file:')) {
            // If it's not in file: format, convert it
            const dbPath = path.isAbsolute(dbUrl) ? dbUrl : path.resolve(__dirname, dbUrl);
            process.env.DATABASE_URL = `file:${dbPath}`;
        } else {
            // Ensure it's set correctly
        process.env.DATABASE_URL = dbUrl;
        }
        
        console.log("🔍 Connecting with DATABASE_URL:", process.env.DATABASE_URL);
        console.log("🔍 DATABASE_URL type:", typeof process.env.DATABASE_URL);
        console.log("🔍 DATABASE_URL value check:", process.env.DATABASE_URL ? "SET" : "NOT SET");
        
        // Verify DATABASE_URL is valid before connecting
        if (!process.env.DATABASE_URL || typeof process.env.DATABASE_URL !== 'string') {
            throw new Error("DATABASE_URL must be a non-empty string before connecting");
        }
        
        // Final check: ensure DATABASE_URL is definitely set and valid
        // The adapter reads this during $connect(), so it must be set correctly
        // Use the absoluteDbPath we calculated at the top level to ensure consistency
        const finalDbUrl = process.env.DATABASE_URL;
        if (!finalDbUrl || typeof finalDbUrl !== 'string' || finalDbUrl.trim() === '') {
            console.error("❌ DATABASE_URL is invalid before connection:", finalDbUrl, typeof finalDbUrl);
            // Use the absolute path we calculated earlier (from top-level scope)
            process.env.DATABASE_URL = `file:${absoluteDbPath}`;
            console.log("🔄 Recovered DATABASE_URL using absoluteDbPath:", process.env.DATABASE_URL);
        } else {
            // Ensure it matches the absolute path we're using
            // Re-set it to be absolutely sure it's correct
            process.env.DATABASE_URL = `file:${absoluteDbPath}`;
            console.log("✅ Ensuring DATABASE_URL matches absoluteDbPath:", process.env.DATABASE_URL);
        }
        
        // One more time - set it right before connect to be absolutely sure
        // Use Object.defineProperty to ensure it's definitely set and accessible
        const dbUrlValue = `file:${absoluteDbPath}`;
        Object.defineProperty(process.env, 'DATABASE_URL', {
            value: dbUrlValue,
            writable: true,
            enumerable: true,
            configurable: true
        });
        // Also set it normally as a fallback
        process.env.DATABASE_URL = dbUrlValue;
        console.log("🔒 Final DATABASE_URL before connect:", process.env.DATABASE_URL);
        console.log("🔒 DATABASE_URL from process.env:", process.env.DATABASE_URL);
        console.log("🔒 DATABASE_URL type check:", typeof process.env.DATABASE_URL);
        
        // Verify it's accessible
        if (!process.env.DATABASE_URL) {
            throw new Error("DATABASE_URL is still undefined after all attempts to set it!");
        }
        
        // Connect to Prisma database
        // The adapter will read process.env.DATABASE_URL during this call
        // Wrap in a try-catch to see what the adapter is actually seeing
        try {
            // Double-check one more time right before the call
            if (!process.env.DATABASE_URL) {
                process.env.DATABASE_URL = `file:${absoluteDbPath}`;
            }
        await prisma.$connect();
        } catch (connectError) {
            console.error("❌ Connection error details:");
            console.error("DATABASE_URL at error time:", process.env.DATABASE_URL);
            console.error("absoluteDbPath:", absoluteDbPath);
            console.error("Error:", connectError);
            throw connectError;
        }
        console.log("✅ Prisma: Connected to database");

        // Start Express server
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📱 Mini App URL: http://localhost:${PORT}`);
            console.log(`📱 Mini App Env: ${REACT_APP_API_URL}`);
            console.log(`🔗 API URL: ${HERO_SMS_API_URL}`);
            if (HERO_SMS_API_KEY) {
                console.log("✅ Hero-SMS API: Configured");
            } else {
                console.log("⚠️ Hero-SMS API: Not configured (add HERO_SMS_API_KEY to .env)");
            }
            console.log("💡 New users will be automatically added to the database with balance 0 USDT");
        });
    } catch (error) {
        console.error("❌ Error starting server:", error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    await prisma.$disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    await prisma.$disconnect();
    process.exit(0);
});

// Start the server
startServer();
