/**
 * The single contract every notation plugin must satisfy.
 *
 * ArbitraryNumber knows nothing beyond this interface — all display
 * logic lives entirely inside the plugin.
 *
 * @example Minimal custom plugin
 * ```ts
 * const myNotation: NotationPlugin = {
 *   format(c, e, d) {
 *     return e < 3 ? c.toFixed(d) : `${c.toFixed(d)}e+${e}`
 *   }
 * }
 * ```
 */
export interface NotationPlugin {
    /**
     * Format a normalized ArbitraryNumber for display.
     *
     * @param coefficient  Always in [1.0, 10.0) — the significand
     * @param exponent     The power of 10 (can be astronomically large)
     * @param decimals     How many decimal places the caller wants
     * @returns            The human-readable string
     */
    format(coefficient: number, exponent: number, decimals: number): string
}

/**
 * Optional extension for suffix-based notations.
 * Implement this if your plugin maps tiers to string labels.
 * Used by LetterNotation and StandardNotation — not required.
 */
export interface SuffixNotationPlugin extends NotationPlugin {
    /**
     * Return the suffix string for a given exponent.
     * e.g. exponent=6  → "M",  exponent=15 → "aa"
     */
    getSuffix(exponent: number): string
}

/**
 * A named unit entry. 
 * 
 * `exponent` must be a multiple of 3.
 */
export interface Unit {
    /** Optional long name, e.g. "Thousand", "Million" — for tooling / docs */
    name?: string;
    /** Short label shown after the number, e.g. "K", "M", "B" */
    symbol: string;
    /** The power of 10 this unit represents.  Must be divisible by 3. */
    exponent: number;
}

/**
 * Configuration for UnitNotation.
 */
export interface UnitNotationOptions {
  /**
   * The ordered list of named units.
   * Units are matched by finding the largest `unit.exponent ≤ exponent`.
   * Any exponent beyond the last unit falls back to `fallback`.
   */
  units: ReadonlyArray<Unit>;
 
  /**
   * What to show when the exponent exceeds all defined units.
   */
  fallback?: NotationPlugin;
 
  /**
   * Separator between the number and its suffix.
   * Default: `' '`  (e.g. "1.500 Million")
   * Set to `''` for compact style (e.g. "1.500M")
   */
  separator?: string;
}