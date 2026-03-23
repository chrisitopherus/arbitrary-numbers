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
    private readonly letters = "abcdefghijklmnopqrstuvwxyz";
    /**
     * @param options - Plugin options. `separator` defaults to `""` (no space before the letter).
     */
    public constructor(options: SuffixNotationPluginOptions = { separator: "" }) {
        super(options);
    }

    public override getSuffix(tier: number): string {
        const index = tier - 1; // -1 because "a" corresponds to 10^3, not 10^0
        const { letters, offset } = this.getLengthAndOffset(index);
        let remaining = index - offset;
        const chars = new Array<string>(letters);

        for (let i = letters - 1; i >= 0; i--) {
            chars[i] = this.letters[remaining % this.letters.length]!;
            remaining = Math.floor(remaining / this.letters.length);
        }

        return chars.join("");
    }

    private getLengthAndOffset(index: number): { letters: number; offset: number } {
        let letters = 1;
        let capacity = this.letters.length;
        let offset = 0;

        while (index >= offset + capacity) {
            offset += capacity;
            letters++;
            capacity = this.letters.length ** letters;
        }

        return { letters, offset };
    }
}

/** Pre-built {@link LetterNotation} instance with no separator between the number and suffix. */
export const letterNotation = new LetterNotation();