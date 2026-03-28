/**
 * Pre-computed powers of 10 for shift values 0-15.
 *
 * 16 values * 8 bytes = 128 bytes. Avoids a `Math.pow(10, n)` call (~1-2 ns)
 * on every add, sub, floor, ceil, round, and isInteger operation.
 * Used by both `ArbitraryNumber` and `ArbitraryNumberArithmetic`.
 */
export const POW10 = [
    1, 1e1, 1e2, 1e3, 1e4, 1e5, 1e6, 1e7,
    1e8, 1e9, 1e10, 1e11, 1e12, 1e13, 1e14, 1e15,
] as const;

/**
 * Returns `10^n`.
 *
 * Uses the {@link POW10} lookup table for `n in [0, 15]` and falls back to
 * `Math.pow(10, n)` for values outside that range (e.g. when `PrecisionCutoff > 15`).
 *
 * @param n - The exponent. Must be a non-negative integer for table lookup.
 */
export function pow10(n: number): number {
    return (n >= 0 && n < 16) ? POW10[n]! : Math.pow(10, n);
}
