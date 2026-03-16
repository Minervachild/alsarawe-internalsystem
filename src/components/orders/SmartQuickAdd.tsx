import { useState, useEffect, useCallback } from 'react';
import { Zap, Sparkles, User, Package, Hash, MapPin, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
  const [parsedLines, setParsedLines] = useState<ParsedItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');

  useEffect(() => {
    if (open) {
      setText('');
      setParsedLines([]);
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
      setParsedLines([]);
      setSelectedClientId('');
      return;
    }
    const lines = value.split('\n').filter(l => l.trim());
    const results = lines.map(line => ({
      text: line.trim(),
      parsed: parseOrderText(line.trim(), clients, products),
    }));
    setParsedLines(results);
    // Auto-select client from first line that has one
    if (!selectedClientId) {
      const firstClient = results.find(r => r.parsed.clientId);
      if (firstClient?.parsed.clientId) setSelectedClientId(firstClient.parsed.clientId);
    }
  }, [clients, products, selectedClientId]);

  const handleRemoveLine = (index: number) => {
    const lines = text.split('\n');
    lines.splice(index, 1);
    const newText = lines.join('\n');
    setText(newText);
    handleTextChange(newText);
  };

  const handleSubmit = () => {
    const allItems = parsedLines.filter(i => i.parsed.productName || i.parsed.quantity);
    if (allItems.length === 0) return;

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
        cells[itemsCol.id] = itemsList;
      }
    }

    onSubmit(cells);
    onOpenChange(false);
  };

  // Resolve client from parsed lines or manual selection
  const firstClientParsed = parsedLines.find(r => r.parsed.clientId);
  const effectiveClientId = selectedClientId || firstClientParsed?.parsed.clientId;
  const effectiveClient = effectiveClientId ? clients.find(c => c.id === effectiveClientId) : null;
  const ambiguousFromLines = parsedLines.find(r => (r.parsed.ambiguousClients?.length || 0) > 0);
  const needsClientSelection = !effectiveClientId && !!ambiguousFromLines;
  const validItems = parsedLines.filter(i => i.parsed.productName && i.parsed.quantity);
  const canSubmit = validItems.length > 0 && !!effectiveClientId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-destructive" />
            Smart Quick Add
          </DialogTitle>
          <DialogDescription>
            Type one item per line, e.g:<br />
            <code className="bg-muted px-1 rounded text-xs">guji 50k</code><br />
            <code className="bg-muted px-1 rounded text-xs">costa 50k</code>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
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

          {/* Multi-line Textarea */}
          <Textarea
            autoFocus
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder={"guji 50k\ncosta 50k\nwhf 20k"}
            className="rounded-xl text-base min-h-[120px]"
            rows={4}
          />

          {/* Live parsed preview */}
          {parsedLines.length > 0 && (
            <div className="bg-muted/50 rounded-xl p-3 space-y-1.5 border border-border/50">
              <p className="text-xs font-medium text-muted-foreground mb-2">Detected ({validItems.length} items):</p>
              {parsedLines.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  {(item.parsed.productName || item.parsed.quantity) ? (
                    <>
                      <Package className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="flex-1">
                        {item.parsed.quantity && <span className="font-medium">{item.parsed.quantity}</span>}
                        {item.parsed.quantity && item.parsed.productName && ' — '}
                        {item.parsed.productName && <span>{item.parsed.productName}</span>}
                        {item.parsed.clientName && !effectiveClient && (
                          <span className="text-muted-foreground ml-1">({item.parsed.clientName})</span>
                        )}
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground flex-1">"{item.text}" — no match</span>
                    </>
                  )}
                  <button onClick={() => handleRemoveLine(idx)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
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
                  {ambiguousFromLines?.parsed.ambiguousClients?.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Manual client select if none found */}
          {!effectiveClientId && text.trim().length > 0 && !needsClientSelection && (
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
          )}

          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full rounded-xl bg-destructive hover:bg-destructive/90 text-white"
          >
            <Zap className="w-4 h-4 mr-2" />
            Add Order {validItems.length > 0 ? `(${validItems.length} items)` : ''}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
