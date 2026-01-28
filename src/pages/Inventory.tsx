import { useState, useEffect } from 'react';
import { Plus, Search, Package, AlertTriangle, MoreHorizontal, Pencil, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Category {
  id: string;
  name: string;
  color: string;
}

interface InventoryItem {
  id: string;
  name: string;
  category_id: string | null;
  current_stock: number;
  min_threshold: number;
  unit: string;
  category?: Category;
}

export default function Inventory() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [movementDialogOpen, setMovementDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [selectedItemForMovement, setSelectedItemForMovement] = useState<InventoryItem | null>(null);
  const [movementType, setMovementType] = useState<'in' | 'out'>('in');
  const [itemFormData, setItemFormData] = useState({ 
    name: '', 
    category_id: '', 
    current_stock: 0,
    min_threshold: 0, 
    unit: 'kg' 
  });
  const [categoryFormData, setCategoryFormData] = useState({ name: '', color: '#8B4513' });
  const [movementQuantity, setMovementQuantity] = useState(0);
  const [movementReason, setMovementReason] = useState('');
  const [movementNotes, setMovementNotes] = useState('');
  const { toast } = useToast();

  const stockOutReasons = [
    { value: 'order', label: 'Used for Order (Spent)' },
    { value: 'waste', label: 'Waste / Spoilage' },
    { value: 'sample', label: 'Sample / Tasting' },
    { value: 'adjustment', label: 'Inventory Adjustment' },
    { value: 'other', label: 'Other' },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: categoriesData } = await supabase
        .from('inventory_categories')
        .select('*')
        .order('name');
      setCategories(categoriesData || []);

      const { data: itemsData } = await supabase
        .from('inventory_items')
        .select('*, inventory_categories(*)')
        .order('name');
      
      const transformedItems = (itemsData || []).map((item: any) => ({
        ...item,
        category: item.inventory_categories,
      }));
      setItems(transformedItems);
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to fetch inventory.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...itemFormData,
        category_id: itemFormData.category_id || null,
      };

      if (editingItem) {
        const { error } = await supabase.from('inventory_items').update(payload).eq('id', editingItem.id);
        if (error) throw error;
        toast({ title: 'Item updated' });
      } else {
        const { error } = await supabase.from('inventory_items').insert(payload);
        if (error) throw error;
        toast({ title: 'Item added' });
      }

      setItemDialogOpen(false);
      setEditingItem(null);
      setItemFormData({ name: '', category_id: '', current_stock: 0, min_threshold: 0, unit: 'kg' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('inventory_categories').insert(categoryFormData);
      if (error) throw error;
      toast({ title: 'Category added' });
      setCategoryDialogOpen(false);
      setCategoryFormData({ name: '', color: '#8B4513' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForMovement) return;

    try {
      const newStock = movementType === 'in' 
        ? selectedItemForMovement.current_stock + movementQuantity
        : selectedItemForMovement.current_stock - movementQuantity;

      if (newStock < 0) {
        toast({ title: 'Error', description: 'Cannot have negative stock.', variant: 'destructive' });
        return;
      }

      // Record movement with reason for stock out
      await supabase.from('inventory_movements').insert({
        item_id: selectedItemForMovement.id,
        type: movementType,
        quantity: movementQuantity,
        reason: movementType === 'out' ? movementReason : null,
        notes: movementNotes || null,
      });

      // Update stock
      await supabase
        .from('inventory_items')
        .update({ current_stock: newStock })
        .eq('id', selectedItemForMovement.id);

      toast({ title: `Stock ${movementType === 'in' ? 'added' : 'removed'}` });
      setMovementDialogOpen(false);
      setSelectedItemForMovement(null);
      setMovementQuantity(0);
      setMovementReason('');
      setMovementNotes('');
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('inventory_items').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Item deleted' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const openMovementDialog = (item: InventoryItem, type: 'in' | 'out') => {
    setSelectedItemForMovement(item);
    setMovementType(type);
    setMovementQuantity(0);
    setMovementReason('');
    setMovementNotes('');
    setMovementDialogOpen(true);
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const lowStockItems = items.filter(item => item.current_stock <= item.min_threshold);

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Inventory</h1>
            <p className="text-muted-foreground">Stock management</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCategoryDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Category
            </Button>
            <Button onClick={() => {
              setEditingItem(null);
              setItemFormData({ name: '', category_id: '', current_stock: 0, min_threshold: 0, unit: 'kg' });
              setItemDialogOpen(true);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </div>
        </div>

        {/* Low Stock Alert */}
        {lowStockItems.length > 0 && (
          <div className="mb-6 p-4 bg-warning/10 border border-warning/30 rounded-lg flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-warning" />
            <span className="text-sm text-warning">
              {lowStockItems.length} item(s) below minimum threshold
            </span>
          </div>
        )}

        <Tabs defaultValue="items" className="space-y-4">
          <TabsList>
            <TabsTrigger value="items">Items</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
          </TabsList>

          <TabsContent value="items">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredItems.map((item) => (
                  <div key={item.id} className="bg-card rounded-xl border border-border/50 p-4 hover-lift">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ 
                            backgroundColor: item.category?.color ? `${item.category.color}20` : '#8B451320',
                            color: item.category?.color || '#8B4513'
                          }}
                        >
                          <Package className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{item.name}</h3>
                          {item.category && (
                            <p className="text-xs text-muted-foreground">{item.category.name}</p>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover">
                          <DropdownMenuItem onClick={() => {
                            setEditingItem(item);
                            setItemFormData({
                              name: item.name,
                              category_id: item.category_id || '',
                              current_stock: item.current_stock,
                              min_threshold: item.min_threshold,
                              unit: item.unit,
                            });
                            setItemDialogOpen(true);
                          }}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(item.id)} className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Stock</span>
                        <span className={`text-lg font-semibold ${item.current_stock <= item.min_threshold ? 'text-destructive' : 'text-foreground'}`}>
                          {item.current_stock} {item.unit}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${item.current_stock <= item.min_threshold ? 'bg-destructive' : 'bg-success'}`}
                          style={{ width: `${Math.min((item.current_stock / (item.min_threshold * 3)) * 100, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Min: {item.min_threshold} {item.unit}
                      </p>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => openMovementDialog(item, 'in')}
                      >
                        <ArrowUp className="w-3 h-3 mr-1" />
                        Stock In
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => openMovementDialog(item, 'out')}
                      >
                        <ArrowDown className="w-3 h-3 mr-1" />
                        Stock Out
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="categories">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {categories.map((category) => (
                <div 
                  key={category.id} 
                  className="p-4 rounded-lg border border-border/50"
                  style={{ backgroundColor: `${category.color}10` }}
                >
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="font-medium">{category.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Item Dialog */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">{editingItem ? 'Edit Item' : 'Add Item'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleItemSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={itemFormData.name}
                onChange={(e) => setItemFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={itemFormData.category_id}
                onValueChange={(val) => setItemFormData(prev => ({ ...prev, category_id: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Current Stock</Label>
                <Input
                  type="number"
                  value={itemFormData.current_stock}
                  onChange={(e) => setItemFormData(prev => ({ ...prev, current_stock: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Min Threshold</Label>
                <Input
                  type="number"
                  value={itemFormData.min_threshold}
                  onChange={(e) => setItemFormData(prev => ({ ...prev, min_threshold: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Input
                  value={itemFormData.unit}
                  onChange={(e) => setItemFormData(prev => ({ ...prev, unit: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setItemDialogOpen(false)}>Cancel</Button>
              <Button type="submit">{editingItem ? 'Update' : 'Add'} Item</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Add Category</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCategorySubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={categoryFormData.name}
                onChange={(e) => setCategoryFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <Input
                type="color"
                value={categoryFormData.color}
                onChange={(e) => setCategoryFormData(prev => ({ ...prev, color: e.target.value }))}
                className="h-10 p-1"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setCategoryDialogOpen(false)}>Cancel</Button>
              <Button type="submit">Add Category</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Movement Dialog */}
      <Dialog open={movementDialogOpen} onOpenChange={setMovementDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">
              {movementType === 'in' ? 'Add Stock' : 'Remove Stock'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleMovement} className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              {selectedItemForMovement?.name} - Current: {selectedItemForMovement?.current_stock} {selectedItemForMovement?.unit}
            </p>
            <div className="space-y-2">
              <Label>Quantity *</Label>
              <Input
                type="number"
                value={movementQuantity}
                onChange={(e) => setMovementQuantity(parseFloat(e.target.value) || 0)}
                min={0}
                required
              />
            </div>
            {movementType === 'out' && (
              <div className="space-y-2">
                <Label>Reason *</Label>
                <Select
                  value={movementReason}
                  onValueChange={setMovementReason}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason for stock out" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {stockOutReasons.map((reason) => (
                      <SelectItem key={reason.value} value={reason.value}>
                        {reason.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input
                value={movementNotes}
                onChange={(e) => setMovementNotes(e.target.value)}
                placeholder={movementType === 'out' ? 'e.g., Order #123, expired batch' : 'e.g., New shipment from supplier'}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setMovementDialogOpen(false)}>Cancel</Button>
              <Button 
                type="submit"
                disabled={movementType === 'out' && !movementReason}
              >
                {movementType === 'in' ? 'Add' : 'Remove'} Stock
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
