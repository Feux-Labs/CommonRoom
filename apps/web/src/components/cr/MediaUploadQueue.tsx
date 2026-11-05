'use client';

import { FileVideo2, ImagePlus, X } from 'lucide-react';
import { Button, ProgressBar } from '@/components/cr/primitives';

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaUploadQueue({
  accept,
  disabled = false,
  error,
  files,
  maxFiles,
  multiple = false,
  onClear,
  onFilesSelected,
  onRemove,
  onPreview,
  onRetry,
  previews = [],
  progress,
  uploading = false,
}: {
  accept: string;
  disabled?: boolean;
  error?: string;
  files: File[];
  maxFiles?: number;
  multiple?: boolean;
  onClear: () => void;
  onFilesSelected: (files: File[], append: boolean) => void;
  onRemove: (index: number) => void;
  onPreview?: (index: number) => void;
  onRetry?: () => void;
  previews?: string[];
  progress?: number | null;
  uploading?: boolean;
}) {
  return (
    <section aria-label="Media upload" className="cr-upload-queue">
      {files.length === 0 ? (
        <label className="cr-upload-picker">
          <ImagePlus aria-hidden="true" size={20} />
          <span>Choose photos or videos</span>
          <small>{maxFiles ? `Up to ${maxFiles} files` : 'Add media to your post'}</small>
          <input
            accept={accept}
            disabled={disabled}
            multiple={multiple}
            onChange={(event) => {
              onFilesSelected(Array.from(event.currentTarget.files ?? []), false);
              event.currentTarget.value = '';
            }}
            type="file"
          />
        </label>
      ) : (
        <>
          <div className="cr-upload-queue__header">
            <span>{files.length} {files.length === 1 ? 'file' : 'files'} selected</span>
            <Button disabled={disabled} onClick={onClear} variant="ghost">Clear</Button>
          </div>
          <ul className="cr-upload-queue__list">
            {files.map((file, index) => {
              const isVideo = file.type.startsWith('video/');
              return (
                <li className="cr-upload-queue__item" key={`${file.name}-${file.lastModified}-${index}`}>
                  <button
                    aria-label={`Preview ${file.name}`}
                    className="cr-upload-queue__preview"
                    disabled={disabled || !onPreview}
                    onClick={() => onPreview?.(index)}
                    type="button"
                  >
                    {previews[index] && !isVideo ? (
                      <img alt="" src={previews[index]} />
                    ) : isVideo ? (
                      <FileVideo2 aria-hidden="true" size={18} />
                    ) : (
                      <ImagePlus aria-hidden="true" size={18} />
                    )}
                  </button>
                  <div className="cr-upload-queue__details">
                    <span className="cr-upload-queue__name" title={file.name}>{file.name}</span>
                    <small>{formatFileSize(file.size)}</small>
                    {progress !== undefined && progress !== null ? (
                      <>
                        <ProgressBar className="cr-upload-queue__progress" label={`Uploading ${file.name}`} value={progress} />
                        <small>Uploading {Math.round(progress)}%. You can post when it finishes.</small>
                      </>
                    ) : uploading ? (
                      <>
                        <ProgressBar className="cr-upload-queue__progress" label={`Uploading ${file.name}`} value={64} />
                        <small aria-live="polite" role="status">Uploading 64%. You can post when it finishes.</small>
                      </>
                    ) : null}
                    {error ? (
                      <div className="cr-upload-queue__error" role="alert">
                        <span>{error}</span>
                        {onRetry ? <button disabled={disabled} onClick={onRetry} type="button">Try again</button> : null}
                      </div>
                    ) : null}
                  </div>
                  <button
                    aria-label={`Remove ${file.name}`}
                    className="cr-upload-queue__remove"
                    disabled={disabled}
                    onClick={() => onRemove(index)}
                    type="button"
                  >
                    <X aria-hidden="true" size={15} />
                  </button>
                </li>
              );
            })}
          </ul>
          {multiple && (maxFiles === undefined || files.length < maxFiles) ? (
            <label className="cr-upload-queue__add">
              <ImagePlus aria-hidden="true" size={16} />
              <span>Add more</span>
              <input
                accept={accept}
                disabled={disabled}
                multiple
                onChange={(event) => {
                  onFilesSelected(Array.from(event.currentTarget.files ?? []), true);
                  event.currentTarget.value = '';
                }}
                type="file"
              />
            </label>
          ) : null}
        </>
      )}
    </section>
  );
}
