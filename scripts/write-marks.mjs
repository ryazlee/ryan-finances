import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public')

function crc32(buffer) {
  let crc = ~0
  for (let i = 0; i < buffer.length; i += 1) {
    crc ^= buffer[i]
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
    }
  }
  return ~crc >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const name = Buffer.from(type)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])))
  return Buffer.concat([length, name, data, crc])
}

function sdRoundBox(x, y, cx, cy, halfWidth, halfHeight, radius) {
  const dx = Math.abs(x - cx) - halfWidth + radius
  const dy = Math.abs(y - cy) - halfHeight + radius
  return Math.min(Math.max(dx, dy), 0) + Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) - radius
}

function coverage(distance) {
  return Math.min(1, Math.max(0, 0.5 - distance))
}

function mix(a, b, t) {
  return a.map((channel, index) => Math.round(channel + (b[index] - channel) * t))
}

function png(size, paint) {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 4 + 1)
    raw[row] = 0
    for (let x = 0; x < size; x += 1) {
      const [r, g, b, a] = paint(x + 0.5, y + 0.5, size)
      const index = row + 1 + x * 4
      raw[index] = r
      raw[index + 1] = g
      raw[index + 2] = b
      raw[index + 3] = a
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function mark(x, y, size) {
  const paper = [250, 250, 250, 255]
  const ink = [17, 24, 39, 255]
  const line = [161, 161, 170, 255]
  const plate = sdRoundBox(x, y, size * 0.5, size * 0.5, size * 0.34, size * 0.34, size * 0.08)
  let color = paper
  color = mix(color, ink, coverage(plate))
  const card = sdRoundBox(x, y, size * 0.5, size * 0.48, size * 0.16, size * 0.11, size * 0.025)
  color = mix(color, paper, coverage(card))
  const top = sdRoundBox(x, y, size * 0.5, size * 0.44, size * 0.09, size * 0.012, size * 0.008)
  const bottom = sdRoundBox(x, y, size * 0.46, size * 0.52, size * 0.06, size * 0.012, size * 0.008)
  color = mix(color, line, Math.max(coverage(top), coverage(bottom)))
  return color
}

writeFileSync(resolve(root, 'favicon.png'), png(512, mark))
writeFileSync(resolve(root, 'og.png'), png(1200, mark))
