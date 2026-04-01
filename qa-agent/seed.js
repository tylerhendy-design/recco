/**
 * Recco QA Seed Script
 * Creates a fully loaded test environment matching QA_JOURNEYS.md data setup spec.
 *
 * User A — test agent account (logs in, runs all journeys)
 * User B — accepted friend (has sent recos to A)
 *
 * Seeded for User A:
 * - Friend connection with B (accepted)
 * - Recos from B: restaurant (with location), TV show, podcast, custom category
 * - A reco request from A
 * - Notifications: reco_received x4, friend_request x1, feedback_received x1
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
  await new Promise(r => setTimeout(r, 600));
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

  const userA = await createUser(emailA, 'QA Agent', `qa_agent_${TAG}`);
  const userB = await createUser(emailB, 'Alex Friend', `alex_${TAG}`);
  console.log('  ✓ Users A and B created');

  // ── Accepted friend connection B → A ────────────────────────
  await supabase.from('friend_connections').insert({
    requester_id: userB.id,
    addressee_id: userA.id,
    status: 'accepted',
    tier: 'close',
  });
  console.log('  ✓ Friend connection (accepted)');

  // ── Recos from B to A ────────────────────────────────────────
  const { data: recos, error: recoErr } = await supabase
    .from('recommendations')
    .insert([
      {
        // Restaurant with location — for Journey 14 (expanded card) and Journey 6 (review)
        sender_id: userB.id,
        category: 'restaurant',
        title: 'Padella',
        why_text: 'Best pasta in London. The pici cacio e pepe is unreal — go for lunch to skip the queue.',
        meta: {
          location: 'Borough Market, London',
          address: '6 Southwark St, London SE1 1TQ',
          price: '££',
        },
      },
      {
        // TV show — for Journey 2 (media reco)
        sender_id: userB.id,
        category: 'tv',
        title: 'The Bear',
        why_text: 'Season 2 episode 6 is one of the best hours of television ever made.',
        meta: { platform: 'Disney+', genre: 'Drama' },
      },
      {
        // Podcast — for Journey 2 (media reco)
        sender_id: userB.id,
        category: 'podcast',
        title: "Conan O'Brien Needs a Friend",
        why_text: 'Start with any Sona episode. Genuinely the funniest podcast out there.',
        meta: { platform: 'Spotify' },
      },
      {
        // Custom category — for Journey 3
        sender_id: userB.id,
        category: 'custom',
        custom_cat: 'Coffee',
        title: 'Monmouth Coffee',
        why_text: 'The Borough Market branch. Queue is worth it.',
        meta: { location: 'Borough Market, London' },
      },
    ])
    .select();

  if (recoErr) throw new Error(`Reco insert failed: ${recoErr.message}`);
  console.log('  ✓ 4 recos created (restaurant, TV, podcast, custom)');

  // ── Recipients — varied statuses ────────────────────────────
  await supabase.from('reco_recipients').insert([
    { reco_id: recos[0].id, recipient_id: userA.id, status: 'unseen' },   // Padella — needs opening + review
    { reco_id: recos[1].id, recipient_id: userA.id, status: 'seen' },     // The Bear — seen, needs marking done
    { reco_id: recos[2].id, recipient_id: userA.id, status: 'done', score: null }, // Podcast — done, needs review
    { reco_id: recos[3].id, recipient_id: userA.id, status: 'unseen' },   // Coffee — unseen
  ]);
  console.log('  ✓ Recipients seeded (unseen / seen / done-no-review / unseen)');

  // ── Message thread on Padella reco ───────────────────────────
  await supabase.from('messages').insert({
    reco_id: recos[0].id,
    sender_id: userB.id,
    recipient_id: userA.id,
    body: 'Let me know what you think of the pici! 🍝',
  });
  console.log('  ✓ Message thread on Padella reco');

  // ── Reco request from A (Journey 5 test data) ────────────────
  await supabase.from('reco_requests').insert({
    requester_id: userA.id,
    target_id: userB.id,
    category: 'restaurant',
    context: 'Looking for somewhere good in Shoreditch',
    fulfilled: false,
    declined: false,
  });
  console.log('  ✓ Reco request from A to B');

  // ── Notifications ─────────────────────────────────────────────
  await supabase.from('notifications').insert([
    {
      user_id: userA.id, type: 'reco_received',
      actor_id: userB.id, reco_id: recos[0].id,
      payload: { title: 'Padella' }, read: false,
    },
    {
      user_id: userA.id, type: 'reco_received',
      actor_id: userB.id, reco_id: recos[1].id,
      payload: { title: 'The Bear' }, read: false,
    },
    {
      user_id: userA.id, type: 'reco_received',
      actor_id: userB.id, reco_id: recos[2].id,
      payload: { title: "Conan O'Brien Needs a Friend" }, read: false,
    },
    {
      user_id: userA.id, type: 'reco_received',
      actor_id: userB.id, reco_id: recos[3].id,
      payload: { title: 'Monmouth Coffee' }, read: false,
    },
    {
      // Feedback received notification so agent can see review flow
      user_id: userA.id, type: 'feedback_received',
      actor_id: userB.id, reco_id: recos[0].id,
      payload: { score: 8, title: 'Padella' }, read: false,
    },
  ]);
  console.log('  ✓ Notifications seeded (4x reco_received, 1x feedback_received)');

  console.log('\n✅ Seed complete.\n');

  // Sign in as User A
  const { data: sessionData, error: signInErr } = await supabaseAnon.auth.signInWithPassword({
    email: emailA,
    password: 'QaAgent_2024!',
  });
  if (signInErr) throw new Error(`Sign-in failed: ${signInErr.message}`);

  return {
    userAId: userA.id,
    userBId: userB.id,
    email: emailA,
    password: 'QaAgent_2024!',
    friendUsername: `alex_${TAG}`,
    friendId: userB.id,
    session: sessionData.session,
  };
}

export async function cleanupSeedAccounts(userAId, userBId) {
  for (const id of [userAId, userBId].filter(Boolean)) {
    const { error } = await supabase.auth.admin.deleteUser(id);
    if (error) console.warn(`  ⚠️  Could not delete ${id}: ${error.message}`);
  }
  console.log('  🧹 Seed accounts deleted.');
}
