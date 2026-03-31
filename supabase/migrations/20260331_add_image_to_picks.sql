-- Add image_url column to profile_picks for TOP 03 images
ALTER TABLE public.profile_picks ADD COLUMN IF NOT EXISTS image_url text;
