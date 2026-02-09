import { useState } from 'react';
import { Target } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

interface CycleTargetEditorProps {
  groupId: string;
  currentTarget: number;
  onUpdate: (groupId: string, targetDays: number) => void;
}

export function CycleTargetEditor({ groupId, currentTarget, onUpdate }: CycleTargetEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState(String(currentTarget));

  const handleSave = () => {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num > 0) {
      onUpdate(groupId, num);
    }
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (open) setValue(String(currentTarget));
    }}>
      <PopoverTrigger asChild>
        <button
          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-muted hover:bg-muted/80 text-muted-foreground transition-colors cursor-pointer"
          title="Set target cycle days"
        >
          <Target className="w-3 h-3" />
          Target {currentTarget}d
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-3" align="start">
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Target Days</label>
          <div className="flex gap-2">
            <Input
              type="number"
              min="1"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="h-8 text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
              }}
            />
            <Button size="sm" className="h-8" onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
