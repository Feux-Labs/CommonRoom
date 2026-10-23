/**
 * seed-users.cjs
 * Seeds ~2000 realistic Black student & general users into Supabase Auth + Public profiles + Dating profiles.
 *
 * Usage:
 *   node --env-file=.env scripts/seed-users.cjs
 */

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
  log: ['error'],
});

// Curated authentic portrait photo URLs of Black women (high-res campus/casual portraits)
const femalePhotos = [
  'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=480&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=480&q=80',
  'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=480&q=80',
  'https://images.unsplash.com/photo-1589571894960-20bbe2828d0a?auto=format&fit=crop&w=480&q=80',
  'https://images.unsplash.com/photo-1523824921871-d6f1a15151f1?auto=format&fit=crop&w=480&q=80',
  'https://images.unsplash.com/photo-1509967419530-da38b4704bc6?auto=format&fit=crop&w=480&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=480&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=480&q=80',
  'https://images.unsplash.com/photo-1592621385612-4d7129426394?auto=format&fit=crop&w=480&q=80',
  'https://images.unsplash.com/photo-1611432579699-484f7990b127?auto=format&fit=crop&w=480&q=80',
  'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=480&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=480&q=80',
  'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&w=480&q=80',
  'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=480&q=80',
  'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?auto=format&fit=crop&w=480&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=480&q=80',
  'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=480&q=80',
  'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=480&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=480&q=80',
  'https://images.unsplash.com/photo-1618088512445-fae3725b7a15?auto=format&fit=crop&w=480&q=80',
  'https://images.unsplash.com/photo-1560787313-5dff3307e257?auto=format&fit=crop&w=480&q=80',
  'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?auto=format&fit=crop&w=480&q=80',
  'https://images.unsplash.com/photo-1534751516642-a171ef282717?auto=format&fit=crop&w=480&q=80',
  'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?auto=format&fit=crop&w=480&q=80',
  'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=480&q=80',
  'https://images.unsplash.com/photo-1584999734482-0361aecad844?auto=format&fit=crop&w=480&q=80',
  'https://images.unsplash.com/photo-1548142813-c348350df52b?auto=format&fit=crop&w=480&q=80',
  'https://images.unsplash.com/photo-1618214878566-a831e67e3df0?auto=format&fit=crop&w=480&q=80',
  'https://images.unsplash.com/photo-1582610285985-a42d91997675?auto=format&fit=crop&w=480&q=80'
];

// Curated authentic portrait photo URLs of Black men (high-res campus/casual portraits)
const malePhotos = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=480&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=480&q=80',
  'https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?auto=format&fit=crop&w=480&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=480&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=480&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=480&q=80',
  'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=480&q=80',
  'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&w=480&q=80',
  'https://images.unsplash.com/photo-1504257432389-52343af06ae3?auto=format&fit=crop&w=480&q=80',
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=480&q=80',
  'https://images.unsplash.com/photo-1557862921-37829c790f19?auto=format&fit=crop&w=480&q=80',
  'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=480&q=80',
  'https://images.unsplash.com/photo-1548372290-8d01b6c8e78c?auto=format&fit=crop&w=480&q=80',
  'https://images.unsplash.com/photo-1605462863863-10d9e47e15ee?auto=format&fit=crop&w=480&q=80',
  'https://images.unsplash.com/photo-1583864697784-a0efc8379f70?auto=format&fit=crop&w=480&q=80',
  'https://images.unsplash.com/photo-1595152772835-219674b2a8a6?auto=format&fit=crop&w=480&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=480&q=80',
  'https://images.unsplash.com/photo-1463453091185-61582044d556?auto=format&fit=crop&w=480&q=80',
  'https://images.unsplash.com/photo-1480455624313-e29b44bbafbd?auto=format&fit=crop&w=480&q=80',
  'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?auto=format&fit=crop&w=480&q=80',
  'https://images.unsplash.com/photo-1513956589380-bad6acb9b9d4?auto=format&fit=crop&w=480&q=80',
  'https://images.unsplash.com/photo-1615109398623-88346a601842?auto=format&fit=crop&w=480&q=80',
  'https://images.unsplash.com/photo-1531384441138-2736e62e0919?auto=format&fit=crop&w=480&q=80',
  'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=480&q=80',
  'https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=480&q=80',
  'https://images.unsplash.com/photo-1542909168-82c3e7fdca5c?auto=format&fit=crop&w=480&q=80',
  'https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=480&q=80',
  'https://images.unsplash.com/photo-1600486913747-55e5470d6f40?auto=format&fit=crop&w=480&q=80'
];

