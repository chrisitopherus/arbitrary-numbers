import { describe, it, expect } from "vitest";
import { ScientificNotation, scientificNotation } from "../../src/plugin/ScientificNotation";

describe("ScientificNotation", () => {
    describe("format — exponent === 0", () => {
        it("returns coefficient.toFixed(decimals) with no e-notation", () => {
            const sn = new ScientificNotation();
            expect(sn.format(1.5, 0, 3)).toBe("1.500");
        });

        it("zero coefficient with zero exponent", () => {
            const sn = new ScientificNotation();
            expect(sn.format(0, 0, 2)).toBe("0.00");
        });

        it("negative coefficient with zero exponent", () => {
            const sn = new ScientificNotation();
            expect(sn.format(-2.5, 0, 2)).toBe("-2.50");
        });

        it("integer coefficient with zero decimals", () => {
            const sn = new ScientificNotation();
            expect(sn.format(9, 0, 0)).toBe("9");
        });

        it("rounds up when decimals=0 and fractional part >= 0.5", () => {
            const sn = new ScientificNotation();
            expect(sn.format(1.5, 0, 0)).toBe("2");
        });

        it("rounds down when decimals=0 and fractional part < 0.5", () => {
            const sn = new ScientificNotation();
            expect(sn.format(1.4, 0, 0)).toBe("1");
        });

        it("produces 15 decimal places", () => {
            const sn = new ScientificNotation();
            expect(sn.format(1.5, 0, 15)).toBe("1.500000000000000");
        });
    });

    describe("format — positive exponent", () => {
        it("uses e+ prefix for positive exponent", () => {
            const sn = new ScientificNotation();
            expect(sn.format(1.5, 12, 3)).toBe("1.500e+12");
        });

        it("exponent of 1 uses e+1", () => {
            const sn = new ScientificNotation();
            expect(sn.format(1, 1, 0)).toBe("1e+1");
        });

        it("negative coefficient with positive exponent", () => {
            const sn = new ScientificNotation();
            expect(sn.format(-3.14, 5, 2)).toBe("-3.14e+5");
        });

        it("decimals=0 rounds the coefficient", () => {
            const sn = new ScientificNotation();
            expect(sn.format(1.5, 3, 0)).toBe("2e+3");
        });

        it("15 decimal places with positive exponent", () => {
            const sn = new ScientificNotation();
            expect(sn.format(1.5, 3, 15)).toBe("1.500000000000000e+3");
        });

        it("very large exponent", () => {
            const sn = new ScientificNotation();
            expect(sn.format(1.5, 1_000_000, 2)).toBe("1.50e+1000000");
        });

        it("exponent exactly at PrecisionCutoff (15)", () => {
            const sn = new ScientificNotation();
            expect(sn.format(1.5, 15, 2)).toBe("1.50e+15");
        });

        it("coefficient rounds up to 10 at 0 decimals — re-normalises exponent", () => {
            const sn = new ScientificNotation();
            // 9.5 rounds to 10 at 0 decimals; output must re-normalise to 1e+4 not "10e+3"
            expect(sn.format(9.5, 3, 0)).toBe("1e+4");
        });

        it("coefficient rounds up to 10 at 1 decimal — re-normalises exponent", () => {
            const sn = new ScientificNotation();
            // 9.99 rounds to 10.0 at 1 decimal
            expect(sn.format(9.99, 3, 1)).toBe("1.0e+4");
        });

        it("coefficient rounds up to 10 with zero exponent — re-normalises to e+1", () => {
            const sn = new ScientificNotation();
            expect(sn.format(9.5, 0, 0)).toBe("1e+1");
        });

        it("negative coefficient rounds past -10 — re-normalises exponent", () => {
            const sn = new ScientificNotation();
            expect(sn.format(-9.5, 3, 0)).toBe("-1e+4");
        });
    });

    describe("format — negative exponent", () => {
        it("uses e- prefix for negative exponent", () => {
            const sn = new ScientificNotation();
            expect(sn.format(1.5, -5, 3)).toBe("1.500e-5");
        });

        it("exponent of -1 uses e-1", () => {
            const sn = new ScientificNotation();
            expect(sn.format(1, -1, 0)).toBe("1e-1");
        });

        it("negative coefficient with negative exponent", () => {
            const sn = new ScientificNotation();
            expect(sn.format(-3.14, -5, 2)).toBe("-3.14e-5");
        });

        it("decimals=0 with negative exponent", () => {
            const sn = new ScientificNotation();
            expect(sn.format(1.5, -3, 0)).toBe("2e-3");
        });

        it("15 decimal places with negative exponent", () => {
            const sn = new ScientificNotation();
            expect(sn.format(1.5, -3, 15)).toBe("1.500000000000000e-3");
        });

        it("very large negative exponent", () => {
            const sn = new ScientificNotation();
            expect(sn.format(1.5, -1_000_000, 2)).toBe("1.50e-1000000");
        });

        it("exponent exactly at -PrecisionCutoff (-15)", () => {
            const sn = new ScientificNotation();
            expect(sn.format(1.5, -15, 2)).toBe("1.50e-15");
        });
    });

    describe("scientificNotation singleton", () => {
        it("is an instance of ScientificNotation", () => {
            expect(scientificNotation).toBeInstanceOf(ScientificNotation);
        });

        it("formats a positive exponent correctly via the singleton", () => {
            expect(scientificNotation.format(1.5, 3, 2)).toBe("1.50e+3");
        });

        it("formats a negative exponent correctly via the singleton", () => {
            expect(scientificNotation.format(1.5, -3, 2)).toBe("1.50e-3");
        });

        it("formats zero exponent correctly via the singleton", () => {
            expect(scientificNotation.format(1.5, 0, 2)).toBe("1.50");
        });
    });
});
