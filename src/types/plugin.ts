/**
 * A formatting plugin that converts a normalised scientific notation number into a string.
 *
 * Implement this interface to create a custom display format and pass it to
 * {@link ArbitraryNumber.toString}.
 *
 * @example
 * const myPlugin: NotationPlugin = {
 *   format: (c, e, _d) => `${c}e${e}`,
 * };
 * number.toString(myPlugin); // "1.5e3"
 */
export interface NotationPlugin {
    /**
     * Formats a normalised scientific notation value as a string.
     *
     * @param coefficient - The significand, always in `[1, 10)` or `0`.
     * @param exponent - The power of 10.
     * @param decimals - The number of decimal places to render.
     */
    format(coefficient: number, exponent: number, decimals: number): string;
}

/**
 * A {@link NotationPlugin} that formats numbers with a human-readable suffix
 * (e.g. `"1.50 K"`, `"3.20 M"`).
 *
 * Extend {@link SuffixNotationBase} to implement this interface.
 */
export interface SuffixNotationPlugin extends NotationPlugin {
    /**
     * Returns the suffix string for the given exponent.
     *
     * @param exponent - The power of 10 of the number being formatted.
     */
    getSuffix(exponent: number): string;
}

/** Options shared by all suffix-based notation plugins. */
export interface SuffixNotationPluginOptions {
    /** String placed between the number and its suffix. Defaults to `" "`. */
    separator?: string;
}

/**
 * A named numeric unit used by {@link UnitNotation} to map exponents to symbols.
 *
 * @example
 * const million: Unit = { exponent: 6, symbol: "M", name: "Million" };
 */
export interface Unit {
    /** Full name of the unit, e.g. `"Million"`. Optional, used for display purposes only. */
    name?: string;
    /** Short symbol displayed after the number, e.g. `"M"`. */
    symbol: string;
    /** The power of 10 this unit represents, e.g. `6` for one million. */
    exponent: number;
}

/** Options for constructing a {@link UnitNotation} instance. */
export interface UnitNotationOptions extends SuffixNotationPluginOptions {
    /** Ordered list of units to match against the number's exponent. */
    units: ReadonlyArray<Unit>;
    /**
     * Fallback plugin used when no unit matches the exponent.
     * Defaults to no fallback (returns raw scientific notation).
     */
    fallback?: NotationPlugin;
}