const firstNamesFemale = [
  'Adaeze','Aisha','Amina','Blessing','Bukola','Chiamaka','Chidinma','Chioma','Damilola','Ebunoluwa',
  'Esther','Fatima','Favour','Folake','Grace','Halima','Hauwa','Ifunanya','Joy','Jumoke',
  'Kemi','Laide','Latifah','Maryam','Mercy','Ngozi','Nkechi','Nkiru','Nneka','Obiageli',
  'Oluwadamilola','Oluwaseun','Omolara','Oyinkansola','Peace','Precious','Rahma','Ruth','Sade','Shade',
  'Simisola','Temitope','Tolu','Toyin','Ugochi','Vivian','Wumi','Yetunde','Zainab','Zara',
  'Adanna','Aishat','Amaka','Bimpe','Busola','Chika','Chinelo','Dara','Deborah','Ebele',
  'Ejiro','Enitan','Fadeke','Fola','Funke','Gloria','Hadiza','Ifeoma','Ify','Jadesola',
  'Jummai','Khadija','Lara','Mide','Morenike','Naomi','Nike','Nnenna','Nonso','Oghene',
  'Omolola','Ope','Oyin','Perpetua','Rachael','Ronke','Rukayat','Saidat','Seyi','Stella',
  'Teni','Titilayo','Tolani','Toyosi','Uju','Victoria','Wuraola','Yinka','Zinny','Adaugo',
  'Anita','Bisola','Chisom','Dupe','Eniola','Fisayo','Goodness','Ibukun','Janet','Kanyinsola'
];

const firstNamesMale = [
  'Adebayo','Adeniyi','Ahmed','Akinola','Bayo','Chidi','Chinedu','Chukwuemeka','Damilare','David',
  'Emeka','Emmanuel','Femi','Gbenga','Ibrahim','Ikenna','Jide','Joshua','Kelechi','Kunle',
  'Lanre','Musa','Nnamdi','Obinna','Oladipo','Olalekan','Oluwafemi','Oluwasegun','Oluwatobi','Peter',
  'Samson','Segun','Suleiman','Taiwo','Tayo','Tobiloba','Tunde','Uche','Victor','Yusuf',
  'Abiodun','Adekunle','Afolabi','Akintunde','Babatunde','Chibuzo','Chidubem','Daniel','Dayo','Ehis',
  'Ekene','Ezekiel','Francis','Godwin','Hassan','Iyke','James','Joseph','Kayode','Kolade',
  'Lekan','Mohammed','Nnaji','Obiora','Olabode','Olamide','Olufunmi','Olusegun','Onochie','Patrick',
  'Samuel','Sani','Solomon','Tamuno','Temiloluwa','Tobechukwu','Udoka','Uzoma','Wale','Yakubu',
  'Ayomide','Bolaji','Chima','Dare','Farooq','Gbolahan','Habib','Ismail','Kolawole','Mayowa'
];

const lastNames = [
  'Abubakar','Adebayo','Adekoya','Adeniran','Adeyemi','Afolabi','Agbaje','Ahmed','Ajayi','Akande',
  'Akinola','Akpan','Alabi','Amadi','Aminu','Anyanwu','Asogwa','Atanda','Audu','Ayodele',
  'Babajide','Balogun','Bello','Chidi','Chukwu','Dada','Danjuma','Ebenezer','Effiong','Egbuna',
  'Ejiofor','Ekong','Elohor','Emeka','Eze','Ezeh','Fadipe','Falana','Fashola','Garba',
  'Hassan','Ibrahim','Idris','Ifeanyichukwu','Igwe','Ikechukwu','Inyang','Iroegbu','Isah','Isiaka',
  'Iwu','Kalu','Kayode','Lawal','Makinde','Musa','Ndidi','Nnamdi','Nwachukwu','Nwosu',
  'Obasi','Obi','Oduya','Ogundimu','Ogunlesi','Okafor','Okeke','Okoh','Okonkwo','Okoro',
  'Olabisi','Oladele','Olatunji','Olawale','Olorunfemi','Oluwaseun','Omotayo','Oni','Onuoha','Onyeka',
  'Orji','Osei','Osigwe','Oyedepo','Oyeniyi','Salami','Sanusi','Soyinka','Ubani','Udeh',
  'Ugwu','Umeh','Usman','Yakubu','Yusuf','Zubair','Adamu','Bako','Chime','Dikko'
];

// Target institutions specified by user
const primarySchools = [
  'Adekunle Ajasin University, Akungba-Akoko', // AAUA
  'Rufus Giwa Polytechnic, Owo',                // RUGIPO
  'Federal University of Technology, Akure',     // FUTA
  'University of Lagos',                         // UNILAG
  'Obafemi Awolowo University',                  // OAU
  'University of Benin',                         // UNIBEN
  'University of Abuja',                         // UNIABUJA
];

