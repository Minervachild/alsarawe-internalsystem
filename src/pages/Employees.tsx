import { useState, useEffect } from 'react';
import { Plus, Search, Phone, MoreHorizontal, Pencil, Trash2, UserPlus, UserX, Shield, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AppLayout } from '@/components/layout/AppLayout';
import { AddEmployeeDialog } from '@/components/employees/AddEmployeeDialog';
import { CreateUserAccountDialog } from '@/components/employees/CreateUserAccountDialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface Employee {
  id: string;
  name: string;
  phone: string | null;
  role: string | null;
  hourly_rate: number;
  off_day_rate: number | null;
  avatar_color: string;
  orders_added: number;
  orders_finished: number;
  profile_id: string | null;
}

interface LinkedProfile {
  id: string;
  username: string;
  user_id: string;
}

interface LinkedRole {
  role: 'admin' | 'user' | 'viewer';
}

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [profiles, setProfiles] = useState<Record<string, LinkedProfile>>({});
  const [roles, setRoles] = useState<Record<string, LinkedRole>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [createAccountDialogOpen, setCreateAccountDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [employeeToRevoke, setEmployeeToRevoke] = useState<Employee | null>(null);
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setEmployees(data || []);

      // Fetch linked profiles
      const profileIds = (data || [])
        .filter((e: Employee) => e.profile_id)
        .map((e: Employee) => e.profile_id);
      
      if (profileIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles_public')
          .select('id, username, user_id')
          .in('id', profileIds);

        const profilesMap: Record<string, LinkedProfile> = {};
        (profilesData || []).forEach((p: any) => {
          profilesMap[p.id] = p;
        });
        setProfiles(profilesMap);

        // Fetch roles for these profiles
        const userIds = (profilesData || []).map((p: any) => p.user_id).filter(Boolean);
        if (userIds.length > 0) {
          const { data: rolesData } = await supabase
            .from('user_roles')
            .select('user_id, role')
            .in('user_id', userIds);

          const rolesMap: Record<string, LinkedRole> = {};
          (rolesData || []).forEach((r: any) => {
            rolesMap[r.user_id] = { role: r.role };
          });
          setRoles(rolesMap);
        }
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch employees.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('employees').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Employee removed' });
      fetchEmployees();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleRevokeAccess = async () => {
    if (!employeeToRevoke?.profile_id) return;

    try {
      const profile = profiles[employeeToRevoke.profile_id];
      if (!profile) throw new Error('Profile not found');

      const { error: unlinkError } = await supabase
        .from('employees')
        .update({ profile_id: null })
        .eq('id', employeeToRevoke.id);
      if (unlinkError) throw unlinkError;

      const { error: deleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', employeeToRevoke.profile_id);
      if (deleteError) throw deleteError;

      toast({ title: 'Access revoked', description: `${employeeToRevoke.name}'s account has been removed.` });
      setRevokeDialogOpen(false);
      setEmployeeToRevoke(null);
      fetchEmployees();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to revoke access.',
        variant: 'destructive',
      });
    }
  };

  const getEmployeeProfile = (employee: Employee) => {
    if (!employee.profile_id) return null;
    return profiles[employee.profile_id] || null;
  };

  const getEmployeeRole = (employee: Employee) => {
    const profile = getEmployeeProfile(employee);
    if (!profile?.user_id) return null;
    return roles[profile.user_id]?.role || null;
  };

  const getRoleBadgeVariant = (role: string | null) => {
    switch (role) {
      case 'admin': return 'default';
      case 'user': return 'secondary';
      case 'viewer': return 'outline';
      default: return 'secondary';
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.role?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Employees</h1>
            <p className="text-muted-foreground">Manage your team and their system access</p>
          </div>
          {isAdmin && (
            <Button onClick={() => {
              setEditingEmployee(null);
              setDialogOpen(true);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Employee
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search employees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Employees Grid */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : filteredEmployees.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No employees found. {isAdmin ? 'Add your first team member!' : ''}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEmployees.map((employee) => {
              const hasAccount = !!employee.profile_id;
              const profile = getEmployeeProfile(employee);
              const role = getEmployeeRole(employee);
              
              return (
                <div key={employee.id} className="bg-card rounded-xl border border-border/50 p-4 hover-lift">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center text-primary-foreground font-semibold relative"
                        style={{ backgroundColor: employee.avatar_color }}
                      >
                        {employee.name.slice(0, 2).toUpperCase()}
                        {hasAccount && (
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                            <Shield className="w-3 h-3 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{employee.name}</h3>
                        {employee.role && (
                          <p className="text-sm text-muted-foreground">{employee.role}</p>
                        )}
                      </div>
                    </div>
                    {isAdmin && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover">
                          <DropdownMenuItem onClick={() => {
                            setEditingEmployee(employee);
                            setDialogOpen(true);
                          }}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit Employee
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator />
                          {!hasAccount ? (
                            <DropdownMenuItem onClick={() => {
                              setSelectedEmployee(employee);
                              setCreateAccountDialogOpen(true);
                            }}>
                              <UserPlus className="w-4 h-4 mr-2" />
                              Create User Account
                            </DropdownMenuItem>
                          ) : (
                            <>
                              <DropdownMenuItem disabled className="text-muted-foreground">
                                <Shield className="w-4 h-4 mr-2" />
                                Account: {profile?.username}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setEmployeeToRevoke(employee);
                                  setRevokeDialogOpen(true);
                                }}
                                className="text-destructive"
                              >
                                <UserX className="w-4 h-4 mr-2" />
                                Revoke Access
                              </DropdownMenuItem>
                            </>
                          )}
                          
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDelete(employee.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Employee
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  {/* Account Status */}
                  {hasAccount && role && (
                    <div className="mt-3 flex items-center gap-2">
                      <Badge variant={getRoleBadgeVariant(role)} className="text-xs">
                        {role}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        System access enabled
                      </span>
                    </div>
                  )}

                  <div className="mt-4 space-y-2">
                    {employee.phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="w-4 h-4" />
                        <span>{employee.phone}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-border/50 grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-lg font-semibold text-foreground">{employee.orders_added}</p>
                      <p className="text-xs text-muted-foreground">Orders Added</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-foreground">{employee.orders_finished}</p>
                      <p className="text-xs text-muted-foreground">Completed</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Employee Dialog */}
      <AddEmployeeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingEmployee={editingEmployee}
        onSuccess={fetchEmployees}
      />

      {/* Create User Account Dialog (for existing employees) */}
      {selectedEmployee && (
        <CreateUserAccountDialog
          open={createAccountDialogOpen}
          onOpenChange={setCreateAccountDialogOpen}
          employeeId={selectedEmployee.id}
          employeeName={selectedEmployee.name}
          onSuccess={fetchEmployees}
        />
      )}

      {/* Revoke Access Confirmation */}
      <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke User Access</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke system access for {employeeToRevoke?.name}? 
              This will delete their user account and they will no longer be able to log in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevokeAccess} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Revoke Access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
