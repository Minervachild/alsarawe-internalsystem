import { ClipboardCheck, Plus, Calendar } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';

export default function QualityCheck() {
  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">Weekly Quality Check</h1>
            <p className="text-muted-foreground mt-1">Scheduled quality inspections with countdown reminders</p>
          </div>
          <Button className="rounded-xl btn-premium">
            <Plus className="w-4 h-4 mr-2" />
            Schedule Check
          </Button>
        </div>

        <div className="card-premium p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <ClipboardCheck className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Quality Check Module</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Schedule weekly quality check events with sections for Machines, Coffee, Hygiene, and Shop Cleanliness.
            The system shows countdown reminders and records who performed each check.
          </p>
          <p className="text-sm text-muted-foreground mt-4">
            Coming soon: Full implementation with customizable checklists and employee tracking.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
