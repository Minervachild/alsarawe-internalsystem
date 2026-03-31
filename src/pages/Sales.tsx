import { useState, useEffect } from 'react';
import { Settings2, PlusCircle, Pencil, Building2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { SalesForm } from '@/components/sales/SalesForm';
import { SalesDashboard } from '@/components/sales/SalesDashboard';
import { BranchManager } from '@/components/sales/BranchManager';
import { EditSalesEntryDialog } from '@/components/sales/EditSalesEntryDialog';
import { format } from 'date-fns';

interface SalesEntry {
  id: string;
  date: string;
  shift: string;
  branch_id: string;
  cash_amount: number;
  card_amount: number;
  transaction_count: number;
  status: string;
  branches?: { name: string };
}

interface Branch {
  id: string;
  name: string;
}

export default function Sales() {
  const { user, isAdmin, profile, isLoading: authLoading } = useAuth();
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [myEntries, setMyEntries] = useState<SalesEntry[]>([]);
  const [myBranches, setMyBranches] = useState<Branch[]>([]);
  const [editEntry, setEditEntry] = useState<SalesEntry | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (user && profile) {
      setIsLoading(true);
      fetchEmployeeId();
    } else {
      setEmployeeId(null);
      setIsLoading(false);
    }
  }, [user, profile, authLoading]);

  const fetchEmployeeId = async () => {
    if (!user) {
      setEmployeeId(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('get_employee_id_for_user', {
        _user_id: user.id,
      });

      if (error) {
        console.error('Error fetching employee ID:', error);
        throw error;
      }
      console.log('Fetched employee ID for user', user.id, ':', data);
      setEmployeeId(data || null);
    } catch (err) {
      console.error('Failed to fetch employee ID:', err);
      setEmployeeId(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch employee's own sales entries
  const fetchMyEntries = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('sales_entries')
      .select('*, branches(name)')
      .eq('submitted_by', user.id)
      .order('date', { ascending: false })
      .limit(20);
    if (data) setMyEntries(data as any[]);
  };

  const fetchMyBranches = async () => {
    if (!employeeId) return;
    const { data } = await supabase
      .from('branch_assignments')
      .select('branch_id, branches(id, name)')
      .eq('employee_id', employeeId);
    if (data) {
      setMyBranches(data.map((ba: any) => ba.branches).filter(Boolean));
    }
  };

  useEffect(() => {
    if (!isAdmin && user) {
      fetchMyEntries();
    }
  }, [user, isAdmin]);

  useEffect(() => {
    if (!isAdmin && employeeId) {
      fetchMyBranches();
    }
  }, [employeeId, isAdmin]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="animate-pulse-soft text-muted-foreground">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  // Employee view: form + their entries list
  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="p-6 max-w-full">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-foreground">Register Sales</h1>
            <p className="text-muted-foreground">Submit your end-of-shift sales data</p>
          </div>
          <SalesForm employeeId={employeeId} onSuccess={() => fetchMyEntries()} />

          {/* My Entries */}
          {myEntries.length > 0 && (
            <div className="mt-8 max-w-lg mx-auto">
              <h3 className="font-semibold mb-3">My Submissions</h3>
              <div className="space-y-2">
                {myEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="card-premium p-3 flex items-center justify-between"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">
                          {format(new Date(entry.date), 'MMM dd, yyyy')}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                          entry.shift === 'morning'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                            : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                        }`}>
                          {entry.shift === 'morning' ? 'AM' : 'PM'}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium inline-flex items-center gap-0.5 ${
                          entry.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : entry.status === 'rejected'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        }`}>
                          {entry.status === 'approved' ? <CheckCircle className="w-3 h-3" /> :
                           entry.status === 'rejected' ? <XCircle className="w-3 h-3" /> :
                           <Clock className="w-3 h-3" />}
                          {entry.status}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {(entry as any).branches?.name || '—'}
                      </div>
                    </div>
                    {entry.status === 'submitted' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => { setEditEntry(entry); setEditOpen(true); }}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <EditSalesEntryDialog
            entry={editEntry}
            branches={myBranches}
            open={editOpen}
            onOpenChange={setEditOpen}
            onUpdated={fetchMyEntries}
          />
        </div>
      </AppLayout>
    );
  }

  // Admin view: dashboard + branch management + register dialog
  return (
    <AppLayout>
      <div className="p-6 max-w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Registering Sales</h1>
            <p className="text-muted-foreground">Review submissions and manage branches</p>
          </div>
          <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1.5">
                <PlusCircle className="w-4 h-4" />
                Register Sale
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Register Sale</DialogTitle>
              </DialogHeader>
              <SalesForm employeeId={employeeId} onSuccess={() => setRegisterOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList>
            <TabsTrigger value="dashboard">Sales Dashboard</TabsTrigger>
            <TabsTrigger value="branches" className="gap-1.5">
              <Settings2 className="w-3.5 h-3.5" />
              Branches
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <SalesDashboard />
          </TabsContent>

          <TabsContent value="branches">
            <BranchManager />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}