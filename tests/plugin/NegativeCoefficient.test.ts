/**
 * Negative-coefficient behaviour across all notation plugins.
 *
 * Idle games rarely use negative numbers, so these tests make the behaviour explicit
 * and prevent regressions for libraries that do use them (e.g. delta-income, balance tracking).
 */
import { describe, it, expect } from "vitest";
import { ScientificNotation, scientificNotation } from "../../src/plugin/ScientificNotation";
import { letterNotation } from "../../src/plugin/AlphabetNotation";
import { UnitNotation, unitNotation } from "../../src/plugin/UnitNotation";
import { CLASSIC_UNITS, COMPACT_UNITS } from "../../src/constants/units";
import { ArbitraryNumber } from "../../src/core/ArbitraryNumber";

// ---------------------------------------------------------------------------
// ScientificNotation — negative coefficient
// ---------------------------------------------------------------------------

describe("ScientificNotation — negative coefficient", () => {
    const sn = new ScientificNotation();

    it("negative coefficient, exponent 0", () => {
        expect(sn.format(-1.5, 0, 2)).toBe("-1.50");
    });

    it("negative coefficient, positive exponent", () => {
        expect(sn.format(-1.5, 3, 2)).toBe("-1.50e+3");
    });

    it("negative coefficient, negative exponent", () => {
        expect(sn.format(-1.5, -3, 2)).toBe("-1.50e-3");
    });

    it("negative coefficient, very large exponent", () => {
        expect(sn.format(-1.5, 300, 2)).toBe("-1.50e+300");
    });

    it("negative coefficient, very large negative exponent", () => {
        expect(sn.format(-1.5, -300, 2)).toBe("-1.50e-300");
    });

    it("negative rounds past -10 — re-normalises (e.g. -9.5 at 0 decimals)", () => {
        expect(sn.format(-9.5, 3, 0)).toBe("-1e+4");
    });

    it("via ArbitraryNumber.toString — negative number", () => {
        const n = new ArbitraryNumber(-1.5, 3);
        expect(n.toString(scientificNotation, 2)).toBe("-1.50e+3");
    });
});

// ---------------------------------------------------------------------------
// AlphabetNotation — negative coefficient
// ---------------------------------------------------------------------------

describe("AlphabetNotation — negative coefficient", () => {
    const ln = letterNotation;

    const tiers = [0, 1, 2, 10, 100] as const;

    for (const tier of tiers) {
        const exponent = tier * 3;
        it(`tier ${tier} (exponent ${exponent}) — negative coefficient renders with minus sign`, () => {
            const result = ln.format(-1.5, exponent, 2);
            // Must start with "-"
            expect(result.startsWith("-")).toBe(true);
            // Must equal the positive version with a leading minus
            const positive = ln.format(1.5, exponent, 2);
            expect(result).toBe(`-${positive}`);
        });
    }

    it("negative coefficient, tier 0 (no suffix)", () => {
        expect(ln.format(-1.5, 0, 2)).toBe("-1.50");
    });

    it("negative coefficient, tier 1 (suffix 'a')", () => {
        expect(ln.format(-1.5, 3, 2)).toBe("-1.50a");
    });

    it("negative coefficient, tier 26 (suffix 'z')", () => {
        expect(ln.format(-1.5, 78, 2)).toBe("-1.50z");
    });

    it("negative coefficient, tier 27 (suffix 'aa')", () => {
        expect(ln.format(-1.5, 81, 2)).toBe("-1.50aa");
    });

    it("negative exponent (fractional value) — negative coefficient", () => {
        expect(ln.format(-2.5, -1, 2)).toBe("-0.25");
    });

    it("via ArbitraryNumber.toString — negative large number", () => {
        const n = new ArbitraryNumber(-1.5, 6);
        expect(n.toString(letterNotation, 2)).toBe("-1.50b");
    });
});

// ---------------------------------------------------------------------------
// UnitNotation — negative coefficient
// ---------------------------------------------------------------------------

