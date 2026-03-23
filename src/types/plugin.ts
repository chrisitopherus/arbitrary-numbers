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
 * A {@link NotationPlugin} that appends a human-readable suffix after the number
 * (e.g. `"1.50 K"`, `"3.20a"`).
 *
 * Extend {@link SuffixNotationBase} rather than implementing this interface directly.
 */
export interface SuffixNotationPlugin extends NotationPlugin {
    /**
     * Returns the suffix label for the given tier, where `tier = floor(exponent / 3)`.
     *
     * @param tier - The exponent tier (`floor(exponent / 3)`).
     * @returns The suffix string (e.g. `"K"`, `"a"`).
     */
    getSuffix(tier: number): string;
}

/**
 * Options shared by all suffix-based notation plugins.
 */
export interface SuffixNotationPluginOptions {
    /**
     * String placed between the formatted number and its suffix.
     *
     * @default ""
     * @example " " → "1.50 K"  |  "" → "1.50K"
     */
    separator?: string;
}

/**
 * A named numeric unit used by {@link UnitNotation} to map exponents to symbols.
 *
 * @example
 * const million: Unit = { exponent: 6, symbol: "M", name: "Million" };
 */
export interface Unit {
    /** Short symbol displayed after the number, e.g. `"M"`. */
    symbol: string;
    /** The power of 10 this unit represents, e.g. `6` for one million. */
    exponent: number;
    /** Optional full name, e.g. `"Million"`. Used for display purposes only. */
    name?: string;
}

/**
 * Options for constructing a {@link UnitNotation} instance.
 */
export interface UnitNotationOptions extends SuffixNotationPluginOptions {
    /** Ordered list of units to match against the number's exponent. */
    units: ReadonlyArray<Unit>;
    /**
     * Plugin used when no unit matches the exponent.
     *
     * @default scientificNotation
     */
    fallback?: NotationPlugin;
}
