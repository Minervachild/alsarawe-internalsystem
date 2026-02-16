import { useState, useEffect } from 'react';
import { Shield, KeyRound, Copy, MoreHorizontal, Trash2, Eye, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { PageAccessDialog } from '@/components/users/PageAccessDialog';

interface User {
  id: string;
  user_id: string;
  username: string;
  email: string | null;
  avatar_color: string;
  can_edit_columns: boolean;
  can_view_reports: boolean;
  can_manage_users: boolean;
  is_active: boolean;
  role?: 'admin' | 'user' | 'viewer';
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sensitiveData, setSensitiveData] = useState<{ passcode: string; api_key: string | null; isNewApiKey?: boolean } | null>(null);
  const [sensitiveDialogUser, setSensitiveDialogUser] = useState<string | null>(null);
  const [pageAccessDialogOpen, setPageAccessDialogOpen] = useState(false);
  const [pageAccessUser, setPageAccessUser] = useState<User | null>(null);
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles_public')
        .select('*')
        .order('username');
      
      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      const usersWithRoles = (profiles || []).map((profile: any) => {
        const userRole = roles?.find((r: any) => r.user_id === profile.user_id);
        return {
          ...profile,
          role: userRole?.role || 'user',
        };
      });

      setUsers(usersWithRoles);
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to fetch users.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const viewSensitiveData = async (userId: string, username: string) => {
    if (!isAdmin) return;
    try {
      const { data, error } = await supabase.rpc('get_sensitive_profile_data', { _profile_id: userId });
      if (error) throw error;
      setSensitiveData(data as any);
      setSensitiveDialogUser(username);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const closeSensitiveDialog = () => {
    setSensitiveData(null);
    setSensitiveDialogUser(null);
  };

  const updatePermission = async (userId: string, field: string, value: boolean) => {
    if (!isAdmin) {
      toast({ title: 'Access denied', description: 'Only admins can modify permissions.', variant: 'destructive' });
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ [field]: value })
        .eq('id', userId);

      if (error) throw error;
      toast({ title: 'Permission updated' });
      fetchUsers();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const generateApiKey = async (userId: string, username: string) => {
    if (!isAdmin) return;

    const apiKey = `sk_${Array.from({ length: 64 }, () => 
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 62)]
    ).join('')}`;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ api_key: apiKey })
        .eq('id', userId);

      if (error) throw error;
      
      // Show the key once in dialog, then immediately clear it from DB
      setSensitiveData({ passcode: '', api_key: apiKey, isNewApiKey: true });
      setSensitiveDialogUser(username);
      
      // Clear the API key from the database after showing it
      await supabase
        .from('profiles')
        .update({ api_key: null })
        .eq('id', userId);
        
      toast({ title: 'API key generated', description: 'Copy it now — it won\'t be shown again.' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const revokeApiKey = async (userId: string) => {
    if (!isAdmin) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ api_key: null })
        .eq('id', userId);

      if (error) throw error;
      toast({ title: 'API key revoked' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: `${label} copied to clipboard.` });
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'default';
      case 'user': return 'secondary';
      case 'viewer': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">User Management</h1>
            <p className="text-muted-foreground">Control access and permissions</p>
          </div>
        </div>

        {!isAdmin && (
          <div className="mb-6 p-4 bg-warning/10 border border-warning/30 rounded-lg flex items-center gap-3">
            <Shield className="w-5 h-5 text-warning" />
            <span className="text-sm text-warning">
              Only administrators can modify user permissions.
            </span>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : (
          <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">User</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Role</th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-muted-foreground">Active</th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-muted-foreground">Edit Columns</th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-muted-foreground">View Reports</th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-muted-foreground">Manage Users</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-t border-border/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-primary-foreground"
                            style={{ backgroundColor: user.avatar_color }}
                          >
                            {user.username.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">{user.username}</p>
                            {user.email && <p className="text-xs text-muted-foreground">{user.email}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={getRoleBadgeVariant(user.role || 'user')}>
                          {user.role || 'user'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Switch
                          checked={user.is_active}
                          onCheckedChange={(checked) => updatePermission(user.id, 'is_active', checked)}
                          disabled={!isAdmin}
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Switch
                          checked={user.can_edit_columns}
                          onCheckedChange={(checked) => updatePermission(user.id, 'can_edit_columns', checked)}
                          disabled={!isAdmin || user.role === 'admin'}
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Switch
                          checked={user.can_view_reports}
                          onCheckedChange={(checked) => updatePermission(user.id, 'can_view_reports', checked)}
                          disabled={!isAdmin || user.role === 'admin'}
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Switch
                          checked={user.can_manage_users}
                          onCheckedChange={(checked) => updatePermission(user.id, 'can_manage_users', checked)}
                          disabled={!isAdmin || user.role === 'admin'}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isAdmin && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover">
                              <DropdownMenuItem onClick={() => viewSensitiveData(user.id, user.username)}>
                                <Eye className="w-4 h-4 mr-2" />
                                View Credentials
                              </DropdownMenuItem>
                              {user.role !== 'admin' && (
                                <DropdownMenuItem onClick={() => {
                                  setPageAccessUser(user);
                                  setPageAccessDialogOpen(true);
                                }}>
                                  <LayoutGrid className="w-4 h-4 mr-2" />
                                  Page Access
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => generateApiKey(user.id, user.username)}>
                                <KeyRound className="w-4 h-4 mr-2" />
                                Generate API Key
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!sensitiveData} onOpenChange={closeSensitiveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              {sensitiveData?.isNewApiKey ? 'New API Key' : 'Credentials'} for {sensitiveDialogUser}
            </DialogTitle>
            <DialogDescription>
              {sensitiveData?.isNewApiKey 
                ? '⚠️ Copy this API key now. It will never be shown again.'
                : 'This is a one-time view. The data will be hidden when you close this dialog.'}
            </DialogDescription>
          </DialogHeader>
          {sensitiveData && (
            <div className="space-y-4">
              {!sensitiveData.isNewApiKey && (
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground mb-1">Passcode</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-sm font-mono font-bold tracking-widest">
                      {sensitiveData.passcode}
                    </code>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copyToClipboard(sensitiveData.passcode, 'Passcode')}>
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
              {sensitiveData.api_key && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-xs text-destructive font-medium mb-1">
                    {sensitiveData.isNewApiKey ? 'API Key (view once)' : 'API Key'}
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs font-mono break-all">
                      {sensitiveData.api_key}
                    </code>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copyToClipboard(sensitiveData.api_key!, 'API Key')}>
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Page Access Dialog */}
      {pageAccessUser && (
        <PageAccessDialog
          open={pageAccessDialogOpen}
          onOpenChange={setPageAccessDialogOpen}
          userId={pageAccessUser.user_id}
          username={pageAccessUser.username}
          onSuccess={fetchUsers}
        />
      )}
    </AppLayout>
  );
}
