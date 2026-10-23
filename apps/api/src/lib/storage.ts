import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { env } from '../config/env.js';

export type AllowedMimeType =
  | 'application/pdf'
  | 'image/png'
  | 'image/jpeg'
  | 'application/json';

export interface FileValidationResult {
  isValid: boolean;
  detectedMime: AllowedMimeType | null;
  extension: string | null;
  error?: string;
}

export interface StoredFileMetadata {
  fileId: string;
  storagePath: string; // Relative safe filename in private storage
  mimeType: AllowedMimeType;
  fileSizeBytes: number;
  sha256: string;
}

export class StorageService {
  private storageDir: string;

  constructor() {
    this.storageDir = path.isAbsolute(env.STORAGE_DIR)
      ? env.STORAGE_DIR
      : path.resolve(process.cwd(), env.STORAGE_DIR);

    this.ensureStorageDirectory();
  }

  private ensureStorageDirectory(): void {
    if (!fs.existsSync(this.storageDir)) {
      try {
        fs.mkdirSync(this.storageDir, { recursive: true, mode: 0o700 });
      } catch (err) {
        console.warn(`[StorageService] Warning while setting 0700 permissions: ${err}`);
      }
    }
  }

  /**
   * Inspects buffer magic bytes to verify genuine file type.
   * NEVER trusts client-supplied Content-Type or file extensions.
   */
  validateMagicBytes(buffer: Buffer): FileValidationResult {
    if (!buffer || buffer.length === 0) {
      return { isValid: false, detectedMime: null, extension: null, error: 'Empty file payload' };
    }

    if (buffer.length > env.MAX_FILE_SIZE_BYTES) {
      return {
        isValid: false,
        detectedMime: null,
        extension: null,
        error: `File size exceeds the allowable limit of ${Math.round(env.MAX_FILE_SIZE_BYTES / (1024 * 1024))}MB.`,
      };
    }

    // PDF magic bytes: %PDF- (0x25 0x50 0x44 0x46 0x2D)
    if (
      buffer.length >= 5 &&
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46 &&
      buffer[4] === 0x2d
    ) {
      return { isValid: true, detectedMime: 'application/pdf', extension: 'pdf' };
    }

    // PNG magic bytes: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
    if (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      return { isValid: true, detectedMime: 'image/png', extension: 'png' };
    }

    // JPEG magic bytes: 0xFF 0xD8 0xFF
    if (
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    ) {
      return { isValid: true, detectedMime: 'image/jpeg', extension: 'jpg' };
    }

    // JSON: Check UTF-8 validity and parse structure
    try {
      const text = buffer.toString('utf-8').trim();
      if ((text.startsWith('{') && text.endsWith('}')) || (text.startsWith('[') && text.endsWith(']'))) {
        JSON.parse(text);
        return { isValid: true, detectedMime: 'application/json', extension: 'json' };
      }
    } catch {
      // Not JSON
    }

    return {
      isValid: false,
      detectedMime: null,
      extension: null,
      error: 'File content does not match allowed medical document types (PDF, PNG, JPEG, JSON). Executables and unverified formats are strictly rejected.',
    };
  }

  /**
   * Stores a validated file buffer in the private storage directory with an opaque UUID name.
   * Medical documents are NEVER stored in a public static directory.
   */
  async storeFile(buffer: Buffer, validatedMime: AllowedMimeType): Promise<StoredFileMetadata> {
    this.ensureStorageDirectory();

    const fileId = crypto.randomUUID();
    const storageFileName = `${fileId}.bin`;
    const fullPath = path.join(this.storageDir, storageFileName);

    // Write file with restricted read/write permissions
    await fs.promises.writeFile(fullPath, buffer, { mode: 0o600 });

    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');

    return {
      fileId,
      storagePath: storageFileName,
      mimeType: validatedMime,
      fileSizeBytes: buffer.length,
      sha256,
    };
  }

  /**
   * Safely retrieves private file bytes from disk.
   * Enforces strict path sanitization to prevent path traversal attacks.
   */
  async getFile(storageFileName: string): Promise<Buffer> {
    this.ensureStorageDirectory();

    // Prevent directory traversal attacks
    const safeFileName = path.basename(storageFileName);
    const fullPath = path.join(this.storageDir, safeFileName);

    if (!fs.existsSync(fullPath)) {
      const err = new Error('Requested document file was not found in private storage.');
      (err as any).statusCode = 404;
      (err as any).code = 'FILE_NOT_FOUND';
      throw err;
    }

    return await fs.promises.readFile(fullPath);
  }

  /**
   * Generates a safe, clean attachment filename for HTTP response headers.
   */
  getSafeDownloadFilename(documentNumber: string, mimeType?: string | null): string {
    const cleanNumber = documentNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
    let ext = 'bin';
    if (mimeType === 'application/pdf') ext = 'pdf';
    else if (mimeType === 'image/png') ext = 'png';
    else if (mimeType === 'image/jpeg') ext = 'jpg';
    else if (mimeType === 'application/json') ext = 'json';
    return `${cleanNumber}.${ext}`;
  }
}

export const storageService = new StorageService();
