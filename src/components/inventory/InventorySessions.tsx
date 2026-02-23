import { useState, useEffect } from 'react';
import { Plus, ClipboardList, Play, CheckCircle2, User, Calendar, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
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
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

interface Employee {
  id: string;
  name: string;
  avatar_color: string | null;
}

interface InventoryItem {
  id: string;
  name: string;
  current_stock: number;
  unit: string;
  category_id: string | null;
  category?: { id: string; name: string; color: string } | null;
}

interface Session {
  id: string;
  scheduled_date: string;
  status: string;
  assigned_employee_id: string | null;
  completed_by_employee_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
}

interface SessionItem {
  id: string;
  session_id: string;
  item_id: string;
  consumption_qty: number;
  reason: string | null;
  notes: string | null;
}

const stockOutReasons = [
  { value: 'consumption', label: 'Consumption' },
  { value: 'waste', label: 'Waste / Spoilage' },
  { value: 'guest', label: 'Guest Consumption' },
  { value: 'sample', label: 'Sample / Tasting' },
  { value: 'adjustment', label: 'Inventory Adjustment' },
];

interface InventorySessionsProps {
  items: InventoryItem[];
  employees: Employee[];
  onRefreshData: () => void;
}

export function InventorySessions({ items, employees, onRefreshData }: InventorySessionsProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [sessionItems, setSessionItems] = useState<SessionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  // Create form state
  const [scheduledDate, setScheduledDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [assignedEmployeeId, setAssignedEmployeeId] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [sessionNotes, setSessionNotes] = useState('');

  // Active session tracking state
  const [itemEntries, setItemEntries] = useState<Record<string, { qty: number; reason: string; notes: string }>>({});

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_sessions')
        .select('*')
        .order('scheduled_date', { ascending: false });
      if (error) throw error;
      setSessions(data || []);
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to fetch sessions.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItemIds.length === 0) {
      toast({ title: 'Error', description: 'Select at least one item.', variant: 'destructive' });
      return;
    }
    try {
      const { data: session, error: sessionError } = await supabase
        .from('inventory_sessions')
        .insert({
          scheduled_date: scheduledDate,
          assigned_employee_id: assignedEmployeeId || null,
          notes: sessionNotes || null,
          status: 'scheduled',
        })
        .select()
        .single();
      if (sessionError) throw sessionError;

      const sessionItemsPayload = selectedItemIds.map(itemId => ({
        session_id: session.id,
        item_id: itemId,
        consumption_qty: 0,
        reason: 'consumption',
      }));

      const { error: itemsError } = await supabase
        .from('inventory_session_items')
        .insert(sessionItemsPayload);
      if (itemsError) throw itemsError;

      toast({ title: 'Session scheduled' });
      setCreateDialogOpen(false);
      resetCreateForm();
      fetchSessions();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const resetCreateForm = () => {
    setScheduledDate(format(new Date(), 'yyyy-MM-dd'));
    setAssignedEmployeeId('');
    setSelectedItemIds([]);
    setSessionNotes('');
  };

  const openSession = async (session: Session) => {
    try {
      // If scheduled, start it
      if (session.status === 'scheduled') {
        await supabase
          .from('inventory_sessions')
          .update({ status: 'in_progress', started_at: new Date().toISOString() })
          .eq('id', session.id);
        session = { ...session, status: 'in_progress', started_at: new Date().toISOString() };
      }

      const { data: sItems, error } = await supabase
        .from('inventory_session_items')
        .select('*')
        .eq('session_id', session.id);
      if (error) throw error;

      setSessionItems(sItems || []);
      setActiveSession(session);

      // Initialize entries from existing data
      const entries: Record<string, { qty: number; reason: string; notes: string }> = {};
      (sItems || []).forEach(si => {
        entries[si.item_id] = {
          qty: si.consumption_qty || 0,
          reason: si.reason || 'consumption',
          notes: si.notes || '',
        };
      });
      setItemEntries(entries);
      fetchSessions();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleCompleteSession = async () => {
    if (!activeSession) return;
    try {
      // Update each session item
      for (const si of sessionItems) {
        const entry = itemEntries[si.item_id];
        if (!entry) continue;

        await supabase
          .from('inventory_session_items')
          .update({
            consumption_qty: entry.qty,
            reason: entry.reason,
            notes: entry.notes || null,
          })
          .eq('id', si.id);

        // Apply stock changes if qty > 0
        if (entry.qty > 0) {
          const item = items.find(i => i.id === si.item_id);
          if (!item) continue;

          const newStock = Math.max(0, item.current_stock - entry.qty);

          // Record movement
          await supabase.from('inventory_movements').insert({
            item_id: si.item_id,
            type: 'out',
            quantity: entry.qty,
            unit_price: 0,
            vat_rate: 0,
            total_price: 0,
            reason: entry.reason || 'consumption',
            notes: `Session count - ${entry.notes || ''}`.trim(),
          });

          // Update stock
          await supabase
            .from('inventory_items')
            .update({ current_stock: newStock })
            .eq('id', si.item_id);
        }
      }

      // Get employee id for the current user
      const { data: empData } = await supabase.rpc('get_employee_id_for_user', { _user_id: (await supabase.auth.getUser()).data.user?.id || '' });

      // Mark session as completed
      await supabase
        .from('inventory_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by_employee_id: empData || activeSession.assigned_employee_id,
        })
        .eq('id', activeSession.id);

      toast({ title: 'Session completed', description: 'Stock levels updated.' });
      setActiveSession(null);
      setSessionItems([]);
      setItemEntries({});
      fetchSessions();
      onRefreshData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const getEmployeeName = (id: string | null) => {
    if (!id) return 'Unassigned';
    return employees.find(e => e.id === id)?.name || 'Unknown';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled': return <Badge variant="outline" className="text-primary border-primary">Scheduled</Badge>;
      case 'in_progress': return <Badge className="bg-warning text-warning-foreground">In Progress</Badge>;
      case 'completed': return <Badge className="bg-success text-white">Completed</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItemIds(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Counting Sessions</h2>
        {isAdmin && (
          <Button onClick={() => { resetCreateForm(); setCreateDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Schedule Session
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No sessions scheduled yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map(session => (
            <div key={session.id} className="bg-card rounded-xl border border-border/50 p-4 hover-lift">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">
                        {format(new Date(session.scheduled_date), 'MMM d, yyyy')}
                      </span>
                      {getStatusBadge(session.status)}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {getEmployeeName(session.assigned_employee_id)}
                      </span>
                      {session.completed_by_employee_id && session.status === 'completed' && (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Done by: {getEmployeeName(session.completed_by_employee_id)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {session.status !== 'completed' && (
                  <Button size="sm" onClick={() => openSession(session)}>
                    <Play className="w-3 h-3 mr-1" />
                    {session.status === 'scheduled' ? 'Start' : 'Continue'}
                  </Button>
                )}
                {session.status === 'completed' && (
                  <Button size="sm" variant="outline" onClick={() => openSession(session)}>
                    View
                  </Button>
                )}
              </div>
              {session.notes && (
                <p className="text-sm text-muted-foreground mt-2">{session.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Session Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Schedule Counting Session</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSession} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Assign To</Label>
                <Select value={assignedEmployeeId} onValueChange={setAssignedEmployeeId}>
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
            </div>

            <div className="space-y-2">
              <Label>Select Items to Count *</Label>
              <div className="border border-border rounded-lg max-h-60 overflow-y-auto">
                {items.map(item => (
                  <label
                    key={item.id}
                    className="flex items-center gap-3 p-3 hover:bg-muted/30 cursor-pointer border-b border-border/30 last:border-b-0"
                  >
                    <Checkbox
                      checked={selectedItemIds.includes(item.id)}
                      onCheckedChange={() => toggleItemSelection(item.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">{item.name}</span>
                      {item.category && (
                        <span className="text-xs text-muted-foreground ml-2">{item.category.name}</span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{item.current_stock} {item.unit}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{selectedItemIds.length} items selected</p>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                placeholder="e.g., End of week count"
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={selectedItemIds.length === 0}>Schedule</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Active Session Dialog */}
      <Dialog open={!!activeSession} onOpenChange={(open) => { if (!open) setActiveSession(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              {activeSession?.status === 'completed' ? 'Session Results' : 'Count Session'}
              {activeSession && getStatusBadge(activeSession.status)}
            </DialogTitle>
          </DialogHeader>

          {activeSession && (
            <div className="space-y-4 mt-2">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {format(new Date(activeSession.scheduled_date), 'MMM d, yyyy')}
                </span>
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  {getEmployeeName(activeSession.assigned_employee_id)}
                </span>
              </div>

              <div className="space-y-3">
                {sessionItems.map(si => {
                  const item = items.find(i => i.id === si.item_id);
                  if (!item) return null;
                  const entry = itemEntries[si.item_id] || { qty: 0, reason: 'consumption', notes: '' };
                  const isCompleted = activeSession.status === 'completed';

                  return (
                    <div key={si.id} className="border border-border/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-sm">{item.name}</span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          Current: {item.current_stock} {item.unit}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Consumed Qty</Label>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={entry.qty}
                            onChange={(e) => setItemEntries(prev => ({
                              ...prev,
                              [si.item_id]: { ...entry, qty: parseFloat(e.target.value) || 0 }
                            }))}
                            disabled={isCompleted}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Reason</Label>
                          <Select
                            value={entry.reason}
                            onValueChange={(val) => setItemEntries(prev => ({
                              ...prev,
                              [si.item_id]: { ...entry, reason: val }
                            }))}
                            disabled={isCompleted}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-popover">
                              {stockOutReasons.map(r => (
                                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Notes</Label>
                          <Input
                            value={entry.notes}
                            onChange={(e) => setItemEntries(prev => ({
                              ...prev,
                              [si.item_id]: { ...entry, notes: e.target.value }
                            }))}
                            disabled={isCompleted}
                            className="h-8 text-sm"
                            placeholder="Optional"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {activeSession.status !== 'completed' && (
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setActiveSession(null)}>Save & Close</Button>
                  <Button onClick={handleCompleteSession}>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Complete Session
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
