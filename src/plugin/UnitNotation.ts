import { CLASSIC_UNITS } from "../constants/units";
import { NotationPlugin, Unit, UnitNotationOptions } from "../types/plugin";
import { letterNotation } from "./LetterNotation";
import { scientificNotation } from "./ScientificNotation";
import { SuffixNotationBase } from "./SuffixNotationBase";

/**
 * Formats numbers using a configurable list of named units
 * (e.g. `"1.50 K"`, `"3.20 M"`, `"1.00 B"`).
 *
 * When the exponent exceeds all defined units, the `fallback` plugin is used.
 * Defaults to {@link scientificNotation} when no fallback is provided.
 *
 * @example
 * const notation = new UnitNotation({ units: CLASSIC_UNITS, fallback: letterNotation });
 * notation.format(1.5, 6, 2);  // "1.50M"
 *
 * @example
 * // Pre-built instance with space separator and letterNotation fallback:
 * number.toString(unitNotation);  // "1.50 K"
 */
export class UnitNotation extends SuffixNotationBase {
    protected readonly fallback: NotationPlugin;
    protected readonly units: ReadonlyArray<Unit>;

    /**
     * @param options - Unit list, optional fallback plugin, and separator.
     */
    public constructor(options: UnitNotationOptions) {
        super(options);
        this.units = options.units;
        this.fallback = options.fallback ?? scientificNotation;
    }

    /**
     * Formats the number using the best-matching unit, or delegates to the fallback
     * plugin when no unit covers the exponent.
     *
     * Overrides the base implementation so the fallback receives the full
     * `(coefficient, exponent, decimals)` context it needs to format correctly.
     *
     * @param coefficient - The significand in `[1, 10)` or `0`.
     * @param exponent - The power of 10.
     * @param decimals - Number of decimal places in the output.
     * @returns The formatted string.
     */
    public override format(coefficient: number, exponent: number, decimals: number): string {
        if (exponent < 3) {
            return (coefficient * Math.pow(10, exponent)).toFixed(decimals);
        }

        const unit = this.findUnit(exponent);
        if (!unit) {
            return this.fallback.format(coefficient, exponent, decimals);
        }

        const remainder = exponent - unit.exponent;
        const displayC = coefficient * Math.pow(10, remainder);
        return `${displayC.toFixed(decimals)}${this.separator}${unit.symbol}`;
    }

    /**
     * Returns the symbol of the best-matching unit for the given tier,
     * or an empty string when no unit matches.
     *
     * For full formatting with fallback support, prefer {@link format}.
     *
     * @param tier - The exponent tier (`floor(exponent / 3)`).
     * @returns The unit symbol, or `""` if none matched.
     */
    public override getSuffix(tier: number): string {
        return this.findUnit(tier * 3)?.symbol ?? "";
    }

    /**
     * Finds the largest unit whose `exponent` does not exceed the given exponent.
     * Units are not required to be sorted or limited to multiples of 3.
     *
     * @param exponent - The raw exponent to match against.
     * @returns The best-matching {@link Unit}, or `undefined` if none qualify.
     */
    private findUnit(exponent: number): Unit | undefined {
        let best: Unit | undefined;
        for (const unit of this.units) {
            if (unit.exponent <= exponent && (!best || unit.exponent > best.exponent)) {
                best = unit;
            }
        }
        return best;
    }
}

/**
 * Pre-built {@link UnitNotation} instance using {@link CLASSIC_UNITS} (K, M, B, T…)
 * with a space separator and {@link letterNotation} as fallback for very large numbers.
 */
export const unitNotation = new UnitNotation({
    separator: " ",
    units: CLASSIC_UNITS,
    fallback: letterNotation,
});
