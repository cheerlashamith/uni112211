import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const DEMO_PASSWORD = process.env.DEMO_USER_PASSWORD || 'Demo@12345';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing required env vars: VITE_SUPABASE_URL/SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SECRET_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_USERS = [
  { email: 'admin@uniguild.edu', role: 'super_admin', name: 'Demo Super Admin' },
  { email: 'head@uniguild.edu', role: 'head_coordinator', name: 'Demo Head Coordinator' },
  { email: 'coordinator@uniguild.edu', role: 'coordinator', name: 'Demo Event Coordinator' },
  { email: 'volunteer@uniguild.edu', role: 'volunteer', name: 'Demo Volunteer' },
  { email: 'evaluator@uniguild.edu', role: 'evaluator', name: 'Demo Evaluator' },
  { email: 'student@uniguild.edu', role: 'student', name: 'Demo Student' },
];

async function findAuthUserByEmail(email) {
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = data?.users || [];
    const found = users.find((u) => (u.email || '').toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (users.length < perPage) return null;
    page += 1;
  }
}

async function ensureAuthUser(user) {
  let existing = await findAuthUserByEmail(user.email);
  if (existing) {
    await supabase.auth.admin.updateUserById(existing.id, {
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: user.name, role: user.role },
    });
    return existing;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: user.email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: user.name, role: user.role },
  });
  if (error) throw error;
  return data.user;
}

async function ensureProfile(authUser, user) {
  const payload = {
    uid: authUser.id,
    email: user.email,
    name: user.name,
    role: user.role,
    college: 'Sasi Institute of Technology',
    department: 'CSE',
    year: '3rd Year',
    status: 'active',
    avatar: `https://picsum.photos/seed/${encodeURIComponent(user.email)}/200/200`,
    skills: ['coordination', 'communication'],
  };

  const { error } = await supabase.from('users').upsert(payload, { onConflict: 'uid' });
  if (error) throw error;
}

async function main() {
  console.log('Seeding demo users into Supabase...');
  console.log(`Using demo password: ${DEMO_PASSWORD}`);

  for (const user of DEMO_USERS) {
    const authUser = await ensureAuthUser(user);
    await ensureProfile(authUser, user);
    console.log(`OK: ${user.role.padEnd(16)} ${user.email}`);
  }

  console.log('\nDone. You can now login from /login with demo buttons or email/password.');
}

main().catch((err) => {
  console.error('Failed to seed demo users:', err?.message || err);
  process.exit(1);
});
