import { useState, useEffect } from 'react';
import { Upload, Palette, Sun, Moon, Monitor, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Settings {
  id?: string;
  logo_url: string | null;
  theme: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    logo_url: null,
    theme: 'light',
    primary_color: '#8B4513',
    secondary_color: '#D4A574',
    accent_color: '#F59E0B',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      if (data) {
        setSettings(data);
      }
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to fetch settings.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      if (settings.id) {
        const { error } = await supabase
          .from('app_settings')
          .update({
            logo_url: settings.logo_url,
            theme: settings.theme,
            primary_color: settings.primary_color,
            secondary_color: settings.secondary_color,
            accent_color: settings.accent_color,
          })
          .eq('id', settings.id);
        
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('app_settings')
          .insert({
            logo_url: settings.logo_url,
            theme: settings.theme,
            primary_color: settings.primary_color,
            secondary_color: settings.secondary_color,
            accent_color: settings.accent_color,
          })
          .select()
          .single();
        
        if (error) throw error;
        setSettings(data);
      }

      // Apply theme
      if (settings.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (settings.theme === 'light') {
        document.documentElement.classList.remove('dark');
      } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.classList.toggle('dark', prefersDark);
      }

      localStorage.setItem('theme', settings.theme);
      toast({ title: 'Settings saved' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="animate-pulse-soft text-muted-foreground">Loading settings...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground">Customize your application</p>
          </div>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        <div className="space-y-8">
          {/* Branding */}
          <div className="bg-card rounded-xl border border-border/50 p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Branding
            </h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Logo URL</Label>
                <Input
                  value={settings.logo_url || ''}
                  onChange={(e) => setSettings(prev => ({ ...prev, logo_url: e.target.value }))}
                  placeholder="https://example.com/logo.png"
                />
                <p className="text-xs text-muted-foreground">
                  Enter a URL to your logo image. It will appear in the header.
                </p>
              </div>
            </div>
          </div>

          {/* Theme */}
          <div className="bg-card rounded-xl border border-border/50 p-6">
            <h2 className="text-lg font-semibold mb-4">Theme</h2>
            <RadioGroup
              value={settings.theme}
              onValueChange={(value) => setSettings(prev => ({ ...prev, theme: value }))}
              className="grid grid-cols-3 gap-4"
            >
              <Label
                htmlFor="light"
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  settings.theme === 'light' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                }`}
              >
                <RadioGroupItem value="light" id="light" className="sr-only" />
                <Sun className="w-6 h-6" />
                <span className="text-sm font-medium">Light</span>
              </Label>
              <Label
                htmlFor="dark"
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  settings.theme === 'dark' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                }`}
              >
                <RadioGroupItem value="dark" id="dark" className="sr-only" />
                <Moon className="w-6 h-6" />
                <span className="text-sm font-medium">Dark</span>
              </Label>
              <Label
                htmlFor="system"
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  settings.theme === 'system' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                }`}
              >
                <RadioGroupItem value="system" id="system" className="sr-only" />
                <Monitor className="w-6 h-6" />
                <span className="text-sm font-medium">System</span>
              </Label>
            </RadioGroup>
          </div>

          {/* Colors */}
          <div className="bg-card rounded-xl border border-border/50 p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Colors
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={settings.primary_color}
                    onChange={(e) => setSettings(prev => ({ ...prev, primary_color: e.target.value }))}
                    className="w-12 h-10 p-1"
                  />
                  <Input
                    value={settings.primary_color}
                    onChange={(e) => setSettings(prev => ({ ...prev, primary_color: e.target.value }))}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Secondary Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={settings.secondary_color}
                    onChange={(e) => setSettings(prev => ({ ...prev, secondary_color: e.target.value }))}
                    className="w-12 h-10 p-1"
                  />
                  <Input
                    value={settings.secondary_color}
                    onChange={(e) => setSettings(prev => ({ ...prev, secondary_color: e.target.value }))}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Accent Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={settings.accent_color}
                    onChange={(e) => setSettings(prev => ({ ...prev, accent_color: e.target.value }))}
                    className="w-12 h-10 p-1"
                  />
                  <Input
                    value={settings.accent_color}
                    onChange={(e) => setSettings(prev => ({ ...prev, accent_color: e.target.value }))}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Note: Color changes will apply globally after saving and refreshing the page.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
