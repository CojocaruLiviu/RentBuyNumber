# 💸 USDT Transfer Script

Script pentru verificarea balance-ului USDT și transferul USDT pe BSC (Binance Smart Chain).

## 📋 Funcționalități

1. **Verificare balance USDT** - Verifică balance-ul USDT pe orice adresă
2. **Transfer USDT** - Transferă USDT din wallet-ul utilizatorului către o adresă dorită

## 🚀 Instalare

Scriptul folosește `ethers.js` care este deja instalat în proiect.

```bash
npm install ethers
```

## 📖 Utilizare

### 1. Verificare Balance USDT

Verifică balance-ul USDT pe o adresă dată:

```bash
node transfer.js check <address>
```

**Exemplu:**
```bash
node transfer.js check 0xf2423e17d69d95a2448c21ed0328c9ecd2859783
```

**Output:**
- Balance USDT
- Balance BNB (pentru taxe de gaz)
- Link-uri către BSCScan
- Informații despre token

### 2. Transfer USDT

Transferă USDT din wallet-ul utilizatorului către o adresă dorită:

```bash
node transfer.js transfer <userId> <toAddress> <amount>
```

**Exemplu:**
```bash
node transfer.js transfer 7480062069 0xf2423e17d69d95a2448c21ed0328c9ecd2859783 10.5
```

**Parametri:**
- `userId` - ID-ul utilizatorului (numele fișierului wallet, fără extensie)
- `toAddress` - Adresa destinație (unde se trimite USDT)
- `amount` - Suma de USDT de transferat (ex: 10.5)

**Output:**
- Verificare balance înainte de transfer
- Estimare taxe de gaz
- Transaction hash
- Link către BSCScan
- Verificare balance după transfer

## ⚠️ ATENȚIE

1. **Transferurile sunt REALE și ireversibile!**
2. **Asigură-te că wallet-ul are suficiente BNB pentru taxe de gaz** (minim 0.001 BNB recomandat)
3. **Verifică adresa destinație înainte de transfer**
4. **USDT este pe BSC (Binance Smart Chain)**, nu pe Ethereum

## 🔧 Configurare

### RPC URL

Poți configura RPC URL-ul pentru BSC prin variabila de mediu:

```bash
export BSC_RPC_URL="https://bsc-dataseed1.binance.org/"
```

Sau adaugă în `.env`:
```
BSC_RPC_URL=https://bsc-dataseed1.binance.org/
```

### Contract USDT

Contractul USDT pe BSC este hardcodat în script:
- **BSC**: `0x55d398326f99059fF775485246999027B3197955`

## 📁 Structură Wallet

Scriptul așteaptă ca wallet-urile să fie în formatul:

```json
{
  "usdt": {
    "address": "0x...",
    "balance": "0",
    "privateKey": "0x..."
  }
}
```

Fișierele wallet trebuie să fie în directorul `@wallets/` cu numele `<userId>.json`.

## 🔍 Verificare

După transfer, poți verifica transaction-ul pe:
- **BSCScan**: https://bscscan.com/tx/<transaction_hash>
- **Adresă**: https://bscscan.com/address/<address>

## 📊 Exemple de Output

### Verificare Balance

```
🔍 Verificare balance USDT pentru adresa: 0xf2423e17d69d95a2448c21ed0328c9ecd2859783
📡 Conectare la BSC: https://bsc-dataseed1.binance.org/
✅ Adresă normalizată: 0xF2423E17D69d95a2448c21eD0328c9ecD2859783

📊 Rezultate:
   Token: USDT
   Balance: 100.5 USDT
   Balance (formatat): 100.500000 USDT
   Balance (raw): 100500000000000000000
   Decimals: 18

⛽ BNB Balance (pentru taxe de gaz): 0.001309975 BNB

🔗 BSCScan: https://bscscan.com/address/0xF2423E17D69d95a2448c21eD0328c9ecD2859783
🔗 USDT Contract: https://bscscan.com/address/0x55d398326f99059fF775485246999027B3197955
```

### Transfer

```
💸 Inițiere transfer USDT
   De la: User 7480062069
   Către: 0xf2423e17d69d95a2448c21ed0328c9ecd2859783
   Sumă: 10.5 USDT

📁 Wallet găsit pentru user 7480062069
   Adresă: 0x75584f33f79d536a9d88ad2d1dbed0254ad58260
   Wallet conectat: 0x75584f33f79d536a9d88ad2d1dbed0254ad58260

🔍 Verificare balance înainte de transfer...
   [Balance details...]

⛽ Estimare taxe de gaz...
   Gas estimate: 65000
   Gas price: 3000000000 wei
   Cost estimat: 0.000195 BNB

⚠️  ATENȚIE: Acest transfer este REAL și ireversibil!
   Sumă: 10.5 USDT
   Destinație: 0xF2423E17D69d95a2448c21eD0328c9ecD2859783
   Taxe de gaz: ~0.000195 BNB

⏳ Efectuare transfer...

✅ Transaction trimisă!
   Transaction Hash: 0x1234...
   BSCScan: https://bscscan.com/tx/0x1234...

⏳ Așteptare confirmare...

✅ Transfer confirmat!
   Block Number: 12345678
   Gas Used: 65000
   Status: Success

📊 Rezumat:
   Balance înainte: 100.500000 USDT
   Balance după: 90.000000 USDT
   Transferat: 10.500000 USDT
```

## 🐛 Troubleshooting

### Eroare: "Insufficient funds"
- Verifică că wallet-ul are suficiente USDT
- Verifică că wallet-ul are suficiente BNB pentru taxe de gaz

### Eroare: "Invalid address"
- Verifică că adresa este validă (format Ethereum/BSC)
- Adresa trebuie să înceapă cu `0x` și să aibă 42 de caractere

### Eroare: "Wallet not found"
- Verifică că fișierul wallet există în `@wallets/<userId>.json`
- Verifică că fișierul conține cheia privată pentru USDT

### Eroare: "Network error"
- Verifică conexiunea la internet
- Încearcă să schimbi RPC URL-ul (poate fi o problemă temporară)

## 📝 Note

- Scriptul folosește BSC (Binance Smart Chain) pentru USDT
- Taxele de gaz sunt plătite în BNB, nu în USDT
- Transferurile sunt confirmate în câteva secunde pe BSC
- Poți verifica status-ul transaction-ului pe BSCScan

