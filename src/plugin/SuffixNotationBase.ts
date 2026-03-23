import { SuffixNotationPlugin, SuffixNotationPluginOptions } from "../types/plugin";

/**
 * Abstract base class for suffix-based notation plugins (e.g. `"1.50 K"`, `"3.20a"`).
 *
 * Subclasses implement {@link getSuffix} to map a tier to a display label.
 * All coefficient/remainder math is handled here.
 *
 * @example
 * class EmojiNotation extends SuffixNotationBase {
 *   private static readonly TIERS = ["", "🔥", "💥", "🌟", "🚀"];
 *   getSuffix(tier: number): string {
 *     return EmojiNotation.TIERS[tier] ?? `e+${tier * 3}`;
 *   }
 * }
 */
export abstract class SuffixNotationBase implements SuffixNotationPlugin {
    protected readonly separator: string;

    /**
     * @param options - Plugin options. `separator` defaults to `""`.
     */
    public constructor(options: SuffixNotationPluginOptions = { separator: "" }) {
        this.separator = options.separator ?? "";
    }

    /**
     * Returns the suffix label for the given tier, where `tier = floor(exponent / 3)`.
     *
     * Tier 1 corresponds to 10³ (thousands), tier 2 to 10⁶ (millions), and so on.
     * Tier 0 is never passed — numbers below 10³ are formatted without a suffix.
     *
     * @param tier - The exponent tier (`floor(exponent / 3)`), always ≥ 1.
     * @returns The suffix string to append (e.g. `"K"`, `"a"`).
     */
    public abstract getSuffix(tier: number): string;

    /**
     * Formats the number as `"<value><separator><suffix>"`.
     *
     * Numbers with `exponent < 3` (i.e. less than 1000) are formatted without a suffix.
     *
     * @param coefficient - The significand in `[1, 10)` or `0`.
     * @param exponent - The power of 10.
     * @param decimals - Number of decimal places in the output.
     * @returns The formatted string.
     */
    public format(coefficient: number, exponent: number, decimals: number): string {
        if (exponent < 3) {
            const value = coefficient * Math.pow(10, exponent);
            return value.toFixed(decimals);
        }

        const tier = Math.floor(exponent / 3);
        const remainder = exponent - tier * 3;         // 0, 1, or 2
        const displayC = coefficient * Math.pow(10, remainder);
        const suffix = this.getSuffix(tier);

        return `${displayC.toFixed(decimals)}${this.separator}${suffix}`;
    }
}
