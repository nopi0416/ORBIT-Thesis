-- ============================================================================
-- USER AND ORGANIZATION DATA INSERTS
-- ============================================================================
-- This script creates:
-- 1. Nine users (3 for each approval level: L1, L2, L3)
-- 2. Hierarchical organization structure (2 parent + 4 children + 4 grandchildren)
-- ============================================================================

-- ============================================================================
-- STEP 1: INSERT USERS (3 per approval level)
-- ============================================================================

-- Level 1 (L1) Approvers
INSERT INTO public.tblusers (user_id, employee_id, first_name, last_name, email, department, status, created_at, updated_at)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440001'::uuid, 'EMP001', 'John', 'Smith', 'john.smith@company.com', 'Finance', 'Active', NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440002'::uuid, 'EMP002', 'Sarah', 'Johnson', 'sarah.johnson@company.com', 'Finance', 'Active', NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440003'::uuid, 'EMP003', 'Michael', 'Brown', 'michael.brown@company.com', 'Finance', 'Active', NOW(), NOW());

-- Level 2 (L2) Approvers
INSERT INTO public.tblusers (user_id, employee_id, first_name, last_name, email, department, status, created_at, updated_at)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440004'::uuid, 'EMP004', 'Emily', 'Davis', 'emily.davis@company.com', 'Operations', 'Active', NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440005'::uuid, 'EMP005', 'Robert', 'Wilson', 'robert.wilson@company.com', 'Operations', 'Active', NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440006'::uuid, 'EMP006', 'Jennifer', 'Martinez', 'jennifer.martinez@company.com', 'Operations', 'Active', NOW(), NOW());

-- Level 3 (L3) Approvers
INSERT INTO public.tblusers (user_id, employee_id, first_name, last_name, email, department, status, created_at, updated_at)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440007'::uuid, 'EMP007', 'David', 'Anderson', 'david.anderson@company.com', 'Executive', 'Active', NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440008'::uuid, 'EMP008', 'Lisa', 'Taylor', 'lisa.taylor@company.com', 'Executive', 'Active', NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440009'::uuid, 'EMP009', 'James', 'Thomas', 'james.thomas@company.com', 'Executive', 'Active', NOW(), NOW());

-- Payroll Users
INSERT INTO public.tblusers (user_id, employee_id, first_name, last_name, email, department, status, created_at, updated_at)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440010'::uuid, 'EMP010', 'Amanda', 'Garcia', 'amanda.garcia@company.com', 'Payroll', 'Active', NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440011'::uuid, 'EMP011', 'Christopher', 'Lee', 'christopher.lee@company.com', 'Payroll', 'Active', NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440012'::uuid, 'EMP012', 'Rachel', 'White', 'rachel.white@company.com', 'Payroll', 'Active', NOW(), NOW());

-- ============================================================================
-- STEP 2: ASSIGN ROLES TO USERS
-- ============================================================================

-- Assign L1_APPROVER role (502094b0-3511-4839-9c26-ced058e3fa96)
INSERT INTO public.tbluserroles (user_id, role_id, is_active, assigned_at, updated_at)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440001'::uuid, '502094b0-3511-4839-9c26-ced058e3fa96'::uuid, TRUE, NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440002'::uuid, '502094b0-3511-4839-9c26-ced058e3fa96'::uuid, TRUE, NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440003'::uuid, '502094b0-3511-4839-9c26-ced058e3fa96'::uuid, TRUE, NOW(), NOW());

-- Assign L2_APPROVER role (127b09d1-7366-4225-aef9-c10aaa5f61a3)
INSERT INTO public.tbluserroles (user_id, role_id, is_active, assigned_at, updated_at)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440004'::uuid, '127b09d1-7366-4225-aef9-c10aaa5f61a3'::uuid, TRUE, NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440005'::uuid, '127b09d1-7366-4225-aef9-c10aaa5f61a3'::uuid, TRUE, NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440006'::uuid, '127b09d1-7366-4225-aef9-c10aaa5f61a3'::uuid, TRUE, NOW(), NOW());

-- Assign L3_APPROVER role (c0940e24-4506-4322-98f1-3c7646c1519f)
INSERT INTO public.tbluserroles (user_id, role_id, is_active, assigned_at, updated_at)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440007'::uuid, 'c0940e24-4506-4322-98f1-3c7646c1519f'::uuid, TRUE, NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440008'::uuid, 'c0940e24-4506-4322-98f1-3c7646c1519f'::uuid, TRUE, NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440009'::uuid, 'c0940e24-4506-4322-98f1-3c7646c1519f'::uuid, TRUE, NOW(), NOW());

-- Assign PAYROLL role (f1879124-4400-4fd6-9dbf-f04cd526cb09)
INSERT INTO public.tbluserroles (user_id, role_id, is_active, assigned_at, updated_at)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440010'::uuid, 'f1879124-4400-4fd6-9dbf-f04cd526cb09'::uuid, TRUE, NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440011'::uuid, 'f1879124-4400-4fd6-9dbf-f04cd526cb09'::uuid, TRUE, NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440012'::uuid, 'f1879124-4400-4fd6-9dbf-f04cd526cb09'::uuid, TRUE, NOW(), NOW());

-- ============================================================================
-- STEP 3: INSERT ORGANIZATIONS (Hierarchical Structure)
-- ============================================================================

