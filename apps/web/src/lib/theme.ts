/** Light or dark: follows the phone by default, and a member can choose in Settings. The choice lives on this device. */
export type ThemeChoice = 'system' | 'light' | 'dark';
export const THEME_KEY = 'commonroom:theme';

export function readTheme(): ThemeChoice {
  try {
    const saved = window.localStorage.getItem(THEME_KEY);
    return saved === 'light' || saved === 'dark' ? saved : 'system';
  } catch {
    return 'system';
  }
}

export function applyTheme(choice: ThemeChoice): void {
  const root = document.documentElement;
  if (choice === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', choice);
  try {
    if (choice === 'system') window.localStorage.removeItem(THEME_KEY);
    else window.localStorage.setItem(THEME_KEY, choice);
  } catch { /* storage unavailable: the choice lasts until the page closes */ }
}

/** Runs before the first paint so the page never flashes the wrong colours. */
export const THEME_BOOT_SCRIPT = `try{var t=localStorage.getItem('${THEME_KEY}');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}`;
