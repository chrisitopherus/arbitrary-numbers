/**
 * A number expressed in normalised scientific notation as `coefficient × 10^exponent`,
 * where `1 ≤ |coefficient| < 10` (or `coefficient === 0`).
 *
 * @example
 * // 1500 → { coefficient: 1.5, exponent: 3 }
 * // 0.05 → { coefficient: 5,   exponent: -2 }
 */
export interface ScientificNotation {
    /** The significand, always in the range `[1, 10)` or `0`. */
    coefficient: number;
    /** The power of 10 by which the coefficient is scaled. */
    exponent: number;
}