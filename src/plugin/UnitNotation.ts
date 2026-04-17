import { CLASSIC_UNITS } from "../constants/units";
import { type SuffixProvider, type UnitArray, type UnitNotationOptions } from "../types/plugin";
import { letterNotation } from "./AlphabetNotation";
import { SuffixNotationBase } from "./SuffixNotationBase";

/**
 * Formats numbers using a tier-indexed array of named units
 * (e.g. `"1.50 K"`, `"3.20 M"`, `"1.00 B"`).
 *
 * The `units` array is indexed by tier (`Math.floor(exponent / 3)`), so lookup
 * is O(1) - no search required. A `undefined` entry means "no unit for this tier";
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
    protected readonly fallback?: SuffixProvider;
    protected readonly units: UnitArray;
    /** The highest tier index that has a defined unit in `units`. Used to offset fallback calls. */
    private readonly lastDefinedTier: number;
    private readonly offsetFallback: boolean;

    /**
     * @param options - Tier-indexed unit array, optional suffix fallback plugin, and separator.
     *   `separator` defaults to `" "` (a space between number and unit symbol).
     *   `offsetFallback` defaults to `true` — the fallback tier is offset so its suffixes
     *   are visually distinct from any low-tier suffixes the same fallback would produce.
     */
    public constructor(options: UnitNotationOptions) {
        super({ separator: " ", ...options });
        this.units = options.units;
        this.fallback = options.fallback;
        this.offsetFallback = options.offsetFallback !== false; // default true

        // Compute last defined tier so fallback can be offset correctly.
        let last = 0;
        for (let i = options.units.length - 1; i >= 0; i--) {
            if (options.units[i] !== undefined) { last = i; break; }
        }

        this.lastDefinedTier = last;
    }

    /**
     * Returns the suffix for the given tier: the own unit symbol if defined,
     * otherwise the fallback's suffix (offset by the last defined tier when
     * `offsetFallback` is `true`), otherwise `""`.
     *
     * The offset ensures fallback suffixes start at tier 1 of the fallback's sequence,
     * avoiding visual ambiguity with low-tier suffixes from the same fallback plugin.
     *
     * @param tier - The exponent tier (`Math.floor(exponent / 3)`).
     * @returns The suffix string, or `""` if neither own units nor fallback cover this tier.
     */
    public override getSuffix(tier: number): string {
        const ownSymbol = this.units[tier]?.symbol;
        if (ownSymbol !== undefined) return ownSymbol;

        if (this.fallback === undefined) return "";

        const fallbackTier = this.offsetFallback
            ? tier - this.lastDefinedTier
            : tier;

        return this.fallback.getSuffix(fallbackTier) ?? "";
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