const secondarySchools = [
  'University of Ibadan',
  'Lagos State University',
  'Ahmadu Bello University',
  'University of Ilorin',
  'University of Nigeria, Nsukka',
  'Covenant University',
  'Babcock University',
  'Federal University of Technology, Minna',
  'University of Port Harcourt',
  'Nnamdi Azikiwe University',
  'Federal University, Oye-Ekiti',
  'Ekiti State University',
  'Osun State University'
];

const courses = [
  'Computer Science','Mechanical Engineering','Medicine & Surgery','Law','Accounting',
  'Economics','Mass Communication','Civil Engineering','Electrical Engineering','Business Administration',
  'Biochemistry','Microbiology','Political Science','Architecture','Pharmacy',
  'Nursing','Agricultural Science','Mathematics','Physics','Chemistry',
  'English','History','Philosophy','Sociology','Psychology',
  'Public Health','Geology','Statistics','Banking & Finance','Marketing',
  'International Relations','Fine Arts','Theatre Arts','Industrial Chemistry','Food Science',
  'Software Engineering','Cybersecurity','Information Technology','Estate Management','Dentistry'
];

const years = ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5'];

const interestsList = [
  'Coding','Music','Football','Design','Reading','Photography','Art','Cooking',
  'Dance','Fashion','Gaming','Fitness','Travel','Movies','Poetry','Tech',
  'Basketball','Anime','Volunteering','Skateboarding','Chess','Debate',
  'Writing','Entrepreneurship','Singing','Podcasts','Yoga','Afrobeats',
  'Swimming','Running','Cycling','Film','Theatre','Robotics','AI/ML',
  'Crypto','Blogging','Sneakers','Thrifting','Content Creation'
];

