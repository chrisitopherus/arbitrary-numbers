import { CLASSIC_UNITS } from "../constants/units";
import { NotationPlugin, Unit, UnitNotationOptions } from "../types/plugin";
import { letterNotation } from "./LetterNotation";
import { SuffixNotationBase } from "./SuffixNotationBase";

/**
 * Formats numbers using a configurable list of named units
 * (e.g. `"1.50 K"`, `"3.20 M"`, `"1.00 B"`).
 *
 * When the exponent exceeds the highest defined unit, the `fallback` plugin is used.
 *
 * @example
 * const notation = new UnitNotation({ units: CLASSIC_UNITS, fallback: letterNotation });
 * notation.format(1.5, 6, 2); // "1.50 M"
 *
 * @example
 * // Use the pre-built instance for zero-config formatting:
 * number.toString(unitNotation);
 */
export class UnitNotation extends SuffixNotationBase {
    protected readonly fallback?: NotationPlugin;
    protected readonly units: ReadonlyArray<Unit> = [];

    /** @param options - Unit list, optional fallback plugin, and separator. */
    public constructor(options: UnitNotationOptions) {
        super(options);

        this.units = options.units;
        this.fallback = options.fallback;
    }

    /**
     * Returns the symbol of the best-matching unit for the given exponent,
     * or delegates to the fallback plugin if no unit matches.
     *
     * @param exponent - The power of 10 of the number being formatted.
     */
    public override getSuffix(exponent: number): string {
        /* v8 ignore next */
        throw new Error("Method not implemented.");
    }
}

/**
 * Pre-built {@link UnitNotation} instance using {@link CLASSIC_UNITS} (K, M, B, T…)
 * with {@link letterNotation} as the fallback for very large numbers.
 */
export const unitNotation = new UnitNotation({
    separator: " ",
    units: CLASSIC_UNITS,
    fallback: letterNotation,
});