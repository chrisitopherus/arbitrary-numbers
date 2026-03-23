import { NotationPlugin } from "../types/plugin";

/**
 * Formats numbers using standard scientific notation: `1.500000000000000e+3`.
 *
 * Numbers with exponent `0` are formatted without an exponent part: `1.500000000000000`.
 *
 * @example
 * scientificNotation.format(1.5, 3, 15); // "1.500000000000000e+3"
 * scientificNotation.format(1.5, 0, 15); // "1.500000000000000"
 */
export class ScientificNotation implements NotationPlugin {
    /**
     * @param coefficient - The significand in `[1, 10)` or `0`.
     * @param exponent - The power of 10.
     * @param decimals - Number of decimal places in the output.
     */
    public format(coefficient: number, exponent: number, decimals: number): string {
        if (exponent === 0) return coefficient.toFixed(decimals)
        const sign = exponent < 0 ? "-" : "+";
        return `${coefficient.toFixed(decimals)}e${sign}${Math.abs(exponent)}`;
    }
}

/** Pre-built {@link ScientificNotation} instance. The default notation used by {@link ArbitraryNumber.toString}. */
export const scientificNotation = new ScientificNotation();