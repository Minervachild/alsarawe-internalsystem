import { useState, useEffect } from 'react';
import { Plus, Clock, Filter, Banknote, Calendar, ChevronDown, ChevronUp, Trash2, DollarSign, CheckCircle, XCircle, Edit2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { useAuth } from '@/contexts/AuthContext';

interface Employee {
  id: string;
  name: string;
  hourly_rate: number;
  off_day_rate: number;
  avatar_color: string;
}

interface OvertimeEntry {
  id: string;
  employee_id: string;
  hours: number;
  amount: number;
  paid_amount: number;
  date: string;
  is_paid: boolean;
  type: string;
  notes: string | null;
  status: string;
  hourly_rate: number;
  off_day_rate: number;
  off_day_hours: number;
  off_day_amount: number;
  submitted_by: string | null;
  approved_amount: number | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  employee?: Employee;
}

interface EmployeeSummary {
  employee: Employee;
  totalAmount: number;
  totalOffDayAmount: number;
  entries: OvertimeEntry[];
}

export default function Overtime() {
  const { isAdmin, user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [entries, setEntries] = useState<OvertimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<OvertimeEntry | null>(null);
  const [filterEmployee, setFilterEmployee] = useState<string>('all');
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [approvalDialog, setApprovalDialog] = useState<OvertimeEntry | null>(null);
  const [approvalAmount, setApprovalAmount] = useState('');
  const [approvalOffDayAmount, setApprovalOffDayAmount] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [formData, setFormData] = useState({
    employee_id: '',
    hourly_rate: 0,
    off_day_rate: 0,
    hours: 0,
    off_day_hours: 0,
    notes: '',
  });

  const { toast } = useToast();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const { data: employeesData } = await supabase
        .from('employees')
        .select('id, name, hourly_rate, off_day_rate, avatar_color')
        .order('name');
      const empList = (employeesData || []).map((e: any) => ({
        ...e,
        hourly_rate: e.hourly_rate || 0,
        off_day_rate: e.off_day_rate || 0,
      })) as Employee[];
      setEmployees(empList);

      if (!isAdmin && empList.length === 1 && !formData.employee_id) {
        setFormData(prev => ({
          ...prev,
          employee_id: empList[0].id,
          hourly_rate: empList[0].hourly_rate,
          off_day_rate: empList[0].off_day_rate,
        }));
      }

      const { data: entriesData } = await supabase
        .from('overtime')
        .select('*, employees(id, name, hourly_rate, off_day_rate, avatar_color)')
        .order('created_at', { ascending: false });

      const transformed = (entriesData || []).map((entry: any) => ({
        ...entry,
        type: entry.type || 'overtime',
        status: entry.status || 'submitted',
        hourly_rate: entry.hourly_rate || 0,
        off_day_rate: entry.off_day_rate || 0,
        off_day_hours: entry.off_day_hours || 0,
        off_day_amount: entry.off_day_amount || 0,
        employee: entry.employees ? {
          ...entry.employees,
          hourly_rate: entry.employees.hourly_rate || 0,
          off_day_rate: entry.employees.off_day_rate || 0,
        } : undefined,
      }));
      setEntries(transformed);
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to fetch data.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const openAddDialog = () => {
    setEditingEntry(null);
    const emp = !isAdmin && employees.length > 0 ? employees[0] : null;
    setFormData({
      employee_id: emp?.id || '',
      hourly_rate: emp?.hourly_rate || 0,
      off_day_rate: emp?.off_day_rate || 0,
      hours: 0,
      off_day_hours: 0,
      notes: '',
    });
    setDialogOpen(true);
  };

  const openEditDialog = (entry: OvertimeEntry) => {
    setEditingEntry(entry);
    setFormData({
      employee_id: entry.employee_id,
      hourly_rate: entry.hourly_rate,
      off_day_rate: entry.off_day_rate,
      hours: entry.hours,
      off_day_hours: entry.off_day_hours,
      notes: entry.notes || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employee_id || !user) return;

    const overtimeAmount = formData.hours * formData.hourly_rate;
    const offDayAmount = formData.off_day_hours * formData.off_day_rate;
    const totalAmount = overtimeAmount + offDayAmount;

    if (formData.hours <= 0 && formData.off_day_hours <= 0) {
      toast({ title: 'Error', description: 'Enter at least overtime hours or off-day hours.', variant: 'destructive' });
      return;
    }

    try {
      const monthDate = `${selectedMonth}-01`;

      if (editingEntry) {
        const { error } = await supabase.from('overtime').update({
          hourly_rate: formData.hourly_rate,
          off_day_rate: formData.off_day_rate,
          hours: formData.hours,
          off_day_hours: formData.off_day_hours,
          off_day_amount: offDayAmount,
          amount: totalAmount,
          notes: formData.notes || null,
        }).eq('id', editingEntry.id);
        if (error) throw error;
        toast({ title: 'Entry updated' });
      } else {
        const { error } = await supabase.from('overtime').insert({
          employee_id: formData.employee_id,
          hours: formData.hours,
          amount: totalAmount,
          hourly_rate: formData.hourly_rate,
          off_day_rate: formData.off_day_rate,
          off_day_hours: formData.off_day_hours,
          off_day_amount: offDayAmount,
          date: monthDate,
          type: 'overtime',
          notes: formData.notes || null,
          submitted_by: user.id,
          status: 'submitted',
        });
        if (error) throw error;
        toast({ title: 'Overtime submitted for approval' });
      }

      setDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleApprove = async (full: boolean) => {
    if (!approvalDialog || !user) return;
    try {
      const approvedAmt = full
        ? approvalDialog.amount
        : (parseFloat(approvalAmount) || 0) + (parseFloat(approvalOffDayAmount) || 0);

      const { error } = await supabase.from('overtime').update({
        status: 'approved',
        approved_amount: approvedAmt,
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        amount: approvedAmt,
      }).eq('id', approvalDialog.id);
      if (error) throw error;

      toast({ title: full ? 'Fully approved' : `Approved ﷼${approvedAmt.toFixed(2)}` });
      setApprovalDialog(null);
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleReject = async (entry: OvertimeEntry) => {
    if (!user) return;
    try {
      const { error } = await supabase.from('overtime').update({
        status: 'rejected',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      }).eq('id', entry.id);
      if (error) throw error;
      toast({ title: 'Entry rejected' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const deleteEntry = async (id: string) => {
    try {
      const { error } = await supabase.from('overtime').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Entry deleted' });
      setDeleteConfirm(null);
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  // Filter
  const filteredEntries = entries.filter(e => {
    if (filterEmployee !== 'all' && e.employee_id !== filterEmployee) return false;
    const entryMonth = e.date.substring(0, 7);
    if (entryMonth !== selectedMonth) return false;
    return true;
  });

  // Group by employee
  const employeeSummaries: EmployeeSummary[] = (() => {
    const map = new Map<string, EmployeeSummary>();
    for (const entry of filteredEntries) {
      if (!entry.employee) continue;
      let summary = map.get(entry.employee_id);
      if (!summary) {
        summary = {
          employee: entry.employee,
          totalAmount: 0,
          totalOffDayAmount: 0,
          entries: [],
        };
        map.set(entry.employee_id, summary);
      }
      if (entry.status !== 'rejected') {
        summary.totalAmount += (entry.hours * entry.hourly_rate);
        summary.totalOffDayAmount += entry.off_day_amount;
      }
      summary.entries.push(entry);
    }
    return Array.from(map.values());
  })();

  const pendingCount = filteredEntries.filter(e => e.status === 'submitted').length;

  // Month options
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 text-xs">Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-xs">Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-xs">Rejected</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  const selectedEmployee = employees.find(e => e.id === formData.employee_id);
  const calcOvertimeAmount = formData.hours * formData.hourly_rate;
  const calcOffDayAmount = formData.off_day_hours * formData.off_day_rate;
  const calcTotal = calcOvertimeAmount + calcOffDayAmount;

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Overtime Tracker</h1>
            <p className="text-muted-foreground text-sm">{isAdmin ? 'Review and approve overtime submissions' : 'Submit your overtime hours for approval'}</p>
          </div>
          <Button onClick={openAddDialog}>
            <Plus className="w-4 h-4 mr-2" />
            Submit Overtime
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Entries</p>
                <p className="text-xl font-bold">{filteredEntries.length}</p>
              </div>
            </div>
          </div>
          {isAdmin && (
            <div className="stat-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Banknote className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending Approval</p>
                  <p className="text-xl font-bold">{pendingCount}</p>
                </div>
              </div>
            </div>
          )}
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-xl font-bold">{filteredEntries.filter(e => e.status === 'approved').length}</p>
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

        {/* Employee Summaries */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : employeeSummaries.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No overtime entries for {formatMonth(selectedMonth)}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {employeeSummaries.map(summary => {
              const isExpanded = expandedEmployee === summary.employee.id;
              const grandTotal = summary.totalAmount + summary.totalOffDayAmount;
              return (
                <div key={summary.employee.id} className="bg-card rounded-xl border border-border/50 overflow-hidden">
                  <div
                    className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => setExpandedEmployee(isExpanded ? null : summary.employee.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground"
                          style={{ backgroundColor: summary.employee.avatar_color || '#8B4513' }}
                        >
                          {summary.employee.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{summary.employee.name}</p>
                          <p className="text-xs text-muted-foreground">{summary.entries.length} entries</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-bold text-foreground">{grandTotal.toFixed(2)} ﷼</p>
                          {summary.totalOffDayAmount > 0 && (
                            <p className="text-xs text-muted-foreground">incl. {summary.totalOffDayAmount.toFixed(2)} ﷼ off-day</p>
                          )}
                        </div>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-border/50">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-muted/50">
                            <tr>
                              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Date</th>
                              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">OT Hours</th>
                              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Rate</th>
                              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">OT Amount</th>
                              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Off-Day</th>
                              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Total</th>
                              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Notes</th>
                              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Status</th>
                              <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {summary.entries.map(entry => {
                              const otAmount = entry.hours * entry.hourly_rate;
                              const total = otAmount + entry.off_day_amount;
                              const canEdit = entry.status === 'submitted' && (!isAdmin || true);
                              return (
                                <tr key={entry.id} className="border-t border-border/30">
                                  <td className="px-4 py-2 text-sm">{new Date(entry.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</td>
                                  <td className="px-4 py-2 text-sm">{entry.hours}h</td>
                                  <td className="px-4 py-2 text-sm">{entry.hourly_rate} ﷼/hr</td>
                                  <td className="px-4 py-2 text-sm font-medium">{otAmount.toFixed(2)} ﷼</td>
                                  <td className="px-4 py-2 text-sm">
                                    {entry.off_day_hours > 0 ? (
                                      <span>{entry.off_day_hours}h × {entry.off_day_rate} = {entry.off_day_amount.toFixed(2)} ﷼</span>
                                    ) : '—'}
                                  </td>
                                  <td className="px-4 py-2 text-sm font-bold">{total.toFixed(2)} ﷼</td>
                                  <td className="px-4 py-2 text-sm text-muted-foreground max-w-[150px] truncate" title={entry.notes || ''}>{entry.notes || '—'}</td>
                                  <td className="px-4 py-2">{getStatusBadge(entry.status)}</td>
                                  <td className="px-4 py-2 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      {/* Admin: approve/reject pending entries */}
                                      {isAdmin && entry.status === 'submitted' && (
                                        <>
                                          <Button size="sm" variant="ghost" className="text-xs h-7 text-success" onClick={() => {
                                            setApprovalDialog(entry);
                                            setApprovalAmount(String(otAmount));
                                            setApprovalOffDayAmount(String(entry.off_day_amount));
                                          }}>
                                            <CheckCircle className="w-3 h-3 mr-1" />
                                            Approve
                                          </Button>
                                          <Button size="sm" variant="ghost" className="text-xs h-7 text-destructive" onClick={() => handleReject(entry)}>
                                            <XCircle className="w-3 h-3 mr-1" />
                                            Reject
                                          </Button>
                                        </>
                                      )}
                                      {/* Edit (only submitted) */}
                                      {canEdit && (
                                        <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => openEditDialog(entry)}>
                                          <Edit2 className="w-3 h-3" />
                                        </Button>
                                      )}
                                      {/* Delete */}
                                      {(isAdmin || entry.status === 'submitted') && (
                                        <Button size="sm" variant="ghost" className="text-xs h-7 text-destructive" onClick={() => setDeleteConfirm(entry.id)}>
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Entry Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">{editingEntry ? 'Edit Overtime' : 'Submit Overtime'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            {/* Employee */}
            {isAdmin ? (
              <div className="space-y-2">
                <Label>Employee *</Label>
                <Select
                  value={formData.employee_id}
                  onValueChange={val => {
                    const emp = employees.find(e => e.id === val);
                    setFormData(p => ({
                      ...p,
                      employee_id: val,
                      hourly_rate: emp?.hourly_rate || 0,
                      off_day_rate: emp?.off_day_rate || 0,
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              employees.length > 0 && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Employee: <span className="font-semibold text-foreground">{employees[0]?.name}</span>
                  </p>
                </div>
              )
            )}

            {/* Month */}
            {!editingEntry && (
              <div className="space-y-2">
                <Label>Month</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {monthOptions.map(m => (
                      <SelectItem key={m} value={m}>{formatMonth(m)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Hourly Rate */}
            <div className="space-y-2">
              <Label>Hourly Rate (﷼/hr) *</Label>
              <Input
                type="number"
                value={formData.hourly_rate || ''}
                onChange={e => setFormData(p => ({ ...p, hourly_rate: parseFloat(e.target.value) || 0 }))}
                step={0.01}
                min={0}
                placeholder="Your hourly rate"
              />
            </div>

            {/* OT Hours */}
            <div className="space-y-2">
              <Label>Overtime Hours *</Label>
              <Input
                type="number"
                value={formData.hours || ''}
                onChange={e => setFormData(p => ({ ...p, hours: parseFloat(e.target.value) || 0 }))}
                step={0.5}
                min={0}
                placeholder="Total overtime hours"
              />
              {formData.hours > 0 && formData.hourly_rate > 0 && (
                <p className="text-xs text-muted-foreground">
                  {formData.hours}h × {formData.hourly_rate} ﷼/hr = <span className="font-semibold">{calcOvertimeAmount.toFixed(2)} ﷼</span>
                </p>
              )}
            </div>

            {/* Off-Day Rate */}
            <div className="space-y-2">
              <Label>Off-Day Rate (﷼/hr)</Label>
              <Input
                type="number"
                value={formData.off_day_rate || ''}
                onChange={e => setFormData(p => ({ ...p, off_day_rate: parseFloat(e.target.value) || 0 }))}
                step={0.01}
                min={0}
                placeholder="Off-day hourly rate"
              />
            </div>

            {/* Off-Day Hours */}
            <div className="space-y-2">
              <Label>Off-Day Hours</Label>
              <Input
                type="number"
                value={formData.off_day_hours || ''}
                onChange={e => setFormData(p => ({ ...p, off_day_hours: parseFloat(e.target.value) || 0 }))}
                step={0.5}
                min={0}
                placeholder="Hours worked on off days"
              />
              {formData.off_day_hours > 0 && formData.off_day_rate > 0 && (
                <p className="text-xs text-muted-foreground">
                  {formData.off_day_hours}h × {formData.off_day_rate} ﷼/hr = <span className="font-semibold">{calcOffDayAmount.toFixed(2)} ﷼</span>
                </p>
              )}
            </div>

            {/* Total Summary */}
            {calcTotal > 0 && (
              <div className="bg-muted/50 rounded-xl p-4 space-y-1">
                {calcOvertimeAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Overtime</span>
                    <span>{calcOvertimeAmount.toFixed(2)} ﷼</span>
                  </div>
                )}
                {calcOffDayAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Off-Day</span>
                    <span>{calcOffDayAmount.toFixed(2)} ﷼</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold border-t border-border/50 pt-1 mt-1">
                  <span>Total</span>
                  <span>{calcTotal.toFixed(2)} ﷼</span>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                value={formData.notes}
                onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                placeholder="What was the overtime for?"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={!formData.employee_id || (formData.hours <= 0 && formData.off_day_hours <= 0)}>
                {editingEntry ? 'Update' : 'Submit for Approval'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog open={!!approvalDialog} onOpenChange={(open) => !open && setApprovalDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Approve Overtime</DialogTitle>
          </DialogHeader>
          {approvalDialog && (() => {
            const otAmount = approvalDialog.hours * approvalDialog.hourly_rate;
            const requestedTotal = otAmount + approvalDialog.off_day_amount;
            return (
              <div className="space-y-4 mt-2">
                <div className="p-3 bg-muted rounded-lg space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Employee</span>
                    <span className="font-semibold">{approvalDialog.employee?.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">OT: {approvalDialog.hours}h × {approvalDialog.hourly_rate}</span>
                    <span>{otAmount.toFixed(2)} ﷼</span>
                  </div>
                  {approvalDialog.off_day_hours > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Off-Day: {approvalDialog.off_day_hours}h × {approvalDialog.off_day_rate}</span>
                      <span>{approvalDialog.off_day_amount.toFixed(2)} ﷼</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold border-t border-border/50 pt-1 mt-1">
                    <span>Requested Total</span>
                    <span>{requestedTotal.toFixed(2)} ﷼</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium">Approve partial amount (optional)</Label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs w-20 shrink-0">OT Amount</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={approvalAmount}
                        onChange={(e) => setApprovalAmount(e.target.value)}
                      />
                    </div>
                    {approvalDialog.off_day_hours > 0 && (
                      <div className="flex items-center gap-2">
                        <Label className="text-xs w-20 shrink-0">Off-Day</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={approvalOffDayAmount}
                          onChange={(e) => setApprovalOffDayAmount(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setApprovalDialog(null)}>Cancel</Button>
                  <Button variant="outline" onClick={() => handleApprove(false)}>
                    Approve Partial
                  </Button>
                  <Button onClick={() => handleApprove(true)}>
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Approve Full
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete overtime entry?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirm && deleteEntry(deleteConfirm)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
