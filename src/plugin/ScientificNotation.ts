import { NotationPlugin } from "../types/plugin";

/**
 * Standard scientific notation. Always works, no configuration needed.
 * Useful as a fallback and for debugging.
 *
 * ```
 * 1.5 × 10¹²  →  "1.500e+12"
 * ```
 */
export class ScientificNotation implements NotationPlugin {
    public format(coefficient: number, exponent: number, decimals: number): string {
        if (exponent === 0) return coefficient.toFixed(decimals)
        const sign = exponent < 0 ? "-" : "+";
        return `${coefficient.toFixed(decimals)}e${sign}${Math.abs(exponent)}`;
    }
}

export const scientificNotation = new ScientificNotation();