const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');

/**
 * GET /api/qr
 * Generates high-quality QR codes locally without external network dependencies.
 * Query params:
 *   - url / text: Text/URL to encode (required)
 *   - format: 'png' (default), 'svg', 'dataurl', 'json'
 *   - size: pixel width/height (default 300, min 100, max 1000)
 *   - margin: quiet zone border (default 2)
 *   - download: 1 or true to trigger browser attachment download
 *   - color: hex color for dark modules (default #000000)
 */
router.get('/', async (req, res) => {
  try {
    const rawText = req.query.url || req.query.text;
    if (!rawText) {
      return res.status(400).json({ success: false, message: 'Parameter "url" or "text" is required' });
    }

    const format = (req.query.format || 'png').toLowerCase();
    const size = Math.min(Math.max(parseInt(req.query.size, 10) || 300, 100), 1000);
    const margin = Math.min(Math.max(parseInt(req.query.margin, 10) || 2, 0), 10);
    const darkColor = req.query.color || '#000000';
    const lightColor = req.query.bgcolor || '#ffffff';
    const isDownload = req.query.download === '1' || req.query.download === 'true';

    const qrOptions = {
      errorCorrectionLevel: 'M',
      margin,
      width: size,
      color: {
        dark: darkColor,
        light: lightColor
      }
    };

    // Cache QR code images in browser / CDN for 24 hours
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');

    if (format === 'dataurl' || format === 'json') {
      const dataUrl = await QRCode.toDataURL(rawText, qrOptions);
      if (format === 'json') {
        return res.json({ success: true, dataUrl, text: rawText });
      }
      res.setHeader('Content-Type', 'text/plain');
      return res.send(dataUrl);
    }

    if (format === 'svg') {
      const svgString = await QRCode.toString(rawText, { ...qrOptions, type: 'svg' });
      res.setHeader('Content-Type', 'image/svg+xml');
      if (isDownload) {
        res.setHeader('Content-Disposition', 'attachment; filename="scode-qr.svg"');
      }
      return res.send(svgString);
    }

    // Default: PNG Buffer
    const buffer = await QRCode.toBuffer(rawText, qrOptions);
    res.setHeader('Content-Type', 'image/png');
    if (isDownload) {
      const filename = req.query.filename ? `${req.query.filename.replace(/[^a-zA-Z0-9_-]/g, '')}-qr.png` : 'scode-qr.png';
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    }
    res.send(buffer);
  } catch (error) {
    console.error('Error generating QR code:', error);
    res.status(500).json({ success: false, message: 'Failed to generate QR code' });
  }
});

module.exports = router;
