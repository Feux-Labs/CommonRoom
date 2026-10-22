const maxImageDimension = 1920;
const imageQuality = 0.82;
const maxVideoDimension = 1280;
const videoBitrate = 2_000_000;

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('This image could not be compressed on this device.'));
    }, type, quality);
  });
}

export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error(`This image format is not supported for compression: ${file.name}`);
  });
  try {
    const scale = Math.min(1, maxImageDimension / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image compression is not available in this browser.');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const blob = await toBlob(canvas, 'image/webp', imageQuality);
    if (blob.type !== 'image/webp') throw new Error('This browser cannot create compressed WebP images.');
    const sourceCanUpload = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
    if (blob.size >= file.size && sourceCanUpload) return file;
    const baseName = file.name.replace(/\.[^.]+$/, '');
    return new File([blob], `${baseName}.webp`, { type: 'image/webp', lastModified: file.lastModified });
  } finally {
    bitmap.close();
  }
}

function getRecorderMimeType() {
  if (typeof MediaRecorder === 'undefined') return null;
  return [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ].find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) ?? null;
}

export async function compressVideo(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<File> {
  const mimeType = getRecorderMimeType();
  if (!mimeType || typeof HTMLCanvasElement.prototype.captureStream !== 'function') return file;

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
    if (!Number.isFinite(video.duration) || video.duration <= 0) return file;

    const videoWithCapture = video as HTMLVideoElement & {
      captureStream?: () => MediaStream;
      webkitCaptureStream?: () => MediaStream;
    };
    sourceStream = typeof videoWithCapture.captureStream === 'function'
      ? videoWithCapture.captureStream()
      : typeof videoWithCapture.webkitCaptureStream === 'function'
        ? videoWithCapture.webkitCaptureStream()
        : null;
    if (!sourceStream) return file;

    const scale = Math.min(1, maxVideoDimension / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(2, Math.round(video.videoWidth * scale / 2) * 2);
    canvas.height = Math.max(2, Math.round(video.videoHeight * scale / 2) * 2);
    const context = canvas.getContext('2d');
    if (!context) return file;

    outputStream = canvas.captureStream(30);
    sourceStream.getAudioTracks().forEach((track) => outputStream?.addTrack(track));
    const chunks: BlobPart[] = [];
    recorder = new MediaRecorder(outputStream, {
      mimeType,
      videoBitsPerSecond: videoBitrate,
      audioBitsPerSecond: 128_000,
    });
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };

    const recordingDone = new Promise<void>((resolve, reject) => {
      recorder!.onstop = () => resolve();
      recorder!.onerror = () => reject(new Error('Video compression failed on this device.'));
      video.onended = () => {
        if (recorder?.state === 'recording') recorder.stop();
      };
    });
    const drawFrame = () => {
      if (video.ended || video.paused) return;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      onProgress?.(Math.min(99, Math.floor(video.currentTime / video.duration * 100)));
      animationFrame = requestAnimationFrame(drawFrame);
    };

    recorder.start(1000);
    await video.play();
    drawFrame();
    await recordingDone;
    onProgress?.(100);

    const compressed = new File(chunks, file.name.replace(/\.[^.]+$/, '.webm'), {
      type: 'video/webm',
      lastModified: file.lastModified,
    });
    return compressed.size < file.size ? compressed : file;
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

export async function compressMedia(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<File> {
  return file.type.startsWith('image/')
    ? compressImage(file)
    : file.type.startsWith('video/')
      ? compressVideo(file, onProgress)
      : file;
}
