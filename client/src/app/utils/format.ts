const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "short",
  timeStyle: "short"
});

export const formatCurrency = (value: number): string => currencyFormatter.format(value);

export const formatDate = (value: string | Date): string => {
  const date = typeof value === "string" ? new Date(value) : value;
  return dateFormatter.format(date);
};
