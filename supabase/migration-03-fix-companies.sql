-- Assign a default company to ALL users who do not have one
DO $$
DECLARE
    usr RECORD;
    new_company_id UUID;
BEGIN
    FOR usr IN SELECT * FROM auth.users
    LOOP
        IF NOT EXISTS (SELECT 1 FROM company_users WHERE user_id = usr.id) THEN
            -- Create a default company for this user
            INSERT INTO companies (name) VALUES ('Benim Şirketim') RETURNING id INTO new_company_id;
            
            -- Assign user as owner
            INSERT INTO company_users (company_id, user_id, role) 
            VALUES (new_company_id, usr.id, 'owner');
        END IF;
    END LOOP;
END $$;

-- Create a trigger function to automatically create a company for new signups
CREATE OR REPLACE FUNCTION public.handle_new_user_company() 
RETURNS TRIGGER AS $$
DECLARE
    new_company_id UUID;
BEGIN
    -- Create the default company
    INSERT INTO public.companies (name) 
    VALUES ('Benim Şirketim') 
    RETURNING id INTO new_company_id;
    
    -- Assign the new user as the owner of this company
    INSERT INTO public.company_users (company_id, user_id, role) 
    VALUES (new_company_id, NEW.id, 'owner');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it already exists to avoid errors
DROP TRIGGER IF EXISTS on_auth_user_created_create_company ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created_create_company
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_company();

