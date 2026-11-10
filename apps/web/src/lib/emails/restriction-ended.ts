import type { Email } from '../mailer';

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '');

/** "Your account is open again." Sent once when a pause or ban ends. Same look as the sign-in emails. */
export function restrictionEndedEmail(to: string, name: string | null): Email {
  const hello = name?.trim() ? `Hi ${name.trim().split(/\s+/)[0]},` : 'Hi,';
  const guidelines = SITE ? `${SITE}/guidelines` : '/guidelines';
  const subject = 'Your Common Room account is open again';
  const text = `${hello}\n\nYour Common Room account is open again. You can post, comment and message as normal.\n\nPlease take a minute to read the community guidelines so it doesn't happen again: ${guidelines}\n\nCommon Room`;
  const html = `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">Your account is open again. You can post and comment as normal.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4fb;padding:32px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:20px;overflow:hidden;">
<tr><td style="background-color:#3a47c4;background-image:linear-gradient(135deg,#1f4fb8,#6a3fcf);padding:28px 32px;font-size:20px;font-weight:500;color:#ffffff;">common room</td></tr>
<tr><td style="padding:36px 32px 12px 32px;"><h1 style="margin:0 0 10px 0;font-size:24px;line-height:1.25;font-weight:600;color:#161a3a;">You’re back</h1>
<p style="margin:0 0 12px 0;font-size:16px;line-height:1.6;color:#4a4f6e;">${hello}</p>
<p style="margin:0;font-size:16px;line-height:1.6;color:#4a4f6e;">Your Common Room account is open again. You can post, comment and message as normal.</p></td></tr>
<tr><td style="padding:20px 32px 32px 32px;"><p style="margin:0;font-size:14px;line-height:1.6;color:#6b7090;">Please take a minute to read the <a href="${guidelines}" style="color:#3a47c4;">community guidelines</a> so we don’t have to pause your account again.</p></td></tr>
</table></td></tr></table>`;
  return { to, toName: name ?? undefined, subject, html, text };
}
