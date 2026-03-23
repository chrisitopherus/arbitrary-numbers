import { NormalizedNumber } from "../types/core";

/**
 * Low-level arithmetic helpers that operate on {@link NormalizedNumber} objects.
 *
 * These are internal building blocks used by {@link ArbitraryNumber}.
 * They are not part of the public API and should not be called directly by consumers.
 */
export class ArbitraryNumberArithmetic {
    /**
     * Normalises a value so that `1 ≤ |coefficient| < 10` (or `coefficient === 0`, `exponent === 0`).
     *
     * @param number - The value to normalise.
     * @returns A new object with the coefficient shifted into `[1, 10)`.
     *
     * @example
     * normalize({ coefficient: 15,  exponent: 3 }); // { coefficient: 1.5, exponent: 4 }
     * normalize({ coefficient: 0,   exponent: 9 }); // { coefficient: 0,   exponent: 0 }
     */
    public static normalize(number: NormalizedNumber): NormalizedNumber {
        if (number.coefficient === 0) {
            return { coefficient: 0, exponent: 0 };
        }

        const shift = Math.floor(Math.log10(Math.abs(number.coefficient)));
        const scale = 10 ** shift;

        // For subnormal floats (e.g. Number.MIN_VALUE ≈ 5e-324), 10^shift underflows to 0.
        // The value is indistinguishable from zero at any practical precision.
        if (scale === 0) {
            return { coefficient: 0, exponent: 0 };
        }

        return {
            coefficient: number.coefficient / scale,
            exponent: number.exponent + shift,
        };
    }

    /**
     * Adds two values that are within precision range of each other.
     *
     * The higher-exponent operand is kept as-is; the lower one is scaled down before
     * summing so both share the same exponent.
     *
     * The result is **not** normalised — call {@link normalize} on the output.
     *
     * @param a - First operand.
     * @param b - Second operand.
     * @param exponentDiff - Pre-computed `a.exponent - b.exponent`.
     *   Must satisfy `|exponentDiff| ≤ PrecisionCutoff`.
     * @returns An unnormalised sum.
     *
     * @example
     * alignedSum({ coefficient: 1.5, exponent: 3 }, { coefficient: 2.5, exponent: 3 }, 0);
     * // { coefficient: 4.0, exponent: 3 }
     */
    public static alignedSum(a: NormalizedNumber, b: NormalizedNumber, exponentDiff: number): NormalizedNumber {
        const higher = exponentDiff >= 0 ? a : b;
        const lower  = exponentDiff >= 0 ? b : a;
        const shift  = Math.abs(exponentDiff);

        return {
            coefficient: higher.coefficient + ArbitraryNumberArithmetic.shiftCoefficientDown(lower.coefficient, shift),
            exponent: higher.exponent,
        };
    }

    /**
     * Divides a coefficient by `10^places`, effectively shifting it right.
     *
     * @param coefficient - The value to shift.
     * @param places - Number of decimal places to shift right.
     * @returns `coefficient / 10^places`.
     *
     * @example
     * shiftCoefficientDown(1.5, 3); // 0.0015
     */
    public static shiftCoefficientDown(coefficient: number, places: number): number {
        return coefficient / (10 ** places);
    }

    /**
     * Multiplies a coefficient by `10^places`, effectively shifting it left.
     *
     * @param coefficient - The value to shift.
     * @param places - Number of decimal places to shift left.
     * @returns `coefficient * 10^places`.
     *
     * @example
     * shiftCoefficientUp(1.5, 3); // 1500
     */
    public static shiftCoefficientUp(coefficient: number, places: number): number {
        return coefficient * (10 ** places);
    }
}
