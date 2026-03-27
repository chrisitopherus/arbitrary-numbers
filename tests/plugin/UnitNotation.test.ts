import { describe, it, expect } from "vitest";
import { UnitNotation, unitNotation } from "../../src/plugin/UnitNotation";
import { letterNotation } from "../../src/plugin/AlphabetNotation";
import { CLASSIC_UNITS, COMPACT_UNITS } from "../../src/constants/units";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function make(options?: ConstructorParameters<typeof UnitNotation>[0]) {
    return new UnitNotation(options ?? { units: CLASSIC_UNITS });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("UnitNotation", () => {
    // -----------------------------------------------------------------------
    // constructor
    // -----------------------------------------------------------------------
    describe("constructor", () => {
        it("stores units", () => {
            const n = make({ units: CLASSIC_UNITS });
            expect(n.format(1.5, 3, 2)).toBe("1.50 K");
        });

        it("defaults separator to space", () => {
            const n = make({ units: CLASSIC_UNITS });
            expect(n.format(1.5, 3, 2)).toBe("1.50 K");
        });

        it("respects custom separator override", () => {
            const n = new UnitNotation({ units: CLASSIC_UNITS, separator: "" });
            expect(n.format(1.5, 3, 2)).toBe("1.50K");
        });

        it("no fallback by default — unmatched tier renders as plain scaled value", () => {
            const n = make({ units: COMPACT_UNITS }); // COMPACT_UNITS max tier 10
            // tier 11, no unit, no fallback → plain number
            expect(n.format(1.5, 33, 2)).toBe("1.50");
        });

        it("respects a custom fallback plugin", () => {
            const n = new UnitNotation({ units: COMPACT_UNITS, fallback: letterNotation });
            // tier 11, no unit → letterNotation.getSuffix(11) = 'k', separator = " " (default)
            expect(n.format(1.5, 33, 2)).toBe("1.50 k");
        });
    });

    // -----------------------------------------------------------------------
    // format — small numbers (exponent < 3)
    // -----------------------------------------------------------------------
    describe("format — exponent < 3 (no suffix)", () => {
        it("exponent 0", () => {
            expect(make().format(1.5, 0, 2)).toBe("1.50");
        });

        it("exponent 2", () => {
            expect(make().format(9.9, 2, 2)).toBe("990.00");
        });

        it("zero", () => {
            expect(make().format(0, 0, 2)).toBe("0.00");
        });
    });

    // -----------------------------------------------------------------------
    // format — negative exponents (fractional values)
    // -----------------------------------------------------------------------
    describe("format — negative exponents (no suffix)", () => {
        it("exponent -1: 2 × 10^-1 = 0.2", () => {
            expect(make().format(2, -1, 2)).toBe("0.20");
        });

        it("exponent -2: 5 × 10^-2 = 0.05", () => {
            expect(make().format(5, -2, 2)).toBe("0.05");
        });

        it("exponent -3: 5 × 10^-3 = 0.005 (3 decimals)", () => {
            expect(make().format(5, -3, 3)).toBe("0.005");
        });
    });

    // -----------------------------------------------------------------------
    // format — unit matching
    // -----------------------------------------------------------------------
    describe("format — unit matching", () => {
        it("K (exponent 3)", () => {
            const n = new UnitNotation({ units: CLASSIC_UNITS, separator: " " });
            expect(n.format(1.5, 3, 2)).toBe("1.50 K");
        });

        it("M (exponent 6)", () => {
            const n = new UnitNotation({ units: CLASSIC_UNITS, separator: " " });
            expect(n.format(3.2, 6, 2)).toBe("3.20 M");
        });

        it("B (exponent 9)", () => {
            const n = new UnitNotation({ units: CLASSIC_UNITS, separator: " " });
            expect(n.format(1.0, 9, 2)).toBe("1.00 B");
        });

        it("remainder 1 — scales display coefficient by 10", () => {
            // 1.5 × 10^4 displayed as 'K': remainder = 4 - 3 = 1 → 1.5 × 10 = 15
            const n = new UnitNotation({ units: CLASSIC_UNITS, separator: " " });
            expect(n.format(1.5, 4, 2)).toBe("15.00 K");
        });

        it("remainder 2 — scales display coefficient by 100", () => {
            // 1.5 × 10^5 → remainder = 2 → 1.5 × 100 = 150
            const n = new UnitNotation({ units: CLASSIC_UNITS, separator: " " });
            expect(n.format(1.5, 5, 2)).toBe("150.00 K");
        });

        it("picks unit by tier (floor(exponent / 3))", () => {
            // exponent 10 → tier = floor(10/3) = 3 → B (tier 3), remainder = 1
            const n = new UnitNotation({ units: CLASSIC_UNITS, separator: " " });
            expect(n.format(1.0, 10, 2)).toBe("10.00 B");
        });

        it("decimals param is forwarded correctly", () => {
            const n = new UnitNotation({ units: CLASSIC_UNITS, separator: " " });
            expect(n.format(1.5, 6, 4)).toBe("1.5000 M");
            expect(n.format(1.5, 6, 0)).toBe("2 M");
        });
    });

    // -----------------------------------------------------------------------
    // format — fallback
    // -----------------------------------------------------------------------
    describe("format — fallback when no unit matches", () => {
        it("no fallback — unmatched tier renders as plain scaled value", () => {
            const n = make({ units: COMPACT_UNITS }); // max tier 10
            // tier 12, no unit, no fallback → displayC = 1.5 * 10^0 = 1.5
            expect(n.format(1.5, 36, 2)).toBe("1.50");
        });

        it("uses fallback getSuffix, keeping own separator", () => {
            const n = new UnitNotation({ units: COMPACT_UNITS, fallback: letterNotation });
            // tier 11 → letterNotation.getSuffix(11) = 'k', default separator = " "
            expect(n.format(1.5, 33, 2)).toBe("1.50 k");
        });

        it("delegates tier (not exponent) to fallback getSuffix", () => {
            const captured: number[] = [];
            const spy = { getSuffix: (tier: number) => { captured.push(tier); return ""; } };
            const n = new UnitNotation({ units: COMPACT_UNITS, fallback: spy });
            n.format(1.5, 99, 2);
            expect(captured[0]).toBe(33); // tier = floor(99 / 3) = 33
        });
    });

    // -----------------------------------------------------------------------
    // getSuffix
    // -----------------------------------------------------------------------
    describe("getSuffix", () => {
        it("returns unit symbol for a matched tier", () => {
            const n = make({ units: CLASSIC_UNITS });
            expect(n.getSuffix(1)).toBe("K");  // tier 1 → exponent 3
            expect(n.getSuffix(2)).toBe("M");  // tier 2 → exponent 6
        });

        it("returns empty string when no unit and no fallback", () => {
            const n = make({ units: COMPACT_UNITS }); // max tier 10, no fallback
            expect(n.getSuffix(50)).toBe("");
        });

        it("returns fallback suffix when no unit matches", () => {
            const n = new UnitNotation({ units: COMPACT_UNITS, fallback: letterNotation });
            // tier 50 → letterNotation index 49 → two-letter: 49-26=23, first='a', second='x' → 'ax'
            expect(n.getSuffix(50)).toBe("ax");
        });
    });

    // -----------------------------------------------------------------------
    // unitNotation singleton
    // -----------------------------------------------------------------------
    describe("unitNotation singleton", () => {
        it("is an instance of UnitNotation", () => {
            expect(unitNotation).toBeInstanceOf(UnitNotation);
        });

        it("uses space separator", () => {
            expect(unitNotation.format(1.5, 3, 2)).toBe("1.50 K");
        });

        it("formats M correctly", () => {
            expect(unitNotation.format(3.2, 6, 2)).toBe("3.20 M");
        });

        it("falls back to letterNotation for exponents beyond Ct+2 (exponent 306)", () => {
            // tier = floor(306/3) = 102, no unit → letterNotation.getSuffix(102)
            // index = 101 → two-letter: 75, first='c', second='x' → 'cx'
            // own separator " " is used → "1.50 cx"
            expect(unitNotation.format(1.5, 306, 2)).toBe("1.50 cx");
        });

        it("Ct (exponent 303) is the last matching unit", () => {
            // remainder = 303-303 = 0 → matches
            expect(unitNotation.format(1.5, 303, 2)).toBe("1.50 Ct");
        });

        it("exponent 304 still matches Ct (remainder 1)", () => {
            expect(unitNotation.format(1.5, 304, 2)).toBe("15.00 Ct");
        });

        it("exponent 305 still matches Ct (remainder 2)", () => {
            expect(unitNotation.format(1.5, 305, 2)).toBe("150.00 Ct");
        });
    });

    // -----------------------------------------------------------------------
    // COMPACT_UNITS
    // -----------------------------------------------------------------------
    describe("COMPACT_UNITS", () => {
        it("formats using compact symbols", () => {
            const n = new UnitNotation({ units: COMPACT_UNITS, separator: " " });
            expect(n.format(1.5, 3, 2)).toBe("1.50 k");
            expect(n.format(1.5, 6, 2)).toBe("1.50 M");
        });

        it("no fallback — renders plain value beyond No", () => {
            const n = new UnitNotation({ units: COMPACT_UNITS });
            expect(n.format(1.5, 33, 2)).toBe("1.50");
        });
    });
});
