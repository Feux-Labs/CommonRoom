/**
 * Client-side media preparation. Everything is re-encoded in the browser, which also
 * removes metadata (GPS location, camera model, timestamps) from the file. The original
 * file is NEVER returned: if a file cannot be re-encoded it is refused instead, because
 * uploading it untouched could publish the poster's location.
 */

export const MAX_IMAGE_DIMENSION = 1920;
export const IMAGE_QUALITY = 0.82;
export const MAX_VIDEO_SECONDS = 15;
/** Target size for a 15 second clip. */
export const TARGET_VIDEO_BYTES = 1_500_000;
/** Anything above this after compression is refused. */
export const MAX_VIDEO_BYTES = 2_000_000;
const MAX_VIDEO_DIMENSION = 960;
const AUDIO_BITRATE = 64_000;
const MIN_VIDEO_BITRATE = 250_000;
const MAX_VIDEO_BITRATE = 1_200_000;

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => {
    throw new Error(`This image format is not supported: ${file.name}`);
  });
  try {
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image compression is not available in this browser.');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    // WebP first. Some browsers silently return PNG for WebP, so check the real type and
    // fall back to JPEG rather than uploading a huge PNG.
    let blob = await toBlob(canvas, 'image/webp', IMAGE_QUALITY);
    let extension = 'webp';
    if (!blob || blob.type !== 'image/webp') {
      blob = await toBlob(canvas, 'image/jpeg', IMAGE_QUALITY);
      extension = 'jpg';
    }
    if (!blob || !['image/webp', 'image/jpeg'].includes(blob.type)) {
      throw new Error('This image could not be prepared on this device.');
    }
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo';
    return new File([blob], `${baseName}.${extension}`, { type: blob.type, lastModified: Date.now() });
  } finally {
    bitmap.close();
  }
}

function recorderMimeType() {
  if (typeof MediaRecorder === 'undefined') return null;
  return [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ].find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
}

export function videoBitrateFor(seconds: number) {
  const totalBits = (TARGET_VIDEO_BYTES * 8 * 0.9) / Math.max(1, seconds);
  return Math.round(Math.min(MAX_VIDEO_BITRATE, Math.max(MIN_VIDEO_BITRATE, totalBits - AUDIO_BITRATE)));
}


/**
 * Videos recorded in the browser (MediaRecorder, our own trimmer) often report an infinite
 * duration until the end is reached. Seeking far past the end makes the browser work it out.
 */
async function resolveDuration(video: HTMLVideoElement): Promise<number> {
  if (Number.isFinite(video.duration)) return video.duration;
  await new Promise<void>((resolve) => {
    const finish = () => { video.removeEventListener('durationchange', onChange); resolve(); };
    const onChange = () => { if (Number.isFinite(video.duration)) finish(); };
    video.addEventListener('durationchange', onChange);
    video.currentTime = Number.MAX_SAFE_INTEGER;
    window.setTimeout(finish, 3000);
  });
  const duration = video.duration;
  video.currentTime = 0;
  return duration;
}

/** Reads a video's duration in seconds without playing it. */
export async function readVideoDuration(file: File): Promise<number> {
  const video = document.createElement('video');
  video.preload = 'metadata';
  const url = URL.createObjectURL(file);
  try {
    video.src = url;
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error(`This video could not be opened: ${file.name}`));
    });
    return await resolveDuration(video);
  } finally {
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(url);
  }
}

export async function compressVideo(file: File, onProgress?: (progress: number) => void): Promise<File> {
  const mimeType = recorderMimeType();
  if (!mimeType || typeof HTMLCanvasElement.prototype.captureStream !== 'function') {
    throw new Error('This browser can’t prepare videos. Try the latest Chrome or Safari.');
  }

  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  const sourceUrl = URL.createObjectURL(file);
  video.src = sourceUrl;

  let animationFrame = 0;
  let sourceStream: MediaStream | null = null;
  let outputStream: MediaStream | null = null;
  let recorder: MediaRecorder | null = null;
  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error(`This video could not be opened: ${file.name}`));
    });
    const duration = await resolveDuration(video);
    if (!Number.isFinite(duration) || duration <= 0) throw new Error('This video could not be read.');
    if (duration > MAX_VIDEO_SECONDS + 0.25) {
      throw new Error(`Videos can be up to ${MAX_VIDEO_SECONDS} seconds. This one is ${Math.ceil(duration)} seconds.`);
    }

    const capturable = video as HTMLVideoElement & { captureStream?: () => MediaStream; webkitCaptureStream?: () => MediaStream };
    sourceStream = capturable.captureStream?.() ?? capturable.webkitCaptureStream?.() ?? null;
    if (!sourceStream) throw new Error('This browser can’t prepare videos. Try the latest Chrome or Safari.');

    const scale = Math.min(1, MAX_VIDEO_DIMENSION / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(2, Math.round((video.videoWidth * scale) / 2) * 2);
    canvas.height = Math.max(2, Math.round((video.videoHeight * scale) / 2) * 2);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Video compression is not available in this browser.');

    outputStream = canvas.captureStream(24);
    sourceStream.getAudioTracks().forEach((track) => outputStream?.addTrack(track));
    const chunks: BlobPart[] = [];
    recorder = new MediaRecorder(outputStream, {
      mimeType,
      videoBitsPerSecond: videoBitrateFor(duration),
      audioBitsPerSecond: AUDIO_BITRATE,
    });
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };

    const recordingDone = new Promise<void>((resolve, reject) => {
      recorder!.onstop = () => resolve();
      recorder!.onerror = () => reject(new Error('Video compression failed on this device.'));
      video.onended = () => { if (recorder?.state === 'recording') recorder.stop(); };
    });
    const drawFrame = () => {
      if (video.ended || video.paused) return;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      onProgress?.(Math.min(99, Math.floor((video.currentTime / duration) * 100)));
      animationFrame = requestAnimationFrame(drawFrame);
    };

    recorder.start(500);
    await video.play();
    drawFrame();
    await recordingDone;
    onProgress?.(100);

    const isMp4 = mimeType.startsWith('video/mp4');
    const output = new File(chunks, `${file.name.replace(/\.[^.]+$/, '') || 'video'}.${isMp4 ? 'mp4' : 'webm'}`, {
      type: isMp4 ? 'video/mp4' : 'video/webm',
      lastModified: Date.now(),
    });
    if (output.size > MAX_VIDEO_BYTES) {
      throw new Error('This video is still too large after compression. Try a shorter or simpler clip.');
    }
    return output;
  } finally {
    cancelAnimationFrame(animationFrame);
    if (recorder?.state === 'recording') recorder.stop();
    sourceStream?.getTracks().forEach((track) => track.stop());
    outputStream?.getTracks().forEach((track) => track.stop());
    video.pause();
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(sourceUrl);
  }
}

export async function compressMedia(file: File, onProgress?: (progress: number) => void): Promise<File> {
  if (file.type.startsWith('image/')) return compressImage(file);
  if (file.type.startsWith('video/')) return compressVideo(file, onProgress);
  throw new Error('This file type isn’t supported.');
}
