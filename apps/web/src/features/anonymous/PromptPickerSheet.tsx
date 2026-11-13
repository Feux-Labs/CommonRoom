'use client';

import { useState } from 'react';
import { BottomSheet } from '@/components/cr/BottomSheet';
import { useAppSession } from '@/features/app/AppSession';
import { CARD_GRADIENTS, isCardTheme, type CardTheme } from '@/features/share/card';
import { AnonymousApiError, anonRequest } from './api';
import { DEFAULT_PROMPT, PROMPT_MAX, PROMPT_TEMPLATES } from './prompt-templates';

const THEMES: CardTheme[] = ['blue-hour', 'soft-sky', 'warm-glow', 'rose-note'];
const gradient = (theme: CardTheme) => `linear-gradient(145deg, ${CARD_GRADIENTS[theme][0]}, ${CARD_GRADIENTS[theme][1]})`;

/**
 * Choose the headline people see on your link. The starter list is always here; "Generate with AI" is a small optional
 * extra at the bottom and the sheet works the same without it.
 */
export function PromptPickerSheet({ open, initialPrompt, initialTheme, onClose, onSave }: {
  open: boolean;
  initialPrompt: string;
  initialTheme: string | null;
  onClose: () => void;
  onSave: (prompt: string, theme: CardTheme) => Promise<void>;
}) {
  return open ? <Body initialPrompt={initialPrompt} initialTheme={initialTheme} onClose={onClose} onSave={onSave} /> : null;
}

function Body({ initialPrompt, initialTheme, onClose, onSave }: { initialPrompt: string; initialTheme: string | null; onClose: () => void; onSave: (prompt: string, theme: CardTheme) => Promise<void> }) {
  const { session } = useAppSession();
  const [text, setText] = useState(initialPrompt);
  const [theme, setTheme] = useState<CardTheme>(isCardTheme(initialTheme) ? initialTheme : 'blue-hour');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');
  const [ideas, setIdeas] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [aiNote, setAiNote] = useState('');

  const generate = async () => {
    if (!session || generating) return;
    setGenerating(true);
    setAiNote('');
    try {
      const result = await anonRequest<{ ideas: string[] }>(session, '/inbox/prompts', 'POST', { hint: hint.trim() });
      setIdeas(result.ideas);
    } catch (generateError) {
      setIdeas([]);
      setAiNote(generateError instanceof AnonymousApiError && generateError.status === 429
        ? 'You’ve tried a lot already. Use the starters above, or try again later.'
        : 'AI ideas aren’t available right now. The starters above still work.');
    } finally {
      setGenerating(false);
    }
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      await onSave(text.trim(), theme);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'That didn’t save. Try again.');
      setSaving(false);
    }
  };

  return (
    <BottomSheet full onClose={onClose} open title="Your prompt" description="This is the headline people see when they open your link.">
      <div className="cr-prompt">
        <div className="cr-prompt__preview" style={{ background: gradient(theme) }}>{text.trim() || DEFAULT_PROMPT}</div>
        <textarea aria-label="Your prompt" className="cr-textarea" maxLength={PROMPT_MAX} onChange={(event) => setText(event.target.value)} placeholder="Write your own, or pick one below" rows={2} value={text} />
        <div aria-label="Colour" className="cr-prompt__themes" role="radiogroup">
          {THEMES.map((id) => (
            <button aria-checked={theme === id} aria-label={id} className="cr-prompt__swatch" key={id} onClick={() => setTheme(id)} role="radio" style={{ background: gradient(id) }} type="button" />
          ))}
        </div>

        <p className="cr-section-label">Pick a starter</p>
        <div className="cr-prompt__list">
          {PROMPT_TEMPLATES.map((template) => (
            <button className="cr-prompt__item" key={template.id} onClick={() => { setText(template.text); setTheme(template.theme); }} style={{ background: gradient(template.theme) }} type="button">{template.text}</button>
          ))}
        </div>

        <div className="cr-prompt__ai">
          <p className="cr-section-label">Want fresh ideas?</p>
          <div className="cr-prompt__aibar">
            <input aria-label="Topic hint" className="cr-input" maxLength={40} onChange={(event) => setHint(event.target.value)} placeholder="A topic hint: food, music, crush…" value={hint} />
            <button className="cr-ghost" disabled={generating} onClick={() => void generate()} type="button">{generating ? 'Thinking…' : 'Generate with AI'}</button>
          </div>
          {aiNote ? <p className="cr-note" role="status">{aiNote}</p> : null}
          {ideas.map((idea) => (
            <button className="cr-prompt__idea" key={idea} onClick={() => setText(idea)} type="button">{idea}</button>
          ))}
        </div>

        {error ? <p role="alert" style={{ color: '#b3261e' }}>{error}</p> : null}
        <div className="cr-acts">
          <button className="cr-ghost cr-ghost--l" onClick={onClose} type="button">Cancel</button>
          <button className="cr-pbtn cr-pbtn--l" disabled={saving} onClick={() => void save()} type="button">{saving ? 'Saving…' : 'Use this prompt'}</button>
        </div>
      </div>
    </BottomSheet>
  );
}