describe("UnitNotation — negative coefficient", () => {
    const un = unitNotation;
    const custom = new UnitNotation({ units: CLASSIC_UNITS, separator: " " });

    const tierCases: Array<[number, number, string]> = [
        [0, 0, "-1.50"],
        [1, 3, "-1.50 K"],
        [2, 6, "-1.50 M"],
        [3, 9, "-1.50 B"],
        [10, 30, "-1.50 No"],
        // tier 100 (exponent 300): CLASSIC_UNITS has no unit; lastDefinedTier=101(Ct)
        // fallbackTier = 100-101 = -1 → no suffix → plain value
        [100, 300, "-1.50"],
    ];

    for (const [tier, exponent, expected] of tierCases) {
        it(`tier ${tier} (exponent ${exponent}) — negative coefficient`, () => {
            expect(custom.format(-1.5, exponent, 2)).toBe(expected);
        });
    }

    it("negative coefficient renders with minus sign for all tiers", () => {
        for (let tier = 0; tier <= 33; tier++) {
            const exponent = tier * 3;
            const result = custom.format(-1.5, exponent, 2);
            const positive = custom.format(1.5, exponent, 2);
            // Result must start with "-" when positive result doesn't have a suffix separator issue
            expect(result).toBe(`-${positive}`);
        }
    });

    it("negative exponent (fractional value) — negative coefficient", () => {
        expect(un.format(-2.5, -1, 2)).toBe("-0.25");
    });

    it("via ArbitraryNumber.toString — negative large number (unitNotation)", () => {
        const n = new ArbitraryNumber(-3.14, 6);
        expect(n.toString(unitNotation, 2)).toBe("-3.14 M");
    });

    it("compact units — negative coefficient", () => {
        const cn = new UnitNotation({ units: COMPACT_UNITS, separator: " " });
        expect(cn.format(-1.5, 3, 2)).toBe("-1.50 k");
        expect(cn.format(-1.5, 6, 2)).toBe("-1.50 M");
    });
});

// ---------------------------------------------------------------------------
// Cross-plugin: negation symmetry
// ---------------------------------------------------------------------------

describe("negation symmetry across plugins", () => {
    const plugins = [
        { name: "scientificNotation", plugin: scientificNotation },
        { name: "letterNotation", plugin: letterNotation },
        { name: "unitNotation", plugin: unitNotation },
    ] as const;

    const exponents = [0, 3, 6, 9, 30, 99];

    for (const { name, plugin } of plugins) {
        for (const exp of exponents) {
            it(`${name} — format(-c, ${exp}) starts with '-' + format(c, ${exp})`, () => {
                const positive = plugin.format(1.5, exp, 2);
                const negative = plugin.format(-1.5, exp, 2);
                expect(negative).toBe(`-${positive}`);
            });
        }
    }
});

// ---------------------------------------------------------------------------
// Negative coefficient at negative exponents (fractional values)
// ---------------------------------------------------------------------------

describe("negative coefficient — negative exponents (fractions)", () => {
    it("scientificNotation: −1.5 × 10^−3 = −0.0015", () => {
        expect(scientificNotation.format(-1.5, -3, 4)).toBe("-1.5000e-3");
    });

    it("scientificNotation: −1.5 × 10^−10 — extreme negative exponent", () => {
        expect(scientificNotation.format(-1.5, -10, 2)).toBe("-1.50e-10");
    });

    it("scientificNotation: −1.5 × 10^−300 — very extreme", () => {
        expect(scientificNotation.format(-1.5, -300, 2)).toBe("-1.50e-300");
    });

    it("letterNotation: neg coefficient, neg exponent → negative decimal", () => {
        // exponent = -1 → value = -0.15; letterNotation has no suffix tier
        const result = letterNotation.format(-1.5, -1, 2);
        expect(result.startsWith("-")).toBe(true);
        expect(result).not.toContain("NaN");
        expect(result).not.toContain("Infinity");
    });

    it("letterNotation: −1.5 × 10^−3 matches negation of positive", () => {
        const pos = letterNotation.format(1.5, -3, 2);
        const neg = letterNotation.format(-1.5, -3, 2);
        expect(neg).toBe(`-${pos}`);
    });

    it("unitNotation: neg coefficient, neg exponent → negative decimal", () => {
        const un = new UnitNotation({ units: CLASSIC_UNITS, separator: " " });
        const result = un.format(-1.5, -1, 4);
        expect(result.startsWith("-")).toBe(true);
        expect(result).not.toContain("NaN");
        expect(result).not.toContain("Infinity");
    });

    it("unitNotation: −1.5 × 10^−5 matches negation of positive", () => {
        const un = new UnitNotation({ units: CLASSIC_UNITS, separator: " " });
        const pos = un.format(1.5, -5, 4);
        const neg = un.format(-1.5, -5, 4);
        expect(neg).toBe(`-${pos}`);
    });

    it("all plugins: output never contains NaN for negative coefficient + negative exponent", () => {
        const exponents = [-1, -3, -10, -100, -309, -1_000_000];
        for (const e of exponents) {
            expect(scientificNotation.format(-1.5, e, 2)).not.toContain("NaN");
            expect(letterNotation.format(-1.5, e, 2)).not.toContain("NaN");
            expect(unitNotation.format(-1.5, e, 2)).not.toContain("NaN");
        }
    });

    it("all plugins: output never contains Infinity for negative coefficient + negative exponent", () => {
        const exponents = [-1, -3, -10, -100, -309, -1_000_000];
        for (const e of exponents) {
            expect(scientificNotation.format(-1.5, e, 2)).not.toContain("Infinity");
            expect(letterNotation.format(-1.5, e, 2)).not.toContain("Infinity");
            expect(unitNotation.format(-1.5, e, 2)).not.toContain("Infinity");
        }
    });
});

