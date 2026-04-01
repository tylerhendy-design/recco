/**
 * Recco QA Seed Script — Comprehensive
 *
 * Creates 4 users and a fully loaded test environment covering every journey.
 *
 * User A (agent)    — logs in and runs all journeys
 * User B (friend)   — accepted friend, has sent A recos, has sent A a message
 * User C (requester)— has sent A a pending friend request (for J_FRIEND_ACCEPT)
 * User D (stranger) — exists so A can search and send them a friend request (J_FRIEND_SEND)
 *
 * After certain journeys, the runner can query Supabase to verify
 * cross-account side effects (e.g. did C get a friend_accepted notification?)
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

  const emailA   = `qa-a+${TAG}@recco-test.dev`;
  const emailB   = `qa-b+${TAG}@recco-test.dev`;
  const emailC   = `qa-c+${TAG}@recco-test.dev`;
  const emailD   = `qa-d+${TAG}@recco-test.dev`;

  const userA = await createUser(emailA, 'QA Agent',    `qa_agent_${TAG}`);
  const userB = await createUser(emailB, 'Alex Friend', `alex_${TAG}`);
  const userC = await createUser(emailC, 'Sam Sender',  `sam_${TAG}`);
  const userD = await createUser(emailD, 'Dana Discover', `dana_${TAG}`);

  console.log('  ✓ Users A, B, C, D created');

  // ── Friend connections ───────────────────────────────────────
  // B ↔ A: accepted (so A has a friend to send recos to)
  await supabase.from('friend_connections').insert({
    requester_id: userB.id, addressee_id: userA.id,
    status: 'accepted', tier: 'close',
  });

  // C → A: pending (for J_FRIEND_ACCEPT — A will accept this)
  await supabase.from('friend_connections').insert({
    requester_id: userC.id, addressee_id: userA.id,
    status: 'pending', tier: 'tribe',
  });

  // D: no connection yet (for J_FRIEND_SEND — A will search and add them)

  console.log('  ✓ Friend connections: B↔A accepted, C→A pending, D unconnected');

  // ── Recos from B to A ────────────────────────────────────────
  const { data: recos, error: recoErr } = await supabase
    .from('recommendations')
    .insert([
      {
        // Restaurant with full location data — J14, J6, J1 reference
        sender_id: userB.id, category: 'restaurant',
        title: 'Padella',
        why_text: 'Best pasta in London. The pici cacio e pepe is unreal — go for lunch to skip the queue.',
        meta: { location: 'Borough Market, London', address: '6 Southwark St, London SE1 1TQ', price: '££' },
      },
      {
        // TV show — J2 / J_AUTOFILL reference
        sender_id: userB.id, category: 'tv',
        title: 'The Bear',
        why_text: 'Season 2 episode 6 is one of the best hours of television ever made.',
        meta: { platform: 'Disney+', genre: 'Drama' },
      },
      {
        // Podcast — already done, no review yet — for J6 review flow
        sender_id: userB.id, category: 'podcast',
        title: "Conan O'Brien Needs a Friend",
        why_text: 'Start with any Sona episode.',
        meta: { platform: 'Spotify' },
      },
      {
        // Culture — for testing Done tab and score colours
        sender_id: userB.id, category: 'culture',
        title: 'Tate Modern: Yayoi Kusama Exhibition',
        why_text: 'The infinity rooms are worth it alone. Book ahead.',
        meta: { location: 'London' },
      },
      {
        // Custom category — for J3
        sender_id: userB.id, category: 'custom', custom_cat: 'Coffee',
        title: 'Monmouth Coffee',
        why_text: 'The Borough Market branch. Queue is worth it.',
        meta: { location: 'Borough Market, London' },
      },
    ])
    .select();

  if (recoErr) throw new Error(`Reco insert failed: ${recoErr.message}`);
  console.log('  ✓ 5 recos created (restaurant, TV, podcast, culture, custom)');

  // ── Recipient statuses — varied for different journey needs ──
  await supabase.from('reco_recipients').insert([
    { reco_id: recos[0].id, recipient_id: userA.id, status: 'unseen' },        // Padella — unseen
    { reco_id: recos[1].id, recipient_id: userA.id, status: 'seen' },          // The Bear — seen, needs action
    { reco_id: recos[2].id, recipient_id: userA.id, status: 'done', score: null }, // Podcast — done, needs review
    { reco_id: recos[3].id, recipient_id: userA.id, status: 'done', score: 8, feedback_text: 'Incredible, highly recommend' }, // Culture — done with review (Done tab)
    { reco_id: recos[4].id, recipient_id: userA.id, status: 'unseen' },        // Coffee — unseen
  ]);
  console.log('  ✓ Recipient statuses: unseen/seen/done-no-review/done-reviewed/unseen');

  // ── Message thread on Padella reco ───────────────────────────
  await supabase.from('messages').insert([
    {
      reco_id: recos[0].id, sender_id: userB.id, recipient_id: userA.id,
      body: 'Let me know what you think of the pici! 🍝',
    },
  ]);
  console.log('  ✓ Message thread on Padella reco');

  // ── Reco request from A to B ─────────────────────────────────
  await supabase.from('reco_requests').insert({
    requester_id: userA.id, target_id: userB.id,
    category: 'restaurant', context: 'Looking for somewhere good in Shoreditch',
    fulfilled: false, declined: false,
  });
  console.log('  ✓ Reco request from A to B');

  // ── Notifications for A ──────────────────────────────────────
  await supabase.from('notifications').insert([
    // Reco received notifications
    { user_id: userA.id, type: 'reco_received', actor_id: userB.id, reco_id: recos[0].id, payload: { title: 'Padella' }, read: false },
    { user_id: userA.id, type: 'reco_received', actor_id: userB.id, reco_id: recos[1].id, payload: { title: 'The Bear' }, read: false },
    { user_id: userA.id, type: 'reco_received', actor_id: userB.id, reco_id: recos[2].id, payload: { title: "Conan O'Brien Needs a Friend" }, read: false },
    { user_id: userA.id, type: 'reco_received', actor_id: userB.id, reco_id: recos[4].id, payload: { title: 'Monmouth Coffee' }, read: false },
    // Feedback received — with score 8 (green badge)
    { user_id: userA.id, type: 'feedback_received', actor_id: userB.id, reco_id: recos[3].id, payload: { score: 8, title: 'Tate Modern' }, read: false },
    // Friend request from C (pending)
    { user_id: userA.id, type: 'friend_request', actor_id: userC.id, payload: { username: `sam_${TAG}`, display_name: 'Sam Sender' }, read: false },
  ]);
  console.log('  ✓ Notifications: 4x reco_received, 1x feedback_received (score 8), 1x friend_request');

  console.log('\n✅ Seed complete.\n');

  // Sign in as User A
  const { data: sessionData, error: signInErr } = await supabaseAnon.auth.signInWithPassword({
    email: emailA, password: 'QaAgent_2024!',
  });
  if (signInErr) throw new Error(`Sign-in failed: ${signInErr.message}`);

  return {
    userAId: userA.id,
    userBId: userB.id,
    userCId: userC.id,
    userDId: userD.id,
    email: emailA,
    password: 'QaAgent_2024!',
    friendUsername:   `alex_${TAG}`,
    requesterUsername: `sam_${TAG}`,
    strangerUsername:  `dana_${TAG}`,
    session: sessionData.session,
  };
}

/**
 * Cross-account verification: check that a specific notification
 * was created for another user after an action by User A.
 * Used to verify bidirectional notification logic.
 */
export async function verifyCrossAccountNotification(userId, type, label) {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, created_at')
    .eq('user_id', userId)
    .eq('type', type)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.log(`  ⚠️  Cross-account check failed: ${error.message}`);
    return false;
  }

  const found = data && data.length > 0;
  const icon = found ? '✅' : '❌';
  console.log(`  ${icon} Cross-account check [${label}]: ${found ? 'notification found' : 'NOT found — bug'}`);
  return found;
}

export async function cleanupSeedAccounts(...ids) {
  for (const id of ids.filter(Boolean)) {
    const { error } = await supabase.auth.admin.deleteUser(id);
    if (error) console.warn(`  ⚠️  Could not delete ${id}: ${error.message}`);
  }
  console.log('  🧹 All seed accounts deleted.');
}
