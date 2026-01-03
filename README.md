# webRentNum - Telegram Mini App

Aplicație Telegram Mini App pentru închirierea numerelor telefonice și activarea SMS folosind [Hero-SMS.com](https://hero-sms.com/) API.

## Features

- ✅ **React Mini App** - Interfață modernă în Telegram
- ✅ **Rent Number** - Închiriere număr pentru SMS nelimitat (2-1344 ore)
- ✅ **Activate Number** - Obținere număr pentru activare SMS one-time
- ✅ **SMS Activation** - Primire automată a codurilor SMS
- ✅ **Balance Check** - Verificare balanță cont Hero-SMS
- ✅ **Number Management** - Gestionare numere active și închiriate
- ✅ **Country & Service Selection** - Selectare țară și serviciu

## Architecture

- **Backend**: Express.js server cu API endpoints pentru Hero-SMS
- **Frontend**: React aplicație pentru Telegram Mini App
- **Bot**: Telegram bot simplu care deschide Mini App-ul

## Installation

### 1. Install Backend Dependencies

```bash
npm install
```

### 2. Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

### 3. Configure Environment Variables

Creează fișierul `.env` în root:

```env
BOT_TOKEN=your_telegram_bot_token
HERO_SMS_API_KEY=your_hero_sms_api_key
HERO_SMS_API_URL=https://hero-sms.com/api
MINI_APP_URL=http://localhost:3000
PORT=3000
```

**Configurare:**

- **BOT_TOKEN**: Obține-l de la `@BotFather` pe Telegram
  - Trimite `/newbot` și urmează instrucțiunile
  - Copiază token-ul primit

- **HERO_SMS_API_KEY**: Obține-l de la [Hero-SMS.com](https://hero-sms.com/)
  - Creează cont pe https://hero-sms.com/
  - Accesează secțiunea API în setările contului
  - Copiază cheia API
  - Adaugă fonduri în cont pentru a putea închiria numere

- **HERO_SMS_API_URL**: 
  - Default: `https://hero-sms.com/stubs/handler_api.php`
  - Nu este necesar să-l schimbi dacă folosești Hero-SMS

- **MINI_APP_URL**: 
  - Pentru development: `http://localhost:3000`
  - Pentru production: URL-ul unde este deployată aplicația (ex: `https://yourdomain.com`)

### 4. Build Frontend

```bash
npm run build
```

Aceasta va construi aplicația React în `frontend/build/`.

## Usage

### Development

1. **Start Backend Server:**
   ```bash
   npm start
   ```
   Serverul va rula pe `http://localhost:3000`

2. **Start Frontend Development (optional):**
   ```bash
   cd frontend
   npm start
   ```
   Frontend-ul va rula pe `http://localhost:3000` (dacă proxy este configurat)

3. **In Telegram:**
   - Caută botul tău
   - Trimite `/start`
   - Apasă butonul "📱 Open Mini App"

### Production

1. **Build Frontend:**
   ```bash
   npm run build
   ```

2. **Deploy:**
   - Deploy serverul Express pe un serviciu (Heroku, Vercel, AWS, etc.)
   - Actualizează `MINI_APP_URL` în `.env` cu URL-ul deployat
   - Configurează botul în @BotFather cu URL-ul Mini App-ului

3. **Configure Bot in @BotFather:**
   - Trimite `/newapp` la @BotFather
   - Selectează botul tău
   - Trimite URL-ul Mini App-ului (ex: `https://yourdomain.com`)

## Project Structure

```
webRentNum/
├── frontend/              # React Mini App
│   ├── public/
│   ├── src/
│   │   ├── pages/        # Pagini React
│   │   │   ├── Home.js
│   │   │   ├── Rent.js
│   │   │   ├── Activate.js
│   │   │   ├── MyNumbers.js
│   │   │   └── Balance.js
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
├── server.js             # Express backend server
├── bot.js                # Telegram bot
├── package.json
├── .env                  # Environment variables
└── README.md
```

## API Endpoints

Backend-ul expune următoarele endpoints care comunică cu Hero-SMS API:

- `GET /api/balance` - Obține balanța contului (Hero-SMS: `action=getBalance`)
- `GET /api/countries` - Listă țări disponibile (Hero-SMS: `action=getCountries`)
- `GET /api/services/:countryId` - Servicii pentru o țară (Hero-SMS: `action=getNumbersStatus`)
- `POST /api/rent` - Închiriază un număr (Hero-SMS: `action=rentNumber`)
- `POST /api/activate` - Obține număr pentru activare (Hero-SMS: `action=getNumber`)
- `GET /api/status/:activationId` - Verifică status activare (Hero-SMS: `action=getStatus`)
- `GET /api/sms/:activationId` - Obține codul SMS (Hero-SMS: `action=getStatus`)
- `POST /api/cancel/:activationId` - Anulează activare (Hero-SMS: `action=setStatus`)
- `GET /api/rented` - Listă numere închiriate (Hero-SMS: `action=getRentList`)
- `GET /api/health` - Health check

### Format API Hero-SMS

API-ul Hero-SMS folosește formatul:
- **URL**: `https://hero-sms.com/stubs/handler_api.php`
- **Method**: GET
- **Parameters**: `api_key` și `action` în query string
- **Response**: Text format (nu JSON)

Exemplu: `https://hero-sms.com/stubs/handler_api.php?api_key=YOUR_KEY&action=getBalance`

## Frontend Pages

- **Home** (`/`) - Pagina principală cu meniu
- **Rent** (`/rent`) - Închiriere număr
- **Activate** (`/activate`) - Activare număr
- **My Numbers** (`/numbers`) - Numerele tale
- **Balance** (`/balance`) - Balanța contului

## Development

### Scripts

- `npm start` - Pornește serverul backend
- `npm run bot` - Pornește doar botul Telegram
- `npm run build` - Construiește frontend-ul
- `cd frontend && npm start` - Pornește frontend în mod development

### Technologies

- **Backend:**
  - Express.js - Web server
  - Axios - HTTP client pentru API calls
  - CORS - Cross-origin resource sharing

- **Frontend:**
  - React 18 - UI framework
  - React Router - Routing
  - @twa-dev/sdk - Telegram Web App SDK
  - Axios - HTTP client

- **Bot:**
  - node-telegram-bot-api - Telegram Bot API

## Notes

- **Security**: API key-ul Hero-SMS este stocat pe server, nu în frontend
- **CORS**: Serverul permite CORS pentru a permite request-uri din Mini App
- **Telegram Web App**: Mini App-ul folosește Telegram Web App SDK pentru integrare
- **Build**: Frontend-ul trebuie construit înainte de deployment

## Troubleshooting

### Mini App nu se deschide
- Verifică că `MINI_APP_URL` este corect în `.env`
- Verifică că serverul rulează
- Verifică că URL-ul este accesibil public (pentru production)

### API errors
- Verifică că `HERO_SMS_API_KEY` este corect
- Verifică că ai fonduri suficiente în cont
- Verifică log-urile serverului pentru detalii

### Build errors
- Asigură-te că ai instalat toate dependențele (`npm install` în root și `cd frontend && npm install`)
- Verifică că Node.js versiunea este compatibilă (>= 16)

## Support

Pentru probleme cu API-ul Hero-SMS, consultă:
- [Hero-SMS.com](https://hero-sms.com/)
- Documentația oficială API

Pentru probleme cu botul, verifică:
- Log-urile consolei
- Configurația din `.env`
- Conectivitatea la internet
