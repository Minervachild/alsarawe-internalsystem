import { useState, useEffect, useCallback } from 'react';
import { Zap, Sparkles, User, Package, Hash, MapPin, AlertCircle, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { parseOrderText, ParsedOrder } from '@/lib/orderParser';

interface SmartQuickAddProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: { id: string; name: string; location?: string | null }[];
  columns: { id: string; name: string; type: string; options?: any }[];
  onSubmit: (cells: Record<string, any>) => void;
}

interface Product {
  id: string;
  full_name: string;
  aliases: string[];
}

interface ParsedItem {
  text: string;
  parsed: ParsedOrder;
}

export function SmartQuickAdd({ open, onOpenChange, clients, columns, onSubmit }: SmartQuickAddProps) {
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState<ParsedOrder | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [items, setItems] = useState<ParsedItem[]>([]);

  useEffect(() => {
    if (open) {
      setText('');
      setParsed(null);
      setSelectedClientId('');
      setItems([]);
      fetchProducts();
    }
  }, [open]);

  const fetchProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('id, full_name, aliases');
    setProducts((data as any[]) || []);
  };

  const handleTextChange = useCallback((value: string) => {
    setText(value);
    if (!value.trim()) {
      setParsed(null);
      setSelectedClientId('');
      return;
    }
    const result = parseOrderText(value, clients, products);
    setParsed(result);
    if (result.clientId && !selectedClientId) setSelectedClientId(result.clientId);
  }, [clients, products, selectedClientId]);

  const handleAddItem = () => {
    if (!parsed || (!parsed.productName && !parsed.quantity)) return;
    setItems(prev => [...prev, { text: text.trim(), parsed: { ...parsed } }]);
    setText('');
    setParsed(null);
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    // Combine current input + already added items
    const allItems = [...items];
    if (parsed && (parsed.productName || parsed.quantity)) {
      allItems.push({ text: text.trim(), parsed: { ...parsed } });
    }

    if (allItems.length === 0 && !parsed) return;

    const cells: Record<string, any> = {};

    const clientCol = columns.find(c => c.type === 'relation' || c.name === 'Client');
    const itemsCol = columns.find(c => c.type === 'items_qty' || c.name === 'Items');
    const locationCol = columns.find(c => c.name === 'Location');

    // Resolve client - use selected or from first parsed result with a client
    const resolvedClientId = selectedClientId || allItems.find(i => i.parsed.clientId)?.parsed.clientId;
    const resolvedClient = resolvedClientId ? clients.find(c => c.id === resolvedClientId) : null;

    if (clientCol && resolvedClient) {
      cells[clientCol.id] = resolvedClient.name;
    }

    if (locationCol && resolvedClient?.location) {
      cells[locationCol.id] = resolvedClient.location;
    }

    // Build items list from all parsed items
    if (itemsCol) {
      const itemsList = allItems
        .filter(i => i.parsed.productName || i.parsed.quantity)
        .map(i => ({
          name: i.parsed.productName || i.parsed.productAlias || 'Item',
          qty: i.parsed.quantityNum || 1,
          unit: i.parsed.unit || 'kg',
        }));

      if (itemsList.length > 0) {
        cells[itemsCol.id] = { items: itemsList };
      }
    }

    onSubmit(cells);
    onOpenChange(false);
  };

  // Resolve client display from all sources
  const effectiveClientId = selectedClientId || parsed?.clientId;
  const effectiveClient = effectiveClientId ? clients.find(c => c.id === effectiveClientId) : null;
  const needsClientSelection = parsed && !parsed.clientId && !selectedClientId && (parsed.ambiguousClients?.length || 0) > 0;
  const noClientFound = parsed && !parsed.clientId && !selectedClientId && !parsed.ambiguousClients?.length && text.trim().length > 0 && items.length === 0;

  const hasCurrentItem = parsed && (parsed.productName || parsed.quantity);
  const canSubmit = items.length > 0 || hasCurrentItem;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-destructive" />
            Smart Quick Add
          </DialogTitle>
          <DialogDescription>
            Type shorthand like <code className="bg-muted px-1 rounded text-xs">50k guji cool donuts</code> — add multiple items to one order.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Already added items */}
          {items.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Items added:</p>
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5 text-sm">
                  <Package className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="flex-1">
                    {item.parsed.quantity && <span className="font-medium">{item.parsed.quantity}</span>}
                    {item.parsed.quantity && item.parsed.productName && ' — '}
                    {item.parsed.productName && <span>{item.parsed.productName}</span>}
                  </span>
                  <button onClick={() => handleRemoveItem(idx)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Client badge (resolved) */}
          {effectiveClient && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <User className="w-3 h-3" />
                {effectiveClient.name}
              </Badge>
              {effectiveClient.location && (
                <Badge variant="secondary" className="gap-1">
                  <MapPin className="w-3 h-3" />
                  {effectiveClient.location}
                </Badge>
              )}
            </div>
          )}

          {/* Smart Input */}
          <div className="flex gap-2">
            <Input
              autoFocus
              value={text}
              onChange={(e) => handleTextChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && hasCurrentItem) {
                  e.preventDefault();
                  handleAddItem();
                }
              }}
              placeholder={items.length > 0 ? "Add another item..." : "e.g. 50k guji cool donuts"}
              className="rounded-xl text-base h-12 flex-1"
            />
            {hasCurrentItem && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-12 w-12 rounded-xl shrink-0"
                onClick={handleAddItem}
              >
                <Plus className="w-5 h-5" />
              </Button>
            )}
          </div>

          {/* Parsed Preview for current input */}
          {parsed && text.trim() && (
            <div className="bg-muted/50 rounded-xl p-3 space-y-2 border border-border/50">
              <p className="text-xs font-medium text-muted-foreground mb-2">Detected:</p>
              <div className="flex flex-wrap gap-2">
                {parsed.quantity && (
                  <Badge variant="secondary" className="gap-1">
                    <Hash className="w-3 h-3" />
                    {parsed.quantity}
                  </Badge>
                )}
                {parsed.productName && (
                  <Badge variant="secondary" className="gap-1">
                    <Package className="w-3 h-3" />
                    {parsed.productName}
                    {parsed.productAlias && (
                      <span className="text-muted-foreground ml-1">({parsed.productAlias})</span>
                    )}
                  </Badge>
                )}
                {parsed.clientName && !effectiveClient && (
                  <Badge variant="secondary" className="gap-1">
                    <User className="w-3 h-3" />
                    {parsed.clientName}
                  </Badge>
                )}
                {parsed.city && !effectiveClient && (
                  <Badge variant="secondary" className="gap-1">
                    <MapPin className="w-3 h-3" />
                    {parsed.city}
                  </Badge>
                )}
              </div>

              {!parsed.quantity && !parsed.productName && !parsed.clientName && (
                <p className="text-xs text-muted-foreground">No matches found. Try adding a known client name or product alias.</p>
              )}
            </div>
          )}

          {/* Ambiguous client selection */}
          {needsClientSelection && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-warning">
                <AlertCircle className="w-4 h-4" />
                Multiple clients matched. Please select:
              </div>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select client..." />
                </SelectTrigger>
                <SelectContent>
                  {parsed?.ambiguousClients?.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* No client found - manual select */}
          {noClientFound && !parsed?.productName && !parsed?.quantity && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <AlertCircle className="w-3 h-3" />
                No client matched. Select manually or continue without.
              </div>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select client (optional)..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full rounded-xl bg-destructive hover:bg-destructive/90 text-white"
          >
            <Zap className="w-4 h-4 mr-2" />
            Add Order {items.length > 0 ? `(${items.length + (hasCurrentItem ? 1 : 0)} items)` : ''}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
