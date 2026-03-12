import { useState, useEffect } from 'react';
import { Plus, Search, Phone, MapPin, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface Client {
  id: string;
  name: string;
  phone: string | null;
  location: string | null;
  logo_url: string | null;
}

interface ClientsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientsDialog({ open, onOpenChange }: ClientsDialogProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', location: '', logo_url: '' });
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  useEffect(() => {
    if (open) fetchClients();
  }, [open]);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name');
      if (error) throw error;
      setClients(data || []);
    } catch {
      toast({ title: 'Error', description: 'Failed to fetch clients.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingClient) {
        const { error } = await supabase.from('clients').update(formData).eq('id', editingClient.id);
        if (error) throw error;
        toast({ title: 'Client updated' });
      } else {
        const { error } = await supabase.from('clients').insert(formData);
        if (error) throw error;
        toast({ title: 'Client added' });
      }
      setEditDialogOpen(false);
      setEditingClient(null);
      setFormData({ name: '', phone: '', location: '', logo_url: '' });
      fetchClients();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      phone: client.phone || '',
      location: client.location || '',
      logo_url: client.logo_url || '',
    });
    setEditDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Client deleted' });
      fetchClients();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Clients</DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-2 mt-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button size="sm" onClick={() => {
              setEditingClient(null);
              setFormData({ name: '', phone: '', location: '', logo_url: '' });
              setEditDialogOpen(true);
            }}>
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No clients found.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              {filteredClients.map((client) => (
                <div key={client.id} className="bg-muted/50 rounded-xl border border-border/50 p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {client.logo_url ? (
                        <img src={client.logo_url} alt={client.name} className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-semibold text-primary">
                            {client.name.slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <h3 className="font-semibold text-sm text-foreground">{client.name}</h3>
                    </div>
                    {isAdmin && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover">
                          <DropdownMenuItem onClick={() => handleEdit(client)}>
                            <Pencil className="w-4 h-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(client.id)} className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  <div className="mt-2 space-y-1">
                    {client.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Phone className="w-3 h-3" /> {client.phone}
                      </div>
                    )}
                    {client.location && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" /> {client.location}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit sub-dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingClient ? 'Edit Client' : 'Add Client'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} placeholder="Company name" required />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={formData.phone} onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))} placeholder="+1 234 567 890" />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input value={formData.location} onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))} placeholder="City, Country" />
            </div>
            <div className="space-y-2">
              <Label>Logo URL</Label>
              <Input value={formData.logo_url} onChange={(e) => setFormData(prev => ({ ...prev, logo_url: e.target.value }))} placeholder="https://example.com/logo.png" />
              {formData.logo_url && <img src={formData.logo_url} alt="Preview" className="w-12 h-12 rounded-full object-cover border" />}
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button type="submit">{editingClient ? 'Update' : 'Add'} Client</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
