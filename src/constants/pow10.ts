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
 * Returns `10^n` for any `n`.
 *
 * Uses the {@link POW10} lookup table for integer `n ∈ [0, 15]` — O(1), no `Math.pow` call.
 * Falls back to `Math.pow(10, n)` for values outside that range, including fractional `n`
 * (e.g. the fractional-exponent remainder in `ArbitraryNumber.pow`, or when
 * `PrecisionCutoff > 15`).
 *
 * @param n - The exponent. Integer `n ∈ [0, 15]` hits the fast table path; everything else
 *   delegates to `Math.pow(10, n)`.
 */
export function pow10(n: number): number {
    return (n >= 0 && n < 16) ? POW10[n]! : Math.pow(10, n);
}

/**
 * Returns `10^n` for integer `n ∈ [0, 15]` — table lookup only, no branch to `Math.pow`.
 *
 * Use this at hot-path call sites where the caller can statically guarantee `n` is a
 * non-negative integer less than 16 (e.g. inside `add`/`sub` when `diff` is clamped by
 * `PrecisionCutoff ≤ 15`). Saves one conditional per call versus `pow10`.
 *
 * @param n - Integer in `[0, 15]`. Behaviour is undefined for values outside this range.
 */
export function pow10Int(n: number): number {
    return POW10[n]!;
}
