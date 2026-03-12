import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { PendingApprovalScreen } from "@/components/auth/PendingApprovalScreen";
import { usePageAccess } from "@/hooks/usePageAccess";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import Clients from "./pages/Clients";
import Employees from "./pages/Employees";
import Inventory from "./pages/Inventory";
import Overtime from "./pages/Overtime";
import Accounts from "./pages/Accounts";
import Users from "./pages/Users";
import SettingsPage from "./pages/Settings";
import DailyDuties from "./pages/DailyDuties";
import QualityCheck from "./pages/QualityCheck";
import Sales from "./pages/Sales";

import Expenses from "./pages/Expenses";
import Shipping from "./pages/Shipping";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isActive, profile } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse-soft text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (!isActive && profile) {
    return <PendingApprovalScreen username={profile.username} />;
  }

  return <>{children}</>;
}

function PageProtectedRoute({ page, children }: { page: string; children: React.ReactNode }) {
  const { user, isLoading, isActive, profile } = useAuth();
  const { canAccess, isLoaded } = usePageAccess();

  if (isLoading || !isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse-soft text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (!isActive && profile) {
    return <PendingApprovalScreen username={profile.username} />;
  }

  if (!canAccess(page)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAdmin, isActive, profile } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse-soft text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (!isActive && profile) {
    return <PendingApprovalScreen username={profile.username} />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/orders" element={<PageProtectedRoute page="orders"><Orders /></PageProtectedRoute>} />
      <Route path="/clients" element={<PageProtectedRoute page="clients"><Clients /></PageProtectedRoute>} />
      <Route path="/employees" element={<AdminRoute><Employees /></AdminRoute>} />
      <Route path="/inventory" element={<PageProtectedRoute page="inventory"><Inventory /></PageProtectedRoute>} />
      <Route path="/overtime" element={<PageProtectedRoute page="overtime"><Overtime /></PageProtectedRoute>} />
      <Route path="/accounts" element={<PageProtectedRoute page="accounts"><Accounts /></PageProtectedRoute>} />
      <Route path="/users" element={<AdminRoute><Users /></AdminRoute>} />
      <Route path="/settings" element={<PageProtectedRoute page="settings"><SettingsPage /></PageProtectedRoute>} />
      <Route path="/daily-duties" element={<PageProtectedRoute page="daily-duties"><DailyDuties /></PageProtectedRoute>} />
      <Route path="/quality-check" element={<PageProtectedRoute page="quality-check"><QualityCheck /></PageProtectedRoute>} />
      <Route path="/sales" element={<PageProtectedRoute page="sales"><Sales /></PageProtectedRoute>} />
      
      <Route path="/expenses" element={<PageProtectedRoute page="expenses"><Expenses /></PageProtectedRoute>} />
      <Route path="/shipping" element={<PageProtectedRoute page="shipping"><Shipping /></PageProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;