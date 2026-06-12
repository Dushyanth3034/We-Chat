// Cryptographic Utilities for End-to-End Encryption using standard WebCrypto APIs

// Helper: Convert ArrayBuffer to Base64 String
export function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Helper: Convert Base64 String to ArrayBuffer
export function base64ToBuffer(base64) {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Helper: Text Encoder / Decoder
const encoder = new TextEncoder();
const decoder = new TextDecoder();

// 1. Derive AES key from password and salt (PBKDF2)
export async function deriveKeyFromPassword(password, saltString = 'wechat-salt-constant') {
  const passwordBuffer = encoder.encode(password);
  const saltBuffer = encoder.encode(saltString);

  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

// 2. Generate RSA Keypair
export async function generateRSAKeyPair() {
  const pair = await window.crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt']
  );

  // Export keys
  const publicKeyDer = await window.crypto.subtle.exportKey('spki', pair.publicKey);
  const privateKeyDer = await window.crypto.subtle.exportKey('pkcs8', pair.privateKey);

  return {
    publicKeyStr: bufferToBase64(publicKeyDer),
    privateKeyStr: bufferToBase64(privateKeyDer),
    publicKey: pair.publicKey,
    privateKey: pair.privateKey
  };
}

// 3. Encrypt Private Key with password derived key
export async function encryptPrivateKey(privateKeyStr, derivedKey) {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const data = encoder.encode(privateKeyStr);

  const ciphertext = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    derivedKey,
    data
  );

  const ivBase64 = bufferToBase64(iv);
  const ciphertextBase64 = bufferToBase64(ciphertext);

  return `${ivBase64}:${ciphertextBase64}`;
}

// 4. Decrypt Private Key with password derived key
export async function decryptPrivateKey(encryptedKeyStr, derivedKey) {
  const parts = encryptedKeyStr.split(':');
  if (parts.length !== 2) throw new Error('Invalid encrypted private key format');

  const iv = new Uint8Array(base64ToBuffer(parts[0]));
  const ciphertext = base64ToBuffer(parts[1]);

  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    derivedKey,
    ciphertext
  );

  return decoder.decode(decrypted);
}

// 5. Generate Random AES-256 Conversation Key
export async function generateConversationKey() {
  const key = await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  const raw = await window.crypto.subtle.exportKey('raw', key);
  return {
    key,
    keyStr: bufferToBase64(raw)
  };
}

// 6. Encrypt Conversation Key using RSA Public Key
export async function encryptConversationKey(conversationKeyStr, recipientPublicKeyStr) {
  const pubKeyBuffer = base64ToBuffer(recipientPublicKeyStr);
  const recipientPublicKey = await window.crypto.subtle.importKey(
    'spki',
    pubKeyBuffer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt']
  );

  const data = encoder.encode(conversationKeyStr);
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    recipientPublicKey,
    data
  );

  return bufferToBase64(ciphertext);
}

// 7. Decrypt Conversation Key using RSA Private Key
export async function decryptConversationKey(encryptedKeyStr, myPrivateKeyStr) {
  const privKeyBuffer = base64ToBuffer(myPrivateKeyStr);
  const myPrivateKey = await window.crypto.subtle.importKey(
    'pkcs8',
    privKeyBuffer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['decrypt']
  );

  const encryptedBuffer = base64ToBuffer(encryptedKeyStr);
  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    myPrivateKey,
    encryptedBuffer
  );

  return decoder.decode(decrypted);
}

// 8. Encrypt String Payload (AES-GCM)
export async function encryptPayload(plaintext, conversationKeyStr) {
  const keyBuffer = base64ToBuffer(conversationKeyStr);
  const key = await window.crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const data = encoder.encode(plaintext);

  const ciphertext = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  const ivBase64 = bufferToBase64(iv);
  const ciphertextBase64 = bufferToBase64(ciphertext);

  return `[E2E]:${ivBase64}:${ciphertextBase64}`;
}

// 9. Decrypt String Payload (AES-GCM)
export async function decryptPayload(encryptedPayload, conversationKeyStr) {
  if (!encryptedPayload || !encryptedPayload.startsWith('[E2E]:')) {
    return encryptedPayload; // Return as-is if not E2E encrypted (backward compatibility)
  }

  const parts = encryptedPayload.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted payload format');

  const keyBuffer = base64ToBuffer(conversationKeyStr);
  const key = await window.crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const iv = new Uint8Array(base64ToBuffer(parts[1]));
  const ciphertext = base64ToBuffer(parts[2]);

  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  return decoder.decode(decrypted);
}

// 10. Encrypt File Blob client-side (AES-GCM)
export async function encryptFile(blob, conversationKeyStr) {
  const keyBuffer = base64ToBuffer(conversationKeyStr);
  const key = await window.crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const arrayBuffer = await blob.arrayBuffer();

  const ciphertext = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    arrayBuffer
  );

  // Combine IV (12 bytes) and ciphertext into a single blob
  // We can prepend IV to the ciphertext bytes
  const combined = new Uint8Array(12 + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), 12);

  return new Blob([combined], { type: 'application/octet-stream' });
}

// 11. Decrypt File Blob client-side (AES-GCM)
export async function decryptFile(blob, conversationKeyStr, mimeType = '') {
  const keyBuffer = base64ToBuffer(conversationKeyStr);
  const key = await window.crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  
  if (bytes.length < 12) throw new Error('Ciphertext too short');
  
  const iv = bytes.slice(0, 12);
  const ciphertext = bytes.slice(12).buffer;

  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  return new Blob([decrypted], { type: mimeType });
}
