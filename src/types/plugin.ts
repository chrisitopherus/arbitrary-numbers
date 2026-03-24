/**
 * A plugin that formats a normalised scientific notation number into a display string.
 *
 * Implement this interface and pass an instance to {@link ArbitraryNumber.toString}
 * to customise how numbers are rendered.
 *
 * @example
 * const myPlugin: NotationPlugin = {
 *   format(coefficient, exponent, decimals) {
 *     return `${coefficient.toFixed(decimals)}e${exponent}`;
 *   },
 * };
 * number.toString(myPlugin); // "1.50e3"
 */
export interface NotationPlugin {
    /**
     * Formats a normalised value as a display string.
     *
     * @param coefficient - The significand, always in `[1, 10)` or `0`.
     * @param exponent - The power of 10.
     * @param decimals - Number of decimal places to render.
     * @returns The formatted string.
     */
    format(coefficient: number, exponent: number, decimals: number): string;
}

/**
 * Minimal interface for anything that can map a tier to a suffix string.
 *
 * Used as the `fallback` type on {@link UnitNotation} — only `getSuffix` is
 * ever called, so a simple object literal is enough:
 *
 * @example
 * const myFallback: SuffixProvider = {
 *   getSuffix(tier) { return tier > 10 ? "big" : ""; },
 * };
 */
export interface SuffixProvider {
    /**
     * Returns the suffix label for the given tier, where `tier = floor(exponent / 3)`.
     *
     * @param tier - The exponent tier (`floor(exponent / 3)`).
     * @returns The suffix string (e.g. `"K"`, `"a"`), or `""` for no suffix.
     */
    getSuffix(tier: number): string;
}

/**
 * A full suffix-based {@link NotationPlugin} — combines formatting and suffix lookup.
 *
 * Extend {@link SuffixNotationBase} rather than implementing this interface directly.
 */
export interface SuffixNotationPlugin extends NotationPlugin, SuffixProvider {}

/**
 * Options shared by all suffix-based notation plugins.
 */
export interface SuffixNotationPluginOptions {
    /**
     * String placed between the formatted number and its suffix.
     *
     * Defaults to `""` for most plugins. {@link UnitNotation} overrides this to `" "`,
     * so `new UnitNotation({ units })` produces `"1.50 K"` without an explicit separator.
     *
     * @example " " → "1.50 K"  |  "" → "1.50K"
     */
    separator?: string;
}

/**
 * A display label for one tier of magnitude, used by {@link UnitNotation}.
 *
 * Units are stored in a **tier-indexed array** — the array index is the tier number,
 * where `tier = Math.floor(exponent / 3)`. Tier 1 = thousands, tier 2 = millions, etc.
 * The exponent is therefore implicit: `exponent = tier * 3`.
 *
 * @example
 * // In a tier-indexed array, index 2 represents 10⁶ (millions):
 * const units: UnitArray = [undefined, { symbol: "K" }, { symbol: "M" }];
 */
export interface Unit {
    /** Short symbol displayed after the number, e.g. `"M"`. */
    symbol: string;
    /** Optional full name, e.g. `"Million"`. Used for display purposes only. */
    name?: string;
}

/**
 * A tier-indexed array of units for use with {@link UnitNotation}.
 *
 * The array index equals the tier number (`Math.floor(exponent / 3)`).
 * `undefined` at an index signals "no unit for this tier" — the fallback plugin
 * (or plain fixed-point rendering) will be used instead.
 *
 * Sparse arrays are valid: unset indices are implicitly `undefined`.
 *
 * @example
 * const myUnits: UnitArray = [
 *   undefined,          // tier 0: < 1000, no suffix
 *   { symbol: "K" },   // tier 1: thousands
 *   { symbol: "M" },   // tier 2: millions
 * ];
 */
export type UnitArray = ReadonlyArray<Unit | undefined>;

/**
 * Options for constructing a {@link UnitNotation} instance.
 */
export interface UnitNotationOptions extends SuffixNotationPluginOptions {
    /**
     * Tier-indexed array of units. The array index equals the tier number
     * (`Math.floor(exponent / 3)`). Use `undefined` at an index to signal
     * "no unit for this tier" — the fallback plugin will be used instead.
     *
     * @example
     * // index 0 = tier 0 (< 1000, no suffix)
     * // index 1 = tier 1 (thousands) → "K"
     * // index 2 = tier 2 (millions)  → "M"
     */
    units: UnitArray;
    /**
     * Suffix provider used when no unit is defined for a tier.
     *
     * Only {@link SuffixProvider.getSuffix} is called — the number and separator are
     * still formatted by this `UnitNotation` instance, keeping presentation consistent.
     * A simple object literal with just `getSuffix` is sufficient; a full plugin is not required.
     *
     * When omitted, tiers with no unit are rendered as a plain fixed-point number (no suffix).
     *
     * @default undefined
     */
    fallback?: SuffixProvider;
}
