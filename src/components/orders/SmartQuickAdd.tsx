import { useState, useEffect, useCallback } from 'react';
import { Zap, Sparkles, User, Package, Hash, MapPin, AlertCircle } from 'lucide-react';
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

export function SmartQuickAdd({ open, onOpenChange, clients, columns, onSubmit }: SmartQuickAddProps) {
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState<ParsedOrder | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');

  useEffect(() => {
    if (open) {
      setText('');
      setParsed(null);
      setSelectedClientId('');
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
    if (result.clientId) setSelectedClientId(result.clientId);
  }, [clients, products]);

  const handleSubmit = () => {
    if (!parsed) return;

    const cells: Record<string, any> = {};

    // Map parsed data to column IDs
    const clientCol = columns.find(c => c.type === 'relation' || c.name === 'Client');
    const itemsCol = columns.find(c => c.type === 'items_qty' || c.name === 'Items');
    const locationCol = columns.find(c => c.name === 'Location');

    // Resolve client
    const resolvedClient = selectedClientId
      ? clients.find(c => c.id === selectedClientId)
      : parsed.clientId
        ? clients.find(c => c.id === parsed.clientId)
        : null;

    if (clientCol && resolvedClient) {
      cells[clientCol.id] = resolvedClient.name;
    }

    if (locationCol && resolvedClient?.location) {
      cells[locationCol.id] = resolvedClient.location;
    }

    // Build items value
    if (itemsCol && (parsed.productName || parsed.quantity)) {
      const itemName = parsed.productName || parsed.productAlias || 'Item';
      const qty = parsed.quantityNum || 1;
      const unit = parsed.unit || 'kg';
      cells[itemsCol.id] = {
        items: [{ name: itemName, qty, unit }],
      };
    }

    onSubmit(cells);
    onOpenChange(false);
  };

  const needsClientSelection = parsed && !parsed.clientId && (parsed.ambiguousClients?.length || 0) > 0;
  const noClientFound = parsed && !parsed.clientId && !parsed.ambiguousClients?.length && text.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-destructive" />
            Smart Quick Add
          </DialogTitle>
          <DialogDescription>
            Type shorthand like <code className="bg-muted px-1 rounded text-xs">50k guji cool donuts</code> and we'll parse it automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Smart Input */}
          <Input
            autoFocus
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder="e.g. 50k guji cool donuts"
            className="rounded-xl text-base h-12"
          />

          {/* Parsed Preview */}
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
                {parsed.clientName && (
                  <Badge variant="secondary" className="gap-1">
                    <User className="w-3 h-3" />
                    {parsed.clientName}
                  </Badge>
                )}
                {parsed.city && (
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
            disabled={!text.trim()}
            className="w-full rounded-xl bg-destructive hover:bg-destructive/90 text-white"
          >
            <Zap className="w-4 h-4 mr-2" />
            Add Order
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
