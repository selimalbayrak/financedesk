-- 1. RPC function to resolve email and add user to company
CREATE OR REPLACE FUNCTION public.add_user_to_company_by_email(
    p_company_id uuid,
    p_email text,
    p_role text
)
RETURNS jsonb AS $$
DECLARE
    v_user_id uuid;
BEGIN
    -- Find the user ID from auth.users by email (case-insensitive)
    SELECT id INTO v_user_id FROM auth.users WHERE LOWER(email) = LOWER(p_email);
    
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('error', 'Bu e-posta adresine sahip bir kullanıcı bulunamadı.');
    END IF;

    -- Check if they are already in the company
    IF EXISTS (SELECT 1 FROM public.company_users WHERE company_id = p_company_id AND user_id = v_user_id) THEN
        RETURN jsonb_build_object('error', 'Bu kullanıcı zaten bu şirkete eklenmiş.');
    END IF;

    -- Insert into company_users
    INSERT INTO public.company_users (company_id, user_id, role)
    VALUES (p_company_id, v_user_id, p_role);

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. RPC function to get all company members securely
CREATE OR REPLACE FUNCTION public.get_company_members(p_company_id uuid)
RETURNS TABLE (
    user_id uuid,
    email text,
    role text,
    display_name text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cu.user_id,
        u.email::text,
        cu.role::text,
        coalesce(u.raw_user_meta_data->>'display_name', '')::text
    FROM public.company_users cu
    JOIN auth.users u ON u.id = cu.user_id
    WHERE cu.company_id = p_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
