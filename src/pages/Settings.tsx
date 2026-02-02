import { useState, useEffect } from 'react';
import { Upload, Palette, Sun, Moon, Monitor, Save, X, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AppLayout } from '@/components/layout/AppLayout';
import { ColorPicker } from '@/components/settings/ColorPicker';
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
    primary_color: '#5D3A1A',
    secondary_color: '#F5F0EB',
    accent_color: '#E69500',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
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
        if (data.logo_url) {
          setLogoPreview(data.logo_url);
        }
      }
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to fetch settings.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setSettings(prev => ({ ...prev, logo_url: null }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      let logoUrl = settings.logo_url;

      // Upload logo if a new file is selected
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `logo-${Date.now()}.${fileExt}`;
        
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('delivery-proofs')
          .upload(`logos/${fileName}`, logoFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('delivery-proofs')
          .getPublicUrl(`logos/${fileName}`);

        logoUrl = urlData.publicUrl;
      }

      const settingsData = {
        logo_url: logoUrl,
        theme: settings.theme,
        primary_color: settings.primary_color,
        secondary_color: settings.secondary_color,
        accent_color: settings.accent_color,
      };

      if (settings.id) {
        const { error } = await supabase
          .from('app_settings')
          .update(settingsData)
          .eq('id', settings.id);
        
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('app_settings')
          .insert(settingsData)
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

      // Apply custom colors to CSS variables
      applyCustomColors(settings);

      localStorage.setItem('theme', settings.theme);
      toast({ title: 'Settings saved', description: 'Your changes have been applied.' });
      
      // Force reload to apply logo changes
      window.location.reload();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const applyCustomColors = (settings: Settings) => {
    const root = document.documentElement;
    
    // Convert hex to HSL for CSS variables
    const hexToHsl = (hex: string): string => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (!result) return '25 55% 30%';

      const r = parseInt(result[1], 16) / 255;
      const g = parseInt(result[2], 16) / 255;
      const b = parseInt(result[3], 16) / 255;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0;
      let s = 0;
      const l = (max + min) / 2;

      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
          case g: h = ((b - r) / d + 2) / 6; break;
          case b: h = ((r - g) / d + 4) / 6; break;
        }
      }

      return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    };

    root.style.setProperty('--primary', hexToHsl(settings.primary_color));
    root.style.setProperty('--accent', hexToHsl(settings.accent_color));
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="animate-pulse text-muted-foreground">Loading settings...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">Settings</h1>
            <p className="text-muted-foreground mt-1">Customize your application</p>
          </div>
          <Button onClick={handleSave} disabled={isSaving} className="rounded-xl btn-premium">
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        <div className="space-y-6">
          {/* Branding */}
          <div className="card-premium p-6">
            <h2 className="section-header mb-5 flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Brand Logo
            </h2>
            <div className="space-y-4">
              {logoPreview ? (
                <div className="relative inline-block">
                  <img 
                    src={logoPreview} 
                    alt="Logo preview" 
                    className="h-20 w-auto object-contain rounded-xl border border-border p-2"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full"
                    onClick={removeLogo}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/40 transition-colors">
                  <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">Click to upload logo</span>
                  <span className="text-xs text-muted-foreground mt-1">PNG, JPG up to 2MB</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoChange}
                  />
                </label>
              )}
              <p className="text-sm text-muted-foreground">
                Your logo will appear in the header navigation.
              </p>
            </div>
          </div>

          {/* Theme */}
          <div className="card-premium p-6">
            <h2 className="section-header mb-5">Theme</h2>
            <RadioGroup
              value={settings.theme}
              onValueChange={(value) => setSettings(prev => ({ ...prev, theme: value }))}
              className="grid grid-cols-3 gap-4"
            >
              <Label
                htmlFor="light"
                className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 cursor-pointer transition-all ${
                  settings.theme === 'light' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                }`}
              >
                <RadioGroupItem value="light" id="light" className="sr-only" />
                <Sun className="w-6 h-6" />
                <span className="text-sm font-medium">Light</span>
              </Label>
              <Label
                htmlFor="dark"
                className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 cursor-pointer transition-all ${
                  settings.theme === 'dark' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                }`}
              >
                <RadioGroupItem value="dark" id="dark" className="sr-only" />
                <Moon className="w-6 h-6" />
                <span className="text-sm font-medium">Dark</span>
              </Label>
              <Label
                htmlFor="system"
                className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 cursor-pointer transition-all ${
                  settings.theme === 'system' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                }`}
              >
                <RadioGroupItem value="system" id="system" className="sr-only" />
                <Monitor className="w-6 h-6" />
                <span className="text-sm font-medium">System</span>
              </Label>
            </RadioGroup>
          </div>

          {/* Colors */}
          <div className="card-premium p-6">
            <h2 className="section-header mb-5 flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Brand Colors
            </h2>
            <p className="text-sm text-muted-foreground mb-5">
              Customize the color palette to match your brand identity.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <ColorPicker
                label="Primary Color"
                value={settings.primary_color}
                onChange={(color) => setSettings(prev => ({ ...prev, primary_color: color }))}
              />
              <ColorPicker
                label="Secondary Color"
                value={settings.secondary_color}
                onChange={(color) => setSettings(prev => ({ ...prev, secondary_color: color }))}
              />
              <ColorPicker
                label="Accent Color"
                value={settings.accent_color}
                onChange={(color) => setSettings(prev => ({ ...prev, accent_color: color }))}
              />
            </div>
            
            {/* Color Preview */}
            <div className="mt-6 p-4 rounded-xl border border-border bg-muted/30">
              <p className="text-sm text-muted-foreground mb-3">Preview</p>
              <div className="flex items-center gap-3">
                <div 
                  className="h-10 px-4 rounded-xl flex items-center justify-center text-sm font-medium text-white"
                  style={{ backgroundColor: settings.primary_color }}
                >
                  Primary Button
                </div>
                <div 
                  className="h-10 px-4 rounded-xl flex items-center justify-center text-sm font-medium border-2"
                  style={{ borderColor: settings.primary_color, color: settings.primary_color }}
                >
                  Outline Button
                </div>
                <div 
                  className="h-10 px-4 rounded-xl flex items-center justify-center text-sm font-medium text-white"
                  style={{ backgroundColor: settings.accent_color }}
                >
                  Accent
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
