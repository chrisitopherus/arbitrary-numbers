import { describe, it, expect } from "vitest";
import { ArbitraryNumber } from "../../core/ArbitraryNumber";
import { scientificNotation } from "../../plugin/ScientificNotation";
import { NotationPlugin } from "../../types/plugin";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function an(coefficient: number, exponent: number): ArbitraryNumber {
    return new ArbitraryNumber(coefficient, exponent);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ArbitraryNumber", () => {
    // -----------------------------------------------------------------------
    // Static constants
    // -----------------------------------------------------------------------
    describe("static constants", () => {
        it("PrecisionCutoff is 15", () => {
            expect(ArbitraryNumber.PrecisionCutoff).toBe(15);
        });

        it("Zero has coefficient 0 and exponent 0", () => {
            expect(ArbitraryNumber.Zero.coefficient).toBe(0);
            expect(ArbitraryNumber.Zero.exponent).toBe(0);
        });

        it("One has coefficient 1 and exponent 0", () => {
            expect(ArbitraryNumber.One.coefficient).toBe(1);
            expect(ArbitraryNumber.One.exponent).toBe(0);
        });

        it("Ten has coefficient 1 and exponent 1", () => {
            expect(ArbitraryNumber.Ten.coefficient).toBe(1);
            expect(ArbitraryNumber.Ten.exponent).toBe(1);
        });
    });

    // -----------------------------------------------------------------------
    // from
    // -----------------------------------------------------------------------
    describe("from", () => {
        it("converts an integer", () => {
            const n = ArbitraryNumber.from(1500);
            expect(n.coefficient).toBeCloseTo(1.5, 10);
            expect(n.exponent).toBe(3);
        });

        it("converts a decimal", () => {
            const n = ArbitraryNumber.from(0.005);
            expect(n.coefficient).toBeCloseTo(5, 10);
            expect(n.exponent).toBe(-3);
        });

        it("converts 0 to Zero", () => {
            const n = ArbitraryNumber.from(0);
            expect(n.coefficient).toBe(0);
            expect(n.exponent).toBe(0);
        });

        it("converts a negative number", () => {
            const n = ArbitraryNumber.from(-1500);
            expect(n.coefficient).toBeCloseTo(-1.5, 10);
            expect(n.exponent).toBe(3);
        });

        it("throws for Infinity", () => {
            expect(() => ArbitraryNumber.from(Infinity)).toThrow("ArbitraryNumber.from: value must be finite");
        });

        it("throws for -Infinity", () => {
            expect(() => ArbitraryNumber.from(-Infinity)).toThrow("ArbitraryNumber.from: value must be finite");
        });

        it("throws for NaN", () => {
            expect(() => ArbitraryNumber.from(NaN)).toThrow("ArbitraryNumber.from: value must be finite");
        });
    });

    // -----------------------------------------------------------------------
    // Constructor
    // -----------------------------------------------------------------------
    describe("constructor", () => {
        it("normalizes coefficient and exponent on construction", () => {
            // 15×10³ → 1.5×10⁴
            const n = an(15, 3);
            expect(n.coefficient).toBeCloseTo(1.5, 10);
            expect(n.exponent).toBe(4);
        });

        it("stores fractional coefficient", () => {
            const n = an(2.5, 5);
            expect(n.coefficient).toBe(2.5);
            expect(n.exponent).toBe(5);
        });

        it("stores negative coefficient", () => {
            const n = an(-1.5, 3);
            expect(n.coefficient).toBe(-1.5);
            expect(n.exponent).toBe(3);
        });

        it("stores negative exponent", () => {
            const n = an(5, -3);
            expect(n.exponent).toBe(-3);
        });

        it("normalizes zero coefficient to exponent 0", () => {
            // normalize({0, 999}) → Zero → coefficient=0, exponent=0
            const n = an(0, 999);
            expect(n.coefficient).toBe(0);
            expect(n.exponent).toBe(0);
        });
    });

    // -----------------------------------------------------------------------
    // add
    // -----------------------------------------------------------------------
    describe("add", () => {
        it("Zero + x returns the same x reference", () => {
            const x = an(1.5, 3);
            expect(ArbitraryNumber.Zero.add(x)).toBe(x);
        });

        it("x + Zero returns the same x reference", () => {
            const x = an(1.5, 3);
            expect(x.add(ArbitraryNumber.Zero)).toBe(x);
        });

        it("Zero + Zero returns a zero-coefficient result", () => {
            const result = ArbitraryNumber.Zero.add(ArbitraryNumber.Zero);
            expect(result.coefficient).toBe(0);
        });

        it("adds two numbers with the same exponent", () => {
            const result = an(1.5, 3).add(an(2.5, 3));
            expect(result.coefficient).toBe(4);
            expect(result.exponent).toBe(3);
        });

        it("adds two numbers with different exponents (larger first)", () => {
            const result = an(1.5, 4).add(an(2.5, 3));
            // 1.5×10⁴ + 2.5×10³ = 15000 + 2500 = 17500 = 1.75×10⁴
            expect(result.coefficient).toBeCloseTo(1.75, 10);
            expect(result.exponent).toBe(4);
        });

        it("adds two numbers with different exponents (smaller first)", () => {
            const result = an(2.5, 3).add(an(1.5, 4));
            // same as above but reversed — still 1.75×10⁴
            expect(result.coefficient).toBeCloseTo(1.75, 10);
            expect(result.exponent).toBe(4);
        });

        it("normalizes when the sum coefficient overflows ≥ 10", () => {
            // 9.5×10³ + 1.5×10³ = 11×10³ → normalized: 1.1×10⁴
            const result = an(9.5, 3).add(an(1.5, 3));
            expect(result.coefficient).toBeCloseTo(1.1, 10);
            expect(result.exponent).toBe(4);
        });

        it("normalizes a regular sum", () => {
            // 1.5×10³ + 1.5×10³ = 3.0×10³
            const result = an(1.5, 3).add(an(1.5, 3));
            expect(result.coefficient).toBe(3);
            expect(result.exponent).toBe(3);
        });

        it("returns this when exponentDiff is strictly greater than PrecisionCutoff", () => {
            // diff = 19 − 3 = 16 > 15 → short-circuit, return this
            const a = an(1.5, 19);
            const b = an(1.5, 3);
            expect(a.add(b)).toBe(a);
        });

        it("returns other when exponentDiff is strictly less than -PrecisionCutoff", () => {
            // diff = 3 − 19 = −16 < −15 → short-circuit, return other
            const a = an(1.5, 3);
            const b = an(1.5, 19);
            expect(a.add(b)).toBe(b);
        });

        it("does NOT short-circuit when exponentDiff equals PrecisionCutoff exactly", () => {
            // diff = 18 − 3 = 15, which is NOT > 15
            const a = an(1.5, 18);
            const b = an(1.5, 3);
            const result = a.add(b);
            expect(result).not.toBe(a);
            expect(result).not.toBe(b);
        });

        it("does NOT short-circuit when exponentDiff equals -PrecisionCutoff exactly", () => {
            // diff = 3 − 18 = −15, which is NOT < −15
            const a = an(1.5, 3);
            const b = an(1.5, 18);
            const result = a.add(b);
            expect(result).not.toBe(a);
            expect(result).not.toBe(b);
        });

        it("handles cancellation (a + (−a) → coefficient 0)", () => {
            const a = an(1.5, 3);
            const neg = an(-1.5, 3);
            const result = a.add(neg);
            expect(result.coefficient).toBe(0);
        });

        it("adds two negative numbers", () => {
            // −1.5×10³ + −2.5×10³ = −4×10³
            const result = an(-1.5, 3).add(an(-2.5, 3));
            expect(result.coefficient).toBeCloseTo(-4, 10);
            expect(result.exponent).toBe(3);
        });

        it("adds a positive and a negative (positive dominates)", () => {
            // 3×10³ + (−1×10³) = 2×10³
            const result = an(3, 3).add(an(-1, 3));
            expect(result.coefficient).toBeCloseTo(2, 10);
            expect(result.exponent).toBe(3);
        });
    });

    // -----------------------------------------------------------------------
    // sub
    // -----------------------------------------------------------------------
    describe("sub", () => {
        it("x − Zero returns the same x reference", () => {
            const x = an(1.5, 3);
            expect(x.sub(ArbitraryNumber.Zero)).toBe(x);
        });

        it("Zero − x returns the negation of x", () => {
            // 0 − 1.5×10³ = −1.5×10³
            const result = ArbitraryNumber.Zero.sub(an(1.5, 3));
            expect(result.coefficient).toBeCloseTo(-1.5, 10);
            expect(result.exponent).toBe(3);
        });

        it("x − x results in coefficient 0", () => {
            const x = an(1.5, 3);
            expect(x.sub(x).coefficient).toBe(0);
        });

        it("subtracts a smaller from a larger (positive result)", () => {
            const result = an(3.5, 3).sub(an(1.5, 3));
            expect(result.coefficient).toBe(2);
            expect(result.exponent).toBe(3);
        });

        it("subtracts a larger from a smaller (negative result)", () => {
            // 1.5 − 3.5 = −2.0 (same exponent, direct subtraction)
            const result = an(1.5, 3).sub(an(3.5, 3));
            expect(result.coefficient).toBeCloseTo(-2, 10);
            expect(result.exponent).toBe(3);
        });

        it("subtracts numbers with different exponents", () => {
            // 2.5×10⁴ − 1.5×10³ = 25000 − 1500 = 23500 = 2.35×10⁴
            const result = an(2.5, 4).sub(an(1.5, 3));
            expect(result.coefficient).toBeCloseTo(2.35, 10);
            expect(result.exponent).toBe(4);
        });

        it("delegates to add with negated coefficient", () => {
            // sub(b) ≡ add(ArbitraryNumber(-b.coefficient, b.exponent))
            const a = an(5, 3);
            const b = an(2, 3);
            const viaSub = a.sub(b);
            const viaAdd = a.add(an(-b.coefficient, b.exponent));
            expect(viaSub.coefficient).toBeCloseTo(viaAdd.coefficient, 10);
            expect(viaSub.exponent).toBe(viaAdd.exponent);
        });
    });

    // -----------------------------------------------------------------------
    // mul
    // -----------------------------------------------------------------------
    describe("mul", () => {
        it("Zero × x returns ArbitraryNumber.Zero singleton", () => {
            expect(ArbitraryNumber.Zero.mul(an(1.5, 3))).toBe(ArbitraryNumber.Zero);
        });

        it("x × Zero returns ArbitraryNumber.Zero singleton", () => {
            expect(an(1.5, 3).mul(ArbitraryNumber.Zero)).toBe(ArbitraryNumber.Zero);
        });

        it("multiplies coefficients and adds exponents", () => {
            // 2×10³ × 3×10⁴ = 6×10⁷
            const result = an(2, 3).mul(an(3, 4));
            expect(result.coefficient).toBe(6);
            expect(result.exponent).toBe(7);
        });

        it("normalizes when product coefficient ≥ 10", () => {
            // 5×10³ × 3×10⁴ = 15×10⁷ → 1.5×10⁸
            const result = an(5, 3).mul(an(3, 4));
            expect(result.coefficient).toBeCloseTo(1.5, 10);
            expect(result.exponent).toBe(8);
        });

        it("One × x equals x (normalized)", () => {
            const result = ArbitraryNumber.One.mul(an(1.5, 3));
            expect(result.coefficient).toBe(1.5);
            expect(result.exponent).toBe(3);
        });

        it("x × One equals x (normalized)", () => {
            const result = an(1.5, 3).mul(ArbitraryNumber.One);
            expect(result.coefficient).toBe(1.5);
            expect(result.exponent).toBe(3);
        });

        it("multiplies negative × positive", () => {
            const result = an(-2, 3).mul(an(3, 4));
            expect(result.coefficient).toBeCloseTo(-6, 10);
            expect(result.exponent).toBe(7);
        });

        it("multiplies negative × negative → positive", () => {
            const result = an(-2, 3).mul(an(-3, 4));
            expect(result.coefficient).toBeCloseTo(6, 10);
            expect(result.exponent).toBe(7);
        });

        it("Ten × Ten = 1×10²", () => {
            const result = ArbitraryNumber.Ten.mul(ArbitraryNumber.Ten);
            expect(result.coefficient).toBeCloseTo(1, 10);
            expect(result.exponent).toBe(2);
        });
    });

    // -----------------------------------------------------------------------
    // div
    // -----------------------------------------------------------------------
    describe("div", () => {
        it("throws 'Division by zero' when dividing by Zero", () => {
            expect(() => an(1.5, 3).div(ArbitraryNumber.Zero)).toThrow("Division by zero");
        });

        it("throws when dividing by any ArbitraryNumber with coefficient 0", () => {
            expect(() => an(1.5, 3).div(an(0, 5))).toThrow("Division by zero");
        });

        it("Zero ÷ x returns a zero-coefficient result", () => {
            const result = ArbitraryNumber.Zero.div(an(1.5, 3));
            expect(result.coefficient).toBe(0);
        });

        it("divides coefficients and subtracts exponents", () => {
            // 6×10⁷ ÷ 3×10⁴ = 2×10³
            const result = an(6, 7).div(an(3, 4));
            expect(result.coefficient).toBe(2);
            expect(result.exponent).toBe(3);
        });

        it("x ÷ x = 1×10⁰", () => {
            const result = an(1.5, 3).div(an(1.5, 3));
            expect(result.coefficient).toBe(1);
            expect(result.exponent).toBe(0);
        });

        it("normalizes when result coefficient < 1", () => {
            // 3×10⁷ ÷ 6×10⁴ = 0.5×10³ → normalized: 5×10²
            const result = an(3, 7).div(an(6, 4));
            expect(result.coefficient).toBe(5);
            expect(result.exponent).toBe(2);
        });

        it("One ÷ Ten = 1×10⁻¹", () => {
            const result = ArbitraryNumber.One.div(ArbitraryNumber.Ten);
            expect(result.coefficient).toBe(1);
            expect(result.exponent).toBe(-1);
        });

        it("divides to produce a negative exponent result", () => {
            // 2×10⁰ ÷ 1×10¹ = 2×10⁻¹ (coefficient 2, exponent -1)
            const result = an(2, 0).div(ArbitraryNumber.Ten);
            expect(result.coefficient).toBe(2);
            expect(result.exponent).toBe(-1);
        });
    });

    // -----------------------------------------------------------------------
    // pow
    // -----------------------------------------------------------------------
    describe("pow", () => {
        it("x ^ 0 returns ArbitraryNumber.One (including zero ^ 0)", () => {
            expect(ArbitraryNumber.Zero.pow(0)).toBe(ArbitraryNumber.One);
            expect(an(1.5, 3).pow(0)).toBe(ArbitraryNumber.One);
        });

        it("Zero ^ n returns ArbitraryNumber.Zero for n > 0", () => {
            expect(ArbitraryNumber.Zero.pow(1)).toBe(ArbitraryNumber.Zero);
            expect(ArbitraryNumber.Zero.pow(3)).toBe(ArbitraryNumber.Zero);
            expect(ArbitraryNumber.Zero.pow(100)).toBe(ArbitraryNumber.Zero);
        });

        it("Zero ^ n throws for negative n (0⁻¹ is undefined)", () => {
            expect(() => ArbitraryNumber.Zero.pow(-1)).toThrow("Zero cannot be raised to a negative power");
            expect(() => ArbitraryNumber.Zero.pow(-3)).toThrow("Zero cannot be raised to a negative power");
        });

        it("x ^ 1 returns normalized x", () => {
            const result = an(2, 3).pow(1);
            expect(result.coefficient).toBe(2);
            expect(result.exponent).toBe(3);
        });

        it("squares: (2×10³)² = 4×10⁶", () => {
            const result = an(2, 3).pow(2);
            expect(result.coefficient).toBe(4);
            expect(result.exponent).toBe(6);
        });

        it("cubes: (2×10³)³ = 8×10⁹", () => {
            const result = an(2, 3).pow(3);
            expect(result.coefficient).toBe(8);
            expect(result.exponent).toBe(9);
        });

        it("normalizes when squared result coefficient ≥ 10", () => {
            // (5×10³)² = 25×10⁶ → 2.5×10⁷
            const result = an(5, 3).pow(2);
            expect(result.coefficient).toBeCloseTo(2.5, 10);
            expect(result.exponent).toBe(7);
        });

        it("handles negative integer exponent (reciprocal)", () => {
            // (2×10⁰)^-1 = 0.5×10⁰ → normalized: 5×10⁻¹
            const result = an(2, 0).pow(-1);
            expect(result.coefficient).toBe(5);
            expect(result.exponent).toBe(-1);
        });

        it("handles negative fractional result exponent", () => {
            // (5×10¹)^-1 = 0.2×10⁻¹ → 2×10⁻²
            const result = an(5, 1).pow(-1);
            expect(result.coefficient).toBe(2);
            expect(result.exponent).toBe(-2);
        });

        it("One ^ large n = One", () => {
            const result = ArbitraryNumber.One.pow(1_000_000);
            expect(result.coefficient).toBeCloseTo(1, 10);
            expect(result.exponent).toBe(0);
        });
    });

    // -----------------------------------------------------------------------
    // compareTo
    // -----------------------------------------------------------------------
    describe("compareTo", () => {
        it("returns 0 for equal normalized numbers", () => {
            expect(an(1.5, 3).compareTo(an(1.5, 3))).toBe(0);
        });

        it("returns 1 when this has a higher exponent", () => {
            expect(an(1.5, 4).compareTo(an(1.5, 3))).toBe(1);
        });

        it("returns -1 when this has a lower exponent", () => {
            expect(an(1.5, 3).compareTo(an(1.5, 4))).toBe(-1);
        });

        it("returns 1 when same exponent but higher coefficient", () => {
            expect(an(2.5, 3).compareTo(an(1.5, 3))).toBe(1);
        });

        it("returns -1 when same exponent but lower coefficient", () => {
            expect(an(1.5, 3).compareTo(an(2.5, 3))).toBe(-1);
        });

        it("exponent comparison takes priority over coefficient", () => {
            // 1×10⁴ > 9×10³ even though coefficient 1 < 9
            expect(an(1, 4).compareTo(an(9, 3))).toBe(1);
        });

        it("Zero compared to Zero returns 0", () => {
            expect(ArbitraryNumber.Zero.compareTo(ArbitraryNumber.Zero)).toBe(0);
        });

        it("One compared to Ten returns -1", () => {
            expect(ArbitraryNumber.One.compareTo(ArbitraryNumber.Ten)).toBe(-1);
        });

        it("negative is always less than positive regardless of exponent magnitude", () => {
            // −1×10⁴ = −10000 < 1×10³ = 1000
            expect(an(-1, 4).compareTo(an(1, 3))).toBe(-1);
        });

        it("positive is always greater than negative regardless of exponent magnitude", () => {
            expect(an(1, 3).compareTo(an(-1, 4))).toBe(1);
        });

        it("Zero is greater than any negative number", () => {
            expect(ArbitraryNumber.Zero.compareTo(an(-1, 3))).toBe(1);
        });

        it("any negative number is less than Zero", () => {
            expect(an(-1, 3).compareTo(ArbitraryNumber.Zero)).toBe(-1);
        });

        it("among two negatives, larger exponent means smaller value", () => {
            // −1×10⁴ = −10000 < −1×10³ = −1000
            expect(an(-1, 4).compareTo(an(-1, 3))).toBe(-1);
        });

        it("among two negatives, smaller exponent means greater value", () => {
            // −1×10³ = −1000 > −1×10⁴ = −10000
            expect(an(-1, 3).compareTo(an(-1, 4))).toBe(1);
        });

        it("among two negatives, same exponent compares coefficients normally", () => {
            // −2×10³ < −1×10³
            expect(an(-2, 3).compareTo(an(-1, 3))).toBe(-1);
            expect(an(-1, 3).compareTo(an(-2, 3))).toBe(1);
        });
    });

    // -----------------------------------------------------------------------
    // greaterThan / lessThan / equals
    // -----------------------------------------------------------------------
    describe("greaterThan", () => {
        it("returns true when strictly greater", () => {
            expect(an(1.5, 4).greaterThan(an(1.5, 3))).toBe(true);
        });

        it("returns false when equal", () => {
            expect(an(1.5, 3).greaterThan(an(1.5, 3))).toBe(false);
        });

        it("returns false when smaller", () => {
            expect(an(1.5, 3).greaterThan(an(1.5, 4))).toBe(false);
        });

        it("positive is greater than negative", () => {
            expect(an(1, 3).greaterThan(an(-1, 4))).toBe(true);
        });

        it("Zero is greater than a negative number", () => {
            expect(ArbitraryNumber.Zero.greaterThan(an(-1, 3))).toBe(true);
        });
    });

    describe("lessThan", () => {
        it("returns true when strictly smaller", () => {
            expect(an(1.5, 3).lessThan(an(1.5, 4))).toBe(true);
        });

        it("returns false when equal", () => {
            expect(an(1.5, 3).lessThan(an(1.5, 3))).toBe(false);
        });

        it("returns false when larger", () => {
            expect(an(1.5, 4).lessThan(an(1.5, 3))).toBe(false);
        });

        it("negative is less than positive", () => {
            expect(an(-1, 4).lessThan(an(1, 3))).toBe(true);
        });

        it("negative is less than Zero", () => {
            expect(an(-1, 3).lessThan(ArbitraryNumber.Zero)).toBe(true);
        });
    });

    describe("equals", () => {
        it("returns true when coefficient and exponent match", () => {
            expect(an(1.5, 3).equals(an(1.5, 3))).toBe(true);
        });

        it("returns false when exponents differ", () => {
            expect(an(1.5, 3).equals(an(1.5, 4))).toBe(false);
        });

        it("returns false when coefficients differ", () => {
            expect(an(1.5, 3).equals(an(2.5, 3))).toBe(false);
        });

        it("Zero equals Zero", () => {
            expect(ArbitraryNumber.Zero.equals(ArbitraryNumber.Zero)).toBe(true);
        });
    });

    // -----------------------------------------------------------------------
    // negate
    // -----------------------------------------------------------------------
    describe("negate", () => {
        it("negates a positive number", () => {
            const result = an(1.5, 3).negate();
            expect(result.coefficient).toBeCloseTo(-1.5, 10);
            expect(result.exponent).toBe(3);
        });

        it("negates a negative number back to positive", () => {
            const result = an(-1.5, 3).negate();
            expect(result.coefficient).toBeCloseTo(1.5, 10);
            expect(result.exponent).toBe(3);
        });

        it("negate of Zero returns Zero", () => {
            expect(ArbitraryNumber.Zero.negate()).toBe(ArbitraryNumber.Zero);
        });

        it("double negation returns the original value", () => {
            const x = an(1.5, 3);
            expect(x.negate().negate().equals(x)).toBe(true);
        });
    });

    // -----------------------------------------------------------------------
    // abs
    // -----------------------------------------------------------------------
    describe("abs", () => {
        it("abs of a positive number returns the same reference", () => {
            const x = an(1.5, 3);
            expect(x.abs()).toBe(x);
        });

        it("abs of a negative number returns the positive equivalent", () => {
            const result = an(-1.5, 3).abs();
            expect(result.coefficient).toBeCloseTo(1.5, 10);
            expect(result.exponent).toBe(3);
        });

        it("abs of Zero returns Zero", () => {
            expect(ArbitraryNumber.Zero.abs()).toBe(ArbitraryNumber.Zero);
        });

        it("abs of negate equals original", () => {
            const x = an(1.5, 3);
            expect(x.negate().abs().equals(x)).toBe(true);
        });
    });

    // -----------------------------------------------------------------------
    // greaterThanOrEqual / lessThanOrEqual
    // -----------------------------------------------------------------------
    describe("greaterThanOrEqual", () => {
        it("returns true when strictly greater", () => {
            expect(an(1.5, 4).greaterThanOrEqual(an(1.5, 3))).toBe(true);
        });

        it("returns true when equal", () => {
            expect(an(1.5, 3).greaterThanOrEqual(an(1.5, 3))).toBe(true);
        });

        it("returns false when smaller", () => {
            expect(an(1.5, 3).greaterThanOrEqual(an(1.5, 4))).toBe(false);
        });
    });

    describe("lessThanOrEqual", () => {
        it("returns true when strictly smaller", () => {
            expect(an(1.5, 3).lessThanOrEqual(an(1.5, 4))).toBe(true);
        });

        it("returns true when equal", () => {
            expect(an(1.5, 3).lessThanOrEqual(an(1.5, 3))).toBe(true);
        });

        it("returns false when larger", () => {
            expect(an(1.5, 4).lessThanOrEqual(an(1.5, 3))).toBe(false);
        });
    });

    // -----------------------------------------------------------------------
    // floor
    // -----------------------------------------------------------------------
    describe("floor", () => {
        it("floor of Zero returns ArbitraryNumber.Zero", () => {
            expect(ArbitraryNumber.Zero.floor()).toBe(ArbitraryNumber.Zero);
        });

        it("floor of a number with coefficient 0 returns Zero", () => {
            // any coefficient=0 is treated as zero by isZero
            expect(an(0, 5).floor()).toBe(ArbitraryNumber.Zero);
        });

        it("returns this when exponent equals PrecisionCutoff (15)", () => {
            const x = an(1.5, 15);
            expect(x.floor()).toBe(x);
        });

        it("returns this when exponent exceeds PrecisionCutoff", () => {
            const x = an(1.5, 100);
            expect(x.floor()).toBe(x);
        });

        it("positive fraction (exponent < 0) floors to Zero", () => {
            // 5×10⁻¹ = 0.5 → floor = 0
            expect(an(5, -1).floor().coefficient).toBe(0);
        });

        it("negative fraction (exponent < 0) floors to −1", () => {
            // −5×10⁻¹ = −0.5 → floor = −1
            const result = an(-5, -1).floor();
            expect(result.coefficient).toBe(-1);
            expect(result.exponent).toBe(0);
        });

        it("positive number with exponent = 0 floors the coefficient", () => {
            // 1.5×10⁰ = 1.5 → floor = 1
            const result = an(1.5, 0).floor();
            expect(result.coefficient).toBe(1);
            expect(result.exponent).toBe(0);
        });

        it("negative number with exponent = 0 floors down", () => {
            // −1.5×10⁰ = −1.5 → floor = −2
            const result = an(-1.5, 0).floor();
            expect(result.coefficient).toBe(-2);
            expect(result.exponent).toBe(0);
        });

        it("integer-valued number is unchanged", () => {
            // 1.5×10¹ = 15 (already an integer) → floor = 15 = 1.5×10¹
            const result = an(1.5, 1).floor();
            expect(result.coefficient).toBeCloseTo(1.5, 10);
            expect(result.exponent).toBe(1);
        });

        it("truncates the decimal part for non-integer", () => {
            // 1.57×10¹ = 15.7 → floor = 15 = 1.5×10¹
            const result = an(1.57, 1).floor();
            expect(result.coefficient).toBeCloseTo(1.5, 10);
            expect(result.exponent).toBe(1);
        });

        it("exponent = PrecisionCutoff − 1 is not treated as large (floors normally)", () => {
            // exponent=14 is just below cutoff; value is integer at that scale
            const x = an(1.5, 14);
            const result = x.floor();
            expect(result).not.toBe(x); // does NOT return early
            // 1.5×10¹⁴ is already an integer → floor leaves it unchanged
            expect(result.coefficient).toBeCloseTo(1.5, 5);
            expect(result.exponent).toBe(14);
        });
    });

    // -----------------------------------------------------------------------
    // ceil
    // -----------------------------------------------------------------------
    describe("ceil", () => {
        it("ceil of Zero returns ArbitraryNumber.Zero", () => {
            expect(ArbitraryNumber.Zero.ceil()).toBe(ArbitraryNumber.Zero);
        });

        it("ceil of a number with coefficient 0 returns Zero", () => {
            expect(an(0, 5).ceil()).toBe(ArbitraryNumber.Zero);
        });

        it("returns this when exponent equals PrecisionCutoff (15)", () => {
            const x = an(1.5, 15);
            expect(x.ceil()).toBe(x);
        });

        it("returns this when exponent exceeds PrecisionCutoff", () => {
            const x = an(1.5, 100);
            expect(x.ceil()).toBe(x);
        });

        it("positive fraction (exponent < 0) ceils to ArbitraryNumber.One", () => {
            // 5×10⁻¹ = 0.5 → ceil = 1
            expect(an(5, -1).ceil()).toBe(ArbitraryNumber.One);
        });

        it("negative fraction (exponent < 0) ceils to ArbitraryNumber.Zero", () => {
            // −5×10⁻¹ = −0.5 → ceil = 0
            expect(an(-5, -1).ceil()).toBe(ArbitraryNumber.Zero);
        });

        it("positive number with exponent = 0 ceils the coefficient", () => {
            // 1.5×10⁰ = 1.5 → ceil = 2
            const result = an(1.5, 0).ceil();
            expect(result.coefficient).toBe(2);
            expect(result.exponent).toBe(0);
        });

        it("negative number with exponent = 0 ceils toward zero", () => {
            // −1.5×10⁰ = −1.5 → ceil = −1
            const result = an(-1.5, 0).ceil();
            expect(result.coefficient).toBe(-1);
            expect(result.exponent).toBe(0);
        });

        it("integer-valued number is unchanged", () => {
            // 1.5×10¹ = 15 → ceil = 15 = 1.5×10¹
            const result = an(1.5, 1).ceil();
            expect(result.coefficient).toBeCloseTo(1.5, 10);
            expect(result.exponent).toBe(1);
        });

        it("rounds up the decimal part for non-integer", () => {
            // 1.57×10¹ = 15.7 → ceil = 16 = 1.6×10¹
            const result = an(1.57, 1).ceil();
            expect(result.coefficient).toBeCloseTo(1.6, 10);
            expect(result.exponent).toBe(1);
        });

        it("exponent = PrecisionCutoff − 1 is not treated as large (ceils normally)", () => {
            const x = an(1.5, 14);
            const result = x.ceil();
            expect(result).not.toBe(x);
            expect(result.coefficient).toBeCloseTo(1.5, 5);
            expect(result.exponent).toBe(14);
        });
    });

    // -----------------------------------------------------------------------
    // clamp
    // -----------------------------------------------------------------------
    describe("clamp", () => {
        const min = an(1, 3);  // 1×10³
        const max = an(2, 3);  // 2×10³

        it("returns value when within [min, max]", () => {
            const value = an(1.5, 3);
            expect(ArbitraryNumber.clamp(value, min, max)).toBe(value);
        });

        it("returns min when value is below range", () => {
            const value = an(5, 2); // 5×10² < 1×10³
            expect(ArbitraryNumber.clamp(value, min, max)).toBe(min);
        });

        it("returns max when value is above range", () => {
            const value = an(3, 3); // 3×10³ > 2×10³
            expect(ArbitraryNumber.clamp(value, min, max)).toBe(max);
        });

        it("returns value when value equals min", () => {
            expect(ArbitraryNumber.clamp(min, min, max)).toBe(min);
        });

        it("returns value when value equals max", () => {
            expect(ArbitraryNumber.clamp(max, min, max)).toBe(max);
        });

        it("clamps Zero to a positive range, returning min", () => {
            expect(ArbitraryNumber.clamp(ArbitraryNumber.Zero, min, max)).toBe(min);
        });
    });

    // -----------------------------------------------------------------------
    // log10
    // -----------------------------------------------------------------------
    describe("log10", () => {
        it("throws 'Logarithm of zero is undefined' for Zero", () => {
            expect(() => ArbitraryNumber.Zero.log10()).toThrow("Logarithm of zero is undefined");
        });

        it("throws for any number with coefficient 0", () => {
            expect(() => an(0, 5).log10()).toThrow("Logarithm of zero is undefined");
        });

        it("throws 'Logarithm of a negative number is undefined' for negative coefficient", () => {
            expect(() => an(-1.5, 3).log10()).toThrow("Logarithm of a negative number is undefined");
        });

        it("log10(One) = 0", () => {
            expect(ArbitraryNumber.One.log10()).toBeCloseTo(0, 10);
        });

        it("log10(Ten) = 1", () => {
            expect(ArbitraryNumber.Ten.log10()).toBeCloseTo(1, 10);
        });

        it("log10(1.5×10³) = log10(1.5) + 3", () => {
            expect(an(1.5, 3).log10()).toBeCloseTo(Math.log10(1.5) + 3, 10);
        });

        it("log10(1×10⁶) = 6", () => {
            expect(an(1, 6).log10()).toBeCloseTo(6, 10);
        });

        it("log10 with very large exponent", () => {
            expect(an(1, 1_000_000).log10()).toBeCloseTo(1_000_000, 10);
        });

        it("log10 with negative exponent", () => {
            // log10(5×10⁻¹) = log10(0.5) = log10(5) − 1
            expect(an(5, -1).log10()).toBeCloseTo(Math.log10(5) - 1, 10);
        });
    });

    // -----------------------------------------------------------------------
    // toString
    // -----------------------------------------------------------------------
    describe("toString", () => {
        it("uses scientificNotation with 2 decimal places by default", () => {
            expect(an(1.5, 12).toString()).toBe("1.50e+12");
        });

        it("Zero formats to 0.00 with default decimals", () => {
            expect(ArbitraryNumber.Zero.toString()).toBe("0.00");
        });

        it("One formats without exponent part", () => {
            expect(ArbitraryNumber.One.toString()).toBe("1.00");
        });

        it("Ten formats with e+1", () => {
            expect(ArbitraryNumber.Ten.toString()).toBe("1.00e+1");
        });

        it("formats negative exponent correctly", () => {
            expect(an(5, -1).toString()).toBe("5.00e-1");
        });

        it("decimals param overrides the default", () => {
            expect(an(1.5, 3).toString(scientificNotation, 4)).toBe("1.5000e+3");
            expect(an(1.5, 3).toString(scientificNotation, 0)).toBe("2e+3");
            expect(an(1.5, 3).toString(scientificNotation, 15)).toBe("1.500000000000000e+3");
        });

        it("accepts a custom NotationPlugin", () => {
            const custom: NotationPlugin = {
                format: (c, e, _d) => `${c}^${e}`,
            };
            expect(an(1.5, 3).toString(custom)).toBe("1.5^3");
        });

        it("passes 2 as the default decimals argument to the plugin", () => {
            let captured: number | undefined;
            const spy: NotationPlugin = {
                format: (_c, _e, d) => { captured = d; return ""; },
            };
            an(1.5, 3).toString(spy);
            expect(captured).toBe(2);
        });

        it("passes the explicit decimals argument to the plugin", () => {
            let captured: number | undefined;
            const spy: NotationPlugin = {
                format: (_c, _e, d) => { captured = d; return ""; },
            };
            an(1.5, 3).toString(spy, 5);
            expect(captured).toBe(5);
        });

        it("passes coefficient and exponent unchanged to the plugin", () => {
            let capturedC: number | undefined;
            let capturedE: number | undefined;
            const spy: NotationPlugin = {
                format: (c, e, _d) => { capturedC = c; capturedE = e; return ""; },
            };
            const n = an(1.5, 3);
            n.toString(spy);
            expect(capturedC).toBe(1.5);
            expect(capturedE).toBe(3);
        });
    });
});
