import { describe, it, expect } from "vitest";
import { ArbitraryNumberArithmetic } from "../../utility/ArbitraryNumberArithmetic";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ArbitraryNumberArithmetic", () => {

    // -----------------------------------------------------------------------
    // normalize — the core invariant that drives the entire library
    // -----------------------------------------------------------------------
    describe("normalize", () => {
        it("result coefficient is always in [1, 10) for positive inputs", () => {
            for (const c of [0.001, 0.1, 1.5, 7, 15, 100, 1234, 0.00001]) {
                const result = ArbitraryNumberArithmetic.normalize({ coefficient: c, exponent: 0 });
                expect(result.coefficient).toBeGreaterThanOrEqual(1);
                expect(result.coefficient).toBeLessThan(10);
            }
        });

        it("result coefficient is always in (−10, −1] for negative inputs", () => {
            for (const c of [-0.001, -0.1, -1.5, -7, -15, -100]) {
                const result = ArbitraryNumberArithmetic.normalize({ coefficient: c, exponent: 0 });
                expect(Math.abs(result.coefficient)).toBeGreaterThanOrEqual(1);
                expect(Math.abs(result.coefficient)).toBeLessThan(10);
            }
        });

        it("zero coefficient always normalises to { coefficient: 0, exponent: 0 }", () => {
            expect(ArbitraryNumberArithmetic.normalize({ coefficient: 0, exponent: 0 }))
                .toEqual({ coefficient: 0, exponent: 0 });
            expect(ArbitraryNumberArithmetic.normalize({ coefficient: 0, exponent: 999 }))
                .toEqual({ coefficient: 0, exponent: 0 });
        });

        it("already-normalised value is unchanged: 1.5 × 10³ stays 1.5 × 10³", () => {
            const result = ArbitraryNumberArithmetic.normalize({ coefficient: 1.5, exponent: 3 });
            expect(result.coefficient).toBeCloseTo(1.5, 10);
            expect(result.exponent).toBe(3);
        });

        it("large coefficient shifts down: 15 × 10³ → 1.5 × 10⁴", () => {
            const result = ArbitraryNumberArithmetic.normalize({ coefficient: 15, exponent: 3 });
            expect(result.coefficient).toBeCloseTo(1.5, 10);
            expect(result.exponent).toBe(4);
        });

        it("small coefficient shifts up: 0.15 × 10³ → 1.5 × 10²", () => {
            const result = ArbitraryNumberArithmetic.normalize({ coefficient: 0.15, exponent: 3 });
            expect(result.coefficient).toBeCloseTo(1.5, 10);
            expect(result.exponent).toBe(2);
        });

        it("multi-step shift: 150 × 10³ → 1.5 × 10⁵", () => {
            const result = ArbitraryNumberArithmetic.normalize({ coefficient: 150, exponent: 3 });
            expect(result.coefficient).toBeCloseTo(1.5, 10);
            expect(result.exponent).toBe(5);
        });

        it("negative coefficient normalises magnitude correctly: −15 × 10³ → −1.5 × 10⁴", () => {
            const result = ArbitraryNumberArithmetic.normalize({ coefficient: -15, exponent: 3 });
            expect(result.coefficient).toBeCloseTo(-1.5, 10);
            expect(result.exponent).toBe(4);
        });

        it("works with negative exponents: 15 × 10⁻³ → 1.5 × 10⁻²", () => {
            const result = ArbitraryNumberArithmetic.normalize({ coefficient: 15, exponent: -3 });
            expect(result.coefficient).toBeCloseTo(1.5, 10);
            expect(result.exponent).toBe(-2);
        });

        it("subnormal coefficient (Number.MIN_VALUE) normalises to zero without looping", () => {
            // Number.MIN_VALUE ≈ 5e−324: its shift would underflow to 0, so it must be
            // treated as zero — if not handled, the normalisation loop would run forever.
            const result = ArbitraryNumberArithmetic.normalize({ coefficient: Number.MIN_VALUE, exponent: 0 });
            expect(result.coefficient).toBe(0);
            expect(result.exponent).toBe(0);
        });
    });
});
