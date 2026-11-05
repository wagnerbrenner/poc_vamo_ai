const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// PNG CRC32 table
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

function createChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const crcBuf = Buffer.alloc(4);
  const toCrc = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(toCrc), 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function generatePngBuffer(width, height, isMaskable = false) {
  const bytesPerPixel = 4;
  const scanlineLength = 1 + width * bytesPerPixel;
  const rawData = Buffer.alloc(scanlineLength * height);

  const cx = width / 2;
  const cy = height * 0.44;
  const scale = width / 100;
  const safeMargin = isMaskable ? 0.8 : 0.9;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLength;
    rawData[rowOffset] = 0; // Filter byte 0 (None)

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * bytesPerPixel;

      // Dark purple background: #14102E -> R:20, G:16, B:46, A:255
      let r = 20;
      let g = 16;
      let b = 46;
      let a = 255;

      // Distance from pin center in 100x100 space
      const nx = (x - cx) / (scale * safeMargin);
      const ny = (y - cy) / (scale * safeMargin);

      // Pin head circle: center (0, -4), radius ~34
      const distPinHead = Math.sqrt(nx * nx + (ny + 4) * (ny + 4));
      
      // Pin triangle tail pointing down to (0, 50)
      const isPinTail = ny >= -4 && ny <= 50 && Math.abs(nx) <= (50 - ny) * 0.68;

      if (distPinHead <= 34 || isPinTail) {
        // Gradient from #6A4CFF (106, 76, 255) to #FF3D7F (255, 61, 127)
        const t = Math.min(1, Math.max(0, (ny + 38) / 88));
        r = Math.round(106 + t * (255 - 106));
        g = Math.round(76 - t * (76 - 61));
        b = Math.round(255 - t * (255 - 127));

        // Inner play triangle in Lima Agora #D4FF3A (212, 255, 58)
        // Triangle vertices: (-8, -14), (18, 0), (-8, 14)
        const tx = nx;
        const ty = ny;
        if (tx >= -8 && tx <= 18) {
          const halfH = 14 * (1 - (tx + 8) / 26);
          if (ty >= -halfH && ty <= halfH) {
            r = 212;
            g = 255;
            b = 58;
          }
        }
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData);

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type (RGBA)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // IDAT
  const idatChunk = createChunk('IDAT', deflated);

  // IEND
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.resolve(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Generate icon.svg
const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="128" fill="#14102E"/>
  <defs>
    <linearGradient id="pwaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#6A4CFF" />
      <stop offset="50%" stopColor="#A238FF" />
      <stop offset="100%" stopColor="#FF3D7F" />
    </linearGradient>
    <filter id="pwaGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="16" floodColor="#FF3D7F" floodOpacity="0.45" />
    </filter>
  </defs>
  <g filter="url(#pwaGlow)" transform="translate(56, 56) scale(4)">
    <path d="M50 94C50 94 84 62 84 40C84 21.2223 68.7777 6 50 6C31.2223 6 16 21.2223 16 40C16 62 50 94 50 94Z" fill="url(#pwaGrad)"/>
    <path d="M42 26L68 40L42 54V26Z" fill="#D4FF3A"/>
  </g>
</svg>`;

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent, 'utf8');
console.log('✓ Created public/icon.svg');

// 2. Generate PNGs: 192x192, 512x512, maskable 512x512, apple-touch-icon 180x180
const p192 = generatePngBuffer(192, 192, false);
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), p192);
console.log('✓ Created public/pwa-192x192.png');

const p512 = generatePngBuffer(512, 512, false);
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), p512);
console.log('✓ Created public/pwa-512x512.png');

const pMaskable = generatePngBuffer(512, 512, true);
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), pMaskable);
console.log('✓ Created public/pwa-maskable-512x512.png');

const pApple = generatePngBuffer(180, 180, false);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), pApple);
console.log('✓ Created public/apple-touch-icon.png');

console.log('All PWA icon assets generated successfully!');
