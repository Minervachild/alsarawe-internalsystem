import { useState, useRef } from 'react';
import { Upload, FileImage, File, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface DeliveryProofUploaderProps {
  value: string | string[] | null;
  onChange: (urls: string[]) => void;
  rowId: string;
}

export function DeliveryProofUploader({ value, onChange, rowId }: DeliveryProofUploaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Normalize value to array
  const files: string[] = Array.isArray(value) ? value : value ? [value] : [];

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setIsUploading(true);
    const newUrls: string[] = [];

    try {
      for (const file of Array.from(selectedFiles)) {
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
          toast({
            title: 'Invalid file type',
            description: 'Only JPEG, PNG, WebP and PDF files are allowed.',
            variant: 'destructive',
          });
          continue;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: 'File too large',
            description: 'Maximum file size is 10MB.',
            variant: 'destructive',
          });
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${rowId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('delivery-proofs')
          .upload(fileName, file);

        if (uploadError) {
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('delivery-proofs')
          .getPublicUrl(fileName);

        newUrls.push(publicUrl);
      }

      if (newUrls.length > 0) {
        onChange([...files, ...newUrls]);
        toast({ title: 'Files uploaded successfully' });
      }
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload file.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveFile = (urlToRemove: string) => {
    onChange(files.filter(url => url !== urlToRemove));
  };

  const getFileIcon = (url: string) => {
    if (url.toLowerCase().endsWith('.pdf')) {
      return <File className="w-4 h-4 text-destructive" />;
    }
    return <FileImage className="w-4 h-4 text-primary" />;
  };

  const getFileName = (url: string) => {
    const parts = url.split('/');
    return parts[parts.length - 1].substring(0, 20) + '...';
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-1 text-sm cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 transition-colors",
            files.length === 0 && "text-muted-foreground"
          )}
        >
          {files.length > 0 ? (
            <div className="flex items-center gap-1">
              {getFileIcon(files[0])}
              <span className="text-xs font-medium">{files.length} file{files.length > 1 ? 's' : ''}</span>
            </div>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              <span className="text-xs">Upload proof</span>
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Delivery Proof</h4>
            <span className="text-xs text-muted-foreground">Required for shipping</span>
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {files.map((url, idx) => (
                <div key={idx} className="flex items-center justify-between bg-muted/50 rounded px-2 py-1">
                  <a 
                    href={url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs hover:underline truncate flex-1"
                  >
                    {getFileIcon(url)}
                    {getFileName(url)}
                  </a>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0"
                    onClick={() => handleRemoveFile(url)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Upload button */}
          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload File
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              JPEG, PNG, WebP or PDF (max 10MB)
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
