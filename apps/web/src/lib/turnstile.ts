/**
 * Cloudflare Turnstile (free captcha) for guest sign-ins, so bots cannot mint endless guest accounts.
 * OFF unless NEXT_PUBLIC_TURNSTILE_SITE_KEY is set: with no key the app behaves exactly as before.
 * The matching secret key goes in Supabase > Authentication > Attack Protection (turn on captcha, choose Turnstile).
 */
type TurnstileApi = {
  render: (container: HTMLElement, options: { sitekey: string; appearance?: string; callback: (token: string) => void; 'error-callback'?: () => void; 'expired-callback'?: () => void }) => string;
  remove: (widgetId: string) => void;
};

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';

export const captchaEnabled = Boolean(SITE_KEY);

let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if ((window as unknown as { turnstile?: TurnstileApi }).turnstile) return Promise.resolve();
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => { scriptPromise = null; reject(new Error('The captcha could not load.')); };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/**
 * Returns a one-time captcha token, or undefined when captcha is off or could not be completed.
 * (Undefined means "try without": if Supabase requires it, the guest sign-in is simply refused, as it would be offline.)
 */
export async function getCaptchaToken(siteKey: string = SITE_KEY, timeoutMs = 20_000): Promise<string | undefined> {
  if (!siteKey || typeof window === 'undefined') return undefined;
  try {
    await loadScript();
  } catch {
    return undefined;
  }
  const api = (window as unknown as { turnstile?: TurnstileApi }).turnstile;
  if (!api) return undefined;

  return new Promise<string | undefined>((resolve) => {
    // "interaction-only": invisible unless Cloudflare needs the visitor to prove they are human.
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:2147483000';
    document.body.appendChild(container);
    let widgetId = '';
    let finished = false;
    const finish = (token: string | undefined) => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timer);
      try { if (widgetId) api.remove(widgetId); } catch { /* widget already gone */ }
      container.remove();
      resolve(token);
    };
    const timer = window.setTimeout(() => finish(undefined), timeoutMs);
    widgetId = api.render(container, {
      sitekey: siteKey,
      appearance: 'interaction-only',
      callback: (token) => finish(token),
      'error-callback': () => finish(undefined),
      'expired-callback': () => finish(undefined),
    });
  });
}

/** Options for `signInAnonymously`: includes the captcha token only when there is one. */
export async function guestSignInOptions(): Promise<{ options: { captchaToken: string } } | undefined> {
  const token = await getCaptchaToken();
  return token ? { options: { captchaToken: token } } : undefined;
}
