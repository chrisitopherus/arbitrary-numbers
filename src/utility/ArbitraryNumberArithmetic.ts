import { ScientificNotation } from "../types/core";

/**
 * Low-level arithmetic helpers that operate directly on {@link ScientificNotation} objects.
 *
 * These methods are internal building blocks used by {@link ArbitraryNumber} and are not
 * intended to be called directly by consumers of the library.
 */
export class ArbitraryNumberArithmetic {
    /**
     * Normalises a scientific notation value so that `1 ≤ |coefficient| < 10`
     * (or `coefficient === 0` with `exponent === 0`).
     *
     * @example
     * normalize({ coefficient: 15, exponent: 3 }); // { coefficient: 1.5, exponent: 4 }
     * normalize({ coefficient: 0,  exponent: 9 }); // { coefficient: 0,   exponent: 0 }
     *
     * @param number - The value to normalise.
     * @returns A new object with the coefficient shifted into `[1, 10)`.
     */
    public static normalize(number: ScientificNotation): ScientificNotation {
        if (number.coefficient === 0) {
            return { coefficient: 0, exponent: 0 };
        }

        const shift = Math.floor(Math.log10(Math.abs(number.coefficient)));
        const scale = 10 ** shift;

        // For subnormal floats (e.g. Number.MIN_VALUE ≈ 5e-324), 10^shift underflows to 0.
        // The number is so small it is indistinguishable from zero at any practical precision.
        if (scale === 0) {
            return { coefficient: 0, exponent: 0 };
        }

        return {
            coefficient: number.coefficient / scale,
            exponent: number.exponent + shift,
        };
    }

    /**
     * Adds two scientific notation values that are within precision range of each other.
     *
     * The higher-exponent operand is kept as-is; the lower one is scaled down before
     * summing so both share the same exponent.
     *
     * @param a - First operand.
     * @param b - Second operand.
     * @param exponentDiff - Pre-computed `a.exponent - b.exponent`. Must satisfy
     *   `|exponentDiff| ≤ PrecisionCutoff`.
     * @returns An unnormalised result — call {@link normalize} on the output.
     */
    public static alignedSum(a: ScientificNotation, b: ScientificNotation, exponentDiff: number): ScientificNotation {
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
     * @example
     * shiftCoefficientDown(1.5, 3); // 0.0015
     *
     * @param coefficient - The value to shift.
     * @param places - Number of decimal places to shift right.
     */
    public static shiftCoefficientDown(coefficient: number, places: number): number {
        return coefficient / (10 ** places);
    }

    /**
     * Multiplies a coefficient by `10^places`, effectively shifting it left.
     *
     * @example
     * shiftCoefficientUp(1.5, 3); // 1500
     *
     * @param coefficient - The value to shift.
     * @param places - Number of decimal places to shift left.
     */
    public static shiftCoefficientUp(coefficient: number, places: number): number {
        return coefficient * (10 ** places);
    }
}
