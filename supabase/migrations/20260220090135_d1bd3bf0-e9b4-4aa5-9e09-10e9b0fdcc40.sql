
-- Drop the restrictive select policy and recreate as permissive
DROP POLICY IF EXISTS "Anyone authenticated can view centers" ON public.centers;

CREATE POLICY "Anyone can view centers"
ON public.centers
FOR SELECT
TO anon, authenticated
USING (true);
