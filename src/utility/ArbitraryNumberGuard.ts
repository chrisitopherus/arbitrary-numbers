import { ArbitraryNumber } from "../core/ArbitraryNumber";
import { ScientificNotation } from "../types/core";

/**
 * Type-guard helpers for {@link ArbitraryNumber} and {@link ScientificNotation}.
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
     */
    public static isArbitraryNumber(obj: unknown): obj is ArbitraryNumber {
        return obj instanceof ArbitraryNumber;
    }

    /**
     * Returns `true` if `obj` has the shape of a {@link ScientificNotation}
     * (i.e. has numeric `coefficient` and `exponent` properties).
     *
     * @param obj - The value to test.
     */
    public static isScientificNotation(obj: unknown): obj is ScientificNotation {
        return obj !== undefined
            && typeof (obj as ScientificNotation)?.coefficient === "number"
            && typeof (obj as ScientificNotation)?.exponent === "number";
    }

    /**
     * Returns `true` if `obj` is an {@link ArbitraryNumber} with a value of zero.
     *
     * @param obj - The value to test.
     */
    public static isZero(obj: unknown): boolean {
        return ArbitraryNumberGuard.isArbitraryNumber(obj) && obj.coefficient === 0;
    }
}