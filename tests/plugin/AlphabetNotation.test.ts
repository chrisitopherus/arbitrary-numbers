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

        it("exponent 2106 → 'zz' (tier 702, last two-letter)", () => {
            expect(fmt(1.5, 2106)).toBe("1.50zz");
        });
    });

    // -----------------------------------------------------------------------
    // format — three-letter suffixes (tiers 703–18278)
    // -----------------------------------------------------------------------
    describe("format — three-letter suffixes", () => {
        it("exponent 2109 → 'aaa' (tier 703, first three-letter)", () => {
            expect(fmt(1.5, 2109)).toBe("1.50aaa");
        });

        it("exponent 2112 → 'aab' (tier 704)", () => {
            expect(fmt(1.5, 2112)).toBe("1.50aab");
        });

        it("exponent 54834 → 'zzz' (tier 18278, last three-letter)", () => {
            expect(fmt(1.5, 54834)).toBe("1.50zzz");
        });
    });

    // -----------------------------------------------------------------------
    // format — four-letter suffixes (tiers 18279+)
    // -----------------------------------------------------------------------
    describe("format — four-letter suffixes", () => {
        it("exponent 54837 → 'aaaa' (tier 18279, first four-letter)", () => {
            expect(fmt(1.5, 54837)).toBe("1.50aaaa");
        });

        it("exponent 3000000 → does not crash, returns valid suffix string", () => {
            const result = fmt(1.5, 3000000);
            expect(result).toMatch(/^1\.50[a-z]+$/);
        });
    });

    // -----------------------------------------------------------------------
    // format — large exponents do not crash or produce empty string
    // -----------------------------------------------------------------------
    describe("format — extreme exponents (no crash, no empty suffix)", () => {
        it("exponent 30000 (tier 10000) — returns non-empty suffix", () => {
            const result = fmt(1.5, 30000);
            expect(result).toMatch(/^1\.50[a-z]+$/);
            expect(result).not.toBe("1.50");
        });

        it("exponent 300000 (tier 100000) — returns non-empty suffix", () => {
            const result = fmt(1.5, 300000);
            expect(result).toMatch(/^1\.50[a-z]+$/);
        });

        it("exponent 3000000 (tier 1000000) — returns non-empty suffix", () => {
            const result = fmt(1.5, 3000000);
            expect(result).toMatch(/^1\.50[a-z]+$/);
        });

        it("suffix sequence is strictly increasing in length at boundaries", () => {
            const t702 = letterNotation.format(1.5, 2106, 2); // "1.50zz"
            const t703 = letterNotation.format(1.5, 2109, 2); // "1.50aaa"
            expect(t702.length).toBeLessThan(t703.length);
        });

        it("negative coefficient with large exponent — sign is preserved", () => {
            const result = fmt(-1.5, 3000);
            expect(result).toMatch(/^-1\.50[a-z]+$/);
        });
    });

    // -----------------------------------------------------------------------
    // format — large negative exponents (values approaching zero)
    // -----------------------------------------------------------------------
    describe("format — large negative exponents", () => {
        it("exponent -1 renders correct decimal value", () => {
            expect(fmt(2, -1)).toBe("0.20");
        });

        it("exponent -5 rounds to 0.00 at 2 decimals (float64 underflow display)", () => {
            // 1.5 × 10^-5 = 0.000015 → 0.00 at 2dp — correct for display purposes
            expect(fmt(1.5, -5)).toBe("0.00");
        });

        it("exponent -100 renders as 0.00 at 2 decimals (magnitude below display threshold)", () => {
            expect(fmt(1.5, -100)).toBe("0.00");
        });

        it("exponent -100 with 6 decimals still 0.000000", () => {
            expect(letterNotation.format(1.5, -100, 6)).toBe("0.000000");
        });

        it("exponent -309 does not produce NaN or Infinity", () => {
            const result = fmt(1.5, -309);
            expect(result).not.toContain("NaN");
            expect(result).not.toContain("Infinity");
        });

        it("exponent -1000000 does not crash", () => {
            expect(() => fmt(1.5, -1000000)).not.toThrow();
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

    // -----------------------------------------------------------------------
    // alphabetSuffix — boundary correctness
    // -----------------------------------------------------------------------
    describe("boundary correctness (single→double→triple→quad transitions)", () => {
        // With 26-char alphabet: single=26, double=26²=676, triple=26³=17576
        // Transitions: tier26='z', tier27='aa'; tier702='zz', tier703='aaa'; tier18278='zzz', tier18279='aaaa'
        it("tier 26 is last single-letter 'z'", () => {
            expect(alphabetSuffix(26)).toBe("z");
        });
        it("tier 27 is first two-letter 'aa'", () => {
            expect(alphabetSuffix(27)).toBe("aa");
        });
        it("tier 702 is last two-letter 'zz'", () => {
            expect(alphabetSuffix(702)).toBe("zz");
        });
        it("tier 703 is first three-letter 'aaa'", () => {
            expect(alphabetSuffix(703)).toBe("aaa");
        });
        it("tier 18278 is last three-letter 'zzz'", () => {
            expect(alphabetSuffix(18278)).toBe("zzz");
        });
        it("tier 18279 is first four-letter 'aaaa'", () => {
            expect(alphabetSuffix(18279)).toBe("aaaa");
        });
    });

    // -----------------------------------------------------------------------
    // alphabetSuffix — monotone (suffix length never decreases)
    // -----------------------------------------------------------------------
    describe("suffix monotonicity — length never decreases", () => {
        it("length is non-decreasing from tier 1 to tier 800", () => {
            let prevLen = 0;
            for (let t = 1; t <= 800; t++) {
                const s = alphabetSuffix(t);
                expect(s.length).toBeGreaterThanOrEqual(prevLen);
                prevLen = s.length;
            }
        });

        it("extreme tier 1000000 does not crash and returns a string", () => {
            expect(() => alphabetSuffix(1000000)).not.toThrow();
            expect(typeof alphabetSuffix(1000000)).toBe("string");
            expect(alphabetSuffix(1000000).length).toBeGreaterThan(0);
        });
    });
});
