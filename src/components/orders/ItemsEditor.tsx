import { useState } from 'react';
import { Plus, X, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

interface ItemEntry {
  name: string;
  qty: number;
  unit?: string;
}

interface ItemsEditorProps {
  value: ItemEntry[] | null;
  onChange: (items: ItemEntry[]) => void;
}

export function ItemsEditor({ value, onChange }: ItemsEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('');

  const items: ItemEntry[] = Array.isArray(value) ? value : [];

  const handleAddItem = () => {
    if (!newItemName.trim() || !newItemQty) return;
    
    const qty = parseFloat(newItemQty);
    if (isNaN(qty) || qty <= 0) return;

    const newItem: ItemEntry = {
      name: newItemName.trim(),
      qty,
      unit: 'kg',
    };

    onChange([...items, newItem]);
    setNewItemName('');
    setNewItemQty('');
  };

  const handleRemoveItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddItem();
    }
  };

  const totalQty = items.reduce((sum, item) => sum + item.qty, 0);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className="flex items-center gap-1 cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 min-w-0">
          {items.length > 0 ? (
            <div className="flex items-center gap-1 flex-wrap">
              <Package className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              <span className="text-sm font-medium">{items.length} items</span>
              <span className="text-xs text-muted-foreground">({totalQty} kg)</span>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Plus className="w-3 h-3" />
              Add items
            </span>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start">
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Order Items</h4>
          
          {/* Existing items list */}
          {items.length > 0 && (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {items.map((item, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between bg-muted/50 rounded px-2 py-1.5 group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm truncate">{item.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {item.qty} {item.unit || 'kg'}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
                    onClick={() => handleRemoveItem(index)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Add new item form */}
          <div className="flex gap-2">
            <Input
              placeholder="Item name"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-8 text-sm flex-1"
            />
            <Input
              placeholder="Qty"
              type="number"
              min="0"
              step="0.5"
              value={newItemQty}
              onChange={(e) => setNewItemQty(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-8 text-sm w-20"
            />
            <Button
              size="sm"
              className="h-8 px-2"
              onClick={handleAddItem}
              disabled={!newItemName.trim() || !newItemQty}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {items.length > 0 && (
            <div className="pt-2 border-t border-border flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-sm font-medium">{totalQty} kg</span>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
