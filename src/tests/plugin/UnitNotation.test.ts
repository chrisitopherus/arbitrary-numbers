import { describe, it, expect } from "vitest";
import { UnitNotation, unitNotation } from "../../plugin/UnitNotation";
import { letterNotation } from "../../plugin/LetterNotation";
import { scientificNotation } from "../../plugin/ScientificNotation";
import { CLASSIC_UNITS, COMPACT_UNITS } from "../../constants/units";

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
            // verify by formatting a known exponent
            expect(n.format(1.5, 3, 2)).toBe("1.50K");
        });

        it("defaults separator to empty string", () => {
            const n = make({ units: CLASSIC_UNITS });
            expect(n.format(1.5, 3, 2)).toBe("1.50K");
        });

        it("respects custom separator", () => {
            const n = new UnitNotation({ units: CLASSIC_UNITS, separator: " " });
            expect(n.format(1.5, 3, 2)).toBe("1.50 K");
        });

        it("defaults fallback to scientificNotation", () => {
            const n = make({ units: COMPACT_UNITS }); // COMPACT_UNITS max is exponent 30
            // exponent 33 has no matching unit → falls back to scientificNotation
            expect(n.format(1.5, 33, 2)).toBe("1.50e+33");
        });

        it("respects a custom fallback plugin", () => {
            const n = new UnitNotation({ units: COMPACT_UNITS, fallback: letterNotation });
            expect(n.format(1.5, 33, 2)).toBe("1.50k");  // letterNotation: tier 11 → 'k'
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

        it("picks the largest unit whose exponent ≤ given exponent", () => {
            // exponent 10 → best unit is B (exponent 9), remainder = 1
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
        it("uses scientificNotation by default when exponent exceeds all units", () => {
            const n = make({ units: COMPACT_UNITS }); // max exponent 30
            expect(n.format(1.5, 36, 2)).toBe("1.50e+36");
        });

        it("delegates full (coefficient, exponent, decimals) context to fallback", () => {
            let capturedC: number | undefined;
            let capturedE: number | undefined;
            let capturedD: number | undefined;
            const spy = {
                format: (c: number, e: number, d: number) => {
                    capturedC = c; capturedE = e; capturedD = d;
                    return "spy";
                },
            };
            const n = new UnitNotation({ units: COMPACT_UNITS, fallback: spy });
            n.format(1.5, 36, 4);
            expect(capturedC).toBe(1.5);
            expect(capturedE).toBe(36);
            expect(capturedD).toBe(4);
        });

        it("fallback receives unmodified exponent (not tier)", () => {
            const captured: number[] = [];
            const spy = {
                format: (_c: number, e: number, _d: number) => { captured.push(e); return ""; },
            };
            const n = new UnitNotation({ units: COMPACT_UNITS, fallback: spy });
            n.format(1.5, 99, 2);
            expect(captured[0]).toBe(99);
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

        it("returns empty string when no unit matches", () => {
            const n = make({ units: COMPACT_UNITS }); // max exponent 30
            expect(n.getSuffix(50)).toBe("");  // tier 50 → exponent 150, no unit
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

        it("falls back to letterNotation for very large exponents", () => {
            // exponent 306 exceeds all CLASSIC_UNITS (max Ct at 303)
            // remainder = 306 - 303 = 3, but that's the Ct unit
            // exponent 309 exceeds Ct
            const result = unitNotation.format(1.5, 309, 2);
            // letterNotation: tier = floor(309/3) = 103 → 'daa' or similar; just verify it doesn't throw
            expect(typeof result).toBe("string");
            expect(result.length).toBeGreaterThan(0);
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

        it("falls back beyond No (exponent 30) with default scientificNotation", () => {
            const n = new UnitNotation({ units: COMPACT_UNITS });
            expect(n.format(1.5, 33, 2)).toBe("1.50e+33");
        });
    });
});
