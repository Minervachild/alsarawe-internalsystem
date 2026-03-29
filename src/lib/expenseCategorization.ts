// Purchase type categories that employees select (intuitive names)
// Maps to Zoho accounting account IDs for the accountant agent

export interface PurchaseCategory {
  id: string;
  label: string;
  labelAr: string;
  zohoAccountId: string;
  zohoAccountName: string;
  includesTax: boolean;
}

export const PURCHASE_CATEGORIES: PurchaseCategory[] = [
  // COGS items
  { id: 'coffee', label: 'Coffee / Beans', labelAr: 'قهوة / بن', zohoAccountId: '4337397000000034003', zohoAccountName: 'تكلفة البضائع المباعة', includesTax: true },
  { id: 'milk', label: 'Milk / Dairy', labelAr: 'حليب / ألبان', zohoAccountId: '4337397000000034003', zohoAccountName: 'تكلفة البضائع المباعة', includesTax: true },
  { id: 'cups_packaging', label: 'Cups / Packaging', labelAr: 'أكواب / تغليف', zohoAccountId: '4337397000000034003', zohoAccountName: 'تكلفة البضائع المباعة', includesTax: true },
  { id: 'ingredients', label: 'Ingredients / Supplies', labelAr: 'مكونات / مستلزمات', zohoAccountId: '4337397000000034003', zohoAccountName: 'تكلفة البضائع المباعة', includesTax: true },
  { id: 'water_ice', label: 'Water / Ice', labelAr: 'ماء / ثلج', zohoAccountId: '4337397000000034003', zohoAccountName: 'تكلفة البضائع المباعة', includesTax: true },

  // Consumables & Cleaning
  { id: 'gas', label: 'Gas Cylinder', labelAr: 'اسطوانة غاز', zohoAccountId: '4337397000000000451', zohoAccountName: 'مصاريف استهلاكية ومنظفات وغاز', includesTax: true },
  { id: 'cleaning', label: 'Cleaning Supplies', labelAr: 'مواد تنظيف', zohoAccountId: '4337397000000000451', zohoAccountName: 'مصاريف استهلاكية ومنظفات وغاز', includesTax: true },
  { id: 'consumables', label: 'Consumables', labelAr: 'مستهلكات', zohoAccountId: '4337397000000000451', zohoAccountName: 'مصاريف استهلاكية ومنظفات وغاز', includesTax: true },

  // Work meals
  { id: 'meals', label: 'Work Meals / Restaurant', labelAr: 'وجبات عمل / مطعم', zohoAccountId: '4337397000003228421', zohoAccountName: 'عشاء/غداء عمل', includesTax: true },

  // Miscellaneous
  { id: 'incense', label: 'Incense / Oud', labelAr: 'بخور / عود', zohoAccountId: '4337397000000000460', zohoAccountName: 'المصروفات المتنوعة', includesTax: true },
  { id: 'office', label: 'Office Supplies', labelAr: 'لوازم مكتبية', zohoAccountId: '4337397000000000460', zohoAccountName: 'المصروفات المتنوعة', includesTax: true },
  { id: 'misc', label: 'Miscellaneous', labelAr: 'متنوع', zohoAccountId: '4337397000000000460', zohoAccountName: 'المصروفات المتنوعة', includesTax: true },

  // Salary
  { id: 'salary', label: 'Salary / Advance', labelAr: 'راتب / سلفة', zohoAccountId: '4337397000000000427', zohoAccountName: 'الرواتب والأجور', includesTax: false },
];

export interface PaymentMethodMapping {
  keywords: string[];
  zohoAccountId: string;
  zohoAccountName: string;
}

export const PAYMENT_METHOD_MAPPINGS: PaymentMethodMapping[] = [
  { keywords: ['بنك', 'شبكة', 'مدى', 'card', 'mada', 'بطاقة'], zohoAccountId: '4337397000000822001', zohoAccountName: 'بطاقة المصروفات' },
  { keywords: ['نقدي', 'cash', 'نقد', 'كاش'], zohoAccountId: '4337397000000000358', zohoAccountName: 'الصندوق' },
  { keywords: ['إنماء فرعي', 'انماء فرعي'], zohoAccountId: '4337397000000329003', zohoAccountName: 'بنك الانماء 2 فرعي' },
  { keywords: ['إنماء', 'انماء', 'inma'], zohoAccountId: '4337397000000086095', zohoAccountName: 'بنك الانماء أساسي' },
];

export function resolvePaymentAccount(paymentMethodName: string): { zohoAccountId: string; zohoAccountName: string } | null {
  const lower = paymentMethodName.toLowerCase().trim();
  // Check specific (longer) keywords first — "إنماء فرعي" before "إنماء"
  for (const mapping of PAYMENT_METHOD_MAPPINGS) {
    if (mapping.keywords.some(k => lower.includes(k.toLowerCase()))) {
      return { zohoAccountId: mapping.zohoAccountId, zohoAccountName: mapping.zohoAccountName };
    }
  }
  return null;
}

export function getCategoryById(id: string): PurchaseCategory | undefined {
  return PURCHASE_CATEGORIES.find(c => c.id === id);
}

export function buildZohoPayload(params: {
  vendor: string;
  invoiceNumber: string;
  amount: number;
  date: string;
  purchaseType: string;
  paymentMethodName: string;
  includesTax: boolean;
}) {
  const category = getCategoryById(params.purchaseType);
  const payment = resolvePaymentAccount(params.paymentMethodName);

  const confidence = category && payment ? 'auto' : 'needs_approval';
  const reasons: string[] = [];
  if (!category) reasons.push('unknown purchase type');
  if (!payment) reasons.push('unclear payment method');
  if (params.amount > 2000) reasons.push('amount exceeds 2000 SAR');

  return {
    vendor: params.vendor,
    invoice_number: params.invoiceNumber,
    amount: params.amount,
    date: params.date,
    expense_account_id: category?.zohoAccountId || '',
    expense_account_name: category?.zohoAccountName || '',
    payment_account_id: payment?.zohoAccountId || '',
    payment_account_name: payment?.zohoAccountName || '',
    reference: `${params.vendor} ${params.invoiceNumber}`.substring(0, 50),
    includes_tax: category ? category.includesTax : params.includesTax,
    confidence,
    reason: reasons.length > 0 ? reasons.join(', ') : undefined,
  };
}