-- PARENT ORGANIZATIONS (Level 0)
INSERT INTO public.tblorganization (org_id, org_name, parent_org_id, geo, location, created_at)
VALUES 
  ('10000000-0000-0000-0000-000000000001'::uuid, 'Asia Pacific Region', NULL, 'Asia', 'Regional', NOW()),
  ('10000000-0000-0000-0000-000000000002'::uuid, 'Europe Region', NULL, 'Europe', 'Regional', NOW());

-- CHILDREN ORGANIZATIONS (Level 1 - 2 per parent)
-- Children of Asia Pacific Region
INSERT INTO public.tblorganization (org_id, org_name, parent_org_id, geo, location, created_at)
VALUES 
  ('20000000-0000-0000-0000-000000000001'::uuid, 'Philippines Operations', '10000000-0000-0000-0000-000000000001'::uuid, 'Philippines', 'Manila', NOW()),
  ('20000000-0000-0000-0000-000000000002'::uuid, 'Singapore Operations', '10000000-0000-0000-0000-000000000001'::uuid, 'Singapore', 'Singapore', NOW());

-- Children of Europe Region
INSERT INTO public.tblorganization (org_id, org_name, parent_org_id, geo, location, created_at)
VALUES 
  ('20000000-0000-0000-0000-000000000003'::uuid, 'UK Operations', '10000000-0000-0000-0000-000000000002'::uuid, 'United Kingdom', 'London', NOW()),
  ('20000000-0000-0000-0000-000000000004'::uuid, 'Germany Operations', '10000000-0000-0000-0000-000000000002'::uuid, 'Germany', 'Berlin', NOW());

-- GRANDCHILDREN ORGANIZATIONS (Level 2 - 2 per child)
-- Grandchildren of Philippines Operations
INSERT INTO public.tblorganization (org_id, org_name, parent_org_id, geo, location, created_at)
VALUES 
  ('30000000-0000-0000-0000-000000000001'::uuid, 'Manila IT Department', '20000000-0000-0000-0000-000000000001'::uuid, 'Philippines', 'Manila', NOW()),
  ('30000000-0000-0000-0000-000000000002'::uuid, 'Manila HR Department', '20000000-0000-0000-0000-000000000001'::uuid, 'Philippines', 'Manila', NOW());

-- Grandchildren of Singapore Operations
INSERT INTO public.tblorganization (org_id, org_name, parent_org_id, geo, location, created_at)
VALUES 
  ('30000000-0000-0000-0000-000000000003'::uuid, 'Singapore Finance Department', '20000000-0000-0000-0000-000000000002'::uuid, 'Singapore', 'Singapore', NOW()),
  ('30000000-0000-0000-0000-000000000004'::uuid, 'Singapore Operations Department', '20000000-0000-0000-0000-000000000002'::uuid, 'Singapore', 'Singapore', NOW());

-- Grandchildren of UK Operations
INSERT INTO public.tblorganization (org_id, org_name, parent_org_id, geo, location, created_at)
VALUES 
  ('30000000-0000-0000-0000-000000000005'::uuid, 'London IT Department', '20000000-0000-0000-0000-000000000003'::uuid, 'United Kingdom', 'London', NOW()),
  ('30000000-0000-0000-0000-000000000006'::uuid, 'London Finance Department', '20000000-0000-0000-0000-000000000003'::uuid, 'United Kingdom', 'London', NOW());

-- Grandchildren of Germany Operations
INSERT INTO public.tblorganization (org_id, org_name, parent_org_id, geo, location, created_at)
VALUES 
  ('30000000-0000-0000-0000-000000000007'::uuid, 'Berlin HR Department', '20000000-0000-0000-0000-000000000004'::uuid, 'Germany', 'Berlin', NOW()),
  ('30000000-0000-0000-0000-000000000008'::uuid, 'Berlin Operations Department', '20000000-0000-0000-0000-000000000004'::uuid, 'Germany', 'Berlin', NOW());

-- ============================================================================
-- VERIFICATION QUERIES (Run these to verify data was inserted correctly)
-- ============================================================================

-- Verify users were created
-- SELECT user_id, email, first_name, last_name FROM public.tblusers WHERE email LIKE '%@company.com' ORDER BY email;

-- Verify user roles were assigned
-- SELECT u.email, r.role_name, ur.is_active FROM public.tblusers u
-- INNER JOIN public.tbluserroles ur ON u.user_id = ur.user_id
-- INNER JOIN public.tblroles r ON ur.role_id = r.role_id
-- ORDER BY r.role_name, u.first_name;

-- Verify organization hierarchy
-- SELECT org_id, org_name, parent_org_id, geo, location FROM public.tblorganization ORDER BY org_name;

-- Verify organization tree structure
-- WITH RECURSIVE org_tree AS (
--   SELECT org_id, org_name, parent_org_id, 1 as level FROM public.tblorganization WHERE parent_org_id IS NULL
--   UNION ALL
--   SELECT o.org_id, o.org_name, o.parent_org_id, ot.level + 1 FROM public.tblorganization o
--   INNER JOIN org_tree ot ON o.parent_org_id = ot.org_id
-- )
-- SELECT REPEAT('  ', level - 1) || org_name as organization_hierarchy FROM org_tree ORDER BY org_id;
