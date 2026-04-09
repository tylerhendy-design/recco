-- Add meta jsonb column to list_items for storing images, locations, place IDs etc.
ALTER TABLE public.list_items ADD COLUMN IF NOT EXISTS meta jsonb DEFAULT '{}';

-- Add RLS policies for lists if they don't exist
DO $$ BEGIN
  CREATE POLICY lists_owner_select ON public.lists FOR SELECT USING (auth.uid() = owner_id);
  CREATE POLICY lists_owner_insert ON public.lists FOR INSERT WITH CHECK (auth.uid() = owner_id);
  CREATE POLICY lists_owner_update ON public.lists FOR UPDATE USING (auth.uid() = owner_id);
  CREATE POLICY lists_owner_delete ON public.lists FOR DELETE USING (auth.uid() = owner_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY list_items_owner ON public.list_items FOR ALL USING (
    EXISTS (SELECT 1 FROM public.lists WHERE id = list_items.list_id AND owner_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
