import React, { useState, useRef, useEffect, useCallback } from "react";
import QRCode from "qrcode";
import jsQR from "jsqr";
import "./App.css";

const API = "http://localhost:4000/api";

// ── Helpers ──────────────────────────────────────────────────────────────────
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function downloadDataUrl(dataUrl, filename) {
  const a = document.createElement("a");
  a.href = dataUrl; a.download = filename; a.click();
}

async function downloadAsPDF(canvasOrDataUrl, label = "QR Code") {
  // Build a printable page and trigger browser print-to-PDF
  const dataUrl = typeof canvasOrDataUrl === "string"
    ? canvasOrDataUrl
    : canvasOrDataUrl.toDataURL("image/png");

  const win = window.open("", "_blank");
  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>QR Studio — ${label}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@600;800&family=Playfair+Display:wght@700&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; }
        body {
          font-family: 'Nunito', sans-serif;
          background: #fdf6f0;
          display: flex; align-items: center; justify-content: center;
          min-height: 100vh;
        }
        .card {
          background: #fff;
          border-radius: 24px;
          padding: 48px 56px;
          text-align: center;
          box-shadow: 0 8px 40px rgba(180,120,100,0.15);
          border: 2px solid #f0e6df;
        }
        .brand {
          font-family: 'Playfair Display', serif;
          font-size: 22px;
          color: #3d2c2c;
          margin-bottom: 6px;
        }
        .brand span { color: #ff6b9d; }
        .sublabel {
          font-size: 13px;
          color: #b09a9a;
          font-weight: 600;
          margin-bottom: 28px;
        }
        img { border-radius: 12px; display: block; margin: 0 auto 24px; }
        .label {
          font-size: 18px;
          font-weight: 800;
          color: #3d2c2c;
          margin-bottom: 8px;
        }
        .footer-note { font-size: 11px; color: #b09a9a; margin-top: 20px; font-weight: 600; }
        @media print {
          body { background: white; }
          .card { box-shadow: none; border: 1px solid #eee; }
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="brand">QR<span>Studio</span></div>
        <div class="sublabel">Scan me ✦</div>
        <img src="${dataUrl}" width="280" height="280" />
        <div class="label">${label}</div>
        <div class="footer-note">Generated with QR Studio · No login · No ads</div>
      </div>
      <script>
        window.onload = () => { window.print(); }
      <\/script>
    </body>
    </html>
  `);
  win.document.close();
}

// ── Live QR Preview ───────────────────────────────────────────────────────────
function LiveQRPreview({ text, darkColor, lightColor, size, canvasRef: extRef }) {
  const internalRef = useRef(null);
  const canvasRef = extRef || internalRef;

  useEffect(() => {
    if (!text || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, text, {
      width: 240,
      margin: 1,
      color: { dark: darkColor, light: lightColor },
      errorCorrectionLevel: "M",
    }).catch(() => {});
  }, [text, darkColor, lightColor, size, canvasRef]);

  if (!text) return (
    <div className="qr-placeholder">
      <span className="placeholder-icon">🌸</span>
      <p>Your QR appears here</p>
    </div>
  );

  return <canvas ref={canvasRef} className="qr-canvas" />;
}

// ── URL / TEXT TAB ────────────────────────────────────────────────────────────
function URLTab() {
  const [text, setText] = useState("");
  const [darkColor, setDarkColor] = useState("#3d2c2c");
  const [lightColor, setLightColor] = useState("#ffffff");
  const [size, setSize] = useState(400);
  const [format, setFormat] = useState("png");
  const [ecLevel, setEcLevel] = useState("M");
  const [logo, setLogo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pdfLabel, setPdfLabel] = useState("");
  const canvasRef = useRef(null);

  const handleDownload = async () => {
    if (!text.trim()) { setError("Please enter a URL or text ✨"); return; }
    setError(""); setLoading(true);
    try {
      if (logo) {
        const formData = new FormData();
        formData.append("text", text);
        formData.append("size", size);
        formData.append("darkColor", darkColor);
        formData.append("lightColor", lightColor);
        formData.append("logo", logo);
        const res = await fetch(`${API}/qr/with-logo`, { method: "POST", body: formData });
        const blob = await res.blob();
        downloadBlob(blob, "qrcode-logo.png");
      } else {
        const res = await fetch(`${API}/qr/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, format, size, darkColor, lightColor, errorCorrectionLevel: ecLevel }),
        });
        if (format === "svg") {
          const blob = await res.blob();
          downloadBlob(blob, "qrcode.svg");
        } else {
          const data = await res.json();
          downloadDataUrl(data.dataUrl, "qrcode.png");
        }
      }
    } catch (e) {
      setError("Download failed. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  const handlePDF = async () => {
    if (!text.trim()) { setError("Enter a URL first to export PDF ✨"); return; }
    if (canvasRef.current) {
      await downloadAsPDF(canvasRef.current, pdfLabel || text.slice(0, 40));
    }
  };

  return (
    <div className="tab-layout">
      <div className="card">
        <div className="card-title">🔗 URL or Text</div>

        <div className="field">
          <label>Your URL or Text</label>
          <input className="input" placeholder="https://yoursite.com or any text..." value={text} onChange={e => { setText(e.target.value); setError(""); }} />
        </div>

        <div className="field-row">
          <div className="field">
            <label>Foreground Color</label>
            <div className="color-row">
              <input type="color" value={darkColor} onChange={e => setDarkColor(e.target.value)} className="color-swatch" />
              <input className="input color-text" value={darkColor} onChange={e => setDarkColor(e.target.value)} maxLength={7} />
            </div>
          </div>
          <div className="field">
            <label>Background Color</label>
            <div className="color-row">
              <input type="color" value={lightColor} onChange={e => setLightColor(e.target.value)} className="color-swatch" />
              <input className="input color-text" value={lightColor} onChange={e => setLightColor(e.target.value)} maxLength={7} />
            </div>
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label>Size</label>
            <select className="input" value={size} onChange={e => setSize(+e.target.value)}>
              <option value={200}>200 × 200</option>
              <option value={300}>300 × 300</option>
              <option value={400}>400 × 400</option>
              <option value={600}>600 × 600</option>
            </select>
          </div>
          <div className="field">
            <label>Format</label>
            <select className="input" value={format} onChange={e => setFormat(e.target.value)}>
              <option value="png">PNG</option>
              <option value="svg">SVG</option>
            </select>
          </div>
        </div>

        <div className="field">
          <label>Error Correction</label>
          <div className="ec-pills">
            {["L","M","Q","H"].map(l => (
              <button key={l} className={`ec-pill ${ecLevel === l ? "active" : ""}`} onClick={() => setEcLevel(l)}>
                {l} {l === "L" ? "7%" : l === "M" ? "15%" : l === "Q" ? "25%" : "30%"}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Logo (optional)</label>
          <input type="file" accept="image/*" className="input file-input" onChange={e => setLogo(e.target.files[0] || null)} />
          {logo && <span className="file-name">📎 {logo.name}</span>}
        </div>

        <div className="field">
          <label>PDF Label (optional)</label>
          <input className="input" placeholder="e.g. My Portfolio" value={pdfLabel} onChange={e => setPdfLabel(e.target.value)} />
        </div>

        {error && <div className="error-msg">⚠ {error}</div>}

        <div className="btn-group">
          <button className="btn-primary" onClick={handleDownload} disabled={loading}>
            {loading ? "⏳ Generating..." : "⬇ Download"}
          </button>
          <button className="btn-lav" onClick={handlePDF} disabled={!text}>
            📄 Export PDF
          </button>
        </div>
      </div>

      <div className="preview-panel">
        <p className="preview-label">Live Preview</p>
        <LiveQRPreview text={text} darkColor={darkColor} lightColor={lightColor} size={size} canvasRef={canvasRef} />
        {text && (
          <div className="preview-meta">
            <span className="meta-tag">{size}px</span>
            <span className="meta-tag">{format.toUpperCase()}</span>
            <span className="meta-tag">EC-{ecLevel}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── CONTACT TAB ───────────────────────────────────────────────────────────────
function VCardTab() {
  const [form, setForm] = useState({ name: "", phone: "", email: "", company: "", website: "" });
  const [loading, setLoading] = useState(false);
  const [dataUrl, setDataUrl] = useState("");
  const [error, setError] = useState("");
  const canvasRef = useRef(null);

  const vcardText = form.name
    ? `BEGIN:VCARD\nVERSION:3.0\nFN:${form.name}\nTEL:${form.phone}\nEMAIL:${form.email}\nORG:${form.company}\nURL:${form.website}\nEND:VCARD`
    : "";

  const handleGenerate = async () => {
    if (!form.name.trim()) { setError("Name is required ✨"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/qr/vcard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setDataUrl(data.dataUrl);
    } catch (e) {
      setError("Failed. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  const handlePDF = async () => {
    if (dataUrl) await downloadAsPDF(dataUrl, form.name || "Contact");
    else if (canvasRef.current && vcardText) await downloadAsPDF(canvasRef.current, form.name || "Contact");
  };

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="tab-layout">
      <div className="card">
        <div className="card-title">👤 Contact Card</div>
        <div className="field"><label>Full Name *</label><input className="input" placeholder="Jane Doe" value={form.name} onChange={set("name")} /></div>
        <div className="field"><label>Phone</label><input className="input" placeholder="+91 98765 43210" value={form.phone} onChange={set("phone")} /></div>
        <div className="field"><label>Email</label><input className="input" placeholder="jane@example.com" value={form.email} onChange={set("email")} /></div>
        <div className="field"><label>Company</label><input className="input" placeholder="Acme Corp" value={form.company} onChange={set("company")} /></div>
        <div className="field"><label>Website</label><input className="input" placeholder="https://jane.dev" value={form.website} onChange={set("website")} /></div>
        {error && <div className="error-msg">⚠ {error}</div>}
        <div className="btn-group">
          <button className="btn-primary" onClick={handleGenerate} disabled={loading}>
            {loading ? "⏳ Generating..." : "✨ Generate QR"}
          </button>
          {(dataUrl || vcardText) && (
            <>
              <button className="btn-mint" onClick={() => downloadDataUrl(dataUrl || canvasRef.current?.toDataURL(), "contact-qr.png")}>⬇ PNG</button>
              <button className="btn-lav" onClick={handlePDF}>📄 PDF</button>
            </>
          )}
        </div>
      </div>

      <div className="preview-panel">
        <p className="preview-label">Live Preview</p>
        <LiveQRPreview text={vcardText} darkColor="#3d2c2c" lightColor="#ffffff" size={300} canvasRef={canvasRef} />
        {vcardText && <div className="preview-meta"><span className="meta-tag">vCard 3.0</span><span className="meta-tag">Contact</span></div>}
      </div>
    </div>
  );
}

// ── SCAN TAB ──────────────────────────────────────────────────────────────────
function ScanTab() {
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [mode, setMode] = useState("upload");
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animRef = useRef(null);
  const [scanning, setScanning] = useState(false);

  const stopCamera = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setScanning(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const handleImageScan = e => {
    const file = e.target.files[0];
    if (!file) return;
    setError(""); setResult("");
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width; canvas.height = img.height;
        canvas.getContext("2d").drawImage(img, 0, 0);
        const imageData = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, canvas.width, canvas.height);
        if (code) setResult(code.data);
        else setError("No QR code found in this image 😕");
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const startCamera = async () => {
    setError(""); setResult("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      videoRef.current.play();
      setScanning(true);

      const scan = () => {
        if (videoRef.current?.readyState === videoRef.current?.HAVE_ENOUGH_DATA) {
          const canvas = canvasRef.current;
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          canvas.getContext("2d").drawImage(videoRef.current, 0, 0);
          const imageData = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, canvas.width, canvas.height);
          if (code) { setResult(code.data); stopCamera(); return; }
        }
        animRef.current = requestAnimationFrame(scan);
      };
      animRef.current = requestAnimationFrame(scan);
    } catch (e) {
      setError("Camera access denied or not available 😕");
    }
  };

  const isUrl = result && (result.startsWith("http://") || result.startsWith("https://"));

  return (
    <div className="tab-layout full">
      <div className="card">
        <div className="card-title">📷 QR Scanner</div>

        <div className="scan-toggle">
          <button className={`scan-mode-btn ${mode === "upload" ? "active" : ""}`} onClick={() => { setMode("upload"); stopCamera(); setResult(""); setError(""); }}>
            📁 Upload Image
          </button>
          <button className={`scan-mode-btn ${mode === "camera" ? "active" : ""}`} onClick={() => { setMode("camera"); setResult(""); setError(""); }}>
            📷 Live Camera
          </button>
        </div>

        {mode === "upload" && (
          <div className="field">
            <label>Upload a QR Code image</label>
            <input type="file" accept="image/*" className="input file-input" onChange={handleImageScan} />
          </div>
        )}

        {mode === "camera" && (
          <div className="camera-area">
            <video ref={videoRef} className="camera-feed" playsInline muted />
            <canvas ref={canvasRef} style={{ display: "none" }} />
            <div className="btn-group">
              {!scanning
                ? <button className="btn-primary" onClick={startCamera}>▶ Start Camera</button>
                : <button className="btn-secondary" onClick={stopCamera}>⏹ Stop</button>
              }
            </div>
          </div>
        )}

        {error && <div className="error-msg">⚠ {error}</div>}

        {result && (
          <div className="scan-result">
            <p className="scan-result-label">✅ QR Decoded!</p>
            <div className="scan-result-text">{result}</div>
            <div className="scan-actions">
              <button className="btn-mint" onClick={() => navigator.clipboard.writeText(result)}>📋 Copy</button>
              {isUrl && <a href={result} target="_blank" rel="noopener noreferrer"><button className="btn-primary">🔗 Open Link</button></a>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── APP ───────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "url",   label: "URL / Text", icon: "🔗" },
  { id: "vcard", label: "Contact",    icon: "👤" },
  { id: "scan",  label: "Scanner",   icon: "📷" },
];

export default function App() {
  const [tab, setTab] = useState("url");

  return (
    <div className="app">
      <header className="header">
        <div className="logo">
          <span className="logo-emoji">🌸</span>
          <span className="logo-text">QR<span>Now</span></span>
        </div>
        <p className="tagline">Generate · Customize · Scan — No login. Totally free.</p>
      </header>

      <main className="main">
        <nav className="tabs">
          {TABS.map(t => (
            <button key={t.id} className={`tab-btn ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
              <span className="tab-icon">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </nav>

        <div className="tab-content">
          {tab === "url"   && <URLTab />}
          {tab === "vcard" && <VCardTab />}
          {tab === "scan"  && <ScanTab />}
        </div>
      </main>

      <footer className="footer">
        <p>Made with <span>♥</span> · QR Now By Kaviya · Open source · No tracking</p>
      </footer>
    </div>
  );
}
