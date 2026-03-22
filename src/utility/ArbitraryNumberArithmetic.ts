import { ScientificNotation } from "../types/core";

export class ArbitraryNumberArithmetic {
    public static normalize(number: ScientificNotation): ScientificNotation {
        if (number.coefficient === 0) {
            return { coefficient: 0, exponent: 0 };
        }

        // determine the number of places to shift the coefficient to get a single digit before the decimal point
        const shift = Math.floor(Math.log10(Math.abs(number.coefficient)));

        let coefficient = number.coefficient / (10 ** shift);
        let exponent = number.exponent + shift;

        // adjust the coefficient and exponent until the coefficient is between 1 and 10
        while (Math.abs(coefficient) >= 10) {
            coefficient /= 10;
            exponent += 1;
        }

        while (Math.abs(coefficient) < 1) {
            coefficient *= 10;
            exponent -= 1;
        }

        return { coefficient, exponent };
    }

    public static alignedSum(a: ScientificNotation, b: ScientificNotation, exponentDiff: number): ScientificNotation {
        const higher = exponentDiff >= 0 ? a : b;
        const lower  = exponentDiff >= 0 ? b : a;
        const shift  = Math.abs(exponentDiff);

        return {
            coefficient: higher.coefficient + ArbitraryNumberArithmetic.shiftCoefficientDown(lower.coefficient, shift),
            exponent: higher.exponent,
        };
    }

    public static shiftCoefficientDown(coefficient: number, places: number): number {
        return coefficient / (10 ** places);
    }

    public static shiftCoefficientUp(coefficient: number, places: number): number {
        return coefficient * (10 ** places);
    }
}
