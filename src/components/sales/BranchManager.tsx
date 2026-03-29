import { useState, useEffect } from 'react';
import { Plus, Trash2, UserPlus, X, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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

interface Branch {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  name: string;
}

interface BranchAssignment {
  id: string;
  branch_id: string;
  employee_id: string;
  employees?: { name: string };
}

export function BranchManager() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assignments, setAssignments] = useState<BranchAssignment[]>([]);
  const [newBranchName, setNewBranchName] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [assignDialogBranch, setAssignDialogBranch] = useState<Branch | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [branchesRes, employeesRes, assignmentsRes] = await Promise.all([
      supabase.from('branches').select('*').order('name'),
      supabase.from('employees_public').select('id, name').order('name'),
      supabase.from('branch_assignments').select('*, employees(name)'),
    ]);

    setBranches(branchesRes.data || []);
    setEmployees(employeesRes.data || []);
    setAssignments((assignmentsRes.data as any[]) || []);
  };

  const handleAddBranch = async () => {
    if (!newBranchName.trim()) return;

    try {
      const { data, error } = await supabase
        .from('branches')
        .insert({ name: newBranchName.trim() })
        .select()
        .single();

      if (error) throw error;

      setBranches((prev) => [...prev, data]);
      setNewBranchName('');
      setIsAddDialogOpen(false);
      toast({ title: `Branch "${data.name}" added` });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteBranch = async (branchId: string) => {
    try {
      const { error } = await supabase.from('branches').delete().eq('id', branchId);
      if (error) throw error;

      setBranches((prev) => prev.filter((b) => b.id !== branchId));
      setAssignments((prev) => prev.filter((a) => a.branch_id !== branchId));
      toast({ title: 'Branch deleted' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleAssignEmployee = async () => {
    if (!assignDialogBranch || !selectedEmployeeId) return;

    try {
      const { data, error } = await supabase
        .from('branch_assignments')
        .insert({
          branch_id: assignDialogBranch.id,
          employee_id: selectedEmployeeId,
        })
        .select('*, employees(name)')
        .single();

      if (error) throw error;

      setAssignments((prev) => [...prev, data as any]);
      setSelectedEmployeeId('');
      setAssignDialogBranch(null);
      toast({ title: 'Employee assigned to branch' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    try {
      const { error } = await supabase.from('branch_assignments').delete().eq('id', assignmentId);
      if (error) throw error;

      setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
      toast({ title: 'Assignment removed' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const getAssignmentsForBranch = (branchId: string) =>
    assignments.filter((a) => a.branch_id === branchId);

  const getUnassignedEmployees = (branchId: string) => {
    const assigned = assignments
      .filter((a) => a.branch_id === branchId)
      .map((a) => a.employee_id);
    return employees.filter((e) => !assigned.includes(e.id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Branches</h3>
        <Button size="sm" className="gap-1" onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="w-4 h-4" />
          Add Branch
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {branches.map((branch) => (
          <div key={branch.id} className="card-premium p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                <span className="font-medium">{branch.name}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setAssignDialogBranch(branch)}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-destructive"
                  onClick={() => handleDeleteBranch(branch.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              {getAssignmentsForBranch(branch.id).length === 0 ? (
                <p className="text-xs text-muted-foreground">No employees assigned</p>
              ) : (
                getAssignmentsForBranch(branch.id).map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between bg-muted/50 rounded-lg px-2.5 py-1.5"
                  >
                    <span className="text-sm">{(assignment as any).employees?.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0"
                      onClick={() => handleRemoveAssignment(assignment.id)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}

        {branches.length === 0 && (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            No branches created yet. Add your first branch to get started.
          </div>
        )}
      </div>

      {/* Add Branch Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Branch</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Branch Name *</Label>
              <Input
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                placeholder="e.g., السويدي"
                onKeyDown={(e) => e.key === 'Enter' && handleAddBranch()}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddBranch} disabled={!newBranchName.trim()}>Add</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Employee Dialog */}
      <Dialog open={!!assignDialogBranch} onOpenChange={(open) => !open && setAssignDialogBranch(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Employee to {assignDialogBranch?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {assignDialogBranch && getUnassignedEmployees(assignDialogBranch.id).map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAssignDialogBranch(null)}>Cancel</Button>
              <Button onClick={handleAssignEmployee} disabled={!selectedEmployeeId}>Assign</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
