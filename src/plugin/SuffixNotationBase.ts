import { SuffixNotationPlugin, SuffixNotationPluginOptions } from "../types/plugin"

/**
 * Abstract base class for suffix-based notation plugins (e.g. `"1.50 K"`, `"3.20 M"`).
 *
 * Subclasses implement {@link getSuffix} to map an exponent to a display label;
 * this class handles all the formatting logic.
 *
 * @example
 * class MyNotation extends SuffixNotationBase {
 *   getSuffix(exponent: number): string {
 *     return exponent >= 6 ? "M" : "K";
 *   }
 * }
 */
export abstract class SuffixNotationBase implements SuffixNotationPlugin {
    protected readonly separator: string;

    /**
     * @param options - Plugin options. `separator` defaults to `" "`.
     */
    public constructor(options: SuffixNotationPluginOptions = { separator: " " }) {
        this.separator = options.separator ?? " ";
    }

    /**
     * Returns the suffix label for the given exponent.
     *
     * @param exponent - The power of 10 of the number being formatted.
     */
    public abstract getSuffix(exponent: number): string;

    /**
     * Formats the number as `"<value><separator><suffix>"`.
     *
     * Numbers with exponent `< 3` (i.e. less than 1000) are formatted without a suffix.
     *
     * @param coefficient - The significand in `[1, 10)` or `0`.
     * @param exponent - The power of 10.
     * @param decimals - Number of decimal places in the output.
     */
    public format(coefficient: number, exponent: number, decimals: number): string {
        // Tiny numbers (< 1000) - no suffix needed
        if (exponent < 3) {
            const value = coefficient * Math.pow(10, exponent)
            return value.toFixed(decimals)
        }

        const tier = Math.floor(exponent / 3)
        const remainder = exponent - tier * 3          // 0, 1, or 2
        const displayC = coefficient * Math.pow(10, remainder)
        const suffix = this.getSuffix(exponent)

        return `${displayC.toFixed(decimals)}${this.separator}${suffix}`;
    }
}