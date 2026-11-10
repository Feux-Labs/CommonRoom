'use client';

import { useRef } from 'react';
import type { ClipboardEvent, KeyboardEvent } from 'react';

/**
 * One box per digit. Typing advances, Backspace goes back, and pasting a full
 * code fills every box. The value is always a string of digits only.
 */
export function OtpInput({
  length,
  value,
  onChange,
  invalid = false,
  disabled = false,
  label = 'Verification code',
  autoFocus = false,
}: {
  length: number;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  disabled?: boolean;
  label?: string;
  autoFocus?: boolean;
}) {
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length }, (_, index) => value[index] ?? '');
  const focusIndex = Math.min(value.length, length - 1);

  const focus = (index: number) => {
    const target = inputs.current[Math.max(0, Math.min(length - 1, index))];
    target?.focus();
    target?.select();
  };

  const setDigit = (index: number, digit: string) => {
    const next = digits.slice();
    next[index] = digit;
    onChange(next.join('').replace(/\D/g, '').slice(0, length));
  };

  const handleInput = (index: number, raw: string) => {
    const clean = raw.replace(/\D/g, '');
    if (!clean) return;
    if (clean.length > 1) {
      const merged = (value.slice(0, index) + clean).slice(0, length);
      onChange(merged);
      focus(merged.length);
      return;
    }
    setDigit(index, clean);
    focus(index + 1);
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace') {
      event.preventDefault();
      if (digits[index]) {
        onChange(value.slice(0, index) + value.slice(index + 1));
      } else if (index > 0) {
        onChange(value.slice(0, index - 1) + value.slice(index));
        focus(index - 1);
      }
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focus(index - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      focus(index + 1);
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;
    event.preventDefault();
    onChange(pasted);
    focus(pasted.length);
  };

  return (
    <div className="cr-otp" role="group" aria-label={label}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => { inputs.current[index] = element; }}
          aria-label={`Digit ${index + 1} of ${length}`}
          aria-invalid={invalid || undefined}
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          autoFocus={autoFocus && index === focusIndex}
          className={index === focusIndex && !disabled ? 'cur' : undefined}
          disabled={disabled}
          inputMode="numeric"
          maxLength={length}
          onChange={(event) => handleInput(index, event.target.value)}
          onFocus={(event) => event.target.select()}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          pattern="[0-9]*"
          type="text"
          value={digit}
        />
      ))}
    </div>
  );
}
