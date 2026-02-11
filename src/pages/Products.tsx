import { useState, useEffect } from 'react';
import { Plus, Search, Pencil, Trash2, Package, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface Product {
  id: string;
  full_name: string;
  aliases: string[];
  origin: string | null;
  default_price: number | null;
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [formData, setFormData] = useState({ full_name: '', aliases: '', origin: '' });
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    const { data, error } = await supabase.from('products').select('*').order('full_name');
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); }
    setProducts((data as any[]) || []);
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const aliases = formData.aliases.split(',').map(a => a.trim().toLowerCase()).filter(Boolean);
    const payload = {
      full_name: formData.full_name.trim(),
      aliases,
      origin: formData.origin.trim() || null,
    };

    try {
      if (editing) {
        const { error } = await supabase.from('products').update(payload).eq('id', editing.id);
        if (error) throw error;
        toast({ title: 'Product updated' });
      } else {
        const { error } = await supabase.from('products').insert(payload);
        if (error) throw error;
        toast({ title: 'Product added' });
      }
      setDialogOpen(false);
      setEditing(null);
      setFormData({ full_name: '', aliases: '', origin: '' });
      fetchProducts();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleEdit = (p: Product) => {
    setEditing(p);
    setFormData({
      full_name: p.full_name,
      aliases: (p.aliases || []).join(', '),
      origin: p.origin || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Product deleted' });
    fetchProducts();
  };

  const filtered = products.filter(p =>
    p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.aliases?.some(a => a.includes(searchQuery.toLowerCase()))
  );

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Products</h1>
            <p className="text-muted-foreground">Manage product catalog &amp; aliases for Quick Add</p>
          </div>
          {isAdmin && (
            <Button onClick={() => { setEditing(null); setFormData({ full_name: '', aliases: '', origin: '' }); setDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          )}
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search products or aliases..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No products yet. Add your first product!</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(product => (
              <div key={product.id} className="bg-card rounded-xl border border-border/50 p-4 hover-lift">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Package className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{product.full_name}</h3>
                      {product.origin && <p className="text-xs text-muted-foreground">{product.origin}</p>}
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(product)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(product.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  <Tag className="w-3 h-3 text-muted-foreground mt-0.5" />
                  {product.origin && (
                    <Badge variant="default" className="text-xs">{product.origin}</Badge>
                  )}
                  {product.aliases?.length > 0 ? product.aliases.map(alias => (
                    <Badge key={alias} variant="outline" className="text-xs">{alias}</Badge>
                  )) : !product.origin && <span className="text-xs text-muted-foreground">No tags</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">{editing ? 'Edit Product' : 'Add Product'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input value={formData.full_name} onChange={e => setFormData(p => ({ ...p, full_name: e.target.value }))} placeholder="e.g. Ethiopian Guji" required />
            </div>
            <div className="space-y-2">
              <Label>Tags / Aliases (comma-separated)</Label>
              <Input value={formData.aliases} onChange={e => setFormData(p => ({ ...p, aliases: e.target.value }))} placeholder="e.g. guji, eth guji, ethiopia" />
              <p className="text-xs text-muted-foreground">Shorthand names used in Quick Add for matching</p>
            </div>
            <div className="space-y-2">
              <Label>Origin</Label>
              <Input value={formData.origin} onChange={e => setFormData(p => ({ ...p, origin: e.target.value }))} placeholder="e.g. Ethiopia" />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit">{editing ? 'Update' : 'Add'} Product</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
