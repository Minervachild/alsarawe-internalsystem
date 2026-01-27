import { useState, useEffect } from 'react';
import { Plus, Search, Eye, EyeOff, Copy, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const categories = [
  'Email', 'Cloud Storage', 'Analytics', 'Payment', 'Communication', 
  'CRM', 'Development', 'Social Media', 'Database', 'Other'
];

interface Account {
  id: string;
  service_name: string;
  category: string;
  username: string | null;
  encrypted_password: string | null;
  notes: string | null;
}

export default function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({ 
    service_name: '', 
    category: 'Other', 
    username: '', 
    encrypted_password: '',
    notes: '' 
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('app_accounts')
        .select('*')
        .order('service_name');
      
      if (error) throw error;
      setAccounts(data || []);
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to fetch accounts.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingAccount) {
        const { error } = await supabase
          .from('app_accounts')
          .update(formData)
          .eq('id', editingAccount.id);
        
        if (error) throw error;
        toast({ title: 'Account updated' });
      } else {
        const { error } = await supabase.from('app_accounts').insert(formData);
        if (error) throw error;
        toast({ title: 'Account added' });
      }

      setDialogOpen(false);
      setEditingAccount(null);
      resetForm();
      fetchAccounts();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setFormData({ service_name: '', category: 'Other', username: '', encrypted_password: '', notes: '' });
  };

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    setFormData({
      service_name: account.service_name,
      category: account.category || 'Other',
      username: account.username || '',
      encrypted_password: account.encrypted_password || '',
      notes: account.notes || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('app_accounts').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Account deleted' });
      fetchAccounts();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: `${label} copied to clipboard.` });
  };

  const filteredAccounts = accounts.filter(account =>
    account.service_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    account.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Email': '#EA4335',
      'Cloud Storage': '#4285F4',
      'Analytics': '#34A853',
      'Payment': '#FBBC05',
      'Communication': '#00BCD4',
      'CRM': '#9C27B0',
      'Development': '#795548',
      'Social Media': '#E91E63',
      'Database': '#FF5722',
      'Other': '#607D8B',
    };
    return colors[category] || '#607D8B';
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">App Accounts</h1>
            <p className="text-muted-foreground">Securely store third-party credentials</p>
          </div>
          <Button onClick={() => {
            setEditingAccount(null);
            resetForm();
            setDialogOpen(true);
          }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Account
          </Button>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search accounts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : filteredAccounts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No accounts found. Add your first account!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAccounts.map((account) => (
              <div key={account.id} className="bg-card rounded-xl border border-border/50 p-4 hover-lift">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-primary-foreground font-semibold text-sm"
                      style={{ backgroundColor: getCategoryColor(account.category || 'Other') }}
                    >
                      {account.service_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{account.service_name}</h3>
                      <p className="text-xs text-muted-foreground">{account.category}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-popover">
                      <DropdownMenuItem onClick={() => handleEdit(account)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(account.id)} className="text-destructive">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="mt-4 space-y-3">
                  {account.username && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Username</span>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-mono">{account.username}</span>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(account.username!, 'Username')}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                  {account.encrypted_password && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Password</span>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-mono">
                          {visiblePasswords.has(account.id) ? account.encrypted_password : '••••••••'}
                        </span>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-6 w-6"
                          onClick={() => togglePasswordVisibility(account.id)}
                        >
                          {visiblePasswords.has(account.id) ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(account.encrypted_password!, 'Password')}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {account.notes && (
                  <p className="mt-3 text-xs text-muted-foreground border-t border-border/50 pt-3">
                    {account.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingAccount ? 'Edit Account' : 'Add Account'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Service Name *</Label>
              <Input
                value={formData.service_name}
                onChange={(e) => setFormData(prev => ({ ...prev, service_name: e.target.value }))}
                placeholder="e.g. GitHub, Stripe"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={formData.category}
                onValueChange={(val) => setFormData(prev => ({ ...prev, category: val }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Username / Email</Label>
              <Input
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                placeholder="username@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={formData.encrypted_password}
                onChange={(e) => setFormData(prev => ({ ...prev, encrypted_password: e.target.value }))}
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit">{editingAccount ? 'Update' : 'Add'} Account</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
