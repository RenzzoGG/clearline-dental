/**
 * en-US number with thousands separators and a fixed number of decimals ("12,400", "4.9").
 *
 * Plain arithmetic instead of Intl.NumberFormat: the first Intl formatter a page creates
 * initializes ICU locale data, a visible main-thread cost on the landing on slow phones,
 * and these formats never vary.
 */
export function formatNumber(value: number, decimals = 0): string {
  const [whole = "0", fraction] = Math.abs(value).toFixed(decimals).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${value < 0 ? "-" : ""}${grouped}${fraction ? `.${fraction}` : ""}`;
}

/** USD price as "$1,234.00" (the API sends decimals as strings, e.g. "60.00"). */
export const formatPrice = (price: string | number): string => {
  const amount = typeof price === "string" ? Number(price) : price;
  return `${amount < 0 ? "-" : ""}$${formatNumber(Math.abs(amount), 2)}`;
};

export const formatDuration = (minutes: number): string =>
  minutes < 60
    ? `${minutes} min`
    : `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60} min` : ""}`;

export const formatPercent = (ratio: number): string =>
  `${(ratio * 100).toFixed(ratio > 0 && ratio < 0.1 ? 1 : 0)}%`;
