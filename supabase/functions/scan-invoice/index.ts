import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const { image_base64, mime_type } = await req.json();
    if (!image_base64) throw new Error('No image provided');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an invoice data extractor for a coffee shop business. Extract the following fields from the invoice image:
- invoice_number: The invoice or receipt number
- vendor_name: The seller/store/vendor name
- payment_type: Payment method (cash, card, bank transfer, etc.)
- amount: Total amount (number only, no currency symbols)
- vat_amount: VAT/tax amount if shown (number only, 0 if not found)
- date: Invoice date in YYYY-MM-DD format if visible
- purchase_type: Categorize based on items purchased. Use ONE of these exact values:
  "coffee" (coffee beans, roasted/green coffee),
  "milk" (milk, dairy products),
  "cups_packaging" (cups, lids, packaging),
  "ingredients" (food/drink ingredients, syrups, flavors),
  "water_ice" (water, ice),
  "gas" (gas cylinders),
  "cleaning" (cleaning supplies, detergent),
  "consumables" (non-production consumables),
  "meals" (restaurant receipts, takeaway food),
  "incense" (incense, oud),
  "office" (office supplies),
  "salary" (salary, salary advance),
  "misc" (anything else)

You MUST call the extract_invoice_data function with the extracted data.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mime_type || 'image/jpeg'};base64,${image_base64}`,
                },
              },
              {
                type: 'text',
                text: 'Extract invoice data from this image.',
              },
            ],
          },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_invoice_data',
              description: 'Extract structured invoice data from the image',
              parameters: {
                type: 'object',
                properties: {
                  invoice_number: { type: 'string', description: 'Invoice or receipt number' },
                  vendor_name: { type: 'string', description: 'Seller/store/vendor name' },
                  payment_type: { type: 'string', description: 'Payment method' },
                  amount: { type: 'number', description: 'Total amount' },
                  vat_amount: { type: 'number', description: 'VAT/tax amount' },
                  date: { type: 'string', description: 'Invoice date YYYY-MM-DD' },
                  purchase_type: { type: 'string', description: 'Category: coffee, milk, cups_packaging, ingredients, water_ice, gas, cleaning, consumables, meals, incense, office, salary, misc' },
                },
                required: ['invoice_number', 'vendor_name', 'amount', 'purchase_type'],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'extract_invoice_data' } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limited, please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add funds.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      throw new Error(`AI gateway error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      throw new Error('No structured data extracted');
    }

    const extracted = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ success: true, data: extracted }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('scan-invoice error:', msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
