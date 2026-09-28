// backend/src/utils/cloudStorage.js
// 🌐 Permanent Scientific Diagram Storage using Google Cloud Storage
import { Storage } from '@google-cloud/storage';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BUCKET_NAME = process.env.GCS_DIAGRAMS_BUCKET || 'vigyanprep-diagrams';
const UPLOADS_DIR = path.join(__dirname, '../../uploads/diagrams');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

let storageClient = null;
let bucketRef = null;

try {
  storageClient = new Storage();
  bucketRef = storageClient.bucket(BUCKET_NAME);
} catch (initErr) {
  console.warn('[CloudStorage] Failed to initialize GCS client:', initErr.message);
}

/**
 * Uploads a file buffer to Google Cloud Storage (or falls back to local disk if GCS is unavailable)
 * Returns the public URL string.
 */
export async function uploadDiagramToStorage(buffer, filename, contentType = 'image/png') {
  // 1. Always cache locally on disk
  const localPath = path.join(UPLOADS_DIR, filename);
  try {
    fs.writeFileSync(localPath, buffer);
  } catch (fsErr) {
    console.warn('[CloudStorage] Local cache write warning:', fsErr.message);
  }

  // 2. Primary: Upload via @google-cloud/storage (works automatically in Cloud Run via ADC)
  if (bucketRef) {
    try {
      const gcsFile = bucketRef.file(filename);
      await gcsFile.save(buffer, {
        contentType,
        metadata: {
          cacheControl: 'public, max-age=31536000',
        },
        resumable: false
      });

      const publicGcsUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${filename}`;
      console.log(`[CloudStorage] ✅ Saved diagram to GCS: ${publicGcsUrl}`);
      return publicGcsUrl;
    } catch (gcsErr) {
      console.warn('[CloudStorage] Native GCS upload failed, attempting local CLI fallback:', gcsErr.message);
    }
  }

  // 3. Secondary: If running locally with gcloud CLI authenticated
  try {
    const { stdout: token } = await execAsync('gcloud auth print-access-token', { timeout: 4000 });
    const trimmedToken = token.trim();
    if (trimmedToken) {
      const gcsApiUrl = `https://storage.googleapis.com/upload/storage/v1/b/${BUCKET_NAME}/o?uploadType=media&name=${encodeURIComponent(filename)}`;
      const res = await fetch(gcsApiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${trimmedToken}`,
          'Content-Type': contentType,
        },
        body: buffer
      });
      if (res.ok) {
        const publicGcsUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${filename}`;
        console.log(`[CloudStorage] ✅ Saved diagram via gcloud token to GCS: ${publicGcsUrl}`);
        return publicGcsUrl;
      }
    }
  } catch (cliErr) {
    // Ignore CLI fallback error
  }

  // 4. Final Fallback to relative uploads URL
  return `/uploads/diagrams/${filename}`;
}
