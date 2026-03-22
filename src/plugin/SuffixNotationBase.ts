import { SuffixNotationPlugin } from "../types/plugin"


/**
 * Abstract base for suffix-based notations (LetterNotation, StandardNotation,
 * and any custom suffix plugin).
 *
 * Subclasses only need to implement one method: `getSuffix(exponent)`.
 * All formatting math — tier calculation, display coefficient, decimal
 * formatting — is handled here once and shared by every subclass.
 *
 * @example Minimal subclass
 * ```ts
 * class EmojiNotation extends SuffixNotationBase {
 *   private static SUFFIXES = ['', '🔥', '💥', '🌟', '🚀']
 *
 *   getSuffix(exponent: number): string {
 *     const tier = Math.floor(exponent / 3)
 *     return EmojiNotation.SUFFIXES[tier] ?? `e+${exponent}`
 *   }
 * }
 * ```
 */
export abstract class SuffixNotationBase implements SuffixNotationPlugin {
    /**
     * Return the display suffix for this exponent tier.
     * Called by format() — you do not need to call it directly.
     */
    abstract getSuffix(exponent: number): string

    /**
     * Produce the final string.  Algorithm:
     *   1. tier       = floor(exponent / 3)          — which suffix bucket
     *   2. remainder  = exponent - tier * 3           — leftover powers [0,1,2]
     *   3. displayC   = coefficient × 10^remainder   — value shown before suffix
     *   4. suffix     = getSuffix(exponent)
     *   5. result     = displayC.toFixed(decimals) + suffix
     */
    public format(coefficient: number, exponent: number, decimals: number): string {
        // Tiny numbers (< 1000) - no suffix needed
        if (exponent < 3) {
            const value = coefficient * Math.pow(10, exponent)
            return value.toFixed(decimals)
        }

        const tier = Math.floor(exponent / 3)
        const remainder = exponent - tier * 3          // 0, 1, or 2
        const displayC = coefficient * Math.pow(10, remainder)
        const suffix = this.getSuffix(exponent)

        return `${displayC.toFixed(decimals)}${suffix}`;
    }
}