import CryptoJS from "crypto-js";
import { env } from "../../shared/config/env";

/**
 * Encrypts data using AES encryption (CryptoJS format)
 * This produces the same format as shown in the network tab
 * @param data - Data to encrypt (will be JSON stringified)
 * @param secret - Encryption secret key (optional, defaults to ENCRYPTION_KEY or JWT_SECRET)
 * @returns Encrypted string in CryptoJS format (base64 encoded)
 */
export function encryptResponse(data: any, secret?: string): string {
  // Use ENCRYPTION_KEY if available, otherwise fall back to JWT_SECRET
  const encryptionKey = secret || (env as any).ENCRYPTION_KEY || env.JWT_SECRET || "default-secret-key";
  const jsonString = JSON.stringify(data);
  const encrypted = CryptoJS.AES.encrypt(jsonString, encryptionKey).toString();
  return encrypted;
}

/**
 * Decrypts data encrypted with encryptResponse
 * @param encryptedData - Encrypted string (CryptoJS format)
 * @param secret - Encryption secret key (optional, defaults to ENCRYPTION_KEY or JWT_SECRET)
 * @returns Decrypted data object
 */
export function decryptResponse(encryptedData: string, secret?: string): any {
  // Use ENCRYPTION_KEY if available, otherwise fall back to JWT_SECRET
  const encryptionKey = secret || (env as any).ENCRYPTION_KEY || env.JWT_SECRET || "default-secret-key";
  const decrypted = CryptoJS.AES.decrypt(encryptedData, encryptionKey);
  const jsonString = decrypted.toString(CryptoJS.enc.Utf8);
  if (!jsonString) {
    throw new Error("Decryption failed - invalid key or corrupted data");
  }
  return JSON.parse(jsonString);
}

