import { useState, useRef } from 'react';
import { Upload, FileImage, File, X, Loader2, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DeliveryProofDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rowId: string;
  onConfirm: (urls: string[]) => void;
}

export function DeliveryProofDialog({ open, onOpenChange, rowId, onConfirm }: DeliveryProofDialogProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setIsUploading(true);
    const newUrls: string[] = [];

    try {
      for (const file of Array.from(selectedFiles)) {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
          toast({ title: 'Invalid file type', description: 'Only JPEG, PNG, WebP and PDF allowed.', variant: 'destructive' });
          continue;
        }
        if (file.size > 10 * 1024 * 1024) {
          toast({ title: 'File too large', description: 'Maximum 10MB.', variant: 'destructive' });
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${rowId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage.from('delivery-proofs').upload(fileName, file);
        if (uploadError) throw uploadError;

        const { data: signedUrlData, error: urlError } = await supabase.storage
          .from('delivery-proofs')
          .createSignedUrl(fileName, 86400);
        if (urlError) throw urlError;
        newUrls.push(signedUrlData.signedUrl);
      }

      if (newUrls.length > 0) {
        setUploadedFiles(prev => [...prev, ...newUrls]);
      }
    } catch (error: any) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (url: string) => {
    setUploadedFiles(prev => prev.filter(u => u !== url));
  };

  const handleConfirm = () => {
    if (uploadedFiles.length === 0) {
      toast({ title: 'Upload required', description: 'Please upload at least one delivery proof.', variant: 'destructive' });
      return;
    }
    onConfirm(uploadedFiles);
    setUploadedFiles([]);
    onOpenChange(false);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setUploadedFiles([]);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Upload Delivery Proof
          </DialogTitle>
          <DialogDescription>
            Upload proof of delivery before moving this order to Shipped.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Uploaded files */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {uploadedFiles.map((url, idx) => (
                <div key={idx} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                  <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm hover:underline truncate flex-1">
                    {url.toLowerCase().includes('.pdf') ? <File className="w-4 h-4 text-destructive shrink-0" /> : <FileImage className="w-4 h-4 text-primary shrink-0" />}
                    <span className="truncate">File {idx + 1}</span>
                  </a>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0" onClick={() => handleRemoveFile(url)}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Upload area */}
          <div
            className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple onChange={handleFileSelect} className="hidden" />
            {isUploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Uploading...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-8 h-8 text-muted-foreground" />
                <span className="text-sm font-medium">Click to upload files</span>
                <span className="text-xs text-muted-foreground">JPEG, PNG, WebP or PDF (max 10MB)</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
            <Button onClick={handleConfirm} disabled={uploadedFiles.length === 0 || isUploading}>
              Confirm & Move to Shipped
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
