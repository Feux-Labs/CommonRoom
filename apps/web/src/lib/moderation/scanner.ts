import { isGeminiConfigured, scanWithGemini } from './gemini-scanner';
import { isScannerConfigured as isGoogleCloudConfigured, scanImage as googleScanImage, scanVideo as googleScanVideo } from './google-scanner';
import type { Level } from './verdict';

/**
 * One entry point for scanning. Uses the Gemini API when GEMINI_API_KEY is set (free tier, no billing), otherwise
 * Google Cloud Vision / Video Intelligence when a service account is set. With neither, scanning is off.
 */
export function isScannerConfigured(): boolean {
  return isGeminiConfigured() || isGoogleCloudConfigured();
}

export async function scanMedia(bytes: Uint8Array, kind: 'image' | 'video', mimeType: string): Promise<{ level: Level; detail: Record<string, unknown> }> {
  if (isGeminiConfigured()) return scanWithGemini(bytes, mimeType);
  return kind === 'video' ? googleScanVideo(bytes) : googleScanImage(bytes);
}

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
  mp4: 'video/mp4', mov: 'video/mov', webm: 'video/webm',
};

export function mimeOfKey(key: string): string {
  return MIME_BY_EXTENSION[key.split('.').pop()?.toLowerCase() ?? ''] ?? 'application/octet-stream';
}
