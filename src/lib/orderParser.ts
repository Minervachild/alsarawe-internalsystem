/**
 * Smart Order Text Parser
 * Parses shorthand like "50k guji cool donuts" into structured order data.
 * 
 * Rules:
 * 1. Detect quantity (50k, 100kg, 20kg)
 * 2. Detect client name (must match existing clients)
 * 3. Detect product alias (from products table)
 * 4. Detect city from client profile
 * 5. Client detection runs BEFORE product detection
 */

export interface ParsedOrder {
  quantity: string | null;
  quantityNum: number | null;
  unit: string | null;
  productName: string | null;
  productAlias: string | null;
  clientName: string | null;
  clientId: string | null;
  city: string | null;
  remainingText: string;
  ambiguousClients?: { id: string; name: string; location?: string | null }[];
}

interface ClientRecord {
  id: string;
  name: string;
  location?: string | null;
}

interface ProductRecord {
  id: string;
  full_name: string;
  aliases: string[];
}

/**
 * Extract quantity from text. Matches patterns like: 50k, 100kg, 20kg, 5k
 */
function extractQuantity(text: string): { quantity: string; quantityNum: number; unit: string; remaining: string } | null {
  const match = text.match(/(\d+(?:\.\d+)?)\s*(k|kg|g|lb|lbs|pcs|pc|bags?)\b/i);
  if (!match) return null;

  const num = parseFloat(match[1]);
  let unit = match[2].toLowerCase();
  // Normalize 'k' to 'kg'
  if (unit === 'k') unit = 'kg';
  if (unit === 'bag') unit = 'bags';
  if (unit === 'lb') unit = 'lbs';
  if (unit === 'pc') unit = 'pcs';

  const remaining = text.replace(match[0], '').trim();
  return { quantity: `${num}${unit}`, quantityNum: num, unit, remaining };
}

/**
 * Find the best client match from the text.
 * Case-insensitive, supports full and partial (unique) match.
 */
function findClient(text: string, clients: ClientRecord[]): { client: ClientRecord | null; ambiguous: ClientRecord[]; remaining: string } {
  const lower = text.toLowerCase();

  // Try full name match first (longest match wins)
  const sortedClients = [...clients].sort((a, b) => b.name.length - a.name.length);

  for (const client of sortedClients) {
    const clientLower = client.name.toLowerCase();
    if (lower.includes(clientLower)) {
      const remaining = text.replace(new RegExp(client.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '').trim();
      return { client, ambiguous: [], remaining };
    }
  }

  // Try partial match - split text into words and try matching
  const words = text.split(/\s+/);
  const matches: ClientRecord[] = [];

  for (const client of clients) {
    const clientWords = client.name.toLowerCase().split(/\s+/);
    // Check if any word from input matches a word in client name
    const hasMatch = words.some(w => clientWords.some(cw => cw === w.toLowerCase() && w.length > 2));
    if (hasMatch) matches.push(client);
  }

  if (matches.length === 1) {
    const remaining = text;
    return { client: matches[0], ambiguous: [], remaining };
  }
  if (matches.length > 1) {
    return { client: null, ambiguous: matches, remaining: text };
  }

  return { client: null, ambiguous: [], remaining: text };
}

/**
 * Find product by alias match.
 */
function findProduct(text: string, products: ProductRecord[]): { product: ProductRecord | null; alias: string | null; remaining: string } {
  const lower = text.toLowerCase();
  const words = lower.split(/\s+/).filter(Boolean);

  // Check for multi-word keywords first (e.g. "white bag" → "white label")
  const multiWordAliases: { product: ProductRecord; alias: string; phraseLen: number }[] = [];
  for (const product of products) {
    for (const alias of product.aliases) {
      const aliasLower = alias.toLowerCase();
      if (aliasLower.includes(' ') && lower.includes(aliasLower)) {
        multiWordAliases.push({ product, alias, phraseLen: aliasLower.length });
      }
    }
  }
  // Longest multi-word alias wins
  if (multiWordAliases.length > 0) {
    multiWordAliases.sort((a, b) => b.phraseLen - a.phraseLen);
    const best = multiWordAliases[0];
    const remaining = text.replace(new RegExp(best.alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '').trim();
    return { product: best.product, alias: best.alias, remaining };
  }

  for (const product of products) {
    // Check aliases
    for (const alias of product.aliases) {
      if (words.includes(alias.toLowerCase())) {
        const remaining = text.replace(new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'), '').trim();
        return { product, alias, remaining };
      }
    }
    // Check full name words
    const nameWords = product.full_name.toLowerCase().split(/\s+/);
    for (const word of words) {
      if (nameWords.includes(word) && word.length > 2) {
        return { product, alias: word, remaining: text };
      }
    }
  }

  return { product: null, alias: null, remaining: text };
}

/**
 * Main parser function
 */
export function parseOrderText(
  text: string,
  clients: ClientRecord[],
  products: ProductRecord[]
): ParsedOrder {
  const result: ParsedOrder = {
    quantity: null,
    quantityNum: null,
    unit: null,
    productName: null,
    productAlias: null,
    clientName: null,
    clientId: null,
    city: null,
    remainingText: text,
  };

  if (!text.trim()) return result;

  let remaining = text.trim();

  // 1. Extract quantity
  const qty = extractQuantity(remaining);
  if (qty) {
    result.quantity = qty.quantity;
    result.quantityNum = qty.quantityNum;
    result.unit = qty.unit;
    remaining = qty.remaining;
  }

  // 2. Client detection FIRST
  const clientMatch = findClient(remaining, clients);
  if (clientMatch.client) {
    result.clientName = clientMatch.client.name;
    result.clientId = clientMatch.client.id;
    result.city = clientMatch.client.location || null;
    remaining = clientMatch.remaining;
  } else if (clientMatch.ambiguous.length > 0) {
    result.ambiguousClients = clientMatch.ambiguous;
  }

  // 3. Product detection
  const productMatch = findProduct(remaining, products);
  if (productMatch.product) {
    result.productName = productMatch.product.full_name;
    result.productAlias = productMatch.alias;
    remaining = productMatch.remaining;
  }

  result.remainingText = remaining.replace(/\s+/g, ' ').trim();
  return result;
}
