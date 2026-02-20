
-- Fix: Drop restrictive policies and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Anyone can view centers" ON public.centers;
DROP POLICY IF EXISTS "HQ can manage centers" ON public.centers;

-- Permissive SELECT for everyone
CREATE POLICY "Anyone can view centers"
  ON public.centers
  FOR SELECT
  USING (true);

-- Permissive ALL for HQ
CREATE POLICY "HQ can manage centers"
  ON public.centers
  FOR ALL
  USING (is_hq());
