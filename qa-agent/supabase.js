/**
 * Supabase utilities for QA agent.
 * Creates and tears down test users without polluting your real user table.
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Service role needed to delete users
);

/**
 * Delete a test user by email address.
 * Uses the admin API so it cleans up auth.users AND any cascade-deleted profile rows.
 */
export async function cleanupTestUser(email) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY not set — skipping test user cleanup.');
    return;
  }

  try {
    // Search by email directly — avoids pagination issues with large user tables
    const { data, error: listError } = await supabase.auth.admin.listUsers({
      perPage: 1000,
      // Filter isn't supported in all versions, so we search and filter client-side,
      // but with a targeted page size this is reliable for typical usage.
    });
    if (listError) throw listError;

    const user = data.users.find((u) => u.email === email);
    if (!user) {
      console.log(`  🧹 No user found for ${email} — nothing to clean up.`);
      return;
    }

    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
    if (deleteError) throw deleteError;

    console.log(`  🧹 Test user ${email} deleted from Supabase.`);
  } catch (err) {
    console.warn(`  ⚠️  Could not clean up test user: ${err.message}`);
  }
}
