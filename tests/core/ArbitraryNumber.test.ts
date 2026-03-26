import { describe, it, expect } from "vitest";
import { ArbitraryNumber } from "../../src/core/ArbitraryNumber";
import { an } from "../../src/core/an";
import { scientificNotation } from "../../src/plugin/ScientificNotation";
import { NotationPlugin } from "../../src/types/plugin";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Constructs an ArbitraryNumber from a plain JS number via normalisation. */
const num = (v: number) => ArbitraryNumber.from(v);

/** Constructs an ArbitraryNumber with an explicit coefficient and exponent. */
const raw = (c: number, e: number) => new ArbitraryNumber(c, e);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ArbitraryNumber", () => {

    // -----------------------------------------------------------------------
    // Representation invariant
    // -----------------------------------------------------------------------
    describe("representation invariant", () => {
        it("an() shorthand creates normalized instances", () => {
            expect(an(1500).equals(num(1500))).toBe(true);
            expect(an(15, 3).equals(raw(1.5, 4))).toBe(true);
        });

        it("an.from() shorthand mirrors ArbitraryNumber.from", () => {
            expect(an.from(1500).equals(ArbitraryNumber.from(1500))).toBe(true);
        });

        it("coefficient is always in [1, 10) for any non-zero input", () => {
            for (const v of [1, 999, 1500, 0.003, 1e20, 7.77, 0.1]) {
                const n = num(v);
                expect(Math.abs(n.coefficient)).toBeGreaterThanOrEqual(1);
                expect(Math.abs(n.coefficient)).toBeLessThan(10);
            }
        });

        it("zero is always stored as coefficient=0, exponent=0 regardless of constructor input", () => {
            expect(num(0).coefficient).toBe(0);
            expect(num(0).exponent).toBe(0);
            expect(raw(0, 999).coefficient).toBe(0);
            expect(raw(0, 999).exponent).toBe(0);
        });

        it("constructor normalises 15 × 10³ → 1.5 × 10⁴", () => {
            const n = raw(15, 3);
            expect(n.coefficient).toBeCloseTo(1.5, 10);
            expect(n.exponent).toBe(4);
        });

        it("negative numbers have coefficient in (−10, −1]", () => {
            const n = num(-1500);
            expect(n.coefficient).toBeCloseTo(-1.5, 10);
            expect(n.exponent).toBe(3);
        });

        it("from() and new ArbitraryNumber produce the same normalised value", () => {
            expect(num(1500).equals(raw(1.5, 3))).toBe(true);
            expect(num(0.005).equals(raw(5, -3))).toBe(true);
        });

        it("from() throws for non-finite input", () => {
            expect(() => num(Infinity)).toThrow();
            expect(() => num(-Infinity)).toThrow();
            expect(() => num(NaN)).toThrow();
        });
    });

    // -----------------------------------------------------------------------
    // Identity elements
    // -----------------------------------------------------------------------
    describe("identity elements", () => {
        it("Zero is the additive identity: a + 0 = a and 0 + a = a", () => {
            const a = num(1500);
            expect(a.add(ArbitraryNumber.Zero).equals(a)).toBe(true);
            expect(ArbitraryNumber.Zero.add(a).equals(a)).toBe(true);
        });

        it("One is the multiplicative identity: a × 1 = a and 1 × a = a", () => {
            const a = num(1500);
            expect(a.mul(ArbitraryNumber.One).equals(a)).toBe(true);
            expect(ArbitraryNumber.One.mul(a).equals(a)).toBe(true);
        });

        it("Zero is the multiplicative absorber: a × 0 = 0 and 0 × a = 0", () => {
            const a = num(1500);
            expect(a.mul(ArbitraryNumber.Zero).equals(ArbitraryNumber.Zero)).toBe(true);
            expect(ArbitraryNumber.Zero.mul(a).equals(ArbitraryNumber.Zero)).toBe(true);
        });
    });

    // -----------------------------------------------------------------------
    // Addition
    // -----------------------------------------------------------------------
    describe("addition", () => {
        it("is commutative: a + b = b + a", () => {
            const a = num(1500);
            const b = num(250);
            expect(a.add(b).equals(b.add(a))).toBe(true);
        });

        it("is associative: (a + b) + c = a + (b + c)", () => {
            const a = num(1000);
            const b = num(500);
            const c = num(250);
            expect(a.add(b).add(c).equals(a.add(b.add(c)))).toBe(true);
        });

        it("additive inverse: a + (−a) = 0", () => {
            const a = num(1500);
            expect(a.add(a.negate()).equals(ArbitraryNumber.Zero)).toBe(true);
        });

        it("1500 + 2500 = 4000", () => {
            expect(num(1500).add(num(2500)).equals(num(4000))).toBe(true);
        });

        it("sum normalises correctly when coefficient overflows: 9500 + 1500 = 11000", () => {
            expect(num(9500).add(num(1500)).equals(num(11000))).toBe(true);
        });

        it("different scales: 15000 + 2500 = 17500", () => {
            expect(num(15000).add(num(2500)).equals(num(17500))).toBe(true);
        });

        it("negative + negative: −1500 + −2500 = −4000", () => {
            expect(num(-1500).add(num(-2500)).equals(num(-4000))).toBe(true);
        });

        it("positive + negative (positive dominates): 3000 + (−1000) = 2000", () => {
            expect(num(3000).add(num(-1000)).equals(num(2000))).toBe(true);
        });

        it("numbers at vastly different scales: the smaller operand is negligible", () => {
            // 1 × 10²⁰ dwarfs 1 × 10⁰ by 20 orders of magnitude
            const huge = raw(1, 20);
            const tiny = raw(1, 0);
            expect(huge.add(tiny).equals(huge)).toBe(true);
        });

        it("numbers exactly at the precision boundary both contribute to the sum", () => {
            // exponent diff = PrecisionCutoff exactly → both operands are included
            const a = raw(1, 18);
            const b = raw(1, 3);
            expect(a.add(b).greaterThan(a)).toBe(true);
        });
    });

    // -----------------------------------------------------------------------
    // Subtraction
    // -----------------------------------------------------------------------
    describe("subtraction", () => {
        it("a − b = a + (−b)", () => {
            const a = num(4000);
            const b = num(1500);
            expect(a.sub(b).equals(a.add(b.negate()))).toBe(true);
        });

        it("a − a = 0", () => {
            const a = num(1500);
            expect(a.sub(a).equals(ArbitraryNumber.Zero)).toBe(true);
        });

        it("a − 0 = a", () => {
            const a = num(1500);
            expect(a.sub(ArbitraryNumber.Zero).equals(a)).toBe(true);
        });

        it("0 − a = −a", () => {
            const a = num(1500);
            expect(ArbitraryNumber.Zero.sub(a).equals(a.negate())).toBe(true);
        });

        it("4000 − 1500 = 2500", () => {
            expect(num(4000).sub(num(1500)).equals(num(2500))).toBe(true);
        });

        it("smaller − larger produces a negative result: 1500 − 3500 = −2000", () => {
            expect(num(1500).sub(num(3500)).equals(num(-2000))).toBe(true);
        });
    });

    // -----------------------------------------------------------------------
    // Multiplication
    // -----------------------------------------------------------------------
    describe("multiplication", () => {
        it("is commutative: a × b = b × a", () => {
            const a = num(1500);
            const b = num(250);
            expect(a.mul(b).equals(b.mul(a))).toBe(true);
        });

        it("is associative: (a × b) × c = a × (b × c)", () => {
            const a = num(2);
            const b = num(3);
            const c = num(4);
            expect(a.mul(b).mul(c).equals(a.mul(b.mul(c)))).toBe(true);
        });

        it("2000 × 3000 = 6 000 000", () => {
            expect(num(2000).mul(num(3000)).equals(num(6_000_000))).toBe(true);
        });

        it("product normalises when coefficient overflows: 5000 × 3000 = 15 000 000", () => {
            expect(num(5000).mul(num(3000)).equals(num(15_000_000))).toBe(true);
        });

        it("negative × positive = negative", () => {
            expect(num(-2000).mul(num(3000)).equals(num(-6_000_000))).toBe(true);
        });

        it("negative × negative = positive", () => {
            expect(num(-2000).mul(num(-3000)).equals(num(6_000_000))).toBe(true);
        });

        it("10 × 10 = 100", () => {
            expect(ArbitraryNumber.Ten.mul(ArbitraryNumber.Ten).equals(num(100))).toBe(true);
        });
    });

    // -----------------------------------------------------------------------
    // Division
    // -----------------------------------------------------------------------
    describe("division", () => {
        it("(a × b) / b = a", () => {
            const a = num(1500);
            const b = num(250);
            expect(a.mul(b).div(b).equals(a)).toBe(true);
        });

        it("a / a = 1", () => {
            expect(num(1500).div(num(1500)).equals(ArbitraryNumber.One)).toBe(true);
        });

        it("a / 1 = a", () => {
            const a = num(1500);
            expect(a.div(ArbitraryNumber.One).equals(a)).toBe(true);
        });

        it("6 000 000 / 3000 = 2000", () => {
            expect(num(6_000_000).div(num(3000)).equals(num(2000))).toBe(true);
        });

        it("division producing a negative exponent: 1 / 10 = 0.1", () => {
            expect(ArbitraryNumber.One.div(ArbitraryNumber.Ten).equals(raw(1, -1))).toBe(true);
        });

        it("0 / a = 0 for any non-zero a", () => {
            expect(ArbitraryNumber.Zero.div(num(1500)).equals(ArbitraryNumber.Zero)).toBe(true);
        });

        it("throws on division by zero", () => {
            expect(() => num(1500).div(ArbitraryNumber.Zero)).toThrow("Division by zero");
        });
    });

    // -----------------------------------------------------------------------
    // Power
    // -----------------------------------------------------------------------
    describe("power", () => {
        it("a^0 = 1 for all a, including 0^0 = 1 by convention", () => {
            expect(num(1500).pow(0).equals(ArbitraryNumber.One)).toBe(true);
            expect(ArbitraryNumber.Zero.pow(0).equals(ArbitraryNumber.One)).toBe(true);
        });

        it("a^1 = a", () => {
            const a = num(1500);
            expect(a.pow(1).equals(a)).toBe(true);
        });

        it("exponent addition law: a^m × a^n = a^(m+n)", () => {
            const a = num(3);
            expect(a.pow(2).mul(a.pow(3)).equals(a.pow(5))).toBe(true);
        });

        it("product-to-power law: (a × b)^n = a^n × b^n", () => {
            const a = num(2);
            const b = num(3);
            expect(a.mul(b).pow(3).equals(a.pow(3).mul(b.pow(3)))).toBe(true);
        });

        it("a^−1 is the multiplicative inverse: a × a^−1 = 1", () => {
            const a = num(4);
            expect(a.mul(a.pow(-1)).equals(ArbitraryNumber.One)).toBe(true);
        });

        it("0^n = 0 for all n > 0", () => {
            expect(ArbitraryNumber.Zero.pow(5).equals(ArbitraryNumber.Zero)).toBe(true);
        });

        it("0^n throws for n < 0 (division by zero)", () => {
            expect(() => ArbitraryNumber.Zero.pow(-1)).toThrow();
        });

        it("1^n = 1 for all n (including very large n)", () => {
            expect(ArbitraryNumber.One.pow(1_000_000).equals(ArbitraryNumber.One)).toBe(true);
        });
    });

    // -----------------------------------------------------------------------
    // Comparison — total order
    // -----------------------------------------------------------------------
    describe("comparison", () => {
        it("is antisymmetric: a > b ↔ b < a", () => {
            const a = num(2000);
            const b = num(1000);
            expect(a.greaterThan(b)).toBe(true);
            expect(b.lessThan(a)).toBe(true);
            expect(b.greaterThan(a)).toBe(false);
            expect(a.lessThan(b)).toBe(false);
        });

        it("is transitive: a > b and b > c implies a > c", () => {
            const a = num(3000);
            const b = num(2000);
            const c = num(1000);
            expect(a.greaterThan(b) && b.greaterThan(c) && a.greaterThan(c)).toBe(true);
        });

        it("compareTo is antisymmetric: sign(a.compareTo(b)) = −sign(b.compareTo(a))", () => {
            const a = num(3000);
            const b = num(1000);
            expect(Math.sign(a.compareTo(b))).toBe(-Math.sign(b.compareTo(a)));
        });

        it("compareTo returns 0 for equal values", () => {
            expect(num(1500).compareTo(num(1500))).toBe(0);
            expect(ArbitraryNumber.Zero.compareTo(ArbitraryNumber.Zero)).toBe(0);
        });

        it("magnitude (exponent) dominates: 1 × 10⁴ > 9 × 10³", () => {
            expect(raw(1, 4).greaterThan(raw(9, 3))).toBe(true);
        });

        it("positive > zero > negative", () => {
            expect(num(1).greaterThan(ArbitraryNumber.Zero)).toBe(true);
            expect(ArbitraryNumber.Zero.greaterThan(num(-1))).toBe(true);
            expect(num(1).greaterThan(num(-1))).toBe(true);
        });

        it("among negatives, larger magnitude = smaller value: −10000 < −1000", () => {
            expect(num(-10000).lessThan(num(-1000))).toBe(true);
        });

        it("Zero is less than a positive fraction (negative exponent)", () => {
            // Regression: Zero { exp:0 } vs 0.5 { exp:-1 } — exponent 0 > -1 must NOT
            // incorrectly declare Zero as greater.
            expect(ArbitraryNumber.Zero.lessThan(raw(5, -1))).toBe(true);
            expect(raw(5, -1).greaterThan(ArbitraryNumber.Zero)).toBe(true);
            expect(ArbitraryNumber.Zero.compareTo(raw(5, -1))).toBe(-1);
            expect(raw(5, -1).compareTo(ArbitraryNumber.Zero)).toBe(1);
        });

        it("Zero is greater than a negative fraction", () => {
            expect(ArbitraryNumber.Zero.greaterThan(raw(-5, -1))).toBe(true);
            expect(raw(-5, -1).lessThan(ArbitraryNumber.Zero)).toBe(true);
        });

        it("Zero equals Zero via compareTo", () => {
            expect(ArbitraryNumber.Zero.compareTo(ArbitraryNumber.Zero)).toBe(0);
            expect(ArbitraryNumber.Zero.equals(ArbitraryNumber.Zero)).toBe(true);
        });
    });

    // -----------------------------------------------------------------------
    // Negate and abs
    // -----------------------------------------------------------------------
    describe("negate and abs", () => {
        it("double negation: −(−a) = a", () => {
            const a = num(1500);
            expect(a.negate().negate().equals(a)).toBe(true);
        });

        it("|a| ≥ 0 for all a", () => {
            expect(num(1500).abs().greaterThanOrEqual(ArbitraryNumber.Zero)).toBe(true);
            expect(num(-1500).abs().greaterThanOrEqual(ArbitraryNumber.Zero)).toBe(true);
        });

        it("|a| = |−a|", () => {
            const a = num(1500);
            expect(a.abs().equals(a.negate().abs())).toBe(true);
        });

        it("|a × b| = |a| × |b|", () => {
            const a = num(-2000);
            const b = num(-3000);
            expect(a.mul(b).abs().equals(a.abs().mul(b.abs()))).toBe(true);
        });

        it("negate of Zero is Zero", () => {
            expect(ArbitraryNumber.Zero.negate().equals(ArbitraryNumber.Zero)).toBe(true);
        });
    });

    // -----------------------------------------------------------------------
    // Floor and ceil
    // -----------------------------------------------------------------------
    describe("floor and ceil", () => {
        it("floor(a) ≤ a ≤ ceil(a) for any value", () => {
            for (const a of [num(1.7), num(1.3), raw(1.57, 1), raw(9.99, 2)]) {
                expect(a.floor().lessThanOrEqual(a)).toBe(true);
                expect(a.ceil().greaterThanOrEqual(a)).toBe(true);
            }
        });

        it("floor(n) = ceil(n) = n for integer-valued numbers", () => {
            expect(num(1500).floor().equals(num(1500))).toBe(true);
            expect(num(1500).ceil().equals(num(1500))).toBe(true);
        });

        it("ceil(a) = floor(a) + 1 for non-integer a", () => {
            const a = raw(1.5, 0); // 1.5
            expect(a.ceil().equals(a.floor().add(ArbitraryNumber.One))).toBe(true);
        });

        it("floor of a positive fraction (0.5) = 0", () => {
            expect(raw(5, -1).floor().equals(ArbitraryNumber.Zero)).toBe(true);
        });

        it("ceil of a positive fraction (0.5) = 1", () => {
            expect(raw(5, -1).ceil().equals(ArbitraryNumber.One)).toBe(true);
        });

        it("floor of a negative fraction (−0.5) = −1", () => {
            expect(raw(-5, -1).floor().equals(raw(-1, 0))).toBe(true);
        });

        it("ceil of a negative fraction (−0.5) = 0", () => {
            expect(raw(-5, -1).ceil().equals(ArbitraryNumber.Zero)).toBe(true);
        });
    });

    // -----------------------------------------------------------------------
    // log10
    // -----------------------------------------------------------------------
    describe("log10", () => {
        it("log10(1) = 0", () => {
            expect(ArbitraryNumber.One.log10()).toBeCloseTo(0, 10);
        });

        it("log10(10) = 1", () => {
            expect(ArbitraryNumber.Ten.log10()).toBeCloseTo(1, 10);
        });

        it("product rule: log10(a × b) = log10(a) + log10(b)", () => {
            const a = num(200);
            const b = num(500);
            expect(a.mul(b).log10()).toBeCloseTo(a.log10() + b.log10(), 10);
        });

        it("power rule: log10(a^n) = n × log10(a)", () => {
            const a = num(10);
            expect(a.pow(5).log10()).toBeCloseTo(5 * a.log10(), 10);
        });

        it("log10 with very large exponent stays accurate", () => {
            expect(raw(1, 1_000_000).log10()).toBeCloseTo(1_000_000, 10);
        });

        it("throws for zero (logarithm of zero is undefined)", () => {
            expect(() => ArbitraryNumber.Zero.log10()).toThrow();
        });

        it("throws for negative numbers (logarithm of negatives is undefined in reals)", () => {
            expect(() => num(-1500).log10()).toThrow();
        });
    });

    // -----------------------------------------------------------------------
    // clamp
    // -----------------------------------------------------------------------
    describe("clamp", () => {
        const lo = num(1000);
        const hi = num(2000);

        it("clamped value is always in [lo, hi]", () => {
            for (const v of [500, 1000, 1500, 2000, 3000]) {
                const clamped = ArbitraryNumber.clamp(num(v), lo, hi);
                expect(clamped.greaterThanOrEqual(lo)).toBe(true);
                expect(clamped.lessThanOrEqual(hi)).toBe(true);
            }
        });

        it("value within range is returned unchanged", () => {
            expect(ArbitraryNumber.clamp(num(1500), lo, hi).equals(num(1500))).toBe(true);
        });

        it("value below lo returns lo", () => {
            expect(ArbitraryNumber.clamp(num(500), lo, hi).equals(lo)).toBe(true);
        });

        it("value above hi returns hi", () => {
            expect(ArbitraryNumber.clamp(num(3000), lo, hi).equals(hi)).toBe(true);
        });
    });

    // -----------------------------------------------------------------------
    // toString
    // -----------------------------------------------------------------------
    describe("toString", () => {
        it("defaults to scientific notation with 2 decimal places", () => {
            expect(raw(1.5, 12).toString()).toBe("1.50e+12");
        });

        it("Zero formats correctly", () => {
            expect(ArbitraryNumber.Zero.toString()).toBe("0.00");
        });

        it("decimals parameter controls output precision", () => {
            expect(raw(1.5, 3).toString(scientificNotation, 4)).toBe("1.5000e+3");
            expect(raw(1.5, 3).toString(scientificNotation, 0)).toBe("2e+3");
        });

        it("passes coefficient and exponent unchanged to the plugin", () => {
            let capturedC: number | undefined;
            let capturedE: number | undefined;
            const spy: NotationPlugin = {
                format: (c, e) => { capturedC = c; capturedE = e; return ""; },
            };
            raw(1.5, 3).toString(spy);
            expect(capturedC).toBe(1.5);
            expect(capturedE).toBe(3);
        });

        it("accepts any NotationPlugin", () => {
            const custom: NotationPlugin = { format: (c, e) => `${c}×10^${e}` };
            expect(raw(1.5, 3).toString(custom)).toBe("1.5×10^3");
        });
    });
});
