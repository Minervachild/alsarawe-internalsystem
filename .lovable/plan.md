

## Fix: Admin Can't Add Clients/Employees + Role-Based Navigation

### Root Cause Analysis

There are **two critical bugs** preventing the admin from adding employees and clients:

**Bug 1: `supabase.auth.signUp()` logs out the admin**
When creating an employee with a system account (or creating an account for an existing employee), the code calls `supabase.auth.signUp()` directly from the client. This **replaces the current admin session** with the newly created user's session. After this happens, the admin is no longer logged in, and `isAdmin` becomes `false` -- hiding all admin buttons and blocking all write operations.

**Bug 2: Duplicate employee creation from database trigger**
A trigger (`on_profile_created_create_employee`) automatically creates an employee record when a new profile is inserted. But the `AddEmployeeDialog` also inserts an employee manually. This results in **duplicate employee records** when creating an employee with an account.

### What Will Be Fixed

1. **Move user account creation to a backend function** -- An edge function will handle `signUp` server-side so the admin's session is never disrupted.

2. **Fix duplicate employee creation** -- The edge function will create the auth user, profile, and role, then return the profile ID. The client will then insert a single employee record linked to that profile. The trigger will be updated to skip creation if the employee is about to be manually linked.

3. **Hide Employees page from non-admin users** -- Non-admin users will not see the Employees workspace card on the Dashboard. The route itself will redirect non-admins away.

4. **Ensure clients can be added** -- Since the signUp bug was corrupting the admin session, fixing Bug 1 will also fix client additions.

---

### Technical Plan

#### Step 1: Create Edge Function for Account Creation

Create `supabase/functions/create-user-account/index.ts` that:
- Accepts: `username`, `passcode`, `role`, permissions, optional `employeeId`
- Validates the caller is an admin (checks their JWT against `user_roles`)
- Uses Supabase Admin client to create the auth user (no session change)
- Creates the profile and role records server-side
- If `employeeId` provided, links the profile to the employee
- Returns the created profile ID and generated passcode

#### Step 2: Update AddEmployeeDialog

Modify `src/components/employees/AddEmployeeDialog.tsx`:
- Replace direct `supabase.auth.signUp()` call with a fetch to the new edge function
- Remove duplicate logic for profile/role creation
- The flow becomes: call edge function (returns profileId) -> insert employee with that profileId

#### Step 3: Update CreateUserAccountDialog

Modify `src/components/employees/CreateUserAccountDialog.tsx`:
- Replace direct `supabase.auth.signUp()` call with a fetch to the edge function
- Pass the `employeeId` so the edge function handles the linking

#### Step 4: Role-Based Page Visibility

Modify `src/pages/Dashboard.tsx`:
- Filter the workspaces array to hide "Employees" and "Users" cards for non-admin users

Modify `src/App.tsx`:
- Create an `AdminRoute` wrapper component that redirects non-admins to `/dashboard`
- Wrap `/employees` and `/users` routes with `AdminRoute`

#### Step 5: Fix the Database Trigger

Update the `handle_new_profile_employee` trigger function to check if an employee with the same `profile_id` was already inserted (race condition guard), preventing duplicates.

