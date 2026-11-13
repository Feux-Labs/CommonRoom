import Link from 'next/link';
import type { ReactNode } from 'react';

const TOKEN = /(#[\p{L}\p{N}_]{1,40})|(?<![\p{L}\p{N}_@])(@[A-Za-z0-9_]{3,24})\b/gu;

/** Text with #tags that open that tag's feed and @mentions of Anonymous IDs shown in bold. Everything else is plain text. */
export function RichText({ text }: { text: string }): ReactNode {
  const parts: ReactNode[] = [];
  let last = 0;
  let index = 0;
  for (const match of text.matchAll(TOKEN)) {
    const start = match.index ?? 0;
    if (start > last) parts.push(text.slice(last, start));
    if (match[1]) {
      parts.push(<Link className="cr-tag" href={`/anonymous/tag/${encodeURIComponent(match[1].slice(1))}`} key={`t${index}`} onClick={(event) => event.stopPropagation()}>{match[1]}</Link>);
    } else {
      parts.push(<b className="cr-mention" key={`m${index}`}>{match[2]}</b>);
    }
    last = start + match[0].length;
    index += 1;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}
