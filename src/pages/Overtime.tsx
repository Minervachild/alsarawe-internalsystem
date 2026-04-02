import { useState, useEffect } from 'react';
import { Plus, Clock, Filter, Banknote, Calendar, ChevronDown, ChevronUp, Trash2, DollarSign } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
  employee?: Employee;
}

interface EmployeeSummary {
  employee: Employee;
  totalHours: number;
  totalAmount: number;
  unpaidAmount: number;
  entries: OvertimeEntry[];
}

export default function Overtime() {
  const { isAdmin } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [entries, setEntries] = useState<OvertimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterEmployee, setFilterEmployee] = useState<string>('all');
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentEntry, setPaymentEntry] = useState<OvertimeEntry | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [bulkPaymentDialogOpen, setBulkPaymentDialogOpen] = useState(false);
  const [bulkPaymentEmployeeId, setBulkPaymentEmployeeId] = useState<string | null>(null);
  const [bulkPaymentAmount, setBulkPaymentAmount] = useState('');
  const [deleteAllConfirm, setDeleteAllConfirm] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [amountMode, setAmountMode] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: '',
    hours: 0,
    amount_override: 0,
    notes: '',
  });

  const { toast } = useToast();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const { data: employeesData } = await supabase
        .from('employees')
        .select('id, name, hourly_rate, avatar_color')
        .order('name');
      const empList = (employeesData || []) as Employee[];
      setEmployees(empList);

      if (!isAdmin && empList.length === 1 && !formData.employee_id) {
        setFormData(prev => ({ ...prev, employee_id: empList[0].id }));
      }

      const { data: entriesData } = await supabase
        .from('overtime')
        .select('*, employees(id, name, hourly_rate, avatar_color)')
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

    if (formData.hours <= 0) {
      toast({ title: 'Error', description: 'Enter the number of hours.', variant: 'destructive' });
      return;
    }

    try {
      const monthDate = `${selectedMonth}-01`;
      const amount = formData.hours * (employee.hourly_rate || 0);

      const { error } = await supabase.from('overtime').insert({
        employee_id: formData.employee_id,
        hours: formData.hours,
        amount,
        date: monthDate,
        type: 'overtime',
        notes: formData.notes || null,
      });
      if (error) throw error;

      toast({ title: 'Overtime entry added' });
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setFormData(prev => ({ ...prev, hours: 0, amount_override: 0, notes: '' }));
  };

  const openPaymentDialog = (entry: OvertimeEntry) => {
    setPaymentEntry(entry);
    const remaining = entry.amount - (entry.paid_amount || 0);
    setPaymentAmount(String(remaining));
    setPaymentDialogOpen(true);
  };

  const handleRecordPayment = async () => {
    if (!paymentEntry) return;
    const payAmt = parseFloat(paymentAmount) || 0;
    if (payAmt <= 0) {
      toast({ title: 'Enter a valid amount', variant: 'destructive' });
      return;
    }
    const newPaidAmount = (paymentEntry.paid_amount || 0) + payAmt;
    const fullyPaid = newPaidAmount >= paymentEntry.amount;

    try {
      const { error } = await supabase
        .from('overtime')
        .update({ paid_amount: newPaidAmount, is_paid: fullyPaid })
        .eq('id', paymentEntry.id);
      if (error) throw error;
      toast({ title: fullyPaid ? 'Fully paid!' : `Recorded ﷼${payAmt.toFixed(2)} payment` });
      setPaymentDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const markAllPaid = async (employeeId: string) => {
    try {
      const unpaidEntries = filteredEntries
        .filter(e => e.employee_id === employeeId && !e.is_paid);
      if (unpaidEntries.length === 0) return;

      for (const entry of unpaidEntries) {
        await supabase
          .from('overtime')
          .update({ paid_amount: entry.amount, is_paid: true })
          .eq('id', entry.id);
      }
      toast({ title: `Marked ${unpaidEntries.length} entries as fully paid` });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const openBulkPaymentDialog = (employeeId: string) => {
    const summary = employeeSummaries.find(s => s.employee.id === employeeId);
    setBulkPaymentEmployeeId(employeeId);
    setBulkPaymentAmount(String(summary?.unpaidAmount || 0));
    setBulkPaymentDialogOpen(true);
  };

  const handleBulkPartialPayment = async () => {
    if (!bulkPaymentEmployeeId) return;
    let remaining = parseFloat(bulkPaymentAmount) || 0;
    if (remaining <= 0) {
      toast({ title: 'Enter a valid amount', variant: 'destructive' });
      return;
    }

    try {
      const unpaidEntries = filteredEntries
        .filter(e => e.employee_id === bulkPaymentEmployeeId && !e.is_paid)
        .sort((a, b) => a.date.localeCompare(b.date));

      for (const entry of unpaidEntries) {
        if (remaining <= 0) break;
        const entryRemaining = entry.amount - (entry.paid_amount || 0);
        if (entryRemaining <= 0) continue;

        const payForThis = Math.min(remaining, entryRemaining);
        const newPaid = (entry.paid_amount || 0) + payForThis;
        const fullyPaid = newPaid >= entry.amount;

        await supabase
          .from('overtime')
          .update({ paid_amount: newPaid, is_paid: fullyPaid })
          .eq('id', entry.id);

        remaining -= payForThis;
      }

      toast({ title: `Recorded ﷼${(parseFloat(bulkPaymentAmount) || 0).toFixed(2)} partial payment` });
      setBulkPaymentDialogOpen(false);
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
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const deleteAllForEmployee = async (employeeId: string) => {
    try {
      const employeeEntries = filteredEntries.filter(e => e.employee_id === employeeId);
      if (employeeEntries.length === 0) return;

      for (const entry of employeeEntries) {
        await supabase.from('overtime').delete().eq('id', entry.id);
      }
      toast({ title: `Deleted ${employeeEntries.length} entries` });
      setDeleteAllConfirm(null);
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  // Filter by employee and month
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
          totalHours: 0,
          totalAmount: 0,
          unpaidAmount: 0,
          entries: [],
        };
        map.set(entry.employee_id, summary);
      }
      summary.totalHours += entry.hours;
      summary.totalAmount += entry.amount;
      const remaining = entry.amount - (entry.paid_amount || 0);
      if (remaining > 0) summary.unpaidAmount += remaining;
      summary.entries.push(entry);
    }
    return Array.from(map.values());
  })();

  const totalUnpaid = filteredEntries.reduce((sum, e) => sum + Math.max(0, e.amount - (e.paid_amount || 0)), 0);
  const totalHours = filteredEntries.reduce((sum, e) => sum + e.hours, 0);

  const selectedEmployee = employees.find(e => e.id === formData.employee_id);
  const calcAmount = (formData.hours || 0) * (selectedEmployee?.hourly_rate || 0);

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

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Overtime Tracker</h1>
            <p className="text-muted-foreground">{isAdmin ? 'Track extra hours and payments' : 'Submit your overtime hours'}</p>
          </div>
          <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Entry
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Hours</p>
                <p className="text-xl font-bold">{totalHours}h</p>
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
              return (
                <div key={summary.employee.id} className="bg-card rounded-xl border border-border/50 overflow-hidden">
                  {/* Summary row */}
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
                          <p className="text-sm text-muted-foreground">
                            <Clock className="w-3 h-3 inline mr-1" />{summary.totalHours}h total
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-bold text-foreground">{summary.totalAmount.toFixed(2)} ﷼</p>
                          {summary.unpaidAmount > 0 && (
                            <p className="text-xs text-warning">{summary.unpaidAmount.toFixed(2)} ﷼ unpaid</p>
                          )}
                        </div>
                        {isAdmin && (
                          <div className="flex items-center gap-1">
                            {summary.unpaidAmount > 0 && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs"
                                  onClick={(e) => { e.stopPropagation(); openBulkPaymentDialog(summary.employee.id); }}
                                >
                                  <DollarSign className="w-3 h-3 mr-1" />
                                  Partial Pay
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs"
                                  onClick={(e) => { e.stopPropagation(); markAllPaid(summary.employee.id); }}
                                >
                                  Pay All
                                </Button>
                              </>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                              onClick={(e) => { e.stopPropagation(); setDeleteAllConfirm(summary.employee.id); }}
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Delete All
                            </Button>
                          </div>
                        )}
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-border/50">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-muted/50">
                            <tr>
                              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Date</th>
                              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Hours</th>
                              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Amount</th>
                              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Description</th>
                              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Status</th>
                              <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {summary.entries.map(entry => (
                              <tr key={entry.id} className="border-t border-border/30">
                                <td className="px-4 py-2 text-sm">{new Date(entry.date).toLocaleDateString()}</td>
                                <td className="px-4 py-2 text-sm">{entry.hours}h</td>
                                <td className="px-4 py-2 text-sm font-medium">{entry.amount.toFixed(2)} ﷼</td>
                                <td className="px-4 py-2 text-sm text-muted-foreground max-w-[200px] truncate" title={entry.notes || ''}>{entry.notes || '—'}</td>
                                <td className="px-4 py-2">
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${entry.is_paid ? 'bg-success/10 text-success' : (entry.paid_amount || 0) > 0 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-warning/10 text-warning'}`}>
                                    {entry.is_paid ? 'Paid' : (entry.paid_amount || 0) > 0 ? `Partial (﷼${(entry.paid_amount || 0).toFixed(0)})` : 'Unpaid'}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    {isAdmin && !entry.is_paid && (
                                      <Button size="sm" variant="ghost" className="text-xs h-7 gap-1" onClick={() => openPaymentDialog(entry)}>
                                        <DollarSign className="w-3 h-3" />
                                        {(entry.paid_amount || 0) > 0 ? 'Add Payment' : 'Record Payment'}
                                      </Button>
                                    )}
                                    <Button size="sm" variant="ghost" className="text-xs h-7 text-destructive" onClick={() => deleteEntry(entry.id)}>
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
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

      {/* Add Entry Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Add Overtime</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            {/* Employee selector */}
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
                        {emp.name} ({emp.hourly_rate} ﷼/hr)
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

            {/* Month */}
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

            {/* Hours */}
            <div className="space-y-2">
              <Label>Total Hours *</Label>
              <Input
                type="number"
                value={formData.hours || ''}
                onChange={e => setFormData(p => ({ ...p, hours: parseFloat(e.target.value) || 0 }))}
                step={0.5}
                min={0}
                placeholder="Enter total overtime hours"
              />
              {formData.hours > 0 && selectedEmployee && (
                <p className="text-xs text-muted-foreground">
                  {formData.hours}h × {selectedEmployee.hourly_rate} ﷼/hr = {calcAmount.toFixed(2)} ﷼
                </p>
              )}
            </div>

            {/* Description */}
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
              <Button type="submit" disabled={!formData.employee_id || formData.hours <= 0}>Add Entry</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Partial Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Record Payment</DialogTitle>
          </DialogHeader>
          {paymentEntry && (
            <div className="space-y-4 mt-2">
              <div className="p-3 bg-muted rounded-lg space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Amount</span>
                  <span className="font-semibold">{paymentEntry.amount.toFixed(2)} ﷼</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Already Paid</span>
                  <span className="font-medium text-emerald-600">{(paymentEntry.paid_amount || 0).toFixed(2)} ﷼</span>
                </div>
                <div className="flex justify-between text-sm border-t border-border/50 pt-1 mt-1">
                  <span className="text-muted-foreground">Remaining</span>
                  <span className="font-bold text-warning">{(paymentEntry.amount - (paymentEntry.paid_amount || 0)).toFixed(2)} ﷼</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Payment Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max={paymentEntry.amount - (paymentEntry.paid_amount || 0)}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => setPaymentAmount(String(paymentEntry.amount - (paymentEntry.paid_amount || 0)))}
                >
                  Pay Full Remaining
                </Button>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleRecordPayment}>Record Payment</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Partial Payment Dialog */}
      <Dialog open={bulkPaymentDialogOpen} onOpenChange={setBulkPaymentDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Partial Payment</DialogTitle>
          </DialogHeader>
          {bulkPaymentEmployeeId && (() => {
            const summary = employeeSummaries.find(s => s.employee.id === bulkPaymentEmployeeId);
            if (!summary) return null;
            return (
              <div className="space-y-4 mt-2">
                <div className="p-3 bg-muted rounded-lg space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Employee</span>
                    <span className="font-semibold">{summary.employee.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Owed</span>
                    <span className="font-semibold">{summary.totalAmount.toFixed(2)} ﷼</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-border/50 pt-1 mt-1">
                    <span className="text-muted-foreground">Unpaid Balance</span>
                    <span className="font-bold text-warning">{summary.unpaidAmount.toFixed(2)} ﷼</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Payment Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max={summary.unpaidAmount}
                    value={bulkPaymentAmount}
                    onChange={(e) => setBulkPaymentAmount(e.target.value)}
                    placeholder="0.00"
                  />
                  <p className="text-xs text-muted-foreground">
                    Payment will be distributed across unpaid entries (oldest first).
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => setBulkPaymentAmount(String(summary.unpaidAmount))}
                    >
                      Pay Full Balance
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => setBulkPaymentAmount(String(Math.round(summary.unpaidAmount / 2 * 100) / 100))}
                    >
                      Pay Half
                    </Button>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setBulkPaymentDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleBulkPartialPayment}>Record Payment</Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Delete All Confirmation */}
      <AlertDialog open={!!deleteAllConfirm} onOpenChange={(open) => !open && setDeleteAllConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all overtime entries?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all overtime entries for this employee in {formatMonth(selectedMonth)}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteAllConfirm && deleteAllForEmployee(deleteAllConfirm)}
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}