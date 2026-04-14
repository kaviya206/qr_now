const express = require("express");
const cors = require("cors");
const QRCode = require("qrcode");
const sharp = require("sharp");
const archiver = require("archiver");
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const path = require("path");
const { Readable } = require("stream");

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// ─── Health Check ──────────────────────────────────────────────────────────
app.get("/health", (req, res) => res.json({ status: "ok" }));

// ─── Generate Single QR ────────────────────────────────────────────────────
app.post("/api/qr/generate", async (req, res) => {
  try {
    const {
      text,
      format = "png",       // png | svg | base64
      size = 300,
      errorCorrectionLevel = "M",
      darkColor = "#000000",
      lightColor = "#ffffff",
      margin = 1,
    } = req.body;

    if (!text || text.trim() === "") {
      return res.status(400).json({ error: "Text/URL is required" });
    }

    const qrOptions = {
      errorCorrectionLevel,
      width: size,
      margin,
      color: { dark: darkColor, light: lightColor },
    };

    if (format === "svg") {
      const svg = await QRCode.toString(text, { ...qrOptions, type: "svg" });
      res.setHeader("Content-Type", "image/svg+xml");
      res.setHeader("Content-Disposition", 'attachment; filename="qrcode.svg"');
      return res.send(svg);
    }

    if (format === "base64") {
      const dataUrl = await QRCode.toDataURL(text, qrOptions);
      return res.json({ dataUrl, text, size, darkColor, lightColor });
    }

    // PNG
    const buffer = await QRCode.toBuffer(text, { ...qrOptions, type: "png" });
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", 'attachment; filename="qrcode.png"');
    return res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate QR code" });
  }
});

// ─── Generate QR with Logo ─────────────────────────────────────────────────
app.post("/api/qr/with-logo", upload.single("logo"), async (req, res) => {
  try {
    const {
      text,
      size = 400,
      darkColor = "#000000",
      lightColor = "#ffffff",
      logoSize = 80,
    } = req.body;

    if (!text) return res.status(400).json({ error: "Text is required" });

    // Generate QR as PNG buffer (high quality, error correction H for logo)
    const qrBuffer = await QRCode.toBuffer(text, {
      errorCorrectionLevel: "H",
      width: parseInt(size),
      margin: 2,
      color: { dark: darkColor, light: lightColor },
    });

    let finalBuffer = qrBuffer;

    if (req.file) {
      const logoBuffer = req.file.buffer;
      const logoSizePx = parseInt(logoSize);
      const qrSize = parseInt(size);
      const offset = Math.floor((qrSize - logoSizePx) / 2);

      // Resize logo and composite onto QR
      const resizedLogo = await sharp(logoBuffer)
        .resize(logoSizePx, logoSizePx, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
        .png()
        .toBuffer();

      finalBuffer = await sharp(qrBuffer)
        .composite([{ input: resizedLogo, top: offset, left: offset }])
        .png()
        .toBuffer();
    }

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", 'attachment; filename="qrcode-logo.png"');
    res.send(finalBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate QR with logo" });
  }
});

// ─── Bulk QR from CSV ──────────────────────────────────────────────────────
app.post("/api/qr/bulk", upload.single("csv"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "CSV file required" });

    const {
      darkColor = "#000000",
      lightColor = "#ffffff",
      size = 300,
    } = req.body;

    const rows = [];
    const stream = Readable.from(req.file.buffer.toString());

    await new Promise((resolve, reject) => {
      stream
        .pipe(csv())
        .on("data", (row) => rows.push(row))
        .on("end", resolve)
        .on("error", reject);
    });

    if (rows.length === 0) return res.status(400).json({ error: "CSV is empty" });
    if (rows.length > 100) return res.status(400).json({ error: "Max 100 rows allowed" });

    // Stream ZIP back
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", 'attachment; filename="qrcodes.zip"');

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(res);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      // Support columns: text, url, name, label (flexible)
      const text = row.text || row.url || row.URL || row.Text || Object.values(row)[0];
      const label = row.name || row.label || row.Name || row.Label || `qr_${i + 1}`;

      if (!text) continue;

      const buffer = await QRCode.toBuffer(text.trim(), {
        errorCorrectionLevel: "M",
        width: parseInt(size),
        margin: 1,
        color: { dark: darkColor, light: lightColor },
      });

      archive.append(buffer, { name: `${label.replace(/[^a-z0-9_-]/gi, "_")}.png` });
    }

    await archive.finalize();
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.status(500).json({ error: "Bulk generation failed" });
  }
});

// ─── vCard QR ──────────────────────────────────────────────────────────────
app.post("/api/qr/vcard", async (req, res) => {
  try {
    const { name, phone, email, company, website, size = 300 } = req.body;

    const vcard = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${name || ""}`,
      `TEL:${phone || ""}`,
      `EMAIL:${email || ""}`,
      `ORG:${company || ""}`,
      `URL:${website || ""}`,
      "END:VCARD",
    ].join("\n");

    const dataUrl = await QRCode.toDataURL(vcard, {
      errorCorrectionLevel: "M",
      width: parseInt(size),
      margin: 1,
    });

    res.json({ dataUrl, vcard });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate vCard QR" });
  }
});

// ─── WiFi QR ───────────────────────────────────────────────────────────────
app.post("/api/qr/wifi", async (req, res) => {
  try {
    const { ssid, password, security = "WPA", hidden = false, size = 300 } = req.body;
    if (!ssid) return res.status(400).json({ error: "SSID required" });

    const wifiString = `WIFI:T:${security};S:${ssid};P:${password || ""};H:${hidden};`;

    const dataUrl = await QRCode.toDataURL(wifiString, {
      errorCorrectionLevel: "M",
      width: parseInt(size),
      margin: 1,
    });

    res.json({ dataUrl, wifiString });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate WiFi QR" });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✅ QR Studio backend running on http://localhost:${PORT}`));
