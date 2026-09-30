export function formatCurrency(amount: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));
}

export function formatAmount(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 10000000) return `₹${(abs / 10000000).toFixed(2)}Cr`;
  if (abs >= 100000) return `₹${(abs / 100000).toFixed(2)}L`;
  if (abs >= 1000) return `₹${(abs / 1000).toFixed(1)}K`;
  return `₹${abs.toLocaleString('en-IN')}`;
}

export function formatAmountFull(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));
}

export function getAmountSign(amount: number): '+' | '-' | '' {
  if (amount > 0) return '+';
  if (amount < 0) return '-';
  return '';
}
