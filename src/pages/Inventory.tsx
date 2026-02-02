import { useState, useEffect } from 'react';
import { Plus, Search, Package, AlertTriangle, MoreHorizontal, Pencil, Trash2, ArrowUp, ArrowDown, TrendingUp, Clock, DollarSign } from 'lucide-react';
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
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInDays } from 'date-fns';

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
  last_refill_date: string | null;
  avg_days_to_refill: number | null;
  category?: Category;
}

interface Movement {
  id: string;
  item_id: string;
  type: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
  total_price: number;
  reason: string | null;
  consumption_date: string | null;
  notes: string | null;
  created_at: string;
}

const VAT_RATE = 0.15; // 15% VAT

export default function Inventory() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
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
  const [movementUnitPrice, setMovementUnitPrice] = useState(0);
  const [movementReason, setMovementReason] = useState('');
  const [movementNotes, setMovementNotes] = useState('');
  const [consumptionDate, setConsumptionDate] = useState('');
  const { toast } = useToast();

  const stockOutReasons = [
    { value: 'consumption', label: 'Consumption' },
    { value: 'waste', label: 'Waste / Spoilage' },
    { value: 'guest', label: 'Guest Consumption' },
    { value: 'sample', label: 'Sample / Tasting' },
    { value: 'adjustment', label: 'Inventory Adjustment' },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [categoriesRes, itemsRes, movementsRes] = await Promise.all([
        supabase.from('inventory_categories').select('*').order('name'),
        supabase.from('inventory_items').select('*, inventory_categories(*)').order('name'),
        supabase.from('inventory_movements').select('*').order('created_at', { ascending: false }).limit(100),
      ]);

      setCategories(categoriesRes.data || []);
      setMovements(movementsRes.data || []);
      
      const transformedItems = (itemsRes.data || []).map((item: any) => ({
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

  const calculateAverageCycle = (itemId: string): number | null => {
    const itemMovements = movements
      .filter(m => m.item_id === itemId && m.type === 'in')
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    if (itemMovements.length < 2) return null;

    let totalDays = 0;
    for (let i = 1; i < itemMovements.length; i++) {
      const days = differenceInDays(
        new Date(itemMovements[i].created_at),
        new Date(itemMovements[i - 1].created_at)
      );
      totalDays += days;
    }

    return Math.round(totalDays / (itemMovements.length - 1));
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

      // Calculate total price with VAT for stock in
      const totalWithVat = movementType === 'in' 
        ? movementUnitPrice * movementQuantity * (1 + VAT_RATE)
        : 0;

      // Record movement
      await supabase.from('inventory_movements').insert({
        item_id: selectedItemForMovement.id,
        type: movementType,
        quantity: movementQuantity,
        unit_price: movementType === 'in' ? movementUnitPrice : 0,
        vat_rate: movementType === 'in' ? VAT_RATE : 0,
        total_price: totalWithVat,
        reason: movementType === 'out' ? movementReason : 'purchase',
        consumption_date: movementReason === 'consumption' && consumptionDate ? consumptionDate : null,
        notes: movementNotes || null,
      });

      // Update stock and last refill date
      const updateData: any = { current_stock: newStock };
      if (movementType === 'in') {
        updateData.last_refill_date = new Date().toISOString();
        // Calculate and update average cycle
        const avgCycle = calculateAverageCycle(selectedItemForMovement.id);
        if (avgCycle !== null) {
          updateData.avg_days_to_refill = avgCycle;
        }
      }

      await supabase
        .from('inventory_items')
        .update(updateData)
        .eq('id', selectedItemForMovement.id);

      toast({ title: `Stock ${movementType === 'in' ? 'added' : 'removed'}` });
      setMovementDialogOpen(false);
      setSelectedItemForMovement(null);
      setMovementQuantity(0);
      setMovementUnitPrice(0);
      setMovementReason('');
      setMovementNotes('');
      setConsumptionDate('');
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
    setMovementUnitPrice(0);
    setMovementReason('');
    setMovementNotes('');
    setConsumptionDate('');
    setMovementDialogOpen(true);
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const lowStockItems = items.filter(item => item.current_stock <= item.min_threshold);
  const criticalItems = lowStockItems.filter(item => item.current_stock === 0);

  // Calculate total inventory value
  const totalValue = movements
    .filter(m => m.type === 'in')
    .reduce((sum, m) => sum + (m.total_price || 0), 0);

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Inventory</h1>
            <p className="text-muted-foreground">Stock management with pricing & analytics</p>
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

        {/* Alerts Section */}
        {criticalItems.length > 0 && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Critical: Out of Stock</AlertTitle>
            <AlertDescription>
              {criticalItems.map(i => i.name).join(', ')} - immediate restocking required!
            </AlertDescription>
          </Alert>
        )}

        {lowStockItems.length > 0 && lowStockItems.length !== criticalItems.length && (
          <Alert className="mb-4 border-warning/50 bg-warning/10">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertTitle className="text-warning">Low Stock Warning</AlertTitle>
            <AlertDescription>
              {lowStockItems.filter(i => i.current_stock > 0).map(i => `${i.name} (${i.current_stock} ${i.unit})`).join(', ')}
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="card-premium p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Package className="w-4 h-4" />
              <span className="text-sm">Total Items</span>
            </div>
            <p className="text-2xl font-semibold">{items.length}</p>
          </div>
          <div className="card-premium p-4">
            <div className="flex items-center gap-2 text-warning mb-1">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">Low Stock</span>
            </div>
            <p className="text-2xl font-semibold">{lowStockItems.length}</p>
          </div>
          <div className="card-premium p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="w-4 h-4" />
              <span className="text-sm">Total Purchases</span>
            </div>
            <p className="text-2xl font-semibold">{totalValue.toFixed(2)}</p>
          </div>
          <div className="card-premium p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm">Categories</span>
            </div>
            <p className="text-2xl font-semibold">{categories.length}</p>
          </div>
        </div>

        <Tabs defaultValue="items" className="space-y-4">
          <TabsList>
            <TabsTrigger value="items">Items</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="history">Movement History</TabsTrigger>
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
                {filteredItems.map((item) => {
                  const avgCycle = item.avg_days_to_refill || calculateAverageCycle(item.id);
                  
                  return (
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

                      {/* Average Cycle */}
                      {avgCycle && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>Avg. {avgCycle} days between refills</span>
                        </div>
                      )}

                      {item.current_stock <= item.min_threshold && (
                        <Badge variant="destructive" className="mt-3">
                          {item.current_stock === 0 ? 'Out of Stock' : 'Low Stock'}
                        </Badge>
                      )}

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
                  );
                })}
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
                  <p className="text-sm text-muted-foreground mt-1">
                    {items.filter(i => i.category_id === category.id).length} items
                  </p>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="history">
            <div className="card-premium overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 text-sm font-medium">Date</th>
                      <th className="text-left p-3 text-sm font-medium">Item</th>
                      <th className="text-left p-3 text-sm font-medium">Type</th>
                      <th className="text-left p-3 text-sm font-medium">Qty</th>
                      <th className="text-left p-3 text-sm font-medium">Unit Price</th>
                      <th className="text-left p-3 text-sm font-medium">Total (inc. VAT)</th>
                      <th className="text-left p-3 text-sm font-medium">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {movements.slice(0, 50).map((m) => {
                      const item = items.find(i => i.id === m.item_id);
                      return (
                        <tr key={m.id} className="hover:bg-muted/30">
                          <td className="p-3 text-sm">{format(new Date(m.created_at), 'MMM d, yyyy')}</td>
                          <td className="p-3 text-sm font-medium">{item?.name || 'Unknown'}</td>
                          <td className="p-3">
                            <Badge variant={m.type === 'in' ? 'default' : 'secondary'}>
                              {m.type === 'in' ? 'Stock In' : 'Stock Out'}
                            </Badge>
                          </td>
                          <td className="p-3 text-sm">{m.quantity} {item?.unit}</td>
                          <td className="p-3 text-sm">{m.unit_price > 0 ? m.unit_price.toFixed(2) : '-'}</td>
                          <td className="p-3 text-sm font-medium">{m.total_price > 0 ? m.total_price.toFixed(2) : '-'}</td>
                          <td className="p-3 text-sm text-muted-foreground">{m.reason || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
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
              {movementType === 'in' ? 'Add Stock (Purchase)' : 'Remove Stock'}
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
                step="0.01"
                required
              />
            </div>

            {movementType === 'in' && (
              <div className="space-y-2">
                <Label>Unit Price (before VAT) *</Label>
                <Input
                  type="number"
                  value={movementUnitPrice}
                  onChange={(e) => setMovementUnitPrice(parseFloat(e.target.value) || 0)}
                  min={0}
                  step="0.01"
                  placeholder="0.00"
                />
                {movementQuantity > 0 && movementUnitPrice > 0 && (
                  <div className="text-sm text-muted-foreground space-y-1 mt-2 p-3 bg-muted/50 rounded-lg">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{(movementUnitPrice * movementQuantity).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>VAT ({(VAT_RATE * 100).toFixed(0)}%):</span>
                      <span>{(movementUnitPrice * movementQuantity * VAT_RATE).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-1">
                      <span>Total:</span>
                      <span>{(movementUnitPrice * movementQuantity * (1 + VAT_RATE)).toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {movementType === 'out' && (
              <>
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

                {movementReason === 'consumption' && (
                  <div className="space-y-2">
                    <Label>Consumption Date *</Label>
                    <Input
                      type="date"
                      value={consumptionDate}
                      onChange={(e) => setConsumptionDate(e.target.value)}
                      required
                    />
                  </div>
                )}
              </>
            )}

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input
                value={movementNotes}
                onChange={(e) => setMovementNotes(e.target.value)}
                placeholder={movementType === 'out' ? 'e.g., Expired batch' : 'e.g., Supplier: XYZ'}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setMovementDialogOpen(false)}>Cancel</Button>
              <Button 
                type="submit"
                disabled={(movementType === 'out' && !movementReason) || (movementReason === 'consumption' && !consumptionDate)}
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
