import { Home, Bell, Settings, Sun, Moon, LogOut, User, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { signOut } from '@/lib/auth';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function Header() {
  const { profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    }
    
    // Fetch logo from settings
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase
      .from('app_settings')
      .select('logo_url')
      .limit(1)
      .maybeSingle();
    
    if (data?.logo_url) {
      setLogoUrl(data.logo_url);
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const handleLogout = async () => {
    try {
      await signOut();
      toast({
        title: 'Logged out',
        description: 'You have been signed out successfully.',
      });
      navigate('/');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to sign out.',
        variant: 'destructive',
      });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="h-16 border-b border-border/60 bg-background/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="h-full px-4 lg:px-6 flex items-center justify-between max-w-[1600px] mx-auto">
        {/* Left section */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/dashboard')}
            className={`rounded-xl ${location.pathname === '/dashboard' ? 'bg-secondary' : ''}`}
          >
            <Home className="w-5 h-5" />
          </Button>

          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/dashboard')}>
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-9 w-auto object-contain" />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">RF</span>
              </div>
            )}
            <span className="font-semibold text-lg hidden sm:block tracking-tight">
              RoastFlow
            </span>
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="rounded-xl relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-accent" />
          </Button>

          <Button 
            variant="ghost" 
            size="icon"
            className="rounded-xl"
            onClick={() => navigate('/settings')}
          >
            <Settings className="w-5 h-5" />
          </Button>

          <Button variant="ghost" size="icon" className="rounded-xl" onClick={toggleTheme}>
            {theme === 'light' ? (
              <Moon className="w-5 h-5" />
            ) : (
              <Sun className="w-5 h-5" />
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 px-2 rounded-xl ml-1">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-medium text-primary-foreground"
                  style={{ backgroundColor: profile?.avatar_color || 'hsl(var(--primary))' }}
                >
                  {profile ? getInitials(profile.username) : <User className="w-4 h-4" />}
                </div>
                <span className="hidden md:block font-medium">{profile?.username}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl">
              <div className="px-3 py-2">
                <p className="text-sm font-medium">{profile?.username}</p>
                <p className="text-xs text-muted-foreground">
                  {isAdmin ? 'Administrator' : 'Team Member'}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/settings')} className="rounded-lg mx-1">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive rounded-lg mx-1">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
