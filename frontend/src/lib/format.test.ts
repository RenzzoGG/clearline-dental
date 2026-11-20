import { describe, expect, it } from "vitest";

import { formatNumber, formatPrice } from "./format";

describe("formatNumber", () => {
  it.each([
    [0, 0, "0"],
    [12400, 0, "12,400"],
    [1234567.891, 2, "1,234,567.89"],
    [4.9, 1, "4.9"],
    [92, 0, "92"],
    [999.5, 0, "1,000"],
    [-1500, 0, "-1,500"],
  ])("formats %d with %d decimals as %s", (value, decimals, expected) => {
    expect(formatNumber(value, decimals)).toBe(expected);
  });

  it("matches Intl.NumberFormat for the counter values", () => {
    const intl = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
    for (const value of [0, 7, 99, 1000, 12400, 12399.6]) {
      expect(formatNumber(value)).toBe(intl.format(value));
    }
  });
});

describe("formatPrice", () => {
  it.each([
    ["60.00", "$60.00"],
    ["650.00", "$650.00"],
    [1250, "$1,250.00"],
    ["0.5", "$0.50"],
  ])("formats %s as %s", (price, expected) => {
    expect(formatPrice(price)).toBe(expected);
  });

  it("matches Intl's USD currency format", () => {
    const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
    for (const value of [0, 60, 120.5, 1999.99, 25000]) {
      expect(formatPrice(value)).toBe(usd.format(value));
    }
  });
});
