import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    const byte = buf[i];
    crc ^= byte;
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crcBuf]);
}

function createPng(width, height, drawFn) {
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowSize);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type 0: None
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = drawFn(x, y, width, height);
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData);

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bit
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', deflated),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

// Draw a modern broadcast radio tower and pulsing wave rings
function drawRadioIcon(isMaskable) {
  return (x, y, w, h) => {
    const nx = (x / w) * 2 - 1; // -1 to 1
    const ny = (y / h) * 2 - 1;
    const rDist = Math.sqrt(nx * nx + ny * ny);

    // Background gradient: dark cyber slate to deep violet
    let bgR = 15 + (ny * 0.5 + 0.5) * 15;
    let bgG = 23 + (ny * 0.5 + 0.5) * 12;
    let bgB = 42 + (ny * 0.5 + 0.5) * 35;

    // Corner rounding if not maskable
    if (!isMaskable && rDist > 0.96) {
      // Soft corner antialiasing
      return [0, 0, 0, 0];
    }

    // Antenna center point at (0, 0.1)
    const cx = 0;
    const cy = 0.05;
    const dx = nx - cx;
    const dy = ny - cy;
    const distToCenter = Math.sqrt(dx * dx + dy * dy);

    // Glowing concentric radio waves
    // Radii: 0.28, 0.45, 0.62
    const rings = [0.26, 0.44, 0.62];
    let ringIntensity = 0;

    for (const radius of rings) {
      const diff = Math.abs(distToCenter - radius);
      if (diff < 0.045) {
        // Only upper-left and upper-right arc (broadcasting upward and outward)
        const angle = Math.atan2(dy, dx); // -pi to pi
        // Arc spans from -160 deg to -20 deg
        if (angle < -0.3 && angle > -2.84) {
          const arcFalloff = Math.sin((angle - (-2.84)) / (-0.3 - (-2.84)) * Math.PI);
          const radial = Math.cos((diff / 0.045) * (Math.PI / 2));
          ringIntensity = Math.max(ringIntensity, radial * arcFalloff);
        }
      }
    }

    // Central transmitter dot
    let dotIntensity = 0;
    if (distToCenter < 0.08) {
      dotIntensity = Math.cos((distToCenter / 0.08) * (Math.PI / 2));
    }

    // Antenna mast tower (triangle / lines)
    let mastIntensity = 0;
    if (ny > 0.05 && ny < 0.65) {
      const halfWidth = 0.02 + (ny - 0.05) * 0.25;
      if (Math.abs(nx) < halfWidth) {
        // Legs of tower
        const legDist = Math.abs(Math.abs(nx) - halfWidth);
        if (legDist < 0.025 || Math.abs(ny - 0.35) < 0.015 || Math.abs(ny - 0.55) < 0.015) {
          mastIntensity = 0.9;
        }
      }
    }

    // Base glowing halo
    const glow = Math.max(0, 1 - distToCenter * 1.6) * 0.35;

    // Combine colors: Cyan #06b6d4 to Violet #8b5cf6
    const cyanR = 6, cyanG = 182, cyanB = 212;
    const violetR = 168, violetG = 85, violetB = 247;
    const mix = (nx + 1) * 0.5;
    const brandR = cyanR * (1 - mix) + violetR * mix;
    const brandG = cyanG * (1 - mix) + violetG * mix;
    const brandB = cyanB * (1 - mix) + violetB * mix;

    let finalR = bgR + glow * 50;
    let finalG = bgG + glow * 80;
    let finalB = bgB + glow * 120;

    if (ringIntensity > 0) {
      finalR = finalR * (1 - ringIntensity) + brandR * ringIntensity;
      finalG = finalG * (1 - ringIntensity) + brandG * ringIntensity;
      finalB = finalB * (1 - ringIntensity) + brandB * ringIntensity;
    }

    if (dotIntensity > 0) {
      // White-hot center
      finalR = finalR * (1 - dotIntensity) + 255 * dotIntensity;
      finalG = finalG * (1 - dotIntensity) + 255 * dotIntensity;
      finalB = finalB * (1 - dotIntensity) + 255 * dotIntensity;
    }

    if (mastIntensity > 0) {
      finalR = finalR * (1 - mastIntensity) + 220 * mastIntensity;
      finalG = finalG * (1 - mastIntensity) + 240 * mastIntensity;
      finalB = finalB * (1 - mastIntensity) + 255 * mastIntensity;
    }

    return [
      Math.min(255, Math.round(finalR)),
      Math.min(255, Math.round(finalG)),
      Math.min(255, Math.round(finalB)),
      255
    ];
  };
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 192x192
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPng(192, 192, drawRadioIcon(false)));
console.log('Generated pwa-192x192.png');

// 512x512
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPng(512, 512, drawRadioIcon(false)));
console.log('Generated pwa-512x512.png');

// 512x512 Maskable (with safe zone margins)
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPng(512, 512, drawRadioIcon(true)));
console.log('Generated pwa-maskable-512x512.png');

// 180x180 apple-touch-icon
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPng(180, 180, drawRadioIcon(false)));
console.log('Generated apple-touch-icon.png');
