import { useState, useEffect } from 'react';
import { Eye, EyeOff, Shield } from 'lucide-react';
// ... keep existing code
  const { toast } = useToast();

  // Sync form data when dialog opens or editingEmployee changes
  useEffect(() => {
    if (open && editingEmployee) {
      setFormData({
        name: editingEmployee.name,
        phone: editingEmployee.phone || '',
        role: editingEmployee.role || '',
        hourly_rate: editingEmployee.hourly_rate,
        off_day_rate: editingEmployee.off_day_rate || 0,
        avatar_color: editingEmployee.avatar_color,
      });
      setCreateAccount(false);
    } else if (open) {
      setFormData({
        name: '',
        phone: '',
        role: '',
        hourly_rate: 0,
        off_day_rate: 0,
        avatar_color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
      });
      setAccountData({
        username: '',
        passcode: '',
        appRole: 'user',
        can_edit_columns: false,
        can_view_reports: false,
        can_manage_users: false,
      });
      setCreateAccount(false);
    }
  }, [open, editingEmployee]);

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
  };

  const generatePasscode = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const all = letters + numbers;
    const passcode = [
      letters[Math.floor(Math.random() * letters.length)],
      letters[Math.floor(Math.random() * letters.length)],
      numbers[Math.floor(Math.random() * numbers.length)],
      numbers[Math.floor(Math.random() * numbers.length)],
      ...Array.from({ length: 4 }, () => all[Math.floor(Math.random() * all.length)])
    ].sort(() => Math.random() - 0.5).join('');
    setAccountData(prev => ({ ...prev, passcode }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (editingEmployee) {
        // Update existing employee
        const { error } = await supabase
          .from('employees')
          .update(formData)
          .eq('id', editingEmployee.id);
        if (error) throw error;
        toast({ title: 'Employee updated' });
      } else {
        // Create new employee
        let profileId: string | null = null;

        if (createAccount) {
          // Validate account data
          const username = accountData.username.trim() || formData.name.trim();
          if (accountData.passcode.length < 6) {
            toast({ title: 'Error', description: 'Passcode must be at least 6 characters.', variant: 'destructive' });
            setIsLoading(false);
            return;
          }
          const hasLetter = /[A-Z]/i.test(accountData.passcode);
          const hasNumber = /\d/.test(accountData.passcode);
          if (!hasLetter || !hasNumber) {
            toast({ title: 'Error', description: 'Passcode must contain both letters and numbers.', variant: 'destructive' });
            setIsLoading(false);
            return;
          }

          // Call edge function to create account server-side (no session disruption)
          const { data: { session } } = await supabase.auth.getSession();
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user-account`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token}`,
              },
              body: JSON.stringify({
                username,
                passcode: accountData.passcode.toUpperCase(),
                role: accountData.appRole,
                can_edit_columns: accountData.appRole === 'admin' || accountData.can_edit_columns,
                can_view_reports: accountData.appRole === 'admin' || accountData.can_view_reports,
                can_manage_users: accountData.appRole === 'admin' || accountData.can_manage_users,
                avatar_color: formData.avatar_color,
              }),
            }
          );

          const result = await response.json();
          if (!response.ok) throw new Error(result.error || 'Failed to create account');

          profileId = result.profileId;
          toast({
            title: 'Account created',
            description: `Passcode: ${result.passcode}`,
          });
        }

        // Insert or update employee
        // When an account was created, the trigger may have auto-created an employee with this profile_id.
        // In that case, update that employee instead of inserting a new one.
        if (profileId) {
          const { data: existingEmp } = await supabase
            .from('employees')
            .select('id')
            .eq('profile_id', profileId)
            .maybeSingle();

          if (existingEmp) {
            // Update the trigger-created employee with the form data
            const { error } = await supabase
              .from('employees')
              .update(formData)
              .eq('id', existingEmp.id);
            if (error) throw error;
          } else {
            const { error } = await supabase
              .from('employees')
              .insert({ ...formData, profile_id: profileId });
            if (error) throw error;
          }
        } else {
          const { error } = await supabase
            .from('employees')
            .insert(formData);
          if (error) throw error;
        }
        toast({ title: 'Employee added' });
      }

      handleOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isEditing = !!editingEmployee;
  const alreadyHasAccount = editingEmployee?.profile_id;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">
            {isEditing ? 'Edit Employee' : 'Add Employee'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Basic Info */}
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Full name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Job Title</Label>
            <Input
              value={formData.role}
              onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
              placeholder="e.g. Barista, Manager"
            />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="+966 5XX XXX XXXX"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Hourly Rate (﷼)</Label>
              <Input
                type="number"
                value={formData.hourly_rate}
                onChange={(e) => setFormData(prev => ({ ...prev, hourly_rate: parseFloat(e.target.value) || 0 }))}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Off-Day Rate (﷼)</Label>
              <Input
                type="number"
                value={formData.off_day_rate}
                onChange={(e) => setFormData(prev => ({ ...prev, off_day_rate: parseFloat(e.target.value) || 0 }))}
                placeholder="0"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Avatar Color</Label>
            <Input
              type="color"
              value={formData.avatar_color}
              onChange={(e) => setFormData(prev => ({ ...prev, avatar_color: e.target.value }))}
              className="h-10 p-1"
            />
          </div>

          {/* Account Creation Section - only for new employees without accounts */}
          {!isEditing && (
            <div className="border-t border-border/50 pt-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium">Create System Account</p>
                  <p className="text-xs text-muted-foreground">
                    Allow this employee to log in to the app
                  </p>
                </div>
                <Switch
                  checked={createAccount}
                  onCheckedChange={setCreateAccount}
                />
              </div>

              {createAccount && (
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                  {/* Username */}
                  <div className="space-y-2">
                    <Label>Username</Label>
                    <Input
                      value={accountData.username}
                      onChange={(e) => setAccountData(prev => ({ ...prev, username: e.target.value }))}
                      placeholder={formData.name || 'Enter username'}
                    />
                    <p className="text-xs text-muted-foreground">Leave empty to use employee name</p>
                  </div>

                  {/* Passcode */}
                  <div className="space-y-2">
                    <Label>Passcode *</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          type={showPasscode ? 'text' : 'password'}
                          value={accountData.passcode}
                          onChange={(e) => setAccountData(prev => ({ ...prev, passcode: e.target.value.toUpperCase() }))}
                          placeholder="Min 6 chars (letters + numbers)"
                          className="pr-10 font-mono tracking-widest"
                          required={createAccount}
                          minLength={6}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                          onClick={() => setShowPasscode(!showPasscode)}
                        >
                          {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                      <Button type="button" variant="outline" onClick={generatePasscode}>
                        Generate
                      </Button>
                    </div>
                  </div>

                  {/* Role */}
                  <div className="space-y-2">
                    <Label>System Role</Label>
                    <Select
                      value={accountData.appRole}
                      onValueChange={(value: 'admin' | 'user' | 'viewer') => {
                        setAccountData(prev => ({
                          ...prev,
                          appRole: value,
                          can_edit_columns: value === 'admin',
                          can_view_reports: value === 'admin',
                          can_manage_users: value === 'admin',
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-primary" />
                            Admin - Full access
                          </div>
                        </SelectItem>
                        <SelectItem value="user">User - Standard access</SelectItem>
                        <SelectItem value="viewer">Viewer - Read-only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Permissions for non-admin */}
                  {accountData.appRole !== 'admin' && (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Permissions</Label>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm">Edit Columns</p>
                          <Switch
                            checked={accountData.can_edit_columns}
                            onCheckedChange={(c) => setAccountData(prev => ({ ...prev, can_edit_columns: c }))}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-sm">View Reports</p>
                          <Switch
                            checked={accountData.can_view_reports}
                            onCheckedChange={(c) => setAccountData(prev => ({ ...prev, can_view_reports: c }))}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-sm">Manage Users</p>
                          <Switch
                            checked={accountData.can_manage_users}
                            onCheckedChange={(c) => setAccountData(prev => ({ ...prev, can_manage_users: c }))}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {accountData.appRole === 'admin' && (
                    <div className="p-3 bg-primary/10 rounded-lg flex items-center gap-3">
                      <Shield className="w-5 h-5 text-primary" />
                      <p className="text-xs text-muted-foreground">Full system access granted.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : isEditing ? 'Update Employee' : createAccount ? 'Add Employee & Create Account' : 'Add Employee'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
