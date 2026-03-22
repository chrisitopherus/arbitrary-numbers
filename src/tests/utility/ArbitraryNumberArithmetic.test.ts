import { describe, it, expect } from "vitest";
import { ArbitraryNumber } from "../../core/ArbitraryNumber";
import { ArbitraryNumberArithmetic } from "../../utility/ArbitraryNumberArithmetic";

// Helper: build a minimal ArbitraryNumber-like object accepted by alignedSum
function an(coefficient: number, exponent: number): ArbitraryNumber {
    return new ArbitraryNumber(coefficient, exponent);
}

describe("ArbitraryNumberArithmetic", () => {
    // -----------------------------------------------------------------------
    // normalize
    // -----------------------------------------------------------------------
    describe("normalize", () => {
        it("coefficient === 0 returns zero values regardless of exponent", () => {
            const result = ArbitraryNumberArithmetic.normalize({ coefficient: 0, exponent: 5 });
            expect(result.coefficient).toBe(0);
            expect(result.exponent).toBe(0);
        });

        it("coefficient === 0 with exponent 0 returns zero values", () => {
            const result = ArbitraryNumberArithmetic.normalize({ coefficient: 0, exponent: 0 });
            expect(result.coefficient).toBe(0);
            expect(result.exponent).toBe(0);
        });

        it("already-normalized value is unchanged", () => {
            // 1.5 is in [1, 10), no shift needed
            const result = ArbitraryNumberArithmetic.normalize({ coefficient: 1.5, exponent: 3 });
            expect(result.coefficient).toBeCloseTo(1.5, 10);
            expect(result.exponent).toBe(3);
        });

        it("coefficient exactly 1 stays at 1", () => {
            const result = ArbitraryNumberArithmetic.normalize({ coefficient: 1, exponent: 0 });
            expect(result.coefficient).toBe(1);
            expect(result.exponent).toBe(0);
        });

        it("coefficient exactly 9.999 stays in [1, 10)", () => {
            const result = ArbitraryNumberArithmetic.normalize({ coefficient: 9.999, exponent: 0 });
            expect(result.coefficient).toBeCloseTo(9.999, 10);
            expect(result.exponent).toBe(0);
        });

        it("shifts coefficient 10 → 1 and increments exponent", () => {
            // 10×10³ → 1×10⁴
            const result = ArbitraryNumberArithmetic.normalize({ coefficient: 10, exponent: 3 });
            expect(result.coefficient).toBeCloseTo(1, 10);
            expect(result.exponent).toBe(4);
        });

        it("shifts large coefficient down (e.g. 15 → 1.5)", () => {
            // 15×10³ → 1.5×10⁴
            const result = ArbitraryNumberArithmetic.normalize({ coefficient: 15, exponent: 3 });
            expect(result.coefficient).toBeCloseTo(1.5, 10);
            expect(result.exponent).toBe(4);
        });

        it("shifts very large coefficient down (e.g. 150 → 1.5)", () => {
            // 150×10³ → 1.5×10⁵
            const result = ArbitraryNumberArithmetic.normalize({ coefficient: 150, exponent: 3 });
            expect(result.coefficient).toBeCloseTo(1.5, 10);
            expect(result.exponent).toBe(5);
        });

        it("shifts small coefficient up (e.g. 0.15 → 1.5)", () => {
            // 0.15×10³ → 1.5×10²
            const result = ArbitraryNumberArithmetic.normalize({ coefficient: 0.15, exponent: 3 });
            expect(result.coefficient).toBeCloseTo(1.5, 10);
            expect(result.exponent).toBe(2);
        });

        it("shifts very small coefficient up (e.g. 0.015 → 1.5)", () => {
            // 0.015×10³ → 1.5×10¹
            const result = ArbitraryNumberArithmetic.normalize({ coefficient: 0.015, exponent: 3 });
            expect(result.coefficient).toBeCloseTo(1.5, 10);
            expect(result.exponent).toBe(1);
        });

        it("handles negative coefficient — normalizes magnitude correctly", () => {
            // −1.5×10³ → already normalized in magnitude (1.5 is in [1,10))
            const result = ArbitraryNumberArithmetic.normalize({ coefficient: -1.5, exponent: 3 });
            expect(result.coefficient).toBeCloseTo(-1.5, 10);
            expect(result.exponent).toBe(3);
        });

        it("normalizes negative coefficient that is too large", () => {
            // −15×10³ → −1.5×10⁴
            const result = ArbitraryNumberArithmetic.normalize({ coefficient: -15, exponent: 3 });
            expect(result.coefficient).toBeCloseTo(-1.5, 10);
            expect(result.exponent).toBe(4);
        });

        it("normalizes negative coefficient that is too small in magnitude", () => {
            // −0.15×10³ → −1.5×10²
            const result = ArbitraryNumberArithmetic.normalize({ coefficient: -0.15, exponent: 3 });
            expect(result.coefficient).toBeCloseTo(-1.5, 10);
            expect(result.exponent).toBe(2);
        });

        it("shifts coefficient with negative exponent", () => {
            // 15×10⁻³ → 1.5×10⁻²
            const result = ArbitraryNumberArithmetic.normalize({ coefficient: 15, exponent: -3 });
            expect(result.coefficient).toBeCloseTo(1.5, 10);
            expect(result.exponent).toBe(-2);
        });

        it("handles coefficient that is a power of 10", () => {
            // 100×10² → 1×10⁴
            const result = ArbitraryNumberArithmetic.normalize({ coefficient: 100, exponent: 2 });
            expect(result.coefficient).toBeCloseTo(1, 10);
            expect(result.exponent).toBe(4);
        });

        it("result coefficient is always in [1, 10) for positive values", () => {
            const cases = [0.001, 0.1, 1.5, 7, 15, 100, 1234, 0.00001];
            for (const c of cases) {
                const result = ArbitraryNumberArithmetic.normalize({ coefficient: c, exponent: 0 });
                expect(Math.abs(result.coefficient)).toBeGreaterThanOrEqual(1);
                expect(Math.abs(result.coefficient)).toBeLessThan(10);
            }
        });

        it("result coefficient is always in (−10, −1] for negative values", () => {
            const cases = [-0.001, -0.1, -1.5, -7, -15, -100];
            for (const c of cases) {
                const result = ArbitraryNumberArithmetic.normalize({ coefficient: c, exponent: 0 });
                expect(Math.abs(result.coefficient)).toBeGreaterThanOrEqual(1);
                expect(Math.abs(result.coefficient)).toBeLessThan(10);
            }
        });
    });

    // -----------------------------------------------------------------------
    // alignedSum
    // -----------------------------------------------------------------------
    describe("alignedSum", () => {
        it("when exponentDiff = 0, a is treated as higher, returns a.exponent", () => {
            // same exponents: 1.5×10³ + 2.5×10³ = 4.0×10³
            const result = ArbitraryNumberArithmetic.alignedSum(an(1.5, 3), an(2.5, 3), 0);
            expect(result.coefficient).toBeCloseTo(4.0, 10);
            expect(result.exponent).toBe(3);
        });

        it("when exponentDiff > 0, a is the higher-exponent number", () => {
            // a=1.5×10⁴, b=2.5×10³, diff=1 → higher=a, shift b down by 1
            // 1.5 + 0.25 = 1.75; exponent=4
            const result = ArbitraryNumberArithmetic.alignedSum(an(1.5, 4), an(2.5, 3), 1);
            expect(result.coefficient).toBeCloseTo(1.75, 10);
            expect(result.exponent).toBe(4);
        });

        it("when exponentDiff < 0, b is the higher-exponent number", () => {
            // a=1.5×10³, b=2.5×10⁴, diff=-1 → higher=b, shift a down by 1
            // 2.5 + 0.15 = 2.65; exponent=4
            const result = ArbitraryNumberArithmetic.alignedSum(an(1.5, 3), an(2.5, 4), -1);
            expect(result.coefficient).toBeCloseTo(2.65, 10);
            expect(result.exponent).toBe(4);
        });

        it("uses the absolute value of diff as the shift magnitude", () => {
            // a=1.5×10³, b=2.5×10⁶, diff=-3 → higher=b, shift a down by 3
            // 2.5 + 0.0015 = 2.5015; exponent=6
            const result = ArbitraryNumberArithmetic.alignedSum(an(1.5, 3), an(2.5, 6), -3);
            expect(result.coefficient).toBeCloseTo(2.5015, 10);
            expect(result.exponent).toBe(6);
        });

        it("handles negative coefficients during alignment", () => {
            // a=3×10³, b=−1.5×10³, diff=0 → 3 + (−1.5) = 1.5; exponent=3
            const result = ArbitraryNumberArithmetic.alignedSum(an(3, 3), an(-1.5, 3), 0);
            expect(result.coefficient).toBeCloseTo(1.5, 10);
            expect(result.exponent).toBe(3);
        });

        it("large shift reduces lower contribution near zero", () => {
            // a=1×10¹⁵, b=1×10⁰, diff=15 → higher=a, shift b down by 15
            // 1 + 1e-15 ≈ 1 (floating point precision limit)
            const result = ArbitraryNumberArithmetic.alignedSum(an(1, 15), an(1, 0), 15);
            expect(result.exponent).toBe(15);
            // coefficient is very close to 1
            expect(result.coefficient).toBeCloseTo(1, 5);
        });
    });

    // -----------------------------------------------------------------------
    // shiftCoefficientDown
    // -----------------------------------------------------------------------
    describe("shiftCoefficientDown", () => {
        it("divides coefficient by 10^places", () => {
            expect(ArbitraryNumberArithmetic.shiftCoefficientDown(5, 1)).toBeCloseTo(0.5, 10);
        });

        it("shifts by 0 places returns unchanged value", () => {
            expect(ArbitraryNumberArithmetic.shiftCoefficientDown(1.5, 0)).toBe(1.5);
        });

        it("shifts by 3 places", () => {
            expect(ArbitraryNumberArithmetic.shiftCoefficientDown(1.5, 3)).toBeCloseTo(0.0015, 10);
        });

        it("handles negative coefficient", () => {
            expect(ArbitraryNumberArithmetic.shiftCoefficientDown(-5, 1)).toBeCloseTo(-0.5, 10);
        });

        it("shifts large number down", () => {
            expect(ArbitraryNumberArithmetic.shiftCoefficientDown(1000, 3)).toBeCloseTo(1, 10);
        });
    });

    // -----------------------------------------------------------------------
    // shiftCoefficientUp
    // -----------------------------------------------------------------------
    describe("shiftCoefficientUp", () => {
        it("multiplies coefficient by 10^places", () => {
            expect(ArbitraryNumberArithmetic.shiftCoefficientUp(5, 1)).toBeCloseTo(50, 10);
        });

        it("shifts by 0 places returns unchanged value", () => {
            expect(ArbitraryNumberArithmetic.shiftCoefficientUp(1.5, 0)).toBe(1.5);
        });

        it("shifts by 3 places", () => {
            expect(ArbitraryNumberArithmetic.shiftCoefficientUp(1.5, 3)).toBeCloseTo(1500, 10);
        });

        it("handles negative coefficient", () => {
            expect(ArbitraryNumberArithmetic.shiftCoefficientUp(-5, 1)).toBeCloseTo(-50, 10);
        });

        it("up then down returns original", () => {
            const original = 1.5;
            const up = ArbitraryNumberArithmetic.shiftCoefficientUp(original, 3);
            const backDown = ArbitraryNumberArithmetic.shiftCoefficientDown(up, 3);
            expect(backDown).toBeCloseTo(original, 10);
        });
    });
});
