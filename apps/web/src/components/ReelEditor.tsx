'use client';

import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { AudioLines, Clapperboard, LoaderCircle, Pause, Play, Upload, X } from 'lucide-react';

type Props = {
  file: File;
  onClose: () => void;
  onExport: (file: File, soundName: string | null) => void;
};

export function ReelEditor({ file, onClose, onExport }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [videoUrl] = useState(() => URL.createObjectURL(file));
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState('');
  const audioUrlRef = useRef('');
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [musicVolume, setMusicVolume] = useState(0.8);
  const [previewing, setPreviewing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    return () => {
      URL.revokeObjectURL(videoUrl);
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    };
  }, [videoUrl]);

  const chooseAudio = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.files?.[0] ?? null;
    event.target.value = '';
    if (!next) return;
    if (!next.type.startsWith('audio/') || next.size > 50 * 1024 * 1024) {
      setError('Choose an audio file smaller than 50 MB.');
      return;
    }
    setError('');
    setAudioFile(next);
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    const nextUrl = URL.createObjectURL(next);
    audioUrlRef.current = nextUrl;
    setAudioUrl(nextUrl);
  };

  const clearAudio = () => {
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = '';
    setAudioFile(null);
    setAudioUrl('');
  };

  const pausePreview = () => {
    videoRef.current?.pause();
    audioRef.current?.pause();
    setPreviewing(false);
  };

  const playPreview = async () => {
    const video = videoRef.current;
    if (!video) return;
    setError('');
    video.currentTime = start;
    if (audioRef.current && audioFile) {
      audioRef.current.currentTime = 0;
      audioRef.current.volume = musicVolume;
      await audioRef.current.play().catch(() => undefined);
    }
    await video.play().catch(() => setError('Your browser could not play this video.'));
    setPreviewing(true);
  };

  const stopAtTrimEnd = () => {
    const video = videoRef.current;
    if (video && video.currentTime >= end) pausePreview();
  };

  const autoCut = async () => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(duration) || duration < 1) {
      setError('Wait for the video to load before analyzing it.');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 18;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) {
      setError('Automatic clip analysis could not initialize.');
      return;
    }

    setAnalyzing(true);
    setError('');
    pausePreview();
    const previousTime = video.currentTime;
    try {
      const sampleCount = Math.min(60, Math.max(12, Math.ceil(duration / 0.5)));
      const luminanceFrames: number[][] = [];
      for (let index = 0; index < sampleCount; index += 1) {
        const time = Math.min(duration - 0.05, (duration * index) / (sampleCount - 1));
        if (Math.abs(video.currentTime - time) >= 0.04) {
          await new Promise<void>((resolve, reject) => {
            const timer = window.setTimeout(() => {
              video.removeEventListener('seeked', onSeeked);
              reject(new Error('The video could not be analyzed. Try trimming it manually.'));
            }, 8000);
            const onSeeked = () => {
              window.clearTimeout(timer);
              resolve();
            };
            video.addEventListener('seeked', onSeeked, { once: true });
            video.currentTime = time;
          });
        }
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        const luma: number[] = [];
        for (let pixel = 0; pixel < pixels.length; pixel += 4) {
          luma.push((pixels[pixel] * 0.2126) + (pixels[pixel + 1] * 0.7152) + (pixels[pixel + 2] * 0.0722));
        }
        luminanceFrames.push(luma);
      }

      const motionScores = [0];
      for (let frame = 1; frame < luminanceFrames.length; frame += 1) {
        const previous = luminanceFrames[frame - 1];
        const current = luminanceFrames[frame];
        let difference = 0;
        for (let pixel = 0; pixel < current.length; pixel += 1) difference += Math.abs(current[pixel] - previous[pixel]);
        motionScores.push(difference / (current.length * 255));
      }

      const clipLength = Math.min(15, duration);
      const sampleInterval = duration / (sampleCount - 1);
      const windowFrames = Math.max(1, Math.ceil(clipLength / sampleInterval));
      const lastStartIndex = Math.max(0, sampleCount - windowFrames);
      let bestStartIndex = 0;
      let bestScore = -1;
      for (let index = 0; index <= lastStartIndex; index += 1) {
        const score = motionScores.slice(index, index + windowFrames).reduce((total, value) => total + value, 0);
        if (score > bestScore) {
          bestScore = score;
          bestStartIndex = index;
        }
      }
      const nextStart = Math.min(duration - clipLength, bestStartIndex * sampleInterval);
      setStart(nextStart);
      setEnd(nextStart + clipLength);
      await new Promise<void>((resolve) => {
        if (Math.abs(video.currentTime - nextStart) < 0.04) resolve();
        else {
          video.addEventListener('seeked', () => resolve(), { once: true });
          video.currentTime = nextStart;
        }
      });
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : 'The video could not be analyzed. Trim it manually instead.');
      if (Math.abs(video.currentTime - previousTime) >= 0.04) video.currentTime = previousTime;
    } finally {
      setAnalyzing(false);
    }
  };

  const exportVideo = async () => {
    if (!videoRef.current || !duration || end <= start) return;
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
    setError('');
    pausePreview();
    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 1280;
    const context = canvas.getContext('2d');
    if (!context) {
      setExporting(false);
      setError('Video export could not initialize the preview canvas.');
      return;
    }

    let frameId = 0;
    let outputStream: MediaStream | null = null;
    let audioContext: AudioContext | null = null;
    let soundSource: AudioBufferSourceNode | null = null;
    let recorder: MediaRecorder | null = null;
    let recorderStopped: Promise<Blob> | null = null;
    const video = document.createElement('video');
    video.src = videoUrl;
    video.preload = 'auto';
    video.playsInline = true;
    const drawFrame = () => {
      const scale = Math.max(canvas.width / video.videoWidth, canvas.height / video.videoHeight);
      const width = video.videoWidth * scale;
      const height = video.videoHeight * scale;
      context.fillStyle = '#000';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(video, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
      frameId = requestAnimationFrame(drawFrame);
    };

    try {
      audioContext = new AudioContext();
      await audioContext.resume();
      await new Promise<void>((resolve, reject) => {
        if (video.readyState >= HTMLMediaElement.HAVE_METADATA) resolve();
        else {
          video.addEventListener('loadedmetadata', () => resolve(), { once: true });
          video.addEventListener('error', () => reject(new Error('The selected video could not be loaded.')), { once: true });
        }
      });
      video.currentTime = start;
      await new Promise<void>((resolve) => {
        if (Math.abs(video.currentTime - start) < 0.05) resolve();
        else video.addEventListener('seeked', () => resolve(), { once: true });
      });

      const originalAudio = audioContext.createMediaElementSource(video);
      const originalGain = audioContext.createGain();
      const recordedAudio = audioContext.createMediaStreamDestination();
      originalAudio.connect(originalGain);
      originalGain.connect(recordedAudio);

      if (audioFile) {
        const decoded = await audioContext.decodeAudioData(await audioFile.arrayBuffer());
        soundSource = audioContext.createBufferSource();
        const musicGain = audioContext.createGain();
        musicGain.gain.value = musicVolume;
        soundSource.buffer = decoded;
        soundSource.connect(musicGain);
        musicGain.connect(recordedAudio);
      }

      outputStream = canvas.captureStream(30);
      const mixedStream = new MediaStream([
        ...outputStream.getVideoTracks(),
        ...recordedAudio.stream.getAudioTracks(),
      ]);
      recorder = new MediaRecorder(mixedStream, { mimeType: recorderType });
      const chunks: BlobPart[] = [];
      const stopped = new Promise<Blob>((resolve, reject) => {
        if (!recorder) return reject(new Error('The video recorder could not be initialized.'));
        recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
        recorder.onerror = () => reject(new Error('Video export stopped unexpectedly.'));
        recorder.onstop = () => resolve(new Blob(chunks, { type: recorderType }));
      });
      recorderStopped = stopped;
      const endRecording = () => {
        if (recorder?.state === 'recording') recorder.stop();
      };
      video.ontimeupdate = () => { if (video.currentTime >= end) { video.pause(); endRecording(); } };
      video.onended = endRecording;
      drawFrame();
      recorder.start(250);
      soundSource?.start(0);
      await video.play();
      const blob = await stopped;
      if (!blob.size) throw new Error('The exported video was empty. Try exporting again.');
      if (blob.size > 100 * 1024 * 1024) throw new Error('The edited video is over the 100 MB upload limit. Trim it shorter and try again.');
      const extension = recorderType.includes('mp4') ? 'mp4' : 'webm';
      onExport(new File([blob], `commonroom-reel-${Date.now()}.${extension}`, { type: recorderType.split(';')[0] }), audioFile?.name ?? null);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'The video could not be exported.');
    } finally {
      video.pause();
      video.ontimeupdate = null;
      video.onended = null;
      if (recorder?.state === 'recording') recorder.stop();
      if (recorderStopped) await recorderStopped.catch(() => new Blob());
      video.removeAttribute('src');
      video.load();
      cancelAnimationFrame(frameId);
      outputStream?.getTracks().forEach((track) => track.stop());
      soundSource?.stop();
      if (audioContext && audioContext.state !== 'closed') await audioContext.close();
      setExporting(false);
    }
  };

  return (
    <div aria-label="Reel editor" aria-modal="true" className="reel-editor-backdrop" role="dialog">
      <section className="reel-editor">
        <header><div><Clapperboard size={18} /><strong>Reel editor</strong></div><button aria-label="Close editor" disabled={exporting} onClick={onClose} type="button"><X size={19} /></button></header>
        <div className="reel-editor-body">
          <div className="reel-preview">
            {videoUrl ? <video onLoadedMetadata={(event) => { const length = event.currentTarget.duration; setDuration(length); setEnd(length); }} onTimeUpdate={stopAtTrimEnd} playsInline ref={videoRef} src={videoUrl} /> : null}
            {!previewing ? <button aria-label="Preview trimmed video" className="reel-preview-play" disabled={exporting} onClick={() => void playPreview()} type="button"><Play fill="currentColor" size={23} /></button> : <button aria-label="Pause preview" className="reel-preview-play" disabled={exporting} onClick={pausePreview} type="button"><Pause fill="currentColor" size={23} /></button>}
          </div>
          <div className="reel-controls">
            <section className="reel-control-section">
              <div className="reel-control-heading"><span><Clapperboard size={15} /> Trim clip</span><small>{Math.max(0, end - start).toFixed(1)} sec</small></div>
              <button className="secondary-button reel-auto-cut" disabled={exporting || analyzing || !duration} onClick={() => void autoCut()} type="button">{analyzing ? <><LoaderCircle className="meet-spinner" size={14} /> Finding a highlight…</> : 'Auto-cut highlight'}</button>
              <p className="reel-auto-cut-note">Finds a high-motion section up to 15 seconds. Adjust the trim handles to edit it manually.</p>
              <div className="reel-trim-row"><label>Start <input aria-label="Trim start time" disabled={exporting || analyzing} max={Math.max(0, end - 1)} min="0" onChange={(event) => setStart(Number(event.target.value))} step="0.1" type="range" value={start} /></label><output>{start.toFixed(1)}s</output></div>
              <div className="reel-trim-row"><label>End <input aria-label="Trim end time" disabled={exporting || analyzing} max={duration} min={Math.min(duration, start + 1)} onChange={(event) => setEnd(Number(event.target.value))} step="0.1" type="range" value={end} /></label><output>{end.toFixed(1)}s</output></div>
              <div className="reel-timeline"><span style={{ left: `${duration ? start / duration * 100 : 0}%`, right: `${duration ? (duration - end) / duration * 100 : 0}%` }} /></div>
            </section>
            <section className="reel-control-section">
              <div className="reel-control-heading"><span><AudioLines size={15} /> Soundtrack</span><small>{audioFile ? 'Your audio' : 'No soundtrack'}</small></div>
              {audioFile ? (
                <>
                  <div className="reel-selected-audio"><AudioLines size={16} /><span>{audioFile.name}</span><button aria-label="Remove soundtrack" onClick={clearAudio} type="button"><X size={15} /></button></div>
                  <audio controls={!exporting} ref={audioRef} src={audioUrl} />
                  <label className="reel-volume">Soundtrack volume<input disabled={exporting} max="1" min="0" onChange={(event) => setMusicVolume(Number(event.target.value))} step="0.05" type="range" value={musicVolume} /></label>
                </>
              ) : (
                <label className="reel-upload-audio"><Upload size={15} /> Add your own soundtrack<input accept="audio/*" onChange={chooseAudio} type="file" /></label>
              )}
              <p>Use audio you own or have permission to publish.</p>
            </section>
            {error ? <div className="feedback error-banner" role="alert">{error}</div> : null}
          </div>
        </div>
        <footer><span>Portrait reel · audio is mixed into the exported video</span><button className="primary-button" disabled={exporting || analyzing || !duration} onClick={() => void exportVideo()} type="button">{exporting ? <><LoaderCircle className="meet-spinner" size={15} /> Exporting…</> : 'Export edited reel'}</button></footer>
      </section>
    </div>
  );
}