const bios = [
  'Living my best campus life ✨',
  'Student by day, creative by night 🌙',
  'Making memories one lecture at a time 📚',
  'Here for good vibes and great convos 💫',
  'Just trying to pass my exams honestly 😅',
  'Building something amazing, one day at a time 🚀',
  'Music lover, food enthusiast, full-time student 🎵',
  'Spreading positive energy across campus ☀️',
  'Passionate about learning, coding and building 🌱',
  'Finding beauty in the little things 🦋',
  'Campus explorer and foodie 🍕',
  'Dreaming big, starting small 💭',
  'Afrobeats and chill vibes ✨',
  'Always up for an adventure 🌍',
  'Coding and coffee is my love language ☕',
  'Just here to make genuine campus friends 📖',
  'Chasing excellence, not perfection 💯',
  'Weekend warrior, weekday scholar 📝',
  'Living proof that Naija students are the best 🇳🇬',
  'Student life is the best life 🎓'
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN(arr, n) {
  const copy = [...arr];
  const result = [];
  for (let i = 0; i < Math.min(n, copy.length); i++) {
    const idx = Math.floor(Math.random() * copy.length);
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
}

function generatePassword() {
  const prefixes = ['Campus', 'Naija', 'Vibes', 'Student', 'Room', 'Connect', 'Active', 'Fresh', 'Smart', 'Elite'];
  const symbols = ['!', '@', '#', '$'];
  const num = Math.floor(100 + Math.random() * 900);
  return `${pick(prefixes)}${num}${pick(symbols)}`;
}

async function run() {
  console.log('🚀 Starting realistic user seed script (~2000 users)...');
  
  const startTime = Date.now();
  const TARGET_TOTAL = 2000;
  const BATCH_SIZE = 50;

  // Check how many seeded users already exist
  const existingCountRes = await prisma.$queryRawUnsafe(`
    SELECT count(*)::int as count FROM auth.users WHERE raw_user_meta_data->>'seeded' = 'true'
  `);
  const existingCount = existingCountRes[0]?.count || 0;
  console.log(`📊 Currently existing seeded users: ${existingCount}`);

  if (existingCount >= TARGET_TOTAL) {
    console.log(`✅ Already have ${existingCount} seeded users. Finished.`);
    return;
  }

  const needed = TARGET_TOTAL - existingCount;
  console.log(`⚡ Generating ${needed} realistic users...`);

  let createdTotal = 0;
  let batchNum = 0;
  const totalBatches = Math.ceil(needed / BATCH_SIZE);

  const usedUsernames = new Set();

  while (createdTotal < needed) {
    batchNum++;
    const currentBatchSize = Math.min(BATCH_SIZE, needed - createdTotal);

    for (let i = 0; i < currentBatchSize; i++) {
      const isFemale = Math.random() < 0.52;
      const firstName = isFemale ? pick(firstNamesFemale) : pick(firstNamesMale);
      const lastName = pick(lastNames);
      const displayName = `${firstName} ${lastName}`;

      let username;
      let suffix = Math.floor(100 + Math.random() * 8900);
      do {
        username = `${firstName.toLowerCase()}_${lastName.toLowerCase()}${suffix}`;
        suffix++;
      } while (usedUsernames.has(username));
      usedUsernames.add(username);

      const email = `${username}@commonroom.ng`;
      const plainPassword = generatePassword();
      const userId = crypto.randomUUID();

      // School distribution:
      // ~60% from AAUA, RUGIPO, FUTA, UNILAG, OAU, UNIBEN, UNIABUJA
      // ~20% from other universities
      // ~20% without school (non-school-centric)
      const randSchoolType = Math.random();
      let school = null;
      let educationStatus = 'not_in_school_yet';
      let course = 'General Member';
      let year = 'Alumni';

      if (randSchoolType < 0.60) {
        school = pick(primarySchools);
        educationStatus = 'currently_in_school';
        course = pick(courses);
        year = pick(years);
      } else if (randSchoolType < 0.80) {
        school = pick(secondarySchools);
        educationStatus = 'currently_in_school';
        course = pick(courses);
        year = pick(years);
      } else {
        school = null;
        educationStatus = 'not_in_school_yet';
        course = 'Creative / Professional';
        year = 'Community';
      }

      const avatarPhoto = isFemale ? pick(femalePhotos) : pick(malePhotos);
      const userBio = pick(bios);
      const userInterests = pickN(interestsList, 4);

      try {
        // 1. Insert into auth.users with crypted password and plain_password in raw_user_meta_data
        await prisma.$executeRawUnsafe(`
          INSERT INTO auth.users (
            id, instance_id, aud, role, email, encrypted_password,
            email_confirmed_at, confirmation_sent_at,
            raw_app_meta_data, raw_user_meta_data,
            created_at, updated_at, is_anonymous
          ) VALUES (
            $1::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', $2,
            crypt($3, gen_salt('bf')),
            now(), now(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            jsonb_build_object('seeded', 'true', 'plain_password', $3, 'display_name', $4),
            now() - (random() * interval '90 days'), now(), false
          )
          ON CONFLICT (id) DO NOTHING
        `, userId, email, plainPassword, displayName);

        // 2. Insert into auth.identities
        await prisma.$executeRawUnsafe(`
          INSERT INTO auth.identities (
            id, user_id, identity_data, provider, provider_id,
            last_sign_in_at, created_at, updated_at
          ) VALUES (
            $1::uuid, $1::uuid,
            jsonb_build_object('sub', $1::text, 'email', $2, 'email_verified', true),
            'email', $1::text,
            now(), now(), now()
          )
          ON CONFLICT (provider, provider_id) DO NOTHING
        `, userId, email);

        // 3. Insert into public.profiles
        await prisma.$executeRawUnsafe(`
          INSERT INTO public.profiles (
            id, display_name, username, education_status, school,
            show_school_on_profile, course, year, age_eligibility_confirmed,
            interests, bio, avatar_url, created_at, updated_at
          ) VALUES (
            $1::uuid, $2, $3, $4, $5,
            $6, $7, $8, true,
            $9, $10, $11, now() - (random() * interval '90 days'), now()
          )
          ON CONFLICT (id) DO NOTHING
        `, userId, displayName, username, educationStatus, school,
           school !== null, course, year, userInterests, userBio, avatarPhoto);

        // 4. Insert into public.dating_profiles for ~70% of users so Connect is bustling with real profiles
        if (Math.random() < 0.70) {
          const datingBio = pick(bios);
          const datingInterests = pickN(interestsList, 4);

          await prisma.$executeRawUnsafe(`
            INSERT INTO public.dating_profiles (
              user_id, display_name, school, bio, interests, discoverable, updated_at
            ) VALUES (
              $1::uuid, $2, $3, $4, $5, true, now()
            )
            ON CONFLICT (user_id) DO NOTHING
          `, userId, displayName, school, datingBio, datingInterests);
        }

        createdTotal++;
      } catch (err) {
        if (!err.message.includes('unique') && !err.message.includes('duplicate')) {
          console.warn(`⚠️ Warning on user ${i}:`, err.message);
        }
      }
    }

    if (batchNum % 2 === 0 || createdTotal >= needed) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`📦 Batch ${batchNum}/${totalBatches} | Seeded ${createdTotal}/${needed} users (${elapsed}s elapsed)`);
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n🎉 SUCCESS! Seeded ${createdTotal} realistic Black users across Nigerian schools & general community in ${duration}s!`);
}

run()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
