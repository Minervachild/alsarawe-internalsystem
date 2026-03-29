import { useState, useRef } from 'react';
import { Camera, Loader2, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ScannedData {
  invoice_number?: string;
  vendor_name?: string;
  payment_type?: string;
  amount?: number;
  vat_amount?: number;
  date?: string;
  purchase_type?: string;
}

interface InvoiceScannerProps {
  onScanned: (data: ScannedData) => void;
}

export function InvoiceScanner({ onScanned }: InvoiceScannerProps) {
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Please select an image file', variant: 'destructive' });
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);

    // Convert to base64
    setScanning(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      const { data, error } = await supabase.functions.invoke('scan-invoice', {
        body: { image_base64: base64, mime_type: file.type },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Scan failed');

      onScanned(data.data);
      toast({ title: 'Invoice scanned successfully' });
      setOpen(false);
      setPreview(null);
    } catch (err: any) {
      toast({ title: 'Scan failed', description: err.message, variant: 'destructive' });
    } finally {
      setScanning(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="gap-1.5"
        onClick={() => setOpen(true)}
      >
        <Camera className="w-4 h-4" />
        Scan Invoice
      </Button>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setPreview(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Smart Invoice Scanner
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Take a photo or upload an invoice image. AI will extract the invoice number, vendor, payment type, amount, and VAT.
            </p>

            {preview ? (
              <div className="relative">
                <img src={preview} alt="Invoice preview" className="w-full rounded-lg border border-border max-h-64 object-contain" />
                {!scanning && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 h-7 w-7 p-0 bg-background/80"
                    onClick={() => { setPreview(null); }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
                {scanning && (
                  <div className="absolute inset-0 bg-background/70 flex items-center justify-center rounded-lg">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <span className="text-sm font-medium">Extracting data...</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div
                className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                <Camera className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm font-medium">Tap to take photo or upload</p>
                <p className="text-xs text-muted-foreground mt-1">Supports JPG, PNG, HEIC</p>
              </div>
            )}

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = '';
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
