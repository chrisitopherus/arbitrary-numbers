import { describe, it, expect } from "vitest";
import { LetterNotation, letterNotation } from "../../plugin/LetterNotation";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(coefficient: number, exponent: number, decimals = 2): string {
    return letterNotation.format(coefficient, exponent, decimals);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("LetterNotation", () => {
    // -----------------------------------------------------------------------
    // constructor / separator
    // -----------------------------------------------------------------------
    describe("constructor", () => {
        it("defaults to empty separator", () => {
            const n = new LetterNotation();
            expect(n.format(1.5, 3, 2)).toBe("1.50a");
        });

        it("respects a custom separator", () => {
            const n = new LetterNotation({ separator: " " });
            expect(n.format(1.5, 3, 2)).toBe("1.50 a");
        });
    });

    // -----------------------------------------------------------------------
    // format — small numbers (exponent < 3)
    // -----------------------------------------------------------------------
    describe("format — exponent < 3 (no suffix)", () => {
        it("exponent 0: returns plain coefficient", () => {
            expect(fmt(1.5, 0)).toBe("1.50");
        });

        it("exponent 1: scales up by 10", () => {
            expect(fmt(1.5, 1)).toBe("15.00");
        });

        it("exponent 2: scales up by 100", () => {
            expect(fmt(1.5, 2)).toBe("150.00");
        });

        it("zero coefficient with small exponent", () => {
            expect(fmt(0, 0)).toBe("0.00");
        });

        it("negative coefficient with small exponent", () => {
            expect(fmt(-1.5, 2)).toBe("-150.00");
        });
    });

    // -----------------------------------------------------------------------
    // format — single-letter suffixes (tiers 1–26)
    // -----------------------------------------------------------------------
    describe("format — single-letter suffixes", () => {
        it("exponent 3 → 'a' (tier 1)", () => {
            expect(fmt(1.5, 3)).toBe("1.50a");
        });

        it("exponent 4 → 'a' (remainder 1: coefficient × 10)", () => {
            expect(fmt(1.5, 4)).toBe("15.00a");
        });

        it("exponent 5 → 'a' (remainder 2: coefficient × 100)", () => {
            expect(fmt(1.5, 5)).toBe("150.00a");
        });

        it("exponent 6 → 'b' (tier 2)", () => {
            expect(fmt(1.5, 6)).toBe("1.50b");
        });

        it("exponent 9 → 'c' (tier 3)", () => {
            expect(fmt(1.5, 9)).toBe("1.50c");
        });

        it("exponent 75 → 'y' (tier 25)", () => {
            expect(fmt(1.5, 75)).toBe("1.50y");
        });

        it("exponent 78 → 'z' (tier 26, last single-letter)", () => {
            expect(fmt(1.5, 78)).toBe("1.50z");
        });

        it("decimals param is respected", () => {
            expect(letterNotation.format(1.5, 3, 4)).toBe("1.5000a");
            expect(letterNotation.format(1.5, 3, 0)).toBe("2a");
        });
    });

    // -----------------------------------------------------------------------
    // format — two-letter suffixes (tiers 27–702)
    // -----------------------------------------------------------------------
    describe("format — two-letter suffixes", () => {
        it("exponent 81 → 'aa' (tier 27, first two-letter)", () => {
            expect(fmt(1.5, 81)).toBe("1.50aa");
        });

        it("exponent 84 → 'ab' (tier 28)", () => {
            expect(fmt(1.5, 84)).toBe("1.50ab");
        });

        it("exponent 153 → 'ay' (tier 51)", () => {
            // tier 51 → index 50 → two-letter: offset=26, remaining=24 → 'a'+'y'
            expect(fmt(1.5, 153)).toBe("1.50ay");
        });

        it("exponent 159 → 'ba' (tier 53)", () => {
            // tier 53 → index 52 → remaining=26 → chars: 'b'+'a'
            expect(fmt(1.5, 159)).toBe("1.50ba");
        });
    });

    // -----------------------------------------------------------------------
    // getSuffix
    // -----------------------------------------------------------------------
    describe("getSuffix", () => {
        it("tier 0 → '' (no suffix for values below 10³)", () => {
            const n = new LetterNotation();
            expect(n.getSuffix(0)).toBe("");
        });

        it("tier 1 → 'a'", () => {
            const n = new LetterNotation();
            expect(n.getSuffix(1)).toBe("a");
        });

        it("tier 26 → 'z'", () => {
            const n = new LetterNotation();
            expect(n.getSuffix(26)).toBe("z");
        });

        it("tier 27 → 'aa'", () => {
            const n = new LetterNotation();
            expect(n.getSuffix(27)).toBe("aa");
        });

        it("tier 28 → 'ab'", () => {
            const n = new LetterNotation();
            expect(n.getSuffix(28)).toBe("ab");
        });
    });

    // -----------------------------------------------------------------------
    // letterNotation singleton
    // -----------------------------------------------------------------------
    describe("letterNotation singleton", () => {
        it("is an instance of LetterNotation", () => {
            expect(letterNotation).toBeInstanceOf(LetterNotation);
        });

        it("uses empty separator", () => {
            expect(letterNotation.format(1.5, 3, 2)).toBe("1.50a");
        });
    });
});
