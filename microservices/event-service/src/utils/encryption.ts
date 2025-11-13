// src/utils/encryption.ts
import CryptoJS from "crypto-js";
import { env } from "../../shared/config/env";

export function encryptResponse(data: any, secret?: string): string {
  const encryptionKey = secret || (env as any).ENCRYPTION_KEY || env.JWT_SECRET || "default-secret-key";
  const jsonString = JSON.stringify(data);
  const encrypted = CryptoJS.AES.encrypt(jsonString, encryptionKey).toString();
  return encrypted;
}

export function decryptResponse(encryptedData: string, secret?: string): any {
  const encryptionKey = secret || (env as any).ENCRYPTION_KEY || env.JWT_SECRET || "default-secret-key";
  const decrypted = CryptoJS.AES.decrypt(encryptedData, encryptionKey);
  const jsonString = decrypted.toString(CryptoJS.enc.Utf8);
  if (!jsonString) {
    throw new Error("Decryption failed - invalid key or corrupted data");
  }
  return JSON.parse(jsonString);
}