// ---------------------------------------------------------------------------
// Negative coefficient — extreme positive exponents (very large negative numbers)
// ---------------------------------------------------------------------------

describe("negative coefficient — extreme positive exponents", () => {
    it("scientificNotation: −1.5e+1000000 — no crash", () => {
        const result = scientificNotation.format(-1.5, 1_000_000, 2);
        expect(result).toBe("-1.50e+1000000");
    });

    it("letterNotation: −1.5 at exponent 3000000 — starts with '-', no crash", () => {
        const result = letterNotation.format(-1.5, 3_000_000, 2);
        expect(result.startsWith("-")).toBe(true);
        expect(result).not.toContain("NaN");
        expect(result).not.toContain("Infinity");
    });

    it("letterNotation: negation symmetry holds at tier 18279 (aaaa boundary)", () => {
        const pos = letterNotation.format(1.5, 18279 * 3, 2);
        const neg = letterNotation.format(-1.5, 18279 * 3, 2);
        expect(neg).toBe(`-${pos}`);
    });

    it("unitNotation with fallback: −1.5 at exponent 3000 — starts with '-'", () => {
        const un = new UnitNotation({ units: CLASSIC_UNITS, fallback: letterNotation, separator: " " });
        const result = un.format(-1.5, 3000, 2);
        expect(result.startsWith("-")).toBe(true);
        expect(result).not.toContain("NaN");
        expect(result).not.toContain("Infinity");
    });

    it("all plugins: output never contains NaN for negative coefficient + large exponent", () => {
        const exponents = [300, 3000, 30000, 300000, 3_000_000];
        for (const e of exponents) {
            expect(scientificNotation.format(-1.5, e, 2)).not.toContain("NaN");
            expect(letterNotation.format(-1.5, e, 2)).not.toContain("NaN");
        }
    });
});

// ---------------------------------------------------------------------------
// ArbitraryNumber.toString with negative numbers through all plugins
// ---------------------------------------------------------------------------

describe("ArbitraryNumber.toString — negative numbers via notation plugins", () => {
    it("scientificNotation: −1.5e6 → '-1.50e+6'", () => {
        expect(new ArbitraryNumber(-1.5, 6).toString(scientificNotation, 2)).toBe("-1.50e+6");
    });

    it("letterNotation: −1.5e9 → '-1.50c'", () => {
        expect(new ArbitraryNumber(-1.5, 9).toString(letterNotation, 2)).toBe("-1.50c");
    });

    it("unitNotation: −1.5e9 → '-1.50 B'", () => {
        const un = new UnitNotation({ units: CLASSIC_UNITS, separator: " " });
        expect(new ArbitraryNumber(-1.5, 9).toString(un, 2)).toBe("-1.50 B");
    });

    it("negative fraction: −0.0015 via scientificNotation", () => {
        const n = ArbitraryNumber.from(-0.0015);
        expect(n.toString(scientificNotation, 2)).toBe("-1.50e-3");
    });

    it("negative fraction: −0.0015 via letterNotation — starts with '-'", () => {
        const n = ArbitraryNumber.from(-0.0015);
        const result = n.toString(letterNotation, 2);
        expect(result.startsWith("-")).toBe(true);
    });
});
