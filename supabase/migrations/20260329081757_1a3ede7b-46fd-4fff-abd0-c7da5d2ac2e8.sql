-- Delete duplicates: Fadl 1 and Shobo P

-- Remove branch assignments for duplicates
DELETE FROM branch_assignments WHERE employee_id IN ('0adb1d74-2c1c-4c3c-be15-4445357b9610', '259d8656-a1d9-407b-ac11-2d5397c8dd4e');

-- Remove page access for duplicates
DELETE FROM user_page_access WHERE user_id IN ('00748fb6-9584-433f-95da-5f2111f618bf', '7577f505-cd54-4800-8466-5babbd8a8a5a');

-- Remove user roles for duplicates
DELETE FROM user_roles WHERE user_id IN ('00748fb6-9584-433f-95da-5f2111f618bf', '7577f505-cd54-4800-8466-5babbd8a8a5a');

-- Remove employee records for duplicates
DELETE FROM employees WHERE id IN ('0adb1d74-2c1c-4c3c-be15-4445357b9610', '259d8656-a1d9-407b-ac11-2d5397c8dd4e');

-- Remove profile records for duplicates
DELETE FROM profiles WHERE id IN ('d79d7e9f-17a4-401a-ab59-64229676d6e7', '7f621b8d-6c95-4962-a504-3db946fd8758');

-- Activate all remaining inactive accounts
UPDATE profiles SET is_active = true WHERE is_active = false;