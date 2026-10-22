'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { AudioLines, Clapperboard, MoveLeft, MoveRight, Upload, X } from 'lucide-react';

type Props = {
  files: File[];
  onClose: () => void;
  onExport: (file: File, soundName: string | null) => void;
};

const MAX_AUDIO_SIZE = 50 * 1024 * 1024;
const MAX_EXPORT_SIZE = 100 * 1024 * 1024;

function drawCover(context: CanvasRenderingContext2D, image: HTMLImageElement, width: number, height: number) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  context.fillStyle = '#000';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
}

export function PhotoReelEditor({ files, onClose, onExport }: Props) {
  const [orderedFiles, setOrderedFiles] = useState(files);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [secondsPerPhoto, setSecondsPerPhoto] = useState(2.5);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState('');
  const audioUrlRef = useRef('');
  const cancelExportRef = useRef(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const imageUrls = useMemo(() => orderedFiles.map((file) => URL.createObjectURL(file)), [orderedFiles]);
  const selectedUrl = imageUrls[Math.min(selectedIndex, imageUrls.length - 1)];
  const duration = orderedFiles.length * secondsPerPhoto;

  useEffect(() => () => imageUrls.forEach((url) => URL.revokeObjectURL(url)), [imageUrls]);
  useEffect(() => () => {
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
  }, []);

  const chooseAudio = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.files?.[0] ?? null;
    event.target.value = '';
    if (!next) return;
    if (!next.type.startsWith('audio/') || next.size > MAX_AUDIO_SIZE) {
      setError('Choose an audio file smaller than 50 MB.');
      return;
    }
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = URL.createObjectURL(next);
    setAudioUrl(audioUrlRef.current);
    setAudioFile(next);
    setError('');
  };

  const movePhoto = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= orderedFiles.length) return;
    setOrderedFiles((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setSelectedIndex(target);
  };

  const removePhoto = (index: number) => {
    setOrderedFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setSelectedIndex((current) => Math.max(0, Math.min(current, orderedFiles.length - 2)));
  };

  const exportVideo = async () => {
    if (orderedFiles.length === 0) {
      setError('Add at least one photo to make a reel.');
      return;
    }
    if (!('MediaRecorder' in window) || !HTMLCanvasElement.prototype.captureStream) {
      setError('Video export is not supported in this browser. Try a recent version of Chrome, Edge, or Firefox.');
      return;
    }
    const recorderType = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']
      .find((type) => MediaRecorder.isTypeSupported(type));
    if (!recorderType) {
      setError('This browser does not support a compatible video export format.');
      return;
    }

    setExporting(true);
    setProgress(0);
    setError('');
    cancelExportRef.current = false;

    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 1280;
    const context = canvas.getContext('2d');
    if (!context) {
      setExporting(false);
      setError('Video export could not initialize the preview canvas.');
      return;
    }

    let outputStream: MediaStream | null = null;
    let audioContext: AudioContext | null = null;
    let soundSource: AudioBufferSourceNode | null = null;
    let recorder: MediaRecorder | null = null;
    let frameId = 0;
    let lastProgressAt = 0;

    try {
      const images = await Promise.all(imageUrls.map(async (url) => {
        const image = new Image();
        image.src = url;
        await image.decode();
        return image;
      }));
      audioContext = new AudioContext();
      await audioContext.resume();
      const recordedAudio = audioContext.createMediaStreamDestination();
      if (audioFile) {
        const decoded = await audioContext.decodeAudioData(await audioFile.arrayBuffer());
        soundSource = audioContext.createBufferSource();
        soundSource.buffer = decoded;
        soundSource.loop = true;
        soundSource.connect(recordedAudio);
      }

      outputStream = canvas.captureStream(30);
      const mixedStream = new MediaStream([
        ...outputStream.getVideoTracks(),
        ...recordedAudio.stream.getAudioTracks(),
      ]);
      recorder = new MediaRecorder(mixedStream, { mimeType: recorderType });
      recorderRef.current = recorder;
      const chunks: BlobPart[] = [];
      const stopped = new Promise<Blob>((resolve, reject) => {
        recorder!.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
        recorder!.onerror = () => reject(new Error('Video export stopped unexpectedly.'));
        recorder!.onstop = () => resolve(new Blob(chunks, { type: recorderType }));
      });

      const totalMs = duration * 1000;
      const startedAt = performance.now();
      const drawFrame = () => {
        const elapsed = performance.now() - startedAt;
        const index = Math.min(images.length - 1, Math.floor(elapsed / (secondsPerPhoto * 1000)));
        drawCover(context, images[index], canvas.width, canvas.height);
        if (elapsed - lastProgressAt >= 250) {
          lastProgressAt = elapsed;
          setProgress(Math.min(99, Math.floor(elapsed / totalMs * 100)));
        }
        if (elapsed >= totalMs || cancelExportRef.current) {
          if (recorder?.state === 'recording') recorder.stop();
          recorderRef.current = null;
          return;
        }
        frameId = requestAnimationFrame(drawFrame);
      };

      drawCover(context, images[0], canvas.width, canvas.height);
      recorder.start(250);
      soundSource?.start(0);
      frameId = requestAnimationFrame(drawFrame);
      const blob = await stopped;
      if (cancelExportRef.current) return;
      if (!blob.size) throw new Error('The exported video was empty. Try exporting again.');
      if (blob.size > MAX_EXPORT_SIZE) throw new Error('The reel is over the 100 MB upload limit. Use fewer photos or a shorter duration.');

      setProgress(100);
      const extension = recorderType.includes('mp4') ? 'mp4' : 'webm';
      onExport(
        new File([blob], `commonroom-photo-reel-${Date.now()}.${extension}`, { type: recorderType.split(';')[0] }),
        audioFile?.name ?? null,
      );
    } catch (exportError) {
      if (!cancelExportRef.current) {
        setError(exportError instanceof Error ? exportError.message : 'The photo reel could not be exported.');
      }
    } finally {
      cancelAnimationFrame(frameId);
      if (recorder?.state === 'recording') recorder.stop();
      outputStream?.getTracks().forEach((track) => track.stop());
      soundSource?.stop();
      if (audioContext && audioContext.state !== 'closed') await audioContext.close();
      setExporting(false);
      if (cancelExportRef.current) setProgress(0);
    }
  };

  const cancelExport = () => {
    cancelExportRef.current = true;
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  };

  return (
    <div aria-label="Photo reel editor" aria-modal="true" className="reel-editor-backdrop" role="dialog">
      <section className="reel-editor photo-reel-editor">
        <header><div><Clapperboard size={18} /><strong>Turn photos into a reel</strong></div><button aria-label="Close editor" disabled={exporting} onClick={onClose} type="button"><X size={19} /></button></header>
        <div className="reel-editor-body">
          <div className="reel-preview">
            {selectedUrl ? <img alt={orderedFiles[selectedIndex]?.name ?? 'Selected photo'} src={selectedUrl} /> : null}
            <span className="photo-reel-preview-count">{selectedIndex + 1} / {orderedFiles.length}</span>
          </div>
          <div className="reel-controls">
            <section className="reel-control-section">
              <div className="reel-control-heading"><span><Clapperboard size={15} /> Photo sequence</span><small>{duration.toFixed(1)} sec total</small></div>
              <div className="photo-reel-sequence">
                {orderedFiles.map((file, index) => (
                  <div className={index === selectedIndex ? 'photo-reel-item selected' : 'photo-reel-item'} key={`${file.name}-${index}`}>
                    <button aria-label={`Preview ${file.name}`} onClick={() => setSelectedIndex(index)} type="button"><img alt="" src={imageUrls[index]} /></button>
                    <span>{index + 1}</span>
                    <div>
                      <button aria-label={`Move ${file.name} earlier`} disabled={index === 0 || exporting} onClick={() => movePhoto(index, -1)} type="button"><MoveLeft size={13} /></button>
                      <button aria-label={`Move ${file.name} later`} disabled={index === orderedFiles.length - 1 || exporting} onClick={() => movePhoto(index, 1)} type="button"><MoveRight size={13} /></button>
                      <button aria-label={`Remove ${file.name}`} disabled={exporting} onClick={() => removePhoto(index)} type="button"><X size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
              <label className="reel-volume">Seconds per photo<input disabled={exporting} max="5" min="1" onChange={(event) => setSecondsPerPhoto(Number(event.target.value))} step="0.5" type="range" value={secondsPerPhoto} /><output>{secondsPerPhoto.toFixed(1)}s</output></label>
              <p>Photos are displayed in this order and cropped to a portrait 9:16 reel.</p>
            </section>
            <section className="reel-control-section">
              <div className="reel-control-heading"><span><AudioLines size={15} /> Soundtrack</span><small>{audioFile ? 'Your audio' : 'Optional'}</small></div>
              {audioFile ? (
                <>
                  <div className="reel-selected-audio"><AudioLines size={16} /><span>{audioFile.name}</span><button aria-label="Remove soundtrack" onClick={() => { if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current); audioUrlRef.current = ''; setAudioUrl(''); setAudioFile(null); }} type="button"><X size={15} /></button></div>
                  <audio controls={!exporting} src={audioUrl} />
                </>
              ) : <label className="reel-upload-audio"><Upload size={15} /> Add your own soundtrack<input accept="audio/*" onChange={chooseAudio} type="file" /></label>}
              <p>Use audio you own or have permission to publish. Your track loops to cover the reel.</p>
            </section>
            {error ? <div className="feedback error-banner" role="alert">{error}</div> : null}
            {exporting ? <div aria-live="polite" className="photo-reel-progress"><span style={{ width: `${progress}%` }} />Exporting {progress}%</div> : null}
          </div>
        </div>
        <footer>
          <span>Processed on this device · no audio library tracks are bundled</span>
          {exporting ? <button className="secondary-button" onClick={cancelExport} type="button">Cancel export</button> : <button className="primary-button" disabled={!orderedFiles.length} onClick={() => void exportVideo()} type="button">Export reel</button>}
        </footer>
      </section>
    </div>
  );
}
