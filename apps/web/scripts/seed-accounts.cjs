/**
 * Seeds house accounts the team can act as from Admin > Moderator accounts:
 *   - "open" accounts: normal profiled members with a name, school, course, level and a stored password (so they can be signed in to);
 *   - "anonymous" accounts: guest-style accounts with an Anonymous ID (no email, no password; the admin acts as them from the dashboard).
 * Every account is marked seeded, so they are kept apart from real members and can be removed with "Clear seeded accounts".
 * No photos are used: seeded accounts show an initial, never a stranger's picture.
 *
 * Usage (from apps/web):  node scripts/seed-accounts.cjs --anonymous 100 --open 100
 * It tops each kind up to the number asked for, so running it twice never doubles them.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { loadEnvConfig } = require('@next/env');
loadEnvConfig(path.join(__dirname, '..'), false);
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL } }, log: ['error'] });

// Name, course and interest pools come from the older seeding script so the two stay consistent.
const oldScript = fs.readFileSync(path.join(__dirname, 'seed-users.cjs'), 'utf8');
function pool(name) {
  const match = oldScript.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`));
  if (!match) throw new Error(`Pool ${name} not found in seed-users.cjs`);
  return new Function(`return [${match[1]}]`)();
}
const firstNamesFemale = pool('firstNamesFemale');
const firstNamesMale = pool('firstNamesMale');
const lastNames = pool('lastNames');
const courses = pool('courses');
const interestsList = pool('interestsList');
const bios = pool('bios');

const directory = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'mobile', 'src', 'data', 'nigerianInstitutions.json'), 'utf8'));
const allSchools = directory.institutions.map((item) => item.name);
const focusSchools = ['Adekunle Ajasin', 'Rufus Giwa', 'Federal University of Technology, Akure', 'University of Lagos', 'Obafemi Awolowo', 'University of Benin', 'University of Abuja']
  .map((needle) => allSchools.find((name) => name.includes(needle))).filter(Boolean);

const ADJECTIVES = ['quiet', 'brave', 'lucky', 'sleepy', 'swift', 'bright', 'calm', 'witty', 'bold', 'cosmic', 'mellow', 'jolly', 'sunny', 'zesty', 'chill', 'clever', 'gentle', 'rapid', 'nimble', 'steady', 'great', 'happy', 'lively', 'noble', 'smooth', 'cheeky', 'dreamy'];
const NOUNS = ['fox', 'owl', 'lion', 'falcon', 'mango', 'comet', 'river', 'drum', 'panda', 'ember', 'cedar', 'pixel', 'nomad', 'scholar', 'ranger', 'danfo', 'baobab', 'sparrow', 'tiger', 'cloud', 'spark', 'jin', 'zebra', 'raven', 'maple', 'orbit', 'echo', 'nova'];
const BLOCKED = ['88', '1488', '69', '420', '666'];

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const pickN = (list, n) => [...list].sort(() => Math.random() - 0.5).slice(0, n);
const arg = (flag) => { const i = process.argv.indexOf(flag); return i > -1 ? Number(process.argv[i + 1]) : 0; };

function password() {
  const alphabet = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from(crypto.randomBytes(14), (byte) => alphabet[byte % alphabet.length]).join('');
}

function handle(used) {
  for (;;) {
    const digits = String(Math.floor(10 + Math.random() * 9990));
    if (BLOCKED.some((run) => digits.includes(run))) continue;
    const value = `${pick(ADJECTIVES)}${pick(NOUNS)}${digits}`;
    if (value.length <= 20 && !used.has(value)) { used.add(value); return value; }
  }
}

async function count(sql) {
  const rows = await prisma.$queryRawUnsafe(sql);
  return Number(rows[0].n);
}

async function seedAnonymous(target) {
  const have = await count("select count(*)::int n from auth.users where is_anonymous and raw_user_meta_data->>'seeded' = 'true'");
  const used = new Set((await prisma.$queryRawUnsafe('select handle from public.anonymous_identities')).map((row) => row.handle));
  let made = 0;
  for (let index = have; index < target; index += 1) {
    const id = crypto.randomUUID();
    const name = handle(used);
    await prisma.$executeRawUnsafe(`
      insert into auth.users (id, instance_id, aud, role, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_anonymous)
      values ($1::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', '{}'::jsonb, '{"seeded":"true"}'::jsonb,
        now() - (random() * interval '30 days'), now(), true)`, id);
    await prisma.$executeRawUnsafe('insert into public.anonymous_identities (user_id, handle) values ($1::uuid, $2)', id, name);
    made += 1;
  }
  return { have, made };
}

async function seedOpen(target) {
  const have = await count("select count(*)::int n from auth.users where not is_anonymous and raw_user_meta_data->>'seeded' = 'true'");
  const usedNames = new Set((await prisma.$queryRawUnsafe('select username from public.profiles')).map((row) => row.username));
  let made = 0;
  for (let index = have; index < target; index += 1) {
    const female = Math.random() < 0.5;
    const first = pick(female ? firstNamesFemale : firstNamesMale);
    const last = pick(lastNames);
    const displayName = `${first} ${last}`;
    let username;
    let suffix = Math.floor(100 + Math.random() * 8900);
    do { username = `${first.toLowerCase()}_${last.toLowerCase()}${suffix}`.replace(/[^a-z0-9_]/g, ''); suffix += 1; } while (usedNames.has(username));
    usedNames.add(username);
    const inSchool = Math.random() < 0.85;
    const school = inSchool ? (Math.random() < 0.6 ? pick(focusSchools) : pick(allSchools)) : null;
    const level = pick(['100L', '200L', '300L', '400L', '500L']);
    const id = crypto.randomUUID();
    const email = `${username}@commonroom.ng`;
    const plain = password();
    await prisma.$executeRawUnsafe(`
      insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_sent_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_anonymous)
      values ($1::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', $2, extensions.crypt($3, extensions.gen_salt('bf')), now(), now(),
        '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('seeded', 'true', 'plain_password', $3::text, 'display_name', $4::text),
        now() - (random() * interval '60 days'), now(), false)`, id, email, plain, displayName);
    await prisma.$executeRawUnsafe(`
      insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
      values (gen_random_uuid(), $1::uuid, jsonb_build_object('sub', $1::text, 'email', $2::text, 'email_verified', true), 'email', $1::text, now(), now(), now())`, id, email);
    await prisma.$executeRawUnsafe(`
      insert into public.profiles (id, display_name, username, education_status, gender, school, show_school_on_profile, course, year, age_eligibility_confirmed, interests, bio, created_at, updated_at)
      values ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, true, $10, $11, now() - (random() * interval '60 days'), now())`,
      id, displayName, username, inSchool ? 'currently_in_school' : 'not_in_school_yet', female ? 'female' : 'male', school, Boolean(school), inSchool ? pick(courses) : '', inSchool ? level : '', pickN(interestsList, 4), pick(bios));
    made += 1;
  }
  return { have, made };
}

(async () => {
  const anonymous = arg('--anonymous');
  const open = arg('--open');
  if (!anonymous && !open) { console.log('Usage: node scripts/seed-accounts.cjs --anonymous 100 --open 100'); return; }
  if (anonymous) { const r = await seedAnonymous(anonymous); console.log(`Anonymous accounts: had ${r.have}, made ${r.made}.`); }
  if (open) { const r = await seedOpen(open); console.log(`Open accounts: had ${r.have}, made ${r.made}.`); }
})().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
