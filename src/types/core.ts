/**
 * A number stored in normalised scientific notation as `coefficient × 10^exponent`,
 * where `1 ≤ |coefficient| < 10` (or `coefficient === 0`).
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
