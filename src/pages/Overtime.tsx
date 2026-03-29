import { useState, useEffect } from 'react';
import { Plus, Clock, Filter, Banknote, Calendar, ChevronDown, ChevronUp, Trash2, DollarSign, FileText } from 'lucide-react';
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
  off_day_rate: number | null;
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

// Group entries by employee for a given month
interface EmployeeSummary {
  employee: Employee;
  overtimeHours: number;
  overtimeAmount: number;
  offDayDays: number;
  offDayAmount: number;
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
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Form state
  const [formData, setFormData] = useState({
    employee_id: '',
    total_overtime_hours: 0,
    total_offday_days: 0,
    overtime_amount_override: 0,
    offday_amount_override: 0,
    notes: '',
  });
  const [dailyBreakdown, setDailyBreakdown] = useState<{ date: string; overtime_hours: number; is_offday: boolean }[]>([]);
  const [showDailyBreakdown, setShowDailyBreakdown] = useState(false);

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

      if (showDailyBreakdown && dailyBreakdown.length > 0) {
        // Use daily breakdown - validate totals match
        const totalOT = dailyBreakdown.reduce((s, d) => s + d.overtime_hours, 0);
        const totalOD = dailyBreakdown.filter(d => d.is_offday).length;

        if (Math.abs(totalOT - formData.total_overtime_hours) > 0.01 && formData.total_overtime_hours > 0) {
          toast({ title: 'Mismatch', description: `Daily overtime total (${totalOT}h) doesn't match total (${formData.total_overtime_hours}h).`, variant: 'destructive' });
          return;
        }
        if (totalOD !== formData.total_offday_days && formData.total_offday_days > 0) {
          toast({ title: 'Mismatch', description: `Daily off-days count (${totalOD}) doesn't match total (${formData.total_offday_days}).`, variant: 'destructive' });
          return;
        }

        for (const day of dailyBreakdown) {
          if (day.overtime_hours > 0) {
            entriesToInsert.push({
              employee_id: formData.employee_id,
              hours: day.overtime_hours,
              amount: day.overtime_hours * (employee.hourly_rate || 0),
              date: day.date,
              type: 'overtime',
              notes: formData.notes || null,
            });
          }
          if (day.is_offday) {
            const rate = employee.off_day_rate || employee.hourly_rate || 0;
            entriesToInsert.push({
              employee_id: formData.employee_id,
              hours: 1,
              amount: rate,
              date: day.date,
              type: 'off_day',
              notes: formData.notes || null,
            });
          }
        }
      } else {
        // No daily breakdown - store as single entries for the 1st of the month
        const monthDate = `${selectedMonth}-01`;
        if (formData.total_overtime_hours > 0) {
          entriesToInsert.push({
            employee_id: formData.employee_id,
            hours: formData.total_overtime_hours,
            amount: formData.total_overtime_hours * (employee.hourly_rate || 0),
            date: monthDate,
            type: 'overtime',
            notes: formData.notes || null,
          });
        }
        if (formData.total_offday_days > 0) {
          const rate = employee.off_day_rate || employee.hourly_rate || 0;
          entriesToInsert.push({
            employee_id: formData.employee_id,
            hours: formData.total_offday_days,
            amount: formData.total_offday_days * rate,
            date: monthDate,
            type: 'off_day',
            notes: formData.notes || null,
          });
        }
      }

      if (entriesToInsert.length === 0) {
        toast({ title: 'Error', description: 'Enter at least one type of hours.', variant: 'destructive' });
        return;
      }

      const { error } = await supabase.from('overtime').insert(entriesToInsert);
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
    setFormData(prev => ({ ...prev, total_overtime_hours: 0, total_offday_days: 0, overtime_amount_override: 0, offday_amount_override: 0, notes: '' }));
    setDailyBreakdown([]);
    setShowDailyBreakdown(false);
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

