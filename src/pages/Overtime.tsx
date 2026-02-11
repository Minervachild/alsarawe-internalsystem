import { useState, useEffect } from 'react';
import { Plus, Clock, Filter, Check, Banknote, Calendar } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface Employee {
  id: string;
  name: string;
  hourly_rate: number;
  off_day_rate: number | null;
  avatar_color: string;
}

interface OvertimeEntry {
  id: string;
  employee_id: string;
  hours: number;
  amount: number;
  date: string;
  is_paid: boolean;
  type: string;
  employee?: Employee;
}

export default function Overtime() {
  const { isAdmin } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [entries, setEntries] = useState<OvertimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterEmployee, setFilterEmployee] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [formData, setFormData] = useState({
    employee_id: '',
    overtime_hours: 0,
    offday_hours: 0,
    date: new Date().toISOString().split('T')[0],
  });
  const { toast } = useToast();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const { data: employeesData } = await supabase
        .from('employees')
        .select('id, name, hourly_rate, off_day_rate, avatar_color')
        .order('name');
      const empList = (employeesData || []) as Employee[];
      setEmployees(empList);

      if (!isAdmin && empList.length === 1 && !formData.employee_id) {
        setFormData(prev => ({ ...prev, employee_id: empList[0].id }));
      }

      const { data: entriesData } = await supabase
        .from('overtime')
        .select('*, employees(id, name, hourly_rate, off_day_rate, avatar_color)')
        .order('date', { ascending: false });

      const transformed = (entriesData || []).map((entry: any) => ({
        ...entry,
        type: entry.type || 'overtime',
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
      const entriesToInsert: any[] = [];

      if (formData.overtime_hours > 0) {
        const amount = formData.overtime_hours * (employee.hourly_rate || 0);
        entriesToInsert.push({
          employee_id: formData.employee_id,
          hours: formData.overtime_hours,
          amount,
          date: formData.date,
          type: 'overtime',
        });
      }

      if (formData.offday_hours > 0) {
        const rate = employee.off_day_rate || employee.hourly_rate || 0;
        const amount = formData.offday_hours * rate;
        entriesToInsert.push({
          employee_id: formData.employee_id,
          hours: formData.offday_hours,
          amount,
          date: formData.date,
          type: 'off_day',
        });
      }

      if (entriesToInsert.length === 0) {
        toast({ title: 'Error', description: 'Enter at least one type of hours.', variant: 'destructive' });
        return;
      }

      const { error } = await supabase.from('overtime').insert(entriesToInsert);
      if (error) throw error;

      toast({ title: 'Overtime entry added' });
      setDialogOpen(false);
      setFormData(prev => ({ ...prev, overtime_hours: 0, offday_hours: 0, date: new Date().toISOString().split('T')[0] }));
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

  // Filter by employee and month
  const filteredEntries = entries.filter(e => {
    if (filterEmployee !== 'all' && e.employee_id !== filterEmployee) return false;
    const entryMonth = e.date.substring(0, 7); // YYYY-MM
    if (entryMonth !== selectedMonth) return false;
    return true;
  });

  const overtimeEntries = filteredEntries.filter(e => e.type === 'overtime');
  const offDayEntries = filteredEntries.filter(e => e.type === 'off_day');

  const totalUnpaid = filteredEntries.filter(e => !e.is_paid).reduce((sum, e) => sum + e.amount, 0);
  const totalOvertimeHours = overtimeEntries.reduce((sum, e) => sum + e.hours, 0);
  const totalOffDayHours = offDayEntries.reduce((sum, e) => sum + e.hours, 0);

  const selectedEmployee = employees.find(e => e.id === formData.employee_id);
  const overtimeAmount = (formData.overtime_hours || 0) * (selectedEmployee?.hourly_rate || 0);
  const offDayRate = selectedEmployee?.off_day_rate || selectedEmployee?.hourly_rate || 0;
  const offDayAmount = (formData.offday_hours || 0) * offDayRate;

  // Generate month options
  const monthOptions: string[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthOptions.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  const formatMonth = (m: string) => {
    const [y, mo] = m.split('-');
    return new Date(parseInt(y), parseInt(mo) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const renderTable = (entries: OvertimeEntry[], typeLabel: string) => (
    entries.length === 0 ? (
      <div className="text-center py-8 text-muted-foreground text-sm">No {typeLabel} entries this month.</div>
    ) : (
      <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                {isAdmin && <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Employee</th>}
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Hours</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Amount</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Status</th>
                {isAdmin && <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">Action</th>}
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => (
                <tr key={entry.id} className="border-t border-border/50">
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-primary-foreground" style={{ backgroundColor: entry.employee?.avatar_color || '#8B4513' }}>
                          {entry.employee?.name?.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium">{entry.employee?.name}</span>
                      </div>
                    </td>
                  )}
                  <td className="px-4 py-3 text-sm">{new Date(entry.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-sm">{entry.hours}h</td>
                  <td className="px-4 py-3 text-sm font-medium">{entry.amount.toFixed(2)} ﷼</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${entry.is_paid ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                      {entry.is_paid ? 'Paid' : 'Pending'}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      {!entry.is_paid && (
                        <Button size="sm" variant="outline" onClick={() => markAsPaid(entry.id)}>Mark Paid</Button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  );

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Overtime Tracker</h1>
            <p className="text-muted-foreground">{isAdmin ? 'Track extra hours and payments' : 'Submit your overtime hours'}</p>
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
                <Banknote className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Unpaid Total</p>
                <p className="text-xl font-bold">{totalUnpaid.toFixed(2)} ﷼</p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Overtime Hours</p>
                <p className="text-xl font-bold">{totalOvertimeHours}h</p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Off-Day Hours</p>
                <p className="text-xl font-bold">{totalOffDayHours}h</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {monthOptions.map(m => (
                  <SelectItem key={m} value={m}>{formatMonth(m)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={filterEmployee} onValueChange={setFilterEmployee}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by employee" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all">All Employees</SelectItem>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Tabs for overtime vs off-day */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : (
          <Tabs defaultValue="overtime">
            <TabsList className="mb-4">
              <TabsTrigger value="overtime" className="gap-1.5">
                <Clock className="w-4 h-4" />
                Overtime ({overtimeEntries.length})
              </TabsTrigger>
              <TabsTrigger value="offday" className="gap-1.5">
                <Calendar className="w-4 h-4" />
                Off-Day ({offDayEntries.length})
              </TabsTrigger>
              <TabsTrigger value="all" className="gap-1.5">
                All ({filteredEntries.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="overtime">{renderTable(overtimeEntries, 'overtime')}</TabsContent>
            <TabsContent value="offday">{renderTable(offDayEntries, 'off-day')}</TabsContent>
            <TabsContent value="all">{renderTable(filteredEntries, '')}</TabsContent>
          </Tabs>
        )}
      </div>

      {/* Add Entry Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Add Overtime Entry</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            {isAdmin ? (
              <div className="space-y-2">
                <Label>Employee *</Label>
                <Select value={formData.employee_id} onValueChange={val => setFormData(p => ({ ...p, employee_id: val }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name} ({emp.hourly_rate} ﷼/hr{emp.off_day_rate ? `, off-day: ${emp.off_day_rate} ﷼/hr` : ''})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              employees.length > 0 && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Employee: <span className="font-semibold text-foreground">{employees[0]?.name}</span>
                    {' '}({employees[0]?.hourly_rate} ﷼/hr)
                  </p>
                </div>
              )
            )}

            <div className="space-y-2">
              <Label>Date *</Label>
              <Input type="date" value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Overtime Hours</Label>
                <Input type="number" value={formData.overtime_hours || ''} onChange={e => setFormData(p => ({ ...p, overtime_hours: parseFloat(e.target.value) || 0 }))} step={0.5} min={0} placeholder="0" />
                {formData.overtime_hours > 0 && selectedEmployee && (
                  <p className="text-xs text-muted-foreground">= {overtimeAmount.toFixed(2)} ﷼ ({selectedEmployee.hourly_rate} ﷼/hr)</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Off-Day Hours</Label>
                <Input type="number" value={formData.offday_hours || ''} onChange={e => setFormData(p => ({ ...p, offday_hours: parseFloat(e.target.value) || 0 }))} step={0.5} min={0} placeholder="0" />
                {formData.offday_hours > 0 && selectedEmployee && (
                  <p className="text-xs text-muted-foreground">= {offDayAmount.toFixed(2)} ﷼ ({offDayRate} ﷼/hr)</p>
                )}
              </div>
            </div>

            {(formData.overtime_hours > 0 || formData.offday_hours > 0) && selectedEmployee && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">
                  Total: <span className="text-foreground">{(overtimeAmount + offDayAmount).toFixed(2)} ﷼</span>
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
