import { CLASSIC_UNITS } from "../constants/units";
import { SuffixProvider, UnitArray, UnitNotationOptions } from "../types/plugin";
import { letterNotation } from "./LetterNotation";
import { SuffixNotationBase } from "./SuffixNotationBase";

/**
 * Formats numbers using a tier-indexed array of named units
 * (e.g. `"1.50 K"`, `"3.20 M"`, `"1.00 B"`).
 *
 * The `units` array is indexed by tier (`Math.floor(exponent / 3)`), so lookup
 * is O(1) — no search required. A `undefined` entry means "no unit for this tier";
 * the fallback plugin handles it.
 *
 * @example
 * const notation = new UnitNotation({ units: CLASSIC_UNITS, separator: " " });
 * notation.format(1.5, 6, 2);  // "1.50 M"
 *
 * @example
 * // Pre-built instance with space separator and letterNotation fallback:
 * number.toString(unitNotation);  // "1.50 K"
 */
export class UnitNotation extends SuffixNotationBase {
    protected readonly fallback: SuffixProvider | undefined;
    protected readonly units: UnitArray;

    /**
     * @param options - Tier-indexed unit array, optional suffix fallback plugin, and separator.
     *   `separator` defaults to `" "` (a space between number and unit symbol).
     */
    public constructor(options: UnitNotationOptions) {
        super({ separator: " ", ...options });
        this.units = options.units;
        this.fallback = options.fallback;
    }

    /**
     * Formats the number by looking up the suffix for `tier` via {@link getSuffix} in O(1).
     *
     * When no suffix is found (own units and fallback both return `""`), the number is
     * rendered as a plain fixed-point value — the separator is omitted.
     *
     * @param coefficient - The significand in `[1, 10)` or `0`.
     * @param exponent - The power of 10.
     * @param decimals - Number of decimal places in the output.
     * @returns The formatted string.
     */
    public override format(coefficient: number, exponent: number, decimals: number): string {
        const tier = Math.floor(exponent / 3);
        const remainder = exponent - tier * 3;
        const displayC = coefficient * Math.pow(10, remainder);
        const suffix = this.getSuffix(tier);

        if (!suffix) return displayC.toFixed(decimals);

        return `${displayC.toFixed(decimals)}${this.separator}${suffix}`;
    }

    /**
     * Returns the suffix for the given tier: the own unit symbol if defined,
     * otherwise the fallback's suffix, otherwise `""`.
     *
     * @param tier - The exponent tier (`Math.floor(exponent / 3)`).
     * @returns The suffix string, or `""` if neither own units nor fallback cover this tier.
     */
    public override getSuffix(tier: number): string {
        return this.units[tier]?.symbol
            ?? this.fallback?.getSuffix(tier)
            ?? "";
    }
}

/**
 * Pre-built {@link UnitNotation} instance using {@link CLASSIC_UNITS} (K, M, B, T…)
 * with a space separator and {@link letterNotation} as fallback for very large numbers.
 */
export const unitNotation = new UnitNotation({
    units: CLASSIC_UNITS,
    fallback: letterNotation,
});
