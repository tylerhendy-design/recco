-- Function to find registered users by email list
-- Used for contact-based friend discovery
-- Returns profile data for matching users (excludes the requesting user)
create or replace function public.find_users_by_email(
  email_list text[],
  exclude_user_id uuid
)
returns table (
  id uuid,
  display_name text,
  username text,
  avatar_url text
)
language sql
security definer
as $$
  select p.id, p.display_name, p.username, p.avatar_url
  from auth.users u
  join public.profiles p on p.id = u.id
  where u.email = any(email_list)
    and u.id != exclude_user_id;
$$;
