// lib/crypto.js
import crypto from 'crypto';

const algorithm = 'aes-256-gcm';
const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
const iterations = 3; // Triple encryption

export function encryptTriple(text) {
  let result = text;
  for (let i = 0; i < iterations; i++) {
    const iv = crypto.randomBytes(12); // 96-bit IV for GCM
    const cipher = crypto.createCipher(algorithm, key);
    cipher.setAAD(Buffer.from('chat')); // Optional associated data
    const encrypted = Buffer.concat([cipher.update(result, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    // Format: iv.tag.encrypted (all base64)
    result = [
      iv.toString('base64'),
      authTag.toString('base64'),
      encrypted.toString('base64')
    ].join('|');
  }
  return result;
}

export function decryptTriple(encryptedText) {
  let result = encryptedText;
  for (let i = 0; i < iterations; i++) {
    const parts = result.split('|');
    if (parts.length !== 3) throw new Error('Invalid encrypted format');
    const [ivB64, tagB64, encB64] = parts;
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(tagB64, 'base64');
    const encrypted = Buffer.from(encB64, 'base64');

    const decipher = crypto.createDecipher(algorithm, key);
    decipher.setAAD(Buffer.from('chat'));
    decipher.setAuthTag(authTag);
    result = decipher.update(encrypted, null, 'utf8') + decipher.final('utf8');
  }
  return result;
}
