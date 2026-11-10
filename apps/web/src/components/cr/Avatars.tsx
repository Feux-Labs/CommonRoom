import { initials } from '@/lib/format';
import { Icon } from './Icon';

type Size = 'xs' | 's' | 'm' | 'l' | 'xl';

const SIZE_CLASS: Record<Size, string> = { xs: 'cr-av--xs', s: 'cr-av--s', m: '', l: 'cr-av--l', xl: 'cr-av--xl' };

/** Person avatar: photo when present, otherwise the first letter. */
export function UserAvatar({
  name,
  src,
  size = 'm',
  tone = 'dark',
  decorative = true,
}: {
  name: string | null | undefined;
  src?: string | null;
  size?: Size;
  tone?: 'dark' | 'gray' | 'mid';
  decorative?: boolean;
}) {
  const toneClass = tone === 'gray' ? 'cr-av--g' : tone === 'mid' ? 'cr-av--m' : '';
  return (
    <span
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : `${name ?? 'User'} avatar`}
      className={`cr-av ${SIZE_CLASS[size]} ${toneClass}`.trim()}
      role={decorative ? undefined : 'img'}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- remote user media from Supabase Storage */}
      {src ? <img alt="" loading="lazy" src={src} /> : initials(name)}
    </span>
  );
}

/** Masked face used for every anonymous author. Never shows a name or photo. */
export function AnonAvatar({ size = 'm' }: { size?: Size }) {
  return (
    <span aria-hidden="true" className={`cr-av cr-av--g ${SIZE_CLASS[size]}`.trim()}>
      <Icon name="anon" />
    </span>
  );
}
