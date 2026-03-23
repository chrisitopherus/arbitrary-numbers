import { SuffixNotationPluginOptions } from "../types/plugin";
import { SuffixNotationBase } from "./SuffixNotationBase";

/**
 * Formats numbers using single-letter suffixes derived from the exponent
 * (e.g. `"1.50a"`, `"3.20b"`).
 *
 * @example
 * letterNotation.format(1.5, 3, 2); // "1.50a"
 */
export class LetterNotation extends SuffixNotationBase {
    /**
     * @param options - Plugin options. `separator` defaults to `""` (no space before the letter).
     */
    public constructor(options: SuffixNotationPluginOptions) {
        super(options);
    }

    /**
     * Returns a single-letter suffix for the given exponent tier.
     *
     * @param exponent - The power of 10 of the number being formatted.
     */
    public override getSuffix(exponent: number): string {
        /* v8 ignore next */
        throw new Error("Method not implemented.");
    }
}

/** Pre-built {@link LetterNotation} instance with no separator between the number and suffix. */
export const letterNotation = new LetterNotation({ separator: "" });