/**
 * Recco QA Seed Script
 * Creates a realistic, fully-loaded test environment:
 *
 * User A (agent)   — the account Claude will log in and explore as
 * User B (friend)  — has sent User A several recos needing action
 * User C (stranger)— exists so User A can search for and add as a friend
 *
 * Seeded state for User A:
 * - 4 unread notifications (reco received x3, friend request x1)
 * - 3 recos from User B: one unseen, one seen (needs marking done + review), one done
 * - 1 pending friend request from User C
 * - 1 existing message thread with User B
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const supabaseAnon = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const TAG = `qa-${Date.now()}`;

async function createUser(email, fullName, username) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: 'QaAgent_2024!',
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) throw new Error(`Could not create ${fullName}: ${error.message}`);

  // Wait briefly for the trigger to create the profile row
  await new Promise(r => setTimeout(r, 500));

  await supabase
    .from('profiles')
    .update({ username, display_name: fullName })
    .eq('id', data.user.id);

  return data.user;
}

export async function seedTestAccounts() {
  console.log('🌱 Seeding test accounts...');

  const emailA = `qa-a+${TAG}@recco-test.dev`;
  const emailB = `qa-b+${TAG}@recco-test.dev`;
  const emailC = `qa-c+${TAG}@recco-test.dev`;

  const userA = await createUser(emailA, 'QA Agent', `qa_agent_${TAG}`);
  const userB = await createUser(emailB, 'Alex Friend', `alex_friend_${TAG}`);
  const userC = await createUser(emailC, 'Sam Stranger', `sam_stranger_${TAG}`);

  console.log(`  ✓ Users created: Agent (A), Friend (B), Stranger (C)`);

  // ── Friend connection: B → A (accepted) ─────────────────────
  await supabase.from('friend_connections').insert({
    requester_id: userB.id,
    addressee_id: userA.id,
    status: 'accepted',
    tier: 'close',
  });

  // ── Friend request: C → A (pending) — Agent can accept or ignore ─
  await supabase.from('friend_connections').insert({
    requester_id: userC.id,
    addressee_id: userA.id,
    status: 'pending',
    tier: 'tribe',
  });

  console.log(`  ✓ Friend connections seeded`);

  // ── Recommendations from B to A ─────────────────────────────
  const { data: recos, error: recoErr } = await supabase
    .from('recommendations')
    .insert([
      {
        // Reco 1: London restaurant — unseen, needs opening + marking done + review
        sender_id: userB.id,
        category: 'restaurant',
        title: 'Padella',
        why_text: 'Best pasta in London, the pici cacio e pepe is unreal. Go for lunch to avoid the queue.',
        meta: { location: 'Borough Market, London', google_place_id: 'ChIJ...' },
      },
      {
        // Reco 2: Podcast — seen but not actioned
        sender_id: userB.id,
        category: 'podcast',
        title: 'Conan O\'Brien Needs a Friend',
        why_text: 'Genuinely the funniest podcast out there, start with the Sona episodes.',
        meta: { platform: 'Spotify' },
      },
      {
        // Reco 3: Culture / experience — already done, so Agent can write a review
        sender_id: userB.id,
        category: 'culture',
        title: 'Tate Modern: Yayoi Kusama Exhibition',
        why_text: 'The infinity rooms are worth it alone. Book ahead.',
        meta: { location: 'London', url: 'https://www.tate.org.uk' },
      },
    ])
    .select();

  if (recoErr) throw new Error(`Reco insert failed: ${recoErr.message}`);
  console.log(`  ✓ 3 recommendations created (restaurant, podcast, culture)`);

  // ── Reco recipients ──────────────────────────────────────────
  await supabase.from('reco_recipients').insert([
    { reco_id: recos[0].id, recipient_id: userA.id, status: 'unseen' },
    { reco_id: recos[1].id, recipient_id: userA.id, status: 'seen' },
    { reco_id: recos[2].id, recipient_id: userA.id, status: 'done', score: null }, // done but no review yet
  ]);

  console.log(`  ✓ User A added as recipient (unseen / seen / done-no-review)`);

  // ── Existing message from B on the Padella reco ──────────────
  await supabase.from('messages').insert({
    reco_id: recos[0].id,
    sender_id: userB.id,
    recipient_id: userA.id,
    body: 'Let me know what you think of the pici! 🍝',
  });

  console.log(`  ✓ Message thread seeded on Padella reco`);

  // ── Notifications ────────────────────────────────────────────
  await supabase.from('notifications').insert([
    {
      user_id: userA.id,
      type: 'reco_received',
      actor_id: userB.id,
      reco_id: recos[0].id,
      payload: { title: 'Padella' },
      read: false,
    },
    {
      user_id: userA.id,
      type: 'reco_received',
      actor_id: userB.id,
      reco_id: recos[1].id,
      payload: { title: 'Conan O\'Brien Needs a Friend' },
      read: false,
    },
    {
      user_id: userA.id,
      type: 'reco_received',
      actor_id: userB.id,
      reco_id: recos[2].id,
      payload: { title: 'Tate Modern: Yayoi Kusama Exhibition' },
      read: true,
    },
    {
      user_id: userA.id,
      type: 'friend_request',
      actor_id: userC.id,
      payload: { username: `sam_stranger_${TAG}` },
      read: false,
    },
  ]);

  console.log(`  ✓ Notifications seeded (3 reco, 1 friend request)`);
  console.log('\n✅ Seed complete.\n');

  // ── Sign in as User A to get a session ───────────────────────
  const { data: sessionData, error: signInErr } = await supabaseAnon.auth.signInWithPassword({
    email: emailA,
    password: 'QaAgent_2024!',
  });
  if (signInErr) throw new Error(`Sign-in failed: ${signInErr.message}`);

  return {
    userAId: userA.id,
    userBId: userB.id,
    userCId: userC.id,
    email: emailA,
    password: 'QaAgent_2024!',
    friendUsername: `alex_friend_${TAG}`,
    strangerUsername: `sam_stranger_${TAG}`,
    session: sessionData.session,
  };
}

export async function cleanupSeedAccounts(userAId, userBId, userCId) {
  for (const id of [userAId, userBId, userCId].filter(Boolean)) {
    const { error } = await supabase.auth.admin.deleteUser(id);
    if (error) console.warn(`  ⚠️  Could not delete user ${id}: ${error.message}`);
  }
  console.log('  🧹 All seed accounts deleted.');
}
