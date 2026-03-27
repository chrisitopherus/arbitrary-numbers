import { describe, it, expect } from "vitest";
import { AlphabetNotation, alphabetSuffix, letterNotation } from "../../src/plugin/AlphabetNotation";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(coefficient: number, exponent: number, decimals = 2): string {
    return letterNotation.format(coefficient, exponent, decimals);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AlphabetNotation", () => {
    // -----------------------------------------------------------------------
    // constructor / separator
    // -----------------------------------------------------------------------
    describe("constructor", () => {
        it("defaults to lowercase a–z alphabet", () => {
            const n = new AlphabetNotation();
            expect(n.format(1.5, 3, 2)).toBe("1.50a");
        });

        it("defaults to empty separator", () => {
            const n = new AlphabetNotation();
            expect(n.format(1.5, 3, 2)).toBe("1.50a");
        });

        it("respects a custom separator", () => {
            const n = new AlphabetNotation({ separator: " " });
            expect(n.format(1.5, 3, 2)).toBe("1.50 a");
        });

        it("respects a custom alphabet", () => {
            const n = new AlphabetNotation({ alphabet: "ABC" });
            expect(n.format(1.5, 3, 2)).toBe("1.50A");
            expect(n.format(1.5, 6, 2)).toBe("1.50B");
            expect(n.format(1.5, 9, 2)).toBe("1.50C");
            expect(n.format(1.5, 12, 2)).toBe("1.50AA");
        });

        it("uppercase alphabet (Excel-style)", () => {
            const n = new AlphabetNotation({ alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZ" });
            expect(n.format(1.5, 3, 2)).toBe("1.50A");
            expect(n.format(1.5, 78, 2)).toBe("1.50Z");
            expect(n.format(1.5, 81, 2)).toBe("1.50AA");
        });
    });

    // -----------------------------------------------------------------------
    // format — negative exponents (fractional values)
    // -----------------------------------------------------------------------
    describe("format — negative exponents (no suffix)", () => {
        it("exponent -1: 2 × 10^-1 = 0.2", () => {
            expect(fmt(2, -1)).toBe("0.20");
        });

        it("exponent -2: 5 × 10^-2 = 0.05", () => {
            expect(fmt(5, -2)).toBe("0.05");
        });

        it("exponent -3: 5 × 10^-3 = 0.005 (3 decimals)", () => {
            expect(letterNotation.format(5, -3, 3)).toBe("0.005");
        });

        it("negative coefficient with negative exponent", () => {
            expect(fmt(-2, -1)).toBe("-0.20");
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
            expect(fmt(1.5, 153)).toBe("1.50ay");
        });

        it("exponent 159 → 'ba' (tier 53)", () => {
            expect(fmt(1.5, 159)).toBe("1.50ba");
        });
    });

    // -----------------------------------------------------------------------
    // getSuffix
    // -----------------------------------------------------------------------
    describe("getSuffix", () => {
        it("tier 0 → '' (no suffix for values below 10³)", () => {
            const n = new AlphabetNotation();
            expect(n.getSuffix(0)).toBe("");
        });

        it("tier 1 → 'a'", () => {
            const n = new AlphabetNotation();
            expect(n.getSuffix(1)).toBe("a");
        });

        it("tier 26 → 'z'", () => {
            const n = new AlphabetNotation();
            expect(n.getSuffix(26)).toBe("z");
        });

        it("tier 27 → 'aa'", () => {
            const n = new AlphabetNotation();
            expect(n.getSuffix(27)).toBe("aa");
        });

        it("tier 28 → 'ab'", () => {
            const n = new AlphabetNotation();
            expect(n.getSuffix(28)).toBe("ab");
        });

        it("returns cached result on repeated calls", () => {
            const n = new AlphabetNotation();
            expect(n.getSuffix(5)).toBe("e");
            expect(n.getSuffix(5)).toBe("e"); // from cache
        });
    });

    // -----------------------------------------------------------------------
    // letterNotation singleton
    // -----------------------------------------------------------------------
    describe("letterNotation singleton", () => {
        it("is an instance of AlphabetNotation", () => {
            expect(letterNotation).toBeInstanceOf(AlphabetNotation);
        });

        it("uses empty separator", () => {
            expect(letterNotation.format(1.5, 3, 2)).toBe("1.50a");
        });
    });
});

// ---------------------------------------------------------------------------
// alphabetSuffix — standalone function
// ---------------------------------------------------------------------------

describe("alphabetSuffix", () => {
    describe("default alphabet (a–z)", () => {
        it("tier 0 → ''", () => {
            expect(alphabetSuffix(0)).toBe("");
        });

        it("negative tier → ''", () => {
            expect(alphabetSuffix(-1)).toBe("");
        });

        it("tier 1 → 'a'", () => {
            expect(alphabetSuffix(1)).toBe("a");
        });

        it("tier 26 → 'z'", () => {
            expect(alphabetSuffix(26)).toBe("z");
        });

        it("tier 27 → 'aa' (first two-character)", () => {
            expect(alphabetSuffix(27)).toBe("aa");
        });

        it("tier 28 → 'ab'", () => {
            expect(alphabetSuffix(28)).toBe("ab");
        });
    });

    describe("custom alphabet", () => {
        it("single-char alphabet wraps immediately", () => {
            // alphabet "x": tier 1 → "x", tier 2 → "xx", tier 3 → "xxx"
            expect(alphabetSuffix(1, "x")).toBe("x");
            expect(alphabetSuffix(2, "x")).toBe("xx");
            expect(alphabetSuffix(3, "x")).toBe("xxx");
        });

        it("three-char alphabet 'abc'", () => {
            expect(alphabetSuffix(1, "abc")).toBe("a");
            expect(alphabetSuffix(2, "abc")).toBe("b");
            expect(alphabetSuffix(3, "abc")).toBe("c");
            expect(alphabetSuffix(4, "abc")).toBe("aa"); // first two-char
            expect(alphabetSuffix(6, "abc")).toBe("ac");
            expect(alphabetSuffix(7, "abc")).toBe("ba");
        });

        it("uppercase / Excel-style columns", () => {
            const abc = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
            expect(alphabetSuffix(1, abc)).toBe("A");
            expect(alphabetSuffix(26, abc)).toBe("Z");
            expect(alphabetSuffix(27, abc)).toBe("AA");
            expect(alphabetSuffix(28, abc)).toBe("AB");
            expect(alphabetSuffix(52, abc)).toBe("AZ");
            expect(alphabetSuffix(53, abc)).toBe("BA");
        });
    });
});
