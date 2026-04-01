/**
 * Recco QA Seed Script
 * Creates two fully set-up test users in Supabase so the agent has
 * a realistic account to test with — not a blank slate.
 *
 * User A (agent)  — the account the browser agent will log in as
 * User B (friend) — a seeded friend who has sent User A recommendations
 *
 * Returns credentials for User A so the agent can log in.
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Service role client for admin operations
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Anon client for signing in as a real user (generates a proper session)
const supabaseAnon = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const SEED_TAG = `qa-seed-${Date.now()}`;

export async function seedTestAccounts() {
  console.log('🌱 Seeding test accounts...');

  // ── Create auth users ───────────────────────────────────────
  const emailA = `qa-agent-a+${SEED_TAG}@recco-test.dev`;
  const emailB = `qa-agent-b+${SEED_TAG}@recco-test.dev`;
  const password = 'QaAgent_2024!';

  const { data: userAData, error: errA } = await supabase.auth.admin.createUser({
    email: emailA,
    password,
    email_confirm: true, // skip email verification
    user_metadata: { full_name: 'QA Agent' },
  });
  if (errA) throw new Error(`Could not create User A: ${errA.message}`);
  const userA = userAData.user;

  const { data: userBData, error: errB } = await supabase.auth.admin.createUser({
    email: emailB,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'QA Friend' },
  });
  if (errB) throw new Error(`Could not create User B: ${errB.message}`);
  const userB = userBData.user;

  console.log(`  ✓ Created User A (agent):  ${emailA}`);
  console.log(`  ✓ Created User B (friend): ${emailB}`);

  // ── Update profiles (trigger creates them, we fill in username) ─
  await supabase
    .from('profiles')
    .update({ username: `qa_agent_${Date.now()}`, display_name: 'QA Agent' })
    .eq('id', userA.id);

  await supabase
    .from('profiles')
    .update({ username: `qa_friend_${Date.now()}`, display_name: 'QA Friend' })
    .eq('id', userB.id);

  // ── Create an accepted friend connection ───────────────────
  const { error: friendErr } = await supabase.from('friend_connections').insert({
    requester_id: userB.id,
    addressee_id: userA.id,
    status: 'accepted',
    tier: 'close',
  });
  if (friendErr) throw new Error(`Could not create friend connection: ${friendErr.message}`);
  console.log('  ✓ Friend connection created (accepted)');

  // ── User B sends User A two recommendations ────────────────
  const recos = [
    {
      sender_id: userB.id,
      category: 'restaurant',
      title: 'Seed Restaurant',
      why_text: 'Amazing pasta, you have to try it.',
      meta: { location: 'London' },
    },
    {
      sender_id: userB.id,
      category: 'film',
      title: 'Seed Film',
      why_text: 'Best film I have seen this year.',
      meta: {},
    },
  ];

  const { data: insertedRecos, error: recoErr } = await supabase
    .from('recommendations')
    .insert(recos)
    .select();
  if (recoErr) throw new Error(`Could not insert recommendations: ${recoErr.message}`);
  console.log(`  ✓ ${insertedRecos.length} recommendations created`);

  // ── Add User A as recipient of both recos ──────────────────
  const recipients = insertedRecos.map((r) => ({
    reco_id: r.id,
    recipient_id: userA.id,
    status: 'unseen',
  }));

  const { error: recipErr } = await supabase.from('reco_recipients').insert(recipients);
  if (recipErr) throw new Error(`Could not insert reco recipients: ${recipErr.message}`);
  console.log('  ✓ User A added as recipient');

  // ── Create notifications for User A ───────────────────────
  const notifications = insertedRecos.map((r) => ({
    user_id: userA.id,
    type: 'reco_received',
    actor_id: userB.id,
    reco_id: r.id,
    payload: { title: r.title },
    read: false,
  }));

  const { error: notifErr } = await supabase.from('notifications').insert(notifications);
  if (notifErr) throw new Error(`Could not insert notifications: ${notifErr.message}`);
  console.log('  ✓ Notifications created for User A');

  console.log('\n✅ Seed complete.\n');

  // Sign in as User A to get a real session token we can inject into the browser
  const { data: sessionData, error: signInErr } = await supabaseAnon.auth.signInWithPassword({
    email: emailA,
    password,
  });
  if (signInErr) throw new Error(`Could not sign in as User A: ${signInErr.message}`);
  console.log('  ✓ Session token obtained for User A');

  return {
    userAId: userA.id,
    userBId: userB.id,
    email: emailA,
    password,
    friendEmail: emailB,
    session: sessionData.session, // access_token, refresh_token, user etc.
  };
}

/**
 * Clean up both seed users (and all cascade-deleted data).
 */
export async function cleanupSeedAccounts(userAId, userBId) {
  const ids = [userAId, userBId].filter(Boolean);
  for (const id of ids) {
    const { error } = await supabase.auth.admin.deleteUser(id);
    if (error) console.warn(`  ⚠️  Could not delete user ${id}: ${error.message}`);
  }
  console.log('  🧹 Seed accounts deleted.');
}
