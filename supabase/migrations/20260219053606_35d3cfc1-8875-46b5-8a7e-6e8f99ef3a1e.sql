
-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('hq', 'center', 'teacher');

-- Create centers table
CREATE TABLE public.centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profiles table (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'teacher',
  center_id UUID REFERENCES public.centers(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Create receipts table
CREATE TABLE public.receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  center_id UUID NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(10,2) NOT NULL,
  receipt_date DATE NOT NULL,
  file_url TEXT,
  file_name TEXT,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Processed')),
  processed_date TIMESTAMP WITH TIME ZONE,
  processed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  xero_pushed BOOLEAN NOT NULL DEFAULT false,
  xero_pushed_at TIMESTAMP WITH TIME ZONE,
  hq_confirmed BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create email_logs table for tracking sent emails
CREATE TABLE public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sent_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_emails TEXT[] NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  receipt_ids UUID[] NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Helper function: check if current user is HQ
CREATE OR REPLACE FUNCTION public.is_hq()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'hq'
  )
$$;

-- Helper function: check if current user is Center
CREATE OR REPLACE FUNCTION public.is_center_user()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'center'
  )
$$;

-- Helper function: get user's center_id
CREATE OR REPLACE FUNCTION public.get_user_center_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT center_id FROM public.profiles WHERE id = auth.uid()
$$;

-- RLS Policies for centers
CREATE POLICY "Anyone authenticated can view centers" ON public.centers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "HQ can manage centers" ON public.centers
  FOR ALL TO authenticated USING (public.is_hq());

-- RLS Policies for profiles
CREATE POLICY "HQ can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (
    public.is_hq() OR
    public.is_center_user() OR
    id = auth.uid()
  );

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());

CREATE POLICY "HQ can manage all profiles" ON public.profiles
  FOR ALL TO authenticated USING (public.is_hq());

CREATE POLICY "Center can manage profiles in their center" ON public.profiles
  FOR ALL TO authenticated USING (
    public.is_center_user() AND center_id = public.get_user_center_id()
  );

CREATE POLICY "Allow profile creation" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (
    user_id = auth.uid() OR public.is_hq() OR public.is_center_user()
  );

CREATE POLICY "HQ can manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.is_hq());

CREATE POLICY "Center can manage teacher roles" ON public.user_roles
  FOR ALL TO authenticated USING (
    public.is_center_user() AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = user_roles.user_id AND p.center_id = public.get_user_center_id() AND p.role = 'teacher'
    )
  );

-- RLS Policies for receipts
CREATE POLICY "HQ can view all receipts" ON public.receipts
  FOR SELECT TO authenticated USING (public.is_hq());

CREATE POLICY "Center can view receipts in their center" ON public.receipts
  FOR SELECT TO authenticated USING (
    public.is_center_user() AND center_id = public.get_user_center_id()
  );

CREATE POLICY "Teacher can view own receipts" ON public.receipts
  FOR SELECT TO authenticated USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can insert own receipts" ON public.receipts
  FOR INSERT TO authenticated WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Teachers can update own pending receipts" ON public.receipts
  FOR UPDATE TO authenticated USING (teacher_id = auth.uid() AND status = 'Pending');

CREATE POLICY "HQ can update all receipts" ON public.receipts
  FOR UPDATE TO authenticated USING (public.is_hq());

CREATE POLICY "Center can update receipts in their center" ON public.receipts
  FOR UPDATE TO authenticated USING (
    public.is_center_user() AND center_id = public.get_user_center_id()
  );

-- RLS Policies for email_logs
CREATE POLICY "HQ can manage email logs" ON public.email_logs
  FOR ALL TO authenticated USING (public.is_hq());

-- Create storage bucket for receipts
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', false);

-- Storage policies
CREATE POLICY "Teachers can upload their receipts" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'receipts' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Authenticated users can view receipts" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'receipts');

CREATE POLICY "HQ can manage all receipt files" ON storage.objects
  FOR ALL TO authenticated USING (
    bucket_id = 'receipts' AND public.is_hq()
  );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_receipts_updated_at
  BEFORE UPDATE ON public.receipts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'teacher')
  );
  
  -- Also insert into user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'teacher')
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert default centers
INSERT INTO public.centers (name, code) VALUES 
  ('HQ', 'HQ'),
  ('Center A', 'CTA'),
  ('Center B', 'CTB');
