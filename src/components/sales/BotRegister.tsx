import { useState, useEffect } from 'react';
import { Copy, Check, Edit3, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface SalesEntry {
  id: string;
  date: string;
  shift: string;
  cash_amount: number;
  card_amount: number;
  transaction_count: number;
}

interface BotRegisterProps {
  entry: SalesEntry | null;
  branchName?: string;
}

export function BotRegister({ entry, branchName }: BotRegisterProps) {
  const [template, setTemplate] = useState('');
  const [editingTemplate, setEditingTemplate] = useState(false);
  const [editedTemplate, setEditedTemplate] = useState('');
  const [copied, setCopied] = useState(false);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const { isAdmin, user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchTemplate();
  }, []);

  const fetchTemplate = async () => {
    const { data } = await (supabase as any)
      .from('bot_register_templates')
      .select('*')
      .eq('type', 'sales')
      .limit(1)
      .maybeSingle();

    if (data) {
      setTemplate(data.template_text);
      setTemplateId(data.id);
    }
  };

  const saveTemplate = async () => {
    if (!templateId || !user) return;

    try {
      const { error } = await supabase
        .from('bot_register_templates')
        .update({ template_text: editedTemplate, updated_by: user.id })
        .eq('id', templateId);

      if (error) throw error;

      setTemplate(editedTemplate);
      setEditingTemplate(false);
      toast({ title: 'Template updated' });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const generateOutput = () => {
    if (!entry || !template) return '';

    const total = Number(entry.cash_amount) + Number(entry.card_amount);
    const dateFormatted = format(new Date(entry.date), 'yyyy M/d');
    const shiftLabel = entry.shift === 'morning' ? 'صباحي' : 'مسائي';
    const cardLabel = 'الإنماء اساسي';

    return template
      .replace(/{branch}/g, branchName || '')
      .replace(/{date}/g, dateFormatted)
      .replace(/{shift}/g, shiftLabel)
      .replace(/{cash}/g, String(Number(entry.cash_amount)))
      .replace(/{card}/g, String(Number(entry.card_amount)))
      .replace(/{card_label}/g, cardLabel)
      .replace(/{total}/g, String(total))
      .replace(/{transactions}/g, String(entry.transaction_count));
  };

  const handleCopy = () => {
    const output = generateOutput();
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: 'Copied to clipboard!' });
  };

  return (
    <div className="card-premium overflow-hidden h-full flex flex-col">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold">Bot Register</h3>
        {isAdmin && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => {
              if (editingTemplate) {
                saveTemplate();
              } else {
                setEditedTemplate(template);
                setEditingTemplate(true);
              }
            }}
          >
            {editingTemplate ? (
              <>
                <Save className="w-3 h-3" />
                Save Template
              </>
            ) : (
              <>
                <Edit3 className="w-3 h-3" />
                Edit Template
              </>
            )}
          </Button>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col">
        {editingTemplate ? (
          <div className="space-y-3 flex-1 flex flex-col">
            <p className="text-xs text-muted-foreground">
              Available variables: {'{branch}'}, {'{date}'}, {'{shift}'}, {'{cash}'}, {'{card}'}, {'{card_label}'}, {'{total}'}, {'{transactions}'}
            </p>
            <Textarea
              value={editedTemplate}
              onChange={(e) => setEditedTemplate(e.target.value)}
              className="flex-1 min-h-[200px] font-mono text-sm"
              dir="rtl"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingTemplate(false)}
            >
              Cancel
            </Button>
          </div>
        ) : entry ? (
          <div className="space-y-3 flex-1 flex flex-col">
            <div className="bg-muted/50 rounded-xl p-4 flex-1 font-mono text-sm whitespace-pre-wrap" dir="rtl">
              {generateOutput()}
            </div>
            <Button
              onClick={handleCopy}
              className="w-full gap-2"
              variant="outline"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy to Clipboard
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm text-center">
            Select a sales entry from the table to generate the accounting journal
          </div>
        )}
      </div>
    </div>
  );
}
