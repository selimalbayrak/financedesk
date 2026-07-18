-- 1. Helper function to check if a user belongs to a company (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.check_user_belongs_to_company(p_company_id uuid, p_user_id uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.company_users 
        WHERE company_id = p_company_id 
        AND user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Helper function to check if a user is owner or admin in a company (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.check_user_is_company_owner_or_admin(p_company_id uuid, p_user_id uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.company_users 
        WHERE company_id = p_company_id 
        AND user_id = p_user_id 
        AND role IN ('owner', 'admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Drop all policies on company_users to start clean
DROP POLICY IF EXISTS "user_company_members" ON public.company_users;
DROP POLICY IF EXISTS "Owners and Admins can manage company users" ON public.company_users;
DROP POLICY IF EXISTS "Users can link themselves as owner" ON public.company_users;

-- 4. Create non-recursive policies on company_users
CREATE POLICY "user_company_members" ON public.company_users 
    FOR SELECT TO authenticated
    USING (public.check_user_belongs_to_company(company_id, (SELECT auth.uid())));

CREATE POLICY "Owners and Admins can manage company users" ON public.company_users 
    FOR ALL TO authenticated
    USING (public.check_user_is_company_owner_or_admin(company_id, (SELECT auth.uid())))
    WITH CHECK (public.check_user_is_company_owner_or_admin(company_id, (SELECT auth.uid())));

CREATE POLICY "Users can link themselves as owner" ON public.company_users 
    FOR INSERT TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id AND role = 'owner');

-- 5. Drop and recreate policies on companies using helper functions for clean consistency
DROP POLICY IF EXISTS "user_companies" ON public.companies;
DROP POLICY IF EXISTS "Users can insert companies" ON public.companies;
DROP POLICY IF EXISTS "Owners can update their companies" ON public.companies;

CREATE POLICY "user_companies" ON public.companies 
    FOR SELECT TO authenticated
    USING (public.check_user_belongs_to_company(id, (SELECT auth.uid())));

CREATE POLICY "Users can insert companies" ON public.companies 
    FOR INSERT TO authenticated 
    WITH CHECK (true);

CREATE POLICY "Owners can update their companies" ON public.companies 
    FOR UPDATE TO authenticated
    USING (public.check_user_is_company_owner_or_admin(id, (SELECT auth.uid())));
