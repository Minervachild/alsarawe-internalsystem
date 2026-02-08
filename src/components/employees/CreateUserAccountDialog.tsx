import { useState } from 'react';
import { UserPlus, Shield, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CreateUserAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  employeeName: string;
  onSuccess: () => void;
}

export function CreateUserAccountDialog({
  open,
  onOpenChange,
  employeeId,
  employeeName,
  onSuccess,
}: CreateUserAccountDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPasscode, setShowPasscode] = useState(false);
  const [formData, setFormData] = useState({
    username: employeeName,
    passcode: '',
    role: 'user' as 'admin' | 'user' | 'viewer',
    can_edit_columns: false,
    can_view_reports: false,
    can_manage_users: false,
  });
  const { toast } = useToast();

  const generatePasscode = () => {
    // Generate 8-character passcode with guaranteed mix of letters and numbers
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const all = letters + numbers;
    
    // Ensure at least 2 letters and 2 numbers
    const passcode = [
      letters[Math.floor(Math.random() * letters.length)],
      letters[Math.floor(Math.random() * letters.length)],
      numbers[Math.floor(Math.random() * numbers.length)],
      numbers[Math.floor(Math.random() * numbers.length)],
      ...Array.from({ length: 4 }, () => all[Math.floor(Math.random() * all.length)])
    ].sort(() => Math.random() - 0.5).join('');
    
    setFormData((prev) => ({ ...prev, passcode }));
  };

  const getRandomColor = () => {
    const colors = ['#8B4513', '#A0522D', '#CD853F', '#DEB887', '#D2691E', '#B8860B', '#DAA520'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username.trim()) {
      toast({ title: 'Error', description: 'Username is required.', variant: 'destructive' });
      return;
    }
    
    // Stronger passcode validation
    if (formData.passcode.length < 6) {
      toast({ title: 'Error', description: 'Passcode must be at least 6 characters.', variant: 'destructive' });
      return;
    }
    
    const hasLetter = /[A-Z]/.test(formData.passcode.toUpperCase());
    const hasNumber = /\d/.test(formData.passcode);
    if (!hasLetter || !hasNumber) {
      toast({ title: 'Error', description: 'Passcode must contain both letters and numbers.', variant: 'destructive' });
      return;
    }
    
    // Reject repeating characters (e.g., AAAA, 1111)
    const hasRepeatingChars = /(.)\1{2,}/.test(formData.passcode);
    if (hasRepeatingChars) {
      toast({ title: 'Error', description: 'Passcode cannot have 3+ repeating characters.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);

    try {
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
            username: formData.username,
            passcode: formData.passcode.toUpperCase(),
            role: formData.role,
            can_edit_columns: formData.role === 'admin' || formData.can_edit_columns,
            can_view_reports: formData.role === 'admin' || formData.can_view_reports,
            can_manage_users: formData.role === 'admin' || formData.can_manage_users,
            employeeId,
          }),
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to create account');

      toast({ 
        title: 'User account created', 
        description: `Account for ${formData.username} created with passcode: ${result.passcode}` 
      });
      
      onOpenChange(false);
      onSuccess();
      
      // Reset form
      setFormData({
        username: employeeName,
        passcode: '',
        role: 'user',
        can_edit_columns: false,
        can_view_reports: false,
        can_manage_users: false,
      });
    } catch (error: any) {
      console.error('Error creating user account:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create user account.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Create User Account
          </DialogTitle>
          <DialogDescription>
            Create a system account for {employeeName} to access the app.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          {/* Username */}
          <div className="space-y-2">
            <Label>Username *</Label>
            <Input
              value={formData.username}
              onChange={(e) => setFormData((prev) => ({ ...prev, username: e.target.value }))}
              placeholder="Enter username"
              required
            />
          </div>

          {/* Passcode */}
          <div className="space-y-2">
            <Label>Passcode *</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showPasscode ? 'text' : 'password'}
                  value={formData.passcode}
                  onChange={(e) => setFormData((prev) => ({ ...prev, passcode: e.target.value.toUpperCase() }))}
                  placeholder="Enter passcode (min 6 chars)"
                  className="pr-10 font-mono tracking-widest"
                  required
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
            <p className="text-xs text-muted-foreground">
              This will be used to log in to the system.
            </p>
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label>Role</Label>
            <Select
              value={formData.role}
              onValueChange={(value: 'admin' | 'user' | 'viewer') => {
                setFormData((prev) => ({
                  ...prev,
                  role: value,
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
                <SelectItem value="viewer">Viewer - Read-only access</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Permissions */}
          {formData.role !== 'admin' && (
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              <Label className="text-sm font-medium">Additional Permissions</Label>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Edit Columns</p>
                    <p className="text-xs text-muted-foreground">Modify board columns</p>
                  </div>
                  <Switch
                    checked={formData.can_edit_columns}
                    onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, can_edit_columns: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">View Reports</p>
                    <p className="text-xs text-muted-foreground">Access analytics</p>
                  </div>
                  <Switch
                    checked={formData.can_view_reports}
                    onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, can_view_reports: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Manage Users</p>
                    <p className="text-xs text-muted-foreground">Add/remove users</p>
                  </div>
                  <Switch
                    checked={formData.can_manage_users}
                    onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, can_manage_users: checked }))}
                  />
                </div>
              </div>
            </div>
          )}

          {formData.role === 'admin' && (
            <div className="p-4 bg-primary/10 rounded-lg flex items-center gap-3">
              <Shield className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Admin role selected</p>
                <p className="text-xs text-muted-foreground">
                  This user will have full system access.
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Account'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
