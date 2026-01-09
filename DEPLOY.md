# Deployment Instructions

## Quick Deploy to Production

Pentru a face deploy al ultimelor schimbări pe `https://smstg.workdomain.site/`:

### Opțiunea 1: Deploy Manual (Recomandat)

1. **Build frontend-ul:**
   ```bash
   npm run build
   ```

2. **Upload folderul `frontend/build` pe server:**
   - Conectează-te la serverul de producție (FTP, SSH, cPanel, etc.)
   - Navighează la folderul unde rulează aplicația
   - Înlocuiește conținutul folderului `frontend/build` cu noul build

3. **Verifică că serverul servește build-ul corect:**
   - Verifică că `server.js` rulează și servește `frontend/build`
   - Accesează `https://smstg.workdomain.site/` și verifică schimbările

### Opțiunea 2: Deploy via SCP (SSH)

1. **Configurează variabilele de mediu în `.env`:**
   ```env
   DEPLOY_METHOD=scp
   DEPLOY_HOST=smstg.workdomain.site
   DEPLOY_USER=your_username
   DEPLOY_PATH=/path/to/frontend/build
   DEPLOY_PORT=22
   ```

2. **Rulează scriptul de deploy:**
   ```bash
   npm run deploy
   ```

### Opțiunea 3: Deploy via Rsync (SSH)

1. **Configurează variabilele de mediu în `.env`:**
   ```env
   DEPLOY_METHOD=rsync
   DEPLOY_HOST=smstg.workdomain.site
   DEPLOY_USER=your_username
   DEPLOY_PATH=/path/to/frontend/build
   DEPLOY_PORT=22
   ```

2. **Rulează scriptul de deploy:**
   ```bash
   npm run deploy
   ```

## Important Notes

- **Build-ul trebuie făcut înainte de deploy:** `npm run build`
- **Serverul trebuie să servească folderul `frontend/build`** (configurat în `server.js`)
- **După deploy, verifică cache-ul:** Șterge cache-ul browserului sau folosește Ctrl+Shift+R pentru hard refresh
- **Verifică că serverul backend rulează** pe serverul de producție

## Troubleshooting

### Schimbările nu apar pe site
- Verifică că build-ul a fost făcut corect: `npm run build`
- Verifică că fișierele au fost uploadate corect pe server
- Șterge cache-ul browserului (Ctrl+Shift+R)
- Verifică că serverul servește folderul `frontend/build` corect

### Eroare la deploy
- Verifică că ai acces SSH/FTP la server
- Verifică că variabilele de mediu sunt configurate corect
- Verifică că path-ul de deploy este corect

