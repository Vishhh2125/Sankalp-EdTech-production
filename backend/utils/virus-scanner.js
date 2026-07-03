import net from 'net';
import fs from 'fs';
import logger from '../config/logger.js';

const CLAMAV_HOST = process.env.CLAMAV_HOST || 'clamav';
const CLAMAV_PORT = parseInt(process.env.CLAMAV_PORT || '3310', 10);

/**
 * Scans a file buffer using the ClamAV INSTREAM protocol.
 * ClamAV protocol details:
 * - Send "nINSTREAM\n"
 * - Send chunks: <4-byte length in big-endian> + <chunk data>
 * - Send end of stream marker: 4-byte 0x00000000
 * - Read response. Clean contains "OK", infected contains "FOUND".
 */
async function scanBuffer(buffer) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    let response = '';

    client.setTimeout(15000); // 15s timeout for large uploads

    client.connect(CLAMAV_PORT, CLAMAV_HOST, () => {
      client.write('nINSTREAM\n');

      const sizeBuffer = Buffer.alloc(4);
      sizeBuffer.writeUInt32BE(buffer.length, 0);
      client.write(sizeBuffer);
      client.write(buffer);

      const zeroBuffer = Buffer.alloc(4);
      zeroBuffer.writeUInt32BE(0, 0);
      client.write(zeroBuffer);
    });

    client.on('data', (data) => {
      response += data.toString();
    });

    client.on('close', () => {
      const isClean = response.includes('OK') && !response.includes('FOUND');
      const isInfected = response.includes('FOUND');

      if (isClean) {
        resolve({ clean: true, isInfected: false, details: response.trim() });
      } else if (isInfected) {
        resolve({ clean: false, isInfected: true, details: response.trim() });
      } else {
        reject(new Error(`ClamAV scan failed with response: ${response.trim()}`));
      }
    });

    client.on('error', (err) => {
      reject(err);
    });

    client.on('timeout', () => {
      client.destroy();
      reject(new Error('ClamAV scan timeout'));
    });
  });
}

/**
 * Scans a file at the given path.
 * If ClamAV daemon is unreachable in development, logs a warning and bypasses check.
 */
async function scanFile(filePath) {
  try {
    const buffer = await fs.promises.readFile(filePath);
    return await scanBuffer(buffer);
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      logger.warn(`[ClamAV] Scan failed or daemon unreachable. Bypassing check in development: ${err.message}`);
      return { clean: true, isInfected: false, details: 'ClamAV bypassed in development mode' };
    }
    // Re-throw in production
    throw err;
  }
}

export { scanBuffer, scanFile };
