import { SuffixNotationPluginOptions } from "../types/plugin";
import { SuffixNotationBase } from "./SuffixNotationBase";

/**
 * Formats numbers using alphabetical suffixes derived from the tier
 * (e.g. `"1.50a"`, `"3.20b"`, `"1.00aa"`).
 *
 * - Tier 1 (10³) → `"a"`, tier 2 (10⁶) → `"b"`, …, tier 26 (10⁷⁸) → `"z"`
 * - Tier 27 (10⁸¹) → `"aa"`, tier 28 → `"ab"`, and so on indefinitely.
 *
 * @example
 * letterNotation.format(1.5, 3, 2);   // "1.50a"
 * letterNotation.format(1.5, 6, 2);   // "1.50b"
 * letterNotation.format(1.5, 78, 2);  // "1.50aa"
 */
export class LetterNotation extends SuffixNotationBase {
    private readonly letters = "abcdefghijklmnopqrstuvwxyz";

    /**
     * @param options - Plugin options. `separator` defaults to `""` (no space before the letter).
     */
    public constructor(options: SuffixNotationPluginOptions = {}) {
        super(options);
    }

    /**
     * Returns the alphabetical suffix for the given tier.
     *
     * Tier 0 (values below 10³) returns `""` — no suffix.
     * Tier 1 → `"a"`, tier 26 → `"z"`, tier 27 → `"aa"`, etc.
     *
     * @param tier - The exponent tier (`floor(exponent / 3)`), ≥ 0.
     * @returns The alphabetical suffix string, or `""` for tier 0.
     */
    public override getSuffix(tier: number): string {
        if (tier === 0) return "";
        const index = tier - 1; // tier 1 = "a" = index 0
        const { letters, offset } = this.getLengthAndOffset(index);
        let remaining = index - offset;
        const chars = new Array<string>(letters);

        for (let i = letters - 1; i >= 0; i--) {
            chars[i] = this.letters[remaining % this.letters.length]!;
            remaining = Math.floor(remaining / this.letters.length);
        }

        return chars.join("");
    }

    /**
     * Determines the number of characters in the suffix and the index offset for the
     * current length group.
     *
     * @param index - Zero-based position in the full suffix sequence.
     * @returns `letters` — the character count; `offset` — start of this length group.
     */
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
