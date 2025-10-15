// lib/crypto.js
import crypto from 'crypto';

const algorithm = 'aes-256-gcm';
const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
const ITERATIONS = 3;

function encryptOnce(text) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipher(algorithm, key);
  cipher.setAAD(Buffer.from('ephemeral-chat'));
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}

function decryptOnce(encryptedText) {
  const [ivB64, tagB64, encB64] = encryptedText.split(':');
  if (!ivB64 || !tagB64 || !encB64) throw new Error('Invalid format');
  
  const decipher = crypto.createDecipher(algorithm, key);
  decipher.setAAD(Buffer.from('ephemeral-chat'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const decrypted = decipher.update(Buffer.from(encB64, 'base64'));
  return Buffer.concat([decrypted, decipher.final()]).toString('utf8');
}

export function encryptTriple(plaintext) {
  let result = plaintext;
  for (let i = 0; i < ITERATIONS; i++) {
    result = encryptOnce(result);
  }
  return result;
}

export function decryptTriple(ciphertext) {
  let result = ciphertext;
  for (let i = 0; i < ITERATIONS; i++) {
    result = decryptOnce(result);
  }
  return result;
}
