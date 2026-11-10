'use client';

import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { BottomSheet } from './BottomSheet';

export const REPORT_REASONS = [
  'Spam',
  'Harassment or bullying',
  'Hate speech',
  'Sexual content',
  'Self-harm',
  'Something else',
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

/** Mockup 18. The caller sends the report; this sheet only collects reason and details. */
function ReportSheetBody({
  open,
  onClose,
  subject = 'post',
  context,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  subject?: string;
  context?: string;
  onSubmit: (reason: ReportReason, details: string) => Promise<void>;
}) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const group = useId();

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!reason || busy) return;
    setBusy(true);
    setError('');
    try {
      await onSubmit(reason, details.trim());
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Your report could not be sent. Try again.');
      setBusy(false);
    }
  };

  return (
    <BottomSheet
      context={context}
      description="Pick the closest reason. Your report is anonymous."
      onClose={onClose}
      open={open}
      title={`Report this ${subject}`}
    >
      <form onSubmit={(event) => void submit(event)}>
        <fieldset className="cr-radio-list">
          <legend className="cr-visually-hidden">Reason</legend>
          {REPORT_REASONS.map((item) => (
            <label className="cr-radio-row" key={item}>
              <span>{item}</span>
              <input checked={reason === item} name={group} onChange={() => setReason(item)} type="radio" value={item} />
              <i aria-hidden="true" />
            </label>
          ))}
        </fieldset>
        <div className="cr-input" style={{ marginTop: 12 }}>
          <input aria-label="Add details (optional)" maxLength={400} onChange={(event) => setDetails(event.target.value)} placeholder="Add details (optional)" value={details} />
        </div>
        {error ? <p className="cr-msg cr-msg--e" role="alert">{error}</p> : null}
        <div className="cr-acts">
          <button className="cr-ghost cr-ghost--l" onClick={onClose} type="button">Cancel</button>
          <button className="cr-pbtn cr-pbtn--l" disabled={!reason || busy} type="submit">{busy ? 'Sending…' : 'Report'}</button>
        </div>
      </form>
    </BottomSheet>
  );
}

type ReportSheetProps = Parameters<typeof ReportSheetBody>[0];

/** Mounted only while open, so every opening starts with fresh state and nothing needs resetting. */
export function ReportSheet(props: ReportSheetProps) {
  return props.open ? <ReportSheetBody {...props} /> : null;
}
