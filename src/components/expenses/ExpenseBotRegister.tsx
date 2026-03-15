import { useState, useEffect } from 'react';
import { Copy, Check, Edit3, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface ExpenseEntry {
  id: string;
  title: string | null;
  amount: number;
  vat_included: boolean;
  date: string;
  notes: string | null;
  invoice_number: string | null;
  expense_sellers?: { name: string } | null;
  expense_accounts?: { name: string } | null;
  expense_payment_methods?: { name: string } | null;
  employees?: { name: string } | null;
}

interface ExpenseBotRegisterProps {
  entry: ExpenseEntry | null;
}

export function ExpenseBotRegister({ entry }: ExpenseBotRegisterProps) {
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
      .eq('type', 'expense')
      .limit(1)
      .maybeSingle();

    if (data) {
      setTemplate(data.template_text);
      setTemplateId(data.id);
    }
  };

  const saveTemplate = async () => {
    if (!user) return;

    try {
      if (templateId) {
        const { error } = await (supabase as any)
          .from('bot_register_templates')
          .update({ template_text: editedTemplate, updated_by: user.id })
          .eq('id', templateId);
        if (error) throw error;
      } else {
        const { data, error } = await (supabase as any)
          .from('bot_register_templates')
          .insert({ template_text: editedTemplate, updated_by: user.id, type: 'expense' })
          .select()
          .single();
        if (error) throw error;
        setTemplateId(data.id);
      }

      setTemplate(editedTemplate);
      setEditingTemplate(false);
      toast({ title: 'Template updated' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const generateOutput = () => {
    if (!entry || !template) return '';

    return template
      .replace(/{title}/g, entry.title || '')
      .replace(/{seller}/g, entry.expense_sellers?.name || '')
      .replace(/{account}/g, entry.expense_accounts?.name || '')
      .replace(/{payment}/g, entry.expense_payment_methods?.name || '')
      .replace(/{employee}/g, entry.employees?.name || '')
      .replace(/{amount}/g, String(Number(entry.amount)))
      .replace(/{vat}/g, entry.vat_included ? 'شامل' : 'غير شامل')
      .replace(/{date}/g, format(new Date(entry.date), 'yyyy-MM-dd'))
      .replace(/{invoice}/g, entry.invoice_number || '')
      .replace(/{notes}/g, entry.notes || '');
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
        <h3 className="font-semibold">Expense Bot Register</h3>
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
              <><Save className="w-3 h-3" /> Save Template</>
            ) : (
              <><Edit3 className="w-3 h-3" /> Edit Template</>
            )}
          </Button>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col">
        {editingTemplate ? (
          <div className="space-y-3 flex-1 flex flex-col">
            <p className="text-xs text-muted-foreground">
              Variables: {'{title}'}, {'{seller}'}, {'{account}'}, {'{payment}'}, {'{employee}'}, {'{amount}'}, {'{vat}'}, {'{date}'}, {'{invoice}'}, {'{notes}'}
            </p>
            <Textarea
              value={editedTemplate}
              onChange={(e) => setEditedTemplate(e.target.value)}
              className="flex-1 min-h-[200px] font-mono text-sm"
              dir="rtl"
            />
            <Button variant="outline" size="sm" onClick={() => setEditingTemplate(false)}>
              Cancel
            </Button>
          </div>
        ) : entry ? (
          <div className="space-y-3 flex-1 flex flex-col">
            <div className="bg-muted/50 rounded-xl p-4 flex-1 font-mono text-sm whitespace-pre-wrap" dir="rtl">
              {generateOutput() || <span className="text-muted-foreground">No template configured. Click "Edit Template" to set one up.</span>}
            </div>
            {template && (
              <Button onClick={handleCopy} className="w-full gap-2" variant="outline">
                {copied ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy to Clipboard</>}
              </Button>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm text-center">
            Select an expense entry to generate the accounting journal
          </div>
        )}
      </div>
    </div>
  );
}
