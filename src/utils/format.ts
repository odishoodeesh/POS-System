export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US').format(Math.round(amount)) + ' IQD';
};