      // For each unpaid entry, set paid_amount = amount and is_paid = true
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
          overtimeHours: 0,
          overtimeAmount: 0,
          offDayDays: 0,
          offDayAmount: 0,
          totalAmount: 0,
          unpaidAmount: 0,
          entries: [],
        };
        map.set(entry.employee_id, summary);
      }
      if (entry.type === 'overtime') {
        summary.overtimeHours += entry.hours;
        summary.overtimeAmount += entry.amount;
      } else {
        summary.offDayDays += entry.hours;
        summary.offDayAmount += entry.amount;
      }
      summary.totalAmount += entry.amount;
      const remaining = entry.amount - (entry.paid_amount || 0);
      if (remaining > 0) summary.unpaidAmount += remaining;
      summary.entries.push(entry);
    }
    return Array.from(map.values());
  })();

  const totalUnpaid = filteredEntries.reduce((sum, e) => sum + Math.max(0, e.amount - (e.paid_amount || 0)), 0);
  const totalOvertimeHours = filteredEntries.filter(e => e.type === 'overtime').reduce((sum, e) => sum + e.hours, 0);
  const totalOffDayDays = filteredEntries.filter(e => e.type === 'off_day').reduce((sum, e) => sum + e.hours, 0);

  const selectedEmployee = employees.find(e => e.id === formData.employee_id);
  const overtimeAmount = (formData.total_overtime_hours || 0) * (selectedEmployee?.hourly_rate || 0);
  const offDayRate = selectedEmployee?.off_day_rate || selectedEmployee?.hourly_rate || 0;
  const offDayAmount = (formData.total_offday_days || 0) * offDayRate;

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

  // Get days in selected month for daily breakdown
  const getDaysInMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    return new Date(y, m, 0).getDate();
  };

  const addDailyRow = () => {
    const [y, m] = selectedMonth.split('-');
    const nextDay = dailyBreakdown.length + 1;
    const daysInMonth = getDaysInMonth();
    if (nextDay > daysInMonth) return;
    setDailyBreakdown(prev => [...prev, {
      date: `${y}-${m}-${String(nextDay).padStart(2, '0')}`,
      overtime_hours: 0,
      is_offday: false,
    }]);
  };

  const removeDailyRow = (index: number) => {
    setDailyBreakdown(prev => prev.filter((_, i) => i !== index));
  };

  const updateDailyRow = (index: number, field: 'date' | 'overtime_hours' | 'is_offday', value: string | number | boolean) => {
    setDailyBreakdown(prev => prev.map((row, i) => i === index ? { ...row, [field]: value } : row));
  };

  const dailyOTTotal = dailyBreakdown.reduce((s, d) => s + d.overtime_hours, 0);
  const dailyODTotal = dailyBreakdown.filter(d => d.is_offday).length;

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
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary" />
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
                <Calendar className="w-5 h-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Off-Days Worked</p>
                <p className="text-xl font-bold">{totalOffDayDays} days</p>
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
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {summary.overtimeHours}h OT
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> {summary.offDayDays} Off-Days
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-bold text-foreground">{summary.totalAmount.toFixed(2)} ﷼</p>
                          {summary.unpaidAmount > 0 && (
                            <p className="text-xs text-warning">{summary.unpaidAmount.toFixed(2)} ﷼ unpaid</p>
                          )}
                        </div>
                        {isAdmin && summary.unpaidAmount > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={(e) => { e.stopPropagation(); markAllPaid(summary.employee.id); }}
                          >
                            Pay All
                          </Button>
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
                              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Type</th>
                              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Qty</th>
                              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Amount</th>
                              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Notes</th>
                              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Status</th>
                              {isAdmin && <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Actions</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {summary.entries.map(entry => (
                              <tr key={entry.id} className="border-t border-border/30">
                                <td className="px-4 py-2 text-sm">{new Date(entry.date).toLocaleDateString()}</td>
                                <td className="px-4 py-2">
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${entry.type === 'overtime' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent-foreground'}`}>
                                    {entry.type === 'overtime' ? 'Overtime' : 'Off-Day'}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-sm">{entry.type === 'overtime' ? `${entry.hours}h` : `${entry.hours} day${entry.hours !== 1 ? 's' : ''}`}</td>
                                <td className="px-4 py-2 text-sm font-medium">{entry.amount.toFixed(2)} ﷼</td>
                                <td className="px-4 py-2 text-sm text-muted-foreground max-w-[200px] truncate" title={entry.notes || ''}>{entry.notes || '—'}</td>
                                <td className="px-4 py-2">
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${entry.is_paid ? 'bg-success/10 text-success' : (entry.paid_amount || 0) > 0 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-warning/10 text-warning'}`}>
                                    {entry.is_paid ? 'Paid' : (entry.paid_amount || 0) > 0 ? `Partial (﷼${(entry.paid_amount || 0).toFixed(0)})` : 'Unpaid'}
                                  </span>
                                </td>
                                {isAdmin && (
                                  <td className="px-4 py-2 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      {!entry.is_paid && (
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
                                )}
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
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Add Monthly Overtime</DialogTitle>
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
                        {emp.name} ({emp.hourly_rate} ﷼/hr{emp.off_day_rate ? `, off-day: ${emp.off_day_rate} ﷼/day` : ''})
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

            {/* Overtime: Hours OR Amount */}
            <div className="space-y-2">
              <Label>Overtime</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Hours</span>
                  <Input
                    type="number"
                    value={formData.total_overtime_hours || ''}
                    onChange={e => {
                      const hrs = parseFloat(e.target.value) || 0;
                      setFormData(p => ({ ...p, total_overtime_hours: hrs, overtime_amount_override: 0 }));
                    }}
                    step={0.5}
                    min={0}
                    placeholder="Enter hours"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">OR Amount (﷼)</span>
                  <Input
                    type="number"
                    value={formData.overtime_amount_override || ''}
                    onChange={e => {
                      const amt = parseFloat(e.target.value) || 0;
                      const rate = selectedEmployee?.hourly_rate || 0;
                      const calcHours = rate > 0 ? Math.round((amt / rate) * 100) / 100 : 0;
                      setFormData(p => ({ ...p, overtime_amount_override: amt, total_overtime_hours: calcHours }));
                    }}
                    step={0.01}
                    min={0}
                    placeholder="Enter amount"
                  />
                </div>
              </div>
              {formData.total_overtime_hours > 0 && selectedEmployee && (
                <p className="text-xs text-muted-foreground">
                  {formData.total_overtime_hours}h × {selectedEmployee.hourly_rate} ﷼/hr = {overtimeAmount.toFixed(2)} ﷼
                </p>
              )}
            </div>

            {/* Off-Days: Days OR Amount */}
            <div className="space-y-2">
              <Label>Off-Days Worked</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Days</span>
                  <Input
                    type="number"
                    value={formData.total_offday_days || ''}
                    onChange={e => {
                      const days = parseInt(e.target.value) || 0;
                      setFormData(p => ({ ...p, total_offday_days: days, offday_amount_override: 0 }));
                    }}
                    step={1}
                    min={0}
                    placeholder="Enter days"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">OR Amount (﷼)</span>
                  <Input
                    type="number"
                    value={formData.offday_amount_override || ''}
                    onChange={e => {
                      const amt = parseFloat(e.target.value) || 0;
                      const rate = selectedEmployee?.off_day_rate || selectedEmployee?.hourly_rate || 0;
                      const calcDays = rate > 0 ? Math.round(amt / rate) : 0;
                      setFormData(p => ({ ...p, offday_amount_override: amt, total_offday_days: calcDays }));
                    }}
                    step={0.01}
                    min={0}
                    placeholder="Enter amount"
                  />
                </div>
              </div>
              {formData.total_offday_days > 0 && selectedEmployee && (
                <p className="text-xs text-muted-foreground">
                  {formData.total_offday_days} day(s) × {offDayRate} ﷼/day = {offDayAmount.toFixed(2)} ﷼
                </p>
              )}
            </div>

            {/* Total preview */}
            {(formData.total_overtime_hours > 0 || formData.total_offday_days > 0) && selectedEmployee && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">
                  Total: <span className="text-foreground">{(overtimeAmount + offDayAmount).toFixed(2)} ﷼</span>
                </p>
              </div>
            )}

            {/* Details / Notes */}
            <div className="space-y-2">
              <Label>Details (optional)</Label>
              <Textarea
                value={formData.notes}
                onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                placeholder="Describe overtime details for each day, reasons, etc."
                rows={3}
              />
            </div>

            {/* Optional daily breakdown toggle */}
            <div className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => {
                  setShowDailyBreakdown(!showDailyBreakdown);
                  if (!showDailyBreakdown && dailyBreakdown.length === 0) {
                    addDailyRow();
                  }
                }}
              >
                {showDailyBreakdown ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
                {showDailyBreakdown ? 'Hide' : 'Add'} Daily Breakdown (Optional)
              </Button>
            </div>

            {/* Daily breakdown rows */}
            {showDailyBreakdown && (
              <div className="space-y-2 border border-border/50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs text-muted-foreground">Daily Breakdown</Label>
                  <div className="text-xs text-muted-foreground">
                    OT: {dailyOTTotal}h | Off: {dailyODTotal} days
                  </div>
                </div>
                {dailyBreakdown.map((row, i) => (
                  <div key={i} className="grid grid-cols-[1fr_80px_60px_32px] gap-2 items-center">
                    <div>
                      <Input
                        type="date"
                        value={row.date}
                        onChange={e => updateDailyRow(i, 'date', e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Input
                        type="number"
                        value={row.overtime_hours || ''}
                        onChange={e => updateDailyRow(i, 'overtime_hours', parseFloat(e.target.value) || 0)}
                        placeholder="OT hrs"
                        step={0.5}
                        min={0}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="flex items-center justify-center">
                      <label className="flex items-center gap-1 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={row.is_offday}
                          onChange={e => updateDailyRow(i, 'is_offday', e.target.checked)}
                          className="rounded"
                        />
                        Off
                      </label>
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeDailyRow(i)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" className="w-full text-xs" onClick={addDailyRow}>
                  <Plus className="w-3 h-3 mr-1" /> Add Day
                </Button>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit">Add Entry</Button>
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
                <div className="flex gap-2">
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
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleRecordPayment}>Record Payment</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
