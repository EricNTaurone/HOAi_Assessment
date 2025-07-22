/**
 * Parses a number string that may be in US or European format
 * US format: 1,234.56 (comma as thousands separator, dot as decimal)
 * European format: 1.234,56 (dot as thousands separator, comma as decimal)
 * Also handles currency symbols at the beginning
 */
export function parseNumber(value: string): number {
  // Remove currency symbols first
  const cleanValue = value
    .replace(/^[\$£€¥₹₽¢₩₪₨₦₡₱₫₭₮₯₲₹₴₵₶₷₸₹₺₻₼₽₾₿]/, "")
    .trim();

  // If empty or invalid, return 0
  if (!cleanValue) return 0;

  // Count dots and commas to determine format
  const dotCount = (cleanValue.match(/\./g) || []).length;
  const commaCount = (cleanValue.match(/,/g) || []).length;

  // If no dots or commas, it's a simple number
  if (dotCount === 0 && commaCount === 0) {
    return parseFloat(cleanValue) || 0;
  }

  // European format: comma as decimal separator (e.g., "123,45" or "1.234,45")
  if (commaCount === 1 && dotCount === 0) {
    return parseFloat(cleanValue.replace(",", ".")) || 0;
  }

  // European format with thousands separator: dot for thousands, comma for decimal
  if (commaCount === 1 && dotCount >= 1) {
    const lastCommaIndex = cleanValue.lastIndexOf(",");
    const decimalPart = cleanValue.substring(lastCommaIndex + 1);

    // If there are only 1-2 digits after the comma, it's likely decimal
    if (decimalPart.length <= 2) {
      return parseFloat(cleanValue.replace(/\./g, "").replace(",", ".")) || 0;
    }
  }

  // US format: dot as decimal separator (e.g., "123.45" or "1,234.45")
  if (dotCount === 1 && commaCount === 0) {
    return parseFloat(cleanValue) || 0;
  }

  // US format with thousands separator: comma for thousands, dot for decimal
  if (dotCount === 1 && commaCount >= 1) {
    return parseFloat(cleanValue.replace(/,/g, "")) || 0;
  }

  // Fallback: try to parse as-is, removing any non-numeric characters except dots and hyphens
  return parseFloat(cleanValue.replace(/[^\d.-]/g, "")) || 0;
}

/**
 * Validates if a string could be a valid currency/number format
 */
export function validateCurrency(value: string): boolean {
  // Allow currency symbols, numbers, dots, commas, and spaces
  const currencyRegex = /^[\$£€¥₹₽¢₩₪₨₦₡₱₫₭₮₯₲₹₴₵₶₷₸₹₺₻₼₽₾₿]?[\d,. ]*$/;
  return currencyRegex.test(value.trim()) && value.trim() !== "";
}
