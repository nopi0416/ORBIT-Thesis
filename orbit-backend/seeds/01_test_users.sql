-- Test User Seeds for ORBIT Authentication System
-- Run this in Supabase SQL Editor to create test users

-- Test User 1: Regular User (First Time Login)
INSERT INTO tblusers (
  email,
  password,
  password_hash,
  first_name,
  last_name,
  employee_id,
  department,
  status,
  is_first_login,
  role,
  is_active,
  created_at,
  updated_at
) VALUES (
  'testuser@example.com',
  'TestPassword123!', -- For demo purposes
  'TestPassword123!', -- Same as password for now (in production, use bcrypt hash)
  'John',
  'Doe',
  'EMP001',
  'Engineering',
  'active',
  true,
  'requestor',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
) ON CONFLICT (email) DO NOTHING;

-- Test User 2: Another User (Already Set Up)
INSERT INTO tblusers (
  email,
  password,
  password_hash,
  first_name,
  last_name,
  employee_id,
  department,
  status,
  is_first_login,
  role,
  is_active,
  created_at,
  updated_at
) VALUES (
  'jane.smith@example.com',
  'JanePassword123!',
  'JanePassword123!',
  'Jane',
  'Smith',
  'EMP002',
  'Marketing',
  'active',
  false,
  'requestor',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
) ON CONFLICT (email) DO NOTHING;

-- Test Admin User (if you have tbladminusers table)
-- INSERT INTO tbladminusers (
--   email,
--   password_hash,
--   first_name,
--   last_name,
--   role,
--   is_active,
--   created_at,
--   updated_at
-- ) VALUES (
--   'admin@example.com',
--   'AdminPassword123!',
--   'Admin',
--   'User',
--   'admin',
--   true,
--   CURRENT_TIMESTAMP,
--   CURRENT_TIMESTAMP
-- ) ON CONFLICT (email) DO NOTHING;

-- Verify the insertions
SELECT id, email, first_name, last_name, is_first_login, created_at FROM tblusers WHERE email LIKE '%@example.com%' ORDER BY created_at DESC;
