import type { ArbitraryNumber } from "../core/ArbitraryNumber";

/**
 * A number stored in normalised scientific notation as `coefficient * 10^exponent`,
 * where `1 <= |coefficient| < 10` (or `coefficient === 0`).
 *
 * @example
 * const n: NormalizedNumber = { coefficient: 1.5, exponent: 3 }; // 1500
 * const z: NormalizedNumber = { coefficient: 0,   exponent: 0 }; // 0
 */
export interface NormalizedNumber {
    /** The significand, always in `[1, 10)` or `0`. */
    coefficient: number;
    /** The power of 10 by which the coefficient is scaled. */
    exponent: number;
}

/** The result of a three-way comparison: negative, zero, or positive. */
export type Signum = -1 | 0 | 1;

/** Remainder after dividing an exponent by 3 - the within-tier offset. */
export type Mod3 = 0 | 1 | 2;

/**
 * Type of the {@link an} shorthand function.
 *
 * Callable as `an(coefficient, exponent?)` and also has a
 * `.from(value)` static method for plain JS number conversion.
 */
export interface AnFunction {
    (coefficient: number, exponent?: number): ArbitraryNumber;
    from(value: number): ArbitraryNumber;
}
