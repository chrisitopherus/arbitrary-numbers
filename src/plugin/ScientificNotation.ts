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
        if (exponent === 0) return coefficient.toFixed(decimals);

        const sign = exponent < 0 ? "-" : "+";
        return `${coefficient.toFixed(decimals)}e${sign}${Math.abs(exponent)}`;
    }
}

/** Pre-built {@link ScientificNotation} instance. The default notation used by {@link ArbitraryNumber.toString}. */
export const scientificNotation = new ScientificNotation();
