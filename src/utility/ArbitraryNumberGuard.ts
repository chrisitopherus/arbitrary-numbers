import { ArbitraryNumber } from "../core/ArbitraryNumber";
import { NormalizedNumber } from "../types/core";

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
     * Returns `true` if `obj` has the shape of a {@link NormalizedNumber}
     * (i.e. has numeric `coefficient` and `exponent` properties).
     *
     * Note: both `ArbitraryNumber` instances and plain objects with the right
     * shape will pass this check. Use {@link isArbitraryNumber} when you need
     * to distinguish between the two.
     *
     * @param obj - The value to test.
     * @returns `true` when `obj` has `typeof coefficient === "number"` and
     *   `typeof exponent === "number"`.
     */
    public static isNormalizedNumber(obj: unknown): obj is NormalizedNumber {
        return obj != null
            && typeof (obj as NormalizedNumber)?.coefficient === "number"
            && typeof (obj as NormalizedNumber)?.exponent === "number";
    }

    /**
     * @deprecated Use {@link isNormalizedNumber} instead.
     * @param obj - The value to test.
     */
    public static isScientificNotation(obj: unknown): obj is NormalizedNumber {
        return ArbitraryNumberGuard.isNormalizedNumber(obj);
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
