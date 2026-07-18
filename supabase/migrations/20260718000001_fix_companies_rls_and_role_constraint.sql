-- 1. Fix company_users role constraint
ALTER TABLE public.company_users DROP CONSTRAINT IF EXISTS company_users_role_check;
ALTER TABLE public.company_users ADD CONSTRAINT company_users_role_check CHECK (role IN ('owner', 'admin', 'accountant', 'viewer'));

-- 2. Enable RLS on companies & company_users if not already
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;

-- 3. Add RLS policies for companies
DROP POLICY IF EXISTS "Users can insert companies" ON public.companies;
CREATE POLICY "Users can insert companies" ON public.companies FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Owners can update their companies" ON public.companies;
CREATE POLICY "Owners can update their companies" ON public.companies FOR UPDATE TO authenticated
USING (id IN (SELECT company_id FROM public.company_users WHERE user_id = (SELECT auth.uid()) AND role = 'owner'));

-- 4. Add RLS policies for company_users
DROP POLICY IF EXISTS "Owners and Admins can manage company users" ON public.company_users;
CREATE POLICY "Owners and Admins can manage company users" ON public.company_users FOR ALL TO authenticated
USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = (SELECT auth.uid()) AND role IN ('owner', 'admin')))
WITH CHECK (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = (SELECT auth.uid()) AND role IN ('owner', 'admin')));

DROP POLICY IF EXISTS "Users can link themselves as owner" ON public.company_users;
CREATE POLICY "Users can link themselves as owner" ON public.company_users FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id AND role = 'owner');
