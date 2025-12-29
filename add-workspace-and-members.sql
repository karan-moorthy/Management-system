-- Create a workspace and add all users as members

-- Step 1: Create a workspace (using first user as owner)
INSERT INTO workspaces (id, name, user_id, invite_code, created_at, updated_at)
VALUES (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
    'Main Workspace',
    'b7d80f97-fa9a-4b45-b461-71ec0da55ac3'::uuid,  -- Chandramohan as owner
    'JOIN2025',
    now(),
    now()
) ON CONFLICT DO NOTHING;

-- Step 2: Add all users as members of the workspace
INSERT INTO members (workspace_id, user_id, role, created_at, updated_at)
SELECT 
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
    id,
    CASE 
        WHEN email = 'chandramohan.reddy@pms.com' THEN 'ADMIN'
        WHEN email = 'varun@pms.com' THEN 'ADMIN'
        ELSE 'MEMBER'
    END,
    now(),
    now()
FROM users
ON CONFLICT DO NOTHING;

-- Verify
SELECT 'Workspace created!' as status;
SELECT COUNT(*) as total_members FROM members;
