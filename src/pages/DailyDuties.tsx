import { CheckSquare, Plus } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';

export default function DailyDuties() {
  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">Daily Check-In Duties</h1>
            <p className="text-muted-foreground mt-1">Role-specific duty checklists for shift start</p>
          </div>
          <Button className="rounded-xl btn-premium">
            <Plus className="w-4 h-4 mr-2" />
            Add Duty Category
          </Button>
        </div>

        <div className="card-premium p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <CheckSquare className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Daily Duties Module</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            This module will allow employees to view and complete role-specific duties when starting their shift.
            Duties are grouped by category (Cleaning, Quality, Service, etc.) and logged with date/time.
          </p>
          <p className="text-sm text-muted-foreground mt-4">
            Coming soon: Full implementation with duty categories, role assignments, and manager overview.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
