import { Equal, Schema } from "effect";

/**
 * Supported currencies for the AV-Daily platform
 */
const AVAILABLE_CURRENCIES = ["NGN"];
export const DEFAULT_CURRENCY = AVAILABLE_CURRENCIES[0] as Currency;
export const Currency = Schema.Literal(...AVAILABLE_CURRENCIES);
export type Currency = typeof Currency.Type;

/**
 * Schema for Money validation
 */
export const MoneySchema = Schema.Struct({
  value: Schema.Number.pipe(Schema.nonNegative()),
  currency: Currency,
}).annotations({
  description: "Money value object representing monetary amounts with currency",
});

/**
 * Money value object representing monetary amounts with currency
 */
export class Money {
  constructor(
    public readonly value: number,
    public readonly currency: Currency
  ) {
    // Validate the money object
    Schema.decodeUnknownSync(MoneySchema)({ value, currency });
  }
  /**
   * Create Money from a number value with default currency
   */
  static fromNumber(value: number, currency: Currency = DEFAULT_CURRENCY): Money {
    if (value < 0) {
      throw new Error("Money value cannot be negative");
    }
    return new Money(value, currency);
  }

  /**
   * Create zero money with default currency
   */
  static zero(currency: Currency = DEFAULT_CURRENCY): Money {
    return new Money(0, currency);
  }

  /**
   * Check if this Money equals another Money (same value and currency)
   */
  equals(other: Money): boolean {
    return (
      Equal.equals(this.value, other.value) &&
      Equal.equals(this.currency, other.currency)
    );
  }

  /**
   * Add another Money amount (must be same currency)
   */
  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error(
        `Cannot add money with different currencies: ${this.currency} and ${other.currency}`
      );
    }
    return new Money(this.value + other.value, this.currency);
  }

  /**
   * Subtract another Money amount (must be same currency)
   */
  subtract(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error(
        `Cannot subtract money with different currencies: ${this.currency} and ${other.currency}`
      );
    }
    const result = this.value - other.value;
    if (result < 0) {
      throw new Error("Cannot create negative money amount");
    }
    return new Money(result, this.currency);
  }

  /**
   * Multiply by a factor
   */
  multiply(factor: number): Money {
    if (factor < 0) {
      throw new Error("Cannot multiply money by negative factor");
    }
    return new Money(this.value * factor, this.currency);
  }

  /**
   * Check if this Money is greater than another Money
   */
  isGreaterThan(other: Money): boolean {
    if (this.currency !== other.currency) {
      throw new Error(
        `Cannot compare money with different currencies: ${this.currency} and ${other.currency}`
      );
    }
    return this.value > other.value;
  }

  /**
   * Check if this Money is greater than or equal to another Money
   */
  isGreaterThanOrEqual(other: Money): boolean {
    if (this.currency !== other.currency) {
      throw new Error(
        `Cannot compare money with different currencies: ${this.currency} and ${other.currency}`
      );
    }
    return this.value >= other.value;
  }

  /**
   * Check if this Money is less than another Money
   */
  isLessThan(other: Money): boolean {
    if (this.currency !== other.currency) {
      throw new Error(
        `Cannot compare money with different currencies: ${this.currency} and ${other.currency}`
      );
    }
    return this.value < other.value;
  }

  /**
   * Check if this Money is zero
   */
  isZero(): boolean {
    return this.value === 0;
  }

  /**
   * Format as currency string
   */
  format(): string {
    const formatter = new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: this.currency,
      minimumFractionDigits: 2,
    });
    return formatter.format(this.value);
  }

  /**
   * Get the string representation
   */
  toString(): string {
    return `${this.value} ${this.currency}`;
  }
}
