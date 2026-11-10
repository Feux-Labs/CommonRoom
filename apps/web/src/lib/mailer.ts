/**
 * Emails the app sends itself (for example "your account is open again") through ZeptoMail's REST API.
 * Sign-in codes are NOT sent from here: Supabase sends those through the SMTP settings you gave it.
 *
 * Env: ZEPTOMAIL_TOKEN (the Send Mail token; a leading "Zoho-enczapikey " is accepted), MAIL_FROM_ADDRESS (an address on
 * your verified domain), MAIL_FROM_NAME (optional). ZEPTOMAIL_API_URL overrides the endpoint if your ZeptoMail account is
 * in another region (default https://api.zeptomail.com/v1.1/email; other regions use .eu, .in, .com.au ...).
 */
type Fetch = typeof fetch;

export type Email = { to: string; toName?: string; subject: string; html: string; text: string };
export type SendResult = 'sent' | 'not_configured';

const DEFAULT_URL = 'https://api.zeptomail.com/v1.1/email';

export function isMailerConfigured(): boolean {
  return Boolean(process.env.ZEPTOMAIL_TOKEN && process.env.MAIL_FROM_ADDRESS);
}

export function authorizationHeader(token: string): string {
  return `Zoho-enczapikey ${token.replace(/^Zoho-enczapikey\s+/i, '').trim()}`;
}

/** Sends one email. Resolves 'not_configured' when keys are missing (callers must NOT treat that as sent). Throws if ZeptoMail refuses. */
export async function sendEmail(email: Email, fetchImpl: Fetch = fetch): Promise<SendResult> {
  const token = process.env.ZEPTOMAIL_TOKEN;
  const from = process.env.MAIL_FROM_ADDRESS;
  if (!token || !from) return 'not_configured';

  const response = await fetchImpl(process.env.ZEPTOMAIL_API_URL || DEFAULT_URL, {
    method: 'POST',
    headers: { Authorization: authorizationHeader(token), 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      from: { address: from, name: process.env.MAIL_FROM_NAME || 'Common Room' },
      to: [{ email_address: { address: email.to, ...(email.toName ? { name: email.toName } : {}) } }],
      subject: email.subject,
      htmlbody: email.html,
      textbody: email.text,
    }),
  });
  if (response.ok) return 'sent';

  // ZeptoMail reports errors as { data: { error_code, message }, message: "error" } (and success data as an array).
  const body = (await response.json().catch(() => null)) as { data?: { error_code?: string; message?: string } | unknown[]; message?: string } | null;
  const detail = body && body.data && !Array.isArray(body.data) ? `${body.data.error_code ?? ''} ${body.data.message ?? ''}`.trim() : (body?.message ?? '');
  throw new Error(`Email was refused (${response.status}) ${detail}`.trim());
}
