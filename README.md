# ⬛ QR Studio

> Generate · Customize · Scan — No login. No ads. No limits.

A full-stack QR code generator with live preview, logo embedding, WiFi/vCard support, bulk generation, and a built-in scanner.

---

## ✨ Features

| Feature | Details |
|---|---|
| 🔗 URL / Text | Live preview, custom colors, logo embed, PNG/SVG download |
| 👤 Contact Card | vCard QR — scan to save contact directly on phone |
| 📶 WiFi | Scan to connect to WiFi — no password typing |
| 📦 Bulk CSV | Upload CSV → Download ZIP of QR codes (up to 100) |
| 📷 Scanner | Scan QR codes via image upload or webcam |

---

## 🗂 Project Structure

```
qr-studio/
├── backend/
│   ├── server.js        ← Express API
│   └── package.json
└── frontend/
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── App.js       ← Full React app
    │   ├── App.css      ← Styles
    │   └── index.js
    └── package.json
```

---

## 🚀 How to Run Locally

### Prerequisites
- Node.js v18+ → https://nodejs.org
- npm (comes with Node)

---

### Step 1 — Clone / Download
```bash
# If using git
git clone https://github.com/yourusername/qr-studio.git
cd qr-studio

# Or just unzip the downloaded folder
```

---

### Step 2 — Start the Backend

Open **Terminal 1**:

```bash
cd backend
npm install
npm run dev
```

You should see:
```
✅ QR Studio backend running on http://localhost:4000
```

> **Note:** `npm run dev` uses nodemon (auto-restarts on file changes).  
> For production use: `npm start`

---

### Step 3 — Start the Frontend

Open **Terminal 2**:

```bash
cd frontend
npm install
npm start
```

Your browser will open automatically at **http://localhost:3000** 🎉

---

## 🌐 API Endpoints

The backend runs on `http://localhost:4000`.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/api/qr/generate` | Generate URL/text QR (PNG or SVG) |
| POST | `/api/qr/with-logo` | Generate QR with embedded logo |
| POST | `/api/qr/vcard` | Generate contact card QR |
| POST | `/api/qr/wifi` | Generate WiFi QR |
| POST | `/api/qr/bulk` | Bulk generate from CSV → ZIP |

### Example: Generate a QR Code
```bash
curl -X POST http://localhost:4000/api/qr/generate \
  -H "Content-Type: application/json" \
  -d '{"text":"https://github.com","format":"base64","size":300}' \
  | jq .dataUrl
```

---

## 📦 Bulk CSV Format

Upload a `.csv` file with this format:

```csv
text,name
https://google.com,Google
https://github.com,GitHub
https://youtube.com,YouTube
```

- `text` or `url` — the QR code content (required)
- `name` or `label` — used as the filename in the ZIP (optional)

---

## 🏗 Hosting (Free Options)

### Option A: Vercel (Frontend) + Railway (Backend)

**Frontend → Vercel**
1. Push frontend folder to GitHub
2. Go to https://vercel.com → Import project
3. Set root directory to `frontend`
4. Set env variable: `REACT_APP_API_URL=https://your-backend.railway.app`
5. Deploy ✅

**Backend → Railway**
1. Go to https://railway.app → New Project → Deploy from GitHub
2. Set root directory to `backend`
3. Railway auto-detects Node.js
4. Deploy ✅ (note the URL given, use it in Vercel env above)

---

### Option B: Render (Both on one platform)

**Backend:**
1. https://render.com → New Web Service
2. Connect GitHub repo, root: `backend`
3. Build: `npm install`, Start: `npm start`

**Frontend:**
1. New Static Site on Render
2. Root: `frontend`, Build: `npm run build`, Publish: `build`

---

### Option C: Local Network (Share with others on same WiFi)

Find your local IP:
```bash
# Mac/Linux
ifconfig | grep "inet "

# Windows
ipconfig
```

Then others on the same WiFi can access:
- Frontend: `http://YOUR_IP:3000`
- Backend: `http://YOUR_IP:4000`

Update `frontend/src/App.js` line:
```js
const API = "http://YOUR_LOCAL_IP:4000/api";
```

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, CSS3 |
| Backend | Node.js, Express |
| QR Engine | `qrcode` npm package |
| Image Processing | `sharp` (logo embedding) |
| Scanning | `jsqr` (client-side) |
| Bulk Archiving | `archiver` (ZIP generation) |
| CSV Parsing | `csv-parser` |

---

## 🤝 Contributing

PRs welcome! Ideas for next features:
- [ ] QR code templates / frames
- [ ] History saved to localStorage
- [ ] Analytics (short link + scan tracking)
- [ ] Dark/Light theme toggle
- [ ] QR code as poster (with label text)

---

## 📄 License

MIT — use freely for personal and commercial projects.
