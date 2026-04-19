/**
 * Pre-computed powers of 10 for exponents 0–22.
 *
 * 23 entries × 8 bytes = 184 bytes. Avoids a `Math.pow(10, n)` call (~2-3 ns)
 * on every add, sub, floor, ceil, round, toNumber, and isInteger operation.
 * Beyond 22, doubles lose integer-step precision anyway; the fallback is correct.
 */
export const POW10 = [
    1, 1e1, 1e2, 1e3, 1e4, 1e5, 1e6, 1e7,
    1e8, 1e9, 1e10, 1e11, 1e12, 1e13, 1e14, 1e15,
    1e16, 1e17, 1e18, 1e19, 1e20, 1e21, 1e22,
] as const;

/**
 * Returns `10^n` for any `n`.
 *
 * Uses the {@link POW10} lookup table for integer `n ∈ [0, 22]` — O(1), no `Math.pow` call.
 * Falls back to `Math.pow(10, n)` for values outside that range, including fractional `n`
 * (e.g. the fractional-exponent remainder in `ArbitraryNumber.pow`).
 */
export function pow10(n: number): number {
    return (n >= 0 && n < 23) ? POW10[n as 0]! : Math.pow(10, n);
}

/** @deprecated Use {@link pow10}. Kept for a single transition cycle; will be removed. */
export const pow10Int = pow10;
