import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface ItemEntry {
  name: string;
  qty: number;
  unit?: string;
  color?: string;
}

const ITEM_COLORS = [
  '#22c55e', // green
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
  '#6366f1', // indigo
];

interface ItemsEditorProps {
  value: ItemEntry[] | null;
  onChange: (items: ItemEntry[]) => void;
}

export function ItemsEditor({ value, onChange }: ItemsEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('');
  const [newItemColor, setNewItemColor] = useState(ITEM_COLORS[0]);

  const items: ItemEntry[] = Array.isArray(value) ? value : [];

  const handleAddItem = () => {
    if (!newItemName.trim() || !newItemQty) return;
    
    const qty = parseFloat(newItemQty);
    if (isNaN(qty) || qty <= 0) return;

    const newItem: ItemEntry = {
      name: newItemName.trim(),
      qty,
      unit: 'kg',
      color: newItemColor,
    };

    onChange([...items, newItem]);
    setNewItemName('');
    setNewItemQty('');
    // Cycle to next color
    const currentIndex = ITEM_COLORS.indexOf(newItemColor);
    setNewItemColor(ITEM_COLORS[(currentIndex + 1) % ITEM_COLORS.length]);
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

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className="flex items-center gap-1 cursor-pointer min-w-0 flex-wrap">
          {items.length > 0 ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              {items.map((item, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-md text-xs font-medium bg-muted text-foreground truncate max-w-[120px]"
                  title={`${item.name} - ${item.qty} ${item.unit || 'kg'}`}
                >
                  {item.name} {item.qty}{item.unit || 'kg'}
                </span>
              ))}
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
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {items.map((item, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between rounded px-2 py-1.5 group"
                  style={{ backgroundColor: `${item.color || ITEM_COLORS[index % ITEM_COLORS.length]}20` }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color || ITEM_COLORS[index % ITEM_COLORS.length] }}
                    />
                    <span className="text-sm font-medium truncate">{item.name}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {item.qty} {item.unit || 'kg'}
                    </span>
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

          {/* Color picker */}
          <div className="flex gap-1 flex-wrap">
            {ITEM_COLORS.map((color) => (
              <button
                key={color}
                className={`w-6 h-6 rounded-full transition-all ${
                  newItemColor === color ? 'ring-2 ring-offset-2 ring-primary' : ''
                }`}
                style={{ backgroundColor: color }}
                onClick={() => setNewItemColor(color)}
                type="button"
              />
            ))}
          </div>

          {/* Add new item form */}
          <div className="flex gap-2">
            <Input
              placeholder="Item name (e.g. Costa Rican)"
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
              style={{ backgroundColor: newItemColor }}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
