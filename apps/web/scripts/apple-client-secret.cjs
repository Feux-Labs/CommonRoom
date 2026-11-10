#!/usr/bin/env node
/**
 * Makes the "secret key" Supabase asks for in Authentication > Providers > Apple.
 * Apple wants a signed token instead of a plain secret. It is made on YOUR computer from your .p8 key file and
 * is never sent anywhere. It lasts 6 months (Apple's maximum): run this again and paste the new one before it ends.
 *
 * Usage:
 *   node apps/web/scripts/apple-client-secret.cjs <TEAM_ID> <KEY_ID> <SERVICES_ID> <path/to/AuthKey_XXXX.p8>
 * Example:
 *   node apps/web/scripts/apple-client-secret.cjs GMWXK3R2P9 ABCDE12345 ng.com.feuxlabs.commonroom.web C:/keys/AuthKey_ABCDE12345.p8
 */
const { sign } = require('node:crypto');
const { readFileSync } = require('node:fs');

const SIX_MONTHS_SECONDS = 15_777_000; // just under Apple's 6 month limit

function appleClientSecret({ teamId, keyId, servicesId, privateKey, now = Math.floor(Date.now() / 1000) }) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const header = encode({ alg: 'ES256', kid: keyId, typ: 'JWT' });
  const payload = encode({ iss: teamId, iat: now, exp: now + SIX_MONTHS_SECONDS, aud: 'https://appleid.apple.com', sub: servicesId });
  // Apple wants the raw R||S signature form (IEEE P1363), not the DER form Node uses by default.
  const signature = sign('sha256', Buffer.from(`${header}.${payload}`), { key: privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64url');
  return `${header}.${payload}.${signature}`;
}

module.exports = { appleClientSecret };

if (require.main === module) {
  const [teamId, keyId, servicesId, keyPath] = process.argv.slice(2);
  if (!teamId || !keyId || !servicesId || !keyPath) {
    console.error('Usage: node apple-client-secret.cjs <TEAM_ID> <KEY_ID> <SERVICES_ID> <path/to/AuthKey.p8>');
    process.exit(1);
  }
  const token = appleClientSecret({ teamId, keyId, servicesId, privateKey: readFileSync(keyPath, 'utf8') });
  console.log(token);
  console.error('\nPaste the line above into Supabase > Authentication > Providers > Apple > Secret Key.');
  console.error('It expires in about 6 months. Run this again before then.');
}
