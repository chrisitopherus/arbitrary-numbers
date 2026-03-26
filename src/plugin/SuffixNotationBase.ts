import { SuffixNotationPlugin, SuffixNotationPluginOptions } from "../types/plugin";

/** Lookup for remainder values 0, 1, 2 (exponent mod 3). */
const DISPLAY_SCALE = [1, 10, 100] as const;

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
    public constructor(options: SuffixNotationPluginOptions = {}) {
        this.separator = options.separator ?? "";
    }

    /**
     * Returns the suffix label for the given tier, where `tier = floor(exponent / 3)`.
     *
     * Tier 0 corresponds to values below 10³ — return `""` to render with no suffix.
     * Tier 1 = 10³, tier 2 = 10⁶, and so on.
     *
     * @param tier - The exponent tier (`floor(exponent / 3)`), ≥ 0.
     * @returns The suffix string (e.g. `"K"`, `"a"`), or `""` for no suffix.
     */
    public abstract getSuffix(tier: number): string;

    /**
     * Formats the number by combining the scaled coefficient with the suffix returned
     * by {@link getSuffix}. When `getSuffix` returns an empty string, the separator is
     * omitted and only the plain value is returned.
     *
     * @param coefficient - The significand in `[1, 10)` or `0`.
     * @param exponent - The power of 10.
     * @param decimals - Number of decimal places in the output.
     * @returns The formatted string.
     */
    public format(coefficient: number, exponent: number, decimals: number): string {
        const tier = Math.floor(exponent / 3);
        const remainder = exponent - tier * 3;         // 0, 1, or 2
        const displayC = coefficient * DISPLAY_SCALE[remainder]!;
        const suffix = this.getSuffix(tier);

        if (!suffix) {
            return displayC.toFixed(decimals);
        }

        return `${displayC.toFixed(decimals)}${this.separator}${suffix}`;
    }
}
