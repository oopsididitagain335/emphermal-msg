// lib/crypto.js
import crypto from 'crypto';

if (!process.env.ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY missing in .env');
}

const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
const AAD = Buffer.from('ephemeral');

function encryptOnce(text) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipher('aes-256-gcm', key);
  cipher.setAAD(AAD);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

function decryptOnce(cipherText) {
  const [ivB64, tagB64, encB64] = cipherText.split(':');
  const decipher = crypto.createDecipher('aes-256-gcm', key);
  decipher.setAAD(AAD);
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const decrypted = decipher.update(Buffer.from(encB64, 'base64'));
  return Buffer.concat([decrypted, decipher.final()]).toString('utf8');
}

export function encryptTriple(plaintext) {
  let res = plaintext;
  for (let i = 0; i < 3; i++) res = encryptOnce(res);
  return res;
}

export function decryptTriple(ciphertext) {
  let res = ciphertext;
  for (let i = 0; i < 3; i++) res = decryptOnce(res);
  return res;
}
