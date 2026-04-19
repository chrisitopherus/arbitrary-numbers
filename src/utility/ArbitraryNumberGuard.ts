import { ArbitraryNumber } from "../core/ArbitraryNumber";

/**
 * Type-guard helpers for {@link ArbitraryNumber} and {@link NormalizedNumber}.
 *
 * @example
 * if (ArbitraryNumberGuard.isArbitraryNumber(value)) {
 *   value.add(ArbitraryNumber.One);
 * }
 */
export class ArbitraryNumberGuard {
    /**
     * Returns `true` if `obj` is an instance of {@link ArbitraryNumber}.
     *
     * @param obj - The value to test.
     * @returns `true` when `obj instanceof ArbitraryNumber`.
     */
    public static isArbitraryNumber(obj: unknown): obj is ArbitraryNumber {
        return obj instanceof ArbitraryNumber;
    }

    /**
     * Returns `true` if `obj` has the shape `{ coefficient: number; exponent: number }`.
     *
     * Both `ArbitraryNumber` instances and plain objects with the right shape pass this
     * check. Use {@link isArbitraryNumber} to distinguish the two.
     */
    public static isNormalizedNumber(obj: unknown): obj is { coefficient: number; exponent: number } {
        return obj != null
            && typeof (obj as Record<string, unknown>).coefficient === "number"
            && typeof (obj as Record<string, unknown>).exponent === "number";
    }

    /**
     * Returns `true` if `obj` is an {@link ArbitraryNumber} with a value of zero.
     *
     * @param obj - The value to test.
     * @returns `true` when `obj` is an `ArbitraryNumber` and its `coefficient` is `0`.
     */
    public static isZero(obj: unknown): boolean {
        return ArbitraryNumberGuard.isArbitraryNumber(obj) && obj.coefficient === 0;
    }
}
