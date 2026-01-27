import { 
  DollarSign, 
  Package, 
  Box, 
  Users, 
  ClipboardList,
  Warehouse,
  UserCog,
  Building2,
  Clock,
  KeyRound,
  UserCircle,
  Settings
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { WorkspaceCard } from '@/components/dashboard/WorkspaceCard';
import { useAuth } from '@/contexts/AuthContext';

const workspaces = [
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
    title: 'Accounts',
    description: 'Credential manager',
    icon: KeyRound,
    href: '/accounts',
    color: '#06B6D4',
  },
  {
    title: 'Users',
    description: 'Access control',
    icon: UserCircle,
    href: '/users',
    color: '#EC4899',
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

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Welcome Section */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl font-display font-bold text-foreground">
            Welcome back, {profile?.username}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's what's happening with your roastery today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <StatCard
              title="Total Revenue"
              value="$24,532"
              subtitle="This month"
              icon={DollarSign}
              trend={{ value: 12, isPositive: true }}
            />
          </div>
          <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <StatCard
              title="Active Orders"
              value="18"
              subtitle="In pipeline"
              icon={Package}
              trend={{ value: 5, isPositive: true }}
            />
          </div>
          <div className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <StatCard
              title="Inventory Status"
              value="89%"
              subtitle="Stock levels"
              icon={Box}
            />
          </div>
          <div className="animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <StatCard
              title="Active Clients"
              value="42"
              subtitle="B2B customers"
              icon={Users}
            />
          </div>
        </div>

        {/* Workspaces */}
        <div className="mb-8">
          <h2 className="text-xl font-display font-semibold mb-4">Workspaces</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
            {workspaces.map((workspace, index) => (
              <div
                key={workspace.title}
                className="animate-slide-up"
                style={{ animationDelay: `${0.1 + index * 0.05}s` }}
              >
                <WorkspaceCard {...workspace} />
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className="text-xl font-display font-semibold mb-4">Recent Activity</h2>
          <div className="bg-card rounded-xl border border-border/50 p-6">
            <div className="space-y-4">
              {[
                { action: 'New order added', detail: 'Coffee Express - 50kg Ethiopian', time: '2 min ago' },
                { action: 'Order shipped', detail: 'Brew Masters - 30kg Colombian', time: '1 hour ago' },
                { action: 'Payment received', detail: 'Roast House - $1,250', time: '3 hours ago' },
                { action: 'Inventory updated', detail: 'Brazilian Santos restocked', time: '5 hours ago' },
              ].map((activity, index) => (
                <div key={index} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
                  <div>
                    <p className="font-medium text-foreground">{activity.action}</p>
                    <p className="text-sm text-muted-foreground">{activity.detail}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{activity.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
