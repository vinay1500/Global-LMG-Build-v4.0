const normalizeCurrencyCode = (value: string | null | undefined) =>
  /^[A-Z]{3}$/.test(String(value || '').trim().toUpperCase())
    ? String(value || '').trim().toUpperCase()
    : 'USD';

const fallbackMoney = (amount: number, currencyCode: string, fractionDigits: number) => {
  const formattedAmount = Number(amount || 0).toLocaleString('en-US', {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  });

  return currencyCode === 'USD' ? `$${formattedAmount}` : `${currencyCode} ${formattedAmount}`;
};

export const formatCurrencyAmount = (
  amount: number,
  currencyCode = 'USD',
  options: { maximumFractionDigits?: number; minimumFractionDigits?: number } = {}
) => {
  const normalizedCurrency = normalizeCurrencyCode(currencyCode);
  const minimumFractionDigits = options.minimumFractionDigits ?? 2;
  const maximumFractionDigits = options.maximumFractionDigits ?? minimumFractionDigits;

  try {
    return new Intl.NumberFormat('en-US', {
      currency: normalizedCurrency,
      currencyDisplay: 'symbol',
      maximumFractionDigits,
      minimumFractionDigits,
      style: 'currency',
    }).format(Number(amount || 0));
  } catch {
    return fallbackMoney(Number(amount || 0), normalizedCurrency, minimumFractionDigits);
  }
};
