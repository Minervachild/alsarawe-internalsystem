import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const WEBHOOK_URL = 'https://n8n.srv1149238.hstgr.cloud/webhook/zoho-expense';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { date, shift, branchName, employeeName, cashAmount, cardAmount, transactionCount } = await req.json();

    const total = Number(cashAmount) + Number(cardAmount);
    const shiftLabel = shift === 'morning' ? 'صباحي' : 'مسائي';

    const prompt = [
      `📊 *تسجيل مبيعات جديد*`,
      ``,
      `📅 التاريخ: ${date}`,
      `🔄 الفترة: ${shiftLabel}`,
      `🏪 الفرع: ${branchName || '-'}`,
      `👤 الموظف: ${employeeName || '-'}`,
      ``,
      `💵 نقدي: ${Number(cashAmount).toLocaleString()} ﷼`,
      `💳 بطاقة: ${Number(cardAmount).toLocaleString()} ﷼`,
      `📦 الإجمالي: ${total.toLocaleString()} ﷼`,
      `🧾 عدد العمليات: ${transactionCount}`,
    ].join('\n');

    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(`Webhook error [${res.status}]: ${JSON.stringify(data)}`);
    }

    return new Response(JSON.stringify({ success: true, response: data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook send error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
