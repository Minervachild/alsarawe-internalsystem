import { useState, useEffect } from 'react';
import { Settings2, PlusCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { SalesForm } from '@/components/sales/SalesForm';
import { SalesDashboard } from '@/components/sales/SalesDashboard';
import { BranchManager } from '@/components/sales/BranchManager';

export default function Sales() {
  const { user, isAdmin, profile } = useAuth();
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [registerOpen, setRegisterOpen] = useState(false);

  useEffect(() => {
    if (user && profile) {
      fetchEmployeeId();
    }
  }, [user, profile]);

  const fetchEmployeeId = async () => {
    try {
      const { data } = await supabase
        .from('employees')
        .select('id')
        .eq('profile_id', profile?.id)
        .maybeSingle();

      setEmployeeId(data?.id || null);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="animate-pulse-soft text-muted-foreground">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  // Employee view: just the form
  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="p-6 max-w-full">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-foreground">Register Sales</h1>
            <p className="text-muted-foreground">Submit your end-of-shift sales data</p>
          </div>
          <SalesForm employeeId={employeeId} />
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