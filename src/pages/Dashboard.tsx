import { 
  Package, 
  Box, 
  Users, 
  ClipboardList,
  Warehouse,
  UserCog,
  Building2,
  Clock,
  Settings,
  CheckSquare,
  ClipboardCheck,
  Receipt,
  Coffee
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { WorkspaceCard } from '@/components/dashboard/WorkspaceCard';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface WorkspaceItem {
  title: string;
  description: string;
  icon: typeof ClipboardList;
  href: string;
  color: string;
  adminOnly?: boolean;
}

const workspaces: WorkspaceItem[] = [
  {
    title: 'B2B Orders',
    description: 'Kanban board',
    icon: ClipboardList,
    href: '/orders',
    color: '#3B82F6',
  },
  {
    title: 'Inventory',
    description: 'Stock management',
    icon: Warehouse,
    href: '/inventory',
    color: '#10B981',
  },
  {
    title: 'Employees',
    description: 'Team tracking',
    icon: UserCog,
    href: '/employees',
    color: '#8B5CF6',
    adminOnly: true,
  },
  {
    title: 'Clients',
    description: 'Customer database',
    icon: Building2,
    href: '/clients',
    color: '#F59E0B',
  },
  {
    title: 'Overtime',
    description: 'Hours tracking',
    icon: Clock,
    href: '/overtime',
    color: '#EF4444',
  },
  {
    title: 'Daily Duties',
    description: 'Check-in tasks',
    icon: CheckSquare,
    href: '/daily-duties',
    color: '#06B6D4',
  },
  {
    title: 'Quality Check',
    description: 'Weekly inspections',
    icon: ClipboardCheck,
    href: '/quality-check',
    color: '#EC4899',
  },
  {
    title: 'Registering Sales',
    description: 'Daily sales tracking',
    icon: Receipt,
    href: '/sales',
    color: '#14B8A6',
  },
  {
    title: 'Products',
    description: 'Product catalog & aliases',
    icon: Coffee,
    href: '/products',
    color: '#D97706',
  },
  {
    title: 'Settings',
    description: 'App configuration',
    icon: Settings,
    href: '/settings',
    color: '#6B7280',
  },
];

export default function Dashboard() {
  const { profile, isAdmin } = useAuth();

  // Fetch active orders count (rows not in completed/delivered groups)
  const { data: activeOrdersCount = 0 } = useQuery({
    queryKey: ['dashboard-active-orders'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('board_rows')
        .select('*', { count: 'exact', head: true });
      
      if (error) throw error;
      return count || 0;
    },
  });

  // Fetch clients count
  const { data: clientsCount = 0 } = useQuery({
    queryKey: ['dashboard-clients'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true });
      
      if (error) throw error;
      return count || 0;
    },
  });

  // Fetch inventory status (percentage of items above threshold)
  const { data: inventoryStatus = 0 } = useQuery({
    queryKey: ['dashboard-inventory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('current_stock, min_threshold');
      
      if (error) throw error;
      if (!data || data.length === 0) return 0;
      
      const healthyItems = data.filter(
        item => (item.current_stock || 0) > (item.min_threshold || 0)
      ).length;
      
      return Math.round((healthyItems / data.length) * 100);
    },
  });

  // Fetch recent activity (last 4 inventory movements or duty completions)
  const { data: recentActivity = [] } = useQuery({
    queryKey: ['dashboard-activity'],
    queryFn: async () => {
      const { data: movements, error } = await supabase
        .from('inventory_movements')
        .select('id, type, quantity, created_at, item_id, inventory_items(name)')
        .order('created_at', { ascending: false })
        .limit(4);
      
      if (error) throw error;
      
      return (movements || []).map(m => ({
        action: m.type === 'in' ? 'Stock added' : 'Stock removed',
        detail: `${m.inventory_items?.name || 'Unknown item'} - ${m.quantity} units`,
        time: formatRelativeTime(new Date(m.created_at || '')),
      }));
    },
  });

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
        {/* Welcome Section */}
        <div className="mb-6 sm:mb-10 animate-fade-in">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-foreground tracking-tight">
            Welcome back, {profile?.username}
          </h1>
          <p className="text-muted-foreground mt-1 sm:mt-2 text-base sm:text-lg">
            Here's what's happening with your roastery today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-6 sm:mb-10">
          <div className="animate-slide-up" style={{ animationDelay: '0.05s' }}>
            <StatCard
              title="Total Revenue"
              value="﷼0"
              subtitle="This month"
            />
          </div>
          <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <StatCard
              title="Active Orders"
              value={activeOrdersCount}
              subtitle="In pipeline"
              icon={Package}
            />
          </div>
          <div className="animate-slide-up" style={{ animationDelay: '0.15s' }}>
            <StatCard
              title="Inventory Status"
              value={`${inventoryStatus}%`}
              subtitle="Stock levels"
              icon={Box}
            />
          </div>
          <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <StatCard
              title="Active Clients"
              value={clientsCount}
              subtitle="B2B customers"
              icon={Users}
            />
          </div>
        </div>

        {/* Workspaces */}
        <div className="mb-6 sm:mb-10">
          <h2 className="section-header mb-3 sm:mb-5">Workspaces</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {workspaces.filter(w => !w.adminOnly || isAdmin).map((workspace, index) => (
              <div
                key={workspace.title}
                className="animate-slide-up"
                style={{ animationDelay: `${0.05 + index * 0.03}s` }}
              >
                <WorkspaceCard {...workspace} />
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className="section-header mb-5">Recent Activity</h2>
          <div className="card-premium p-6">
            <div className="space-y-1">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between py-4 border-b border-border/40 last:border-0">
                    <div>
                      <p className="font-medium text-foreground">{activity.action}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{activity.detail}</p>
                    </div>
                    <span className="text-sm text-muted-foreground">{activity.time}</span>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  No recent activity
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}
