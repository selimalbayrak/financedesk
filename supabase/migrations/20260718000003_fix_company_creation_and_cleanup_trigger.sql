-- 1. RPC function to create company and link user as owner atomically (bypasses RLS SELECT order issue)
CREATE OR REPLACE FUNCTION public.create_company_and_owner(p_name text)
RETURNS uuid AS $$
DECLARE
    v_company_id uuid;
    v_user_id uuid;
BEGIN
    -- Get current authenticated user ID
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Oturum açmış kullanıcı bulunamadı.';
    END IF;

    -- Insert the new company
    INSERT INTO public.companies (name)
    VALUES (p_name)
    RETURNING id INTO v_company_id;

    -- Link the user as owner
    INSERT INTO public.company_users (company_id, user_id, role)
    VALUES (v_company_id, v_user_id, 'owner');

    RETURN v_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Modify trigger function to ONLY create default company for albayrakselim9@gmail.com
CREATE OR REPLACE FUNCTION public.handle_new_user_company() 
RETURNS TRIGGER AS $$
DECLARE
    new_company_id UUID;
BEGIN
    -- Only create a default company if the user's email is albayrakselim9@gmail.com
    IF LOWER(NEW.email) = 'albayrakselim9@gmail.com' THEN
        INSERT INTO public.companies (name) 
        VALUES ('Benim Şirketim') 
        RETURNING id INTO new_company_id;
        
        INSERT INTO public.company_users (company_id, user_id, role) 
        VALUES (new_company_id, NEW.id, 'owner');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Clean up: Delete any automatically created "Benim Şirketim" company for any other users
DELETE FROM public.companies 
WHERE name = 'Benim Şirketim'
AND id IN (
    SELECT cu.company_id 
    FROM public.company_users cu
    JOIN auth.users u ON u.id = cu.user_id
    WHERE cu.role = 'owner'
    AND LOWER(u.email) != 'albayrakselim9@gmail.com'
);
