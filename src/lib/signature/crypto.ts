// src/lib/signature/crypto.ts
// Cifrado en reposo (AES-256-GCM) de la firma manuscrita antes de guardarla en la base de datos.
// Formato almacenado:  v1:<iv_b64>:<authTag_b64>:<ciphertext_b64>
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const VERSION = 'v1';
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
export const MAX_SIGNATURE_BYTES = 512 * 1024;

function getKey(): Buffer {
  const raw = process.env.SIGNATURE_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error('Falta la variable de entorno SIGNATURE_ENCRYPTION_KEY (32 bytes en hex o base64).');
  }
  const key = /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error('SIGNATURE_ENCRYPTION_KEY debe ser de 32 bytes (64 caracteres hex o base64 equivalente).');
  }
  return key;
}

export function encryptBuffer(plain: Buffer): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join(':');
}

export function decryptToBuffer(payload: string): Buffer {
  const [version, iv, tag, data] = payload.split(':');
  if (version !== VERSION || !iv || !tag || !data) {
    throw new Error('Formato de firma cifrada no reconocido.');
  }
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]);
}

/** Convierte un data URL PNG en Buffer validando MIME, firma binaria PNG y tamaño máximo. */
export function pngDataUrlToBuffer(dataUrl: unknown): Buffer {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/png;base64,')) {
    throw new Error('Formato de imagen inválido. Se requiere PNG codificado en base64.');
  }
  const buf = Buffer.from(dataUrl.slice('data:image/png;base64,'.length), 'base64');
  if (buf.length === 0 || buf.length > MAX_SIGNATURE_BYTES) {
    throw new Error('La imagen de la firma está vacía o excede el tamaño permitido.');
  }
  if (!buf.subarray(0, 8).equals(PNG_MAGIC)) {
    throw new Error('El archivo de firma no es un PNG válido.');
  }
  return buf;
}

/** Devuelve el PNG descifrado de una sesión de firma completada (o null). */
export function getSignaturePng(session: { firmaPngEnc?: string | null } | null | undefined): Buffer | null {
  if (!session?.firmaPngEnc) return null;
  try {
    return decryptToBuffer(session.firmaPngEnc);
  } catch (err) {
    console.error('No se pudo descifrar la firma:', (err as Error).message);
    return null;
  }
}

export function getSignatureDataUrl(session: { firmaPngEnc?: string | null } | null | undefined): string | null {
  const png = getSignaturePng(session);
  return png ? `data:image/png;base64,${png.toString('base64')}` : null;
}

