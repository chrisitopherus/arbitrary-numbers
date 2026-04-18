import { type NotationPlugin } from "../types/plugin";

/**
 * Formats numbers using standard scientific notation: `"1.50e+3"`, `"1.50e-5"`.
 *
 * Numbers with `exponent === 0` are formatted without an exponent part: `"1.50"`.
 * This is the default plugin used by {@link ArbitraryNumber.toString}.
 *
 * @example
 * const n = new ArbitraryNumber(1.5, 3);
 * n.toString();                       // "1.50e+3"   (default decimals = 2)
 * n.toString(scientificNotation, 6);  // "1.500000e+3"
 */
export class ScientificNotation implements NotationPlugin {
    /**
     * Formats a normalised value as `"<coefficient>e±<exponent>"`.
     *
     * @param coefficient - The significand in `[1, 10)` or `0`.
     * @param exponent - The power of 10.
     * @param decimals - Number of decimal places in the output.
     * @returns The formatted string.
     */
    public format(coefficient: number, exponent: number, decimals: number): string {
        let c = coefficient;
        let e = exponent;

        // toFixed can round 9.5 up to "10", violating the [1,10) display invariant.
        // Detect this and re-normalise before building the string.
        let fixed = c.toFixed(decimals);
        if (Math.abs(parseFloat(fixed)) >= 10) {
            c = c / 10;
            e = e + 1;
            fixed = c.toFixed(decimals);
        }

        if (e === 0) return fixed;

        const sign = e < 0 ? "-" : "+";
        return `${fixed}e${sign}${Math.abs(e)}`;
    }
}

/** Pre-built {@link ScientificNotation} instance. The default notation used by {@link ArbitraryNumber.toString}. */
export const scientificNotation = new ScientificNotation();
