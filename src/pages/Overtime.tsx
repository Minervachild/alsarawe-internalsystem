import { useState, useEffect } from 'react';
import { Plus, Calendar, DollarSign, Check, Clock, Filter } from 'lucide-react';
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
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Employee {
  id: string;
  name: string;
  hourly_rate: number;
  avatar_color: string;
}

interface OvertimeEntry {
  id: string;
  employee_id: string;
  hours: number;
  amount: number;
  date: string;
  is_paid: boolean;
  employee?: Employee;
}

export default function Overtime() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [entries, setEntries] = useState<OvertimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterEmployee, setFilterEmployee] = useState<string>('all');
  const [formData, setFormData] = useState({ 
    employee_id: '', 
    hours: 0, 
    date: new Date().toISOString().split('T')[0] 
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: employeesData } = await supabase
        .from('employees')
        .select('id, name, hourly_rate, avatar_color')
        .order('name');
      setEmployees(employeesData || []);

      const { data: entriesData } = await supabase
        .from('overtime')
        .select('*, employees(id, name, hourly_rate, avatar_color)')
        .order('date', { ascending: false });
      
      const transformed = (entriesData || []).map((entry: any) => ({
        ...entry,
        employee: entry.employees,
      }));
      setEntries(transformed);
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to fetch data.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const employee = employees.find(emp => emp.id === formData.employee_id);
    if (!employee) return;

    try {
      const amount = formData.hours * employee.hourly_rate;
      const { error } = await supabase.from('overtime').insert({
        employee_id: formData.employee_id,
        hours: formData.hours,
        amount,
        date: formData.date,
      });

      if (error) throw error;
      toast({ title: 'Overtime entry added' });
      setDialogOpen(false);
      setFormData({ employee_id: '', hours: 0, date: new Date().toISOString().split('T')[0] });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const markAsPaid = async (id: string) => {
    try {
      const { error } = await supabase.from('overtime').update({ is_paid: true }).eq('id', id);
      if (error) throw error;
      toast({ title: 'Marked as paid' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const filteredEntries = filterEmployee === 'all' 
    ? entries 
    : entries.filter(e => e.employee_id === filterEmployee);

  const totalUnpaid = filteredEntries.filter(e => !e.is_paid).reduce((sum, e) => sum + e.amount, 0);

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Overtime Tracker</h1>
            <p className="text-muted-foreground">Track extra hours and payments</p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Entry
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Unpaid Total</p>
                <p className="text-xl font-bold">${totalUnpaid.toFixed(2)}</p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Hours</p>
                <p className="text-xl font-bold">{filteredEntries.reduce((sum, e) => sum + e.hours, 0)}h</p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <Check className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Entries Paid</p>
                <p className="text-xl font-bold">{filteredEntries.filter(e => e.is_paid).length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-4 mb-6">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={filterEmployee} onValueChange={setFilterEmployee}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by employee" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">All Employees</SelectItem>
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Entries List */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : filteredEntries.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No overtime entries yet.
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Employee</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Date</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Hours</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Amount</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry) => (
                    <tr key={entry.id} className="border-t border-border/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-primary-foreground"
                            style={{ backgroundColor: entry.employee?.avatar_color || '#8B4513' }}
                          >
                            {entry.employee?.name.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-medium">{entry.employee?.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">{new Date(entry.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-sm">{entry.hours}h</td>
                      <td className="px-4 py-3 text-sm font-medium">${entry.amount.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${entry.is_paid ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                          {entry.is_paid ? 'Paid' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!entry.is_paid && (
                          <Button size="sm" variant="outline" onClick={() => markAsPaid(entry.id)}>
                            Mark Paid
                          </Button>
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

      {/* Add Entry Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Add Overtime Entry</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Employee *</Label>
              <Select
                value={formData.employee_id}
                onValueChange={(val) => setFormData(prev => ({ ...prev, employee_id: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name} (${emp.hourly_rate}/hr)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Hours *</Label>
                <Input
                  type="number"
                  value={formData.hours}
                  onChange={(e) => setFormData(prev => ({ ...prev, hours: parseFloat(e.target.value) || 0 }))}
                  step={0.5}
                  min={0}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  required
                />
              </div>
            </div>
            {formData.employee_id && formData.hours > 0 && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Amount: <span className="font-semibold text-foreground">
                    ${(formData.hours * (employees.find(e => e.id === formData.employee_id)?.hourly_rate || 0)).toFixed(2)}
                  </span>
                </p>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit">Add Entry</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
