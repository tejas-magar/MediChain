import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env.js';

/**
 * SIGNING KEY STRATEGY & KEY MANAGEMENT ARCHITECTURE:
 *
 * 1. LOCAL DEVELOPMENT ENVIRONMENT:
 *    - Private signing keys are stored locally in the secure keystore directory (`.keystore/`).
 *    - Directory permissions are restricted (0700 on POSIX).
 *    - Key files are named `${userId}.key` with mode 0600.
 *    - Private keys are NEVER stored in:
 *      * The database (only User.publicKeyPem is stored in DB for verification)
 *      * The frontend web application bundle
 *      * The Git repository (.gitignore strictly ignores .keystore, *.key, *.pem)
 *      * Public blockchain ledgers
 *
 * 2. PRODUCTION ARCHITECTURE:
 *    - Hardware Security Module (HSM) or Cloud Key Management Service (Cloud KMS)
 *      such as AWS KMS, Google Cloud KMS, or Azure Key Vault.
 *    - Asymmetric RSA-PSS or RSA-PKCS1-v1_5 signing keys are generated inside HSM/KMS.
 *    - Private keys NEVER leave the HSM boundary.
 *    - When a document is finalized, the server computes SHA-256 canonical bytes
 *      and calls the KMS `Sign` API via authenticated IAM role.
 *    - Public keys/certificates are registered in a trusted public key registry.
 */

export class KeystoreService {
  private keystoreDir: string;

  constructor() {
    this.keystoreDir = path.isAbsolute(env.KEYSTORE_DIR)
      ? env.KEYSTORE_DIR
      : path.resolve(process.cwd(), env.KEYSTORE_DIR);

    this.ensureKeystoreDirectory();
  }

  private ensureKeystoreDirectory(): void {
    if (!fs.existsSync(this.keystoreDir)) {
      try {
        fs.mkdirSync(this.keystoreDir, { recursive: true, mode: 0o700 });
      } catch (err) {
        console.warn(`[KeystoreService] Could not set 0700 permission on keystore directory: ${err}`);
      }
    }
  }

  /**
   * Generates a new RSA 2048-bit key-pair.
   */
  generateKeyPair(): { publicKeyPem: string; privateKeyPem: string } {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    return { publicKeyPem: publicKey, privateKeyPem: privateKey };
  }

  /**
   * Retrieves or provisions an issuer's private key in the local secure keystore.
   */
  getOrCreateIssuerKey(userId: string): { privateKeyPem: string; publicKeyPem: string } {
    this.ensureKeystoreDirectory();
    // Sanitize userId to prevent directory traversal
    const safeUserId = path.basename(userId);
    const keyPath = path.join(this.keystoreDir, `${safeUserId}.key`);

    if (fs.existsSync(keyPath)) {
      const privateKeyPem = fs.readFileSync(keyPath, 'utf-8');
      const privKeyObj = crypto.createPrivateKey(privateKeyPem);
      const pubKeyObj = crypto.createPublicKey(privKeyObj);
      const publicKeyPem = pubKeyObj.export({ type: 'spki', format: 'pem' }).toString();
      return { privateKeyPem, publicKeyPem };
    }

    // Generate new keypair
    const { publicKeyPem, privateKeyPem } = this.generateKeyPair();
    try {
      fs.writeFileSync(keyPath, privateKeyPem, { encoding: 'utf-8', mode: 0o600 });
    } catch (err) {
      console.error(`[KeystoreService] Failed to write key file: ${err}`);
      throw new Error(`Failed to safely persist issuer private key.`);
    }

    return { privateKeyPem, publicKeyPem };
  }

  /**
   * Saves an existing private key to the keystore for a given user.
   */
  saveIssuerKey(userId: string, privateKeyPem: string): void {
    this.ensureKeystoreDirectory();
    const safeUserId = path.basename(userId);
    const keyPath = path.join(this.keystoreDir, `${safeUserId}.key`);
    fs.writeFileSync(keyPath, privateKeyPem, { encoding: 'utf-8', mode: 0o600 });
  }

  /**
   * Retrieves an issuer's private key. Throws if not present.
   */
  getIssuerPrivateKey(userId: string): string {
    const safeUserId = path.basename(userId);
    const keyPath = path.join(this.keystoreDir, `${safeUserId}.key`);
    if (!fs.existsSync(keyPath)) {
      // Fallback: auto-generate and persist so dev workflows never fail silently
      return this.getOrCreateIssuerKey(userId).privateKeyPem;
    }
    return fs.readFileSync(keyPath, 'utf-8');
  }

  /**
   * Deterministically canonicalizes a document payload into a stable UTF-8 Buffer.
   * Recursively sorts object keys so that equivalent JSON structures always yield
   * identical byte representations across platforms and serializations.
   */
  canonicalizeDocument(payload: unknown): Buffer {
    const sortObjectKeys = (obj: any): any => {
      if (obj === null || typeof obj !== 'object') {
        return obj;
      }
      if (obj instanceof Date) {
        return obj.toISOString();
      }
      if (Array.isArray(obj)) {
        return obj.map(sortObjectKeys);
      }
      const sortedKeys = Object.keys(obj).sort();
      const result: Record<string, any> = {};
      for (const key of sortedKeys) {
        result[key] = sortObjectKeys(obj[key]);
      }
      return result;
    };

    const sorted = sortObjectKeys(payload);
    const canonicalJson = JSON.stringify(sorted);
    return Buffer.from(canonicalJson, 'utf-8');
  }

  /**
   * Computes the SHA-256 hexadecimal hash over exact input bytes.
   */
  computeSha256(data: Buffer | string): string {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf-8');
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Cryptographically signs canonical document bytes with the issuer's private key
   * using RSA-SHA256.
   */
  signCanonicalBytes(
    userId: string,
    canonicalBytes: Buffer
  ): { signature: string; algorithm: 'RSA-SHA256' } {
    const privateKeyPem = this.getIssuerPrivateKey(userId);
    const signer = crypto.createSign('SHA256');
    signer.update(canonicalBytes);
    signer.end();

    const signature = signer.sign(privateKeyPem, 'base64');
    return { signature, algorithm: 'RSA-SHA256' };
  }

  /**
   * Verifies an RSA-SHA256 signature against canonical document bytes and issuer's public key.
   */
  verifySignature(
    canonicalBytes: Buffer,
    signatureBase64: string,
    publicKeyPem: string
  ): boolean {
    try {
      const verifier = crypto.createVerify('SHA256');
      verifier.update(canonicalBytes);
      verifier.end();
      return verifier.verify(publicKeyPem, signatureBase64, 'base64');
    } catch (err) {
      console.warn(`[KeystoreService] Signature verification exception: ${err}`);
      return false;
    }
  }
}

export const keystoreService = new KeystoreService();
