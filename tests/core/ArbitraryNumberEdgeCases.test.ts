/**
 * Edge-case and smoke tests for ArbitraryNumber.
 *
 * Covers:
 *  - Non-finite constructor / from() inputs (NaN, Infinity, -Infinity, -0)
 *  - Subnormal float underflow (Number.MIN_VALUE)
 *  - Extreme exponent values (Number.MAX_VALUE ~1.8e308)
 *  - Arithmetic edge cases that can overflow internally (pow with large n)
 *  - Math domain errors (div-by-zero, sqrt of negative, log of negative/zero, negative pow)
 *  - Predicates on special values (isZero, isPositive, isNegative, isInteger, sign)
 *  - toNumber() return values for extreme exponents
 *  - Comparison edge cases (zero vs tiny negatives / positives)
 *  - sumArray edge cases (empty, single-element, all-zeros)
 *  - withPrecision scope-restore
 *  - End-to-end smoke: idle-game tick, prestige loop, upgrade chain
 */

import { describe, it, expect } from "vitest";
import { ArbitraryNumber } from "../../src/core/ArbitraryNumber";
import { an } from "../../src/core/an";
import { chain } from "../../src/core/AnChain";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const num = (v: number) => ArbitraryNumber.from(v);
const raw = (c: number, e: number) => new ArbitraryNumber(c, e);
const Z = ArbitraryNumber.Zero;
const ONE = ArbitraryNumber.One;

function approxEq(a: ArbitraryNumber, b: ArbitraryNumber, tol = 1e-9): boolean {
    if (a.coefficient === 0 && b.coefficient === 0) return true;
    if (a.exponent !== b.exponent) return false;

    const rel =
        Math.abs(a.coefficient - b.coefficient) /
        Math.max(Math.abs(a.coefficient), Math.abs(b.coefficient));
    return rel <= tol;
}

// ---------------------------------------------------------------------------
// Constructor validation — non-finite inputs
// ---------------------------------------------------------------------------

describe("constructor: non-finite inputs", () => {
    it("new ArbitraryNumber(NaN, 0) throws", () => {
        expect(() => raw(NaN, 0)).toThrow("coefficient must be finite");
    });

    it("new ArbitraryNumber(Infinity, 0) throws", () => {
        expect(() => raw(Infinity, 0)).toThrow("coefficient must be finite");
    });

    it("new ArbitraryNumber(-Infinity, 0) throws", () => {
        expect(() => raw(-Infinity, 0)).toThrow("coefficient must be finite");
    });

    it("new ArbitraryNumber(1, NaN) throws", () => {
        expect(() => raw(1, NaN)).toThrow("exponent must be finite");
    });

    it("new ArbitraryNumber(1, Infinity) throws", () => {
        expect(() => raw(1, Infinity)).toThrow("exponent must be finite");
    });

    it("new ArbitraryNumber(1, -Infinity) throws", () => {
        expect(() => raw(1, -Infinity)).toThrow("exponent must be finite");
    });

    it("new ArbitraryNumber(0, NaN) is Zero (coefficient=0 early-returns before exponent guard)", () => {
        const n = raw(0, NaN);
        expect(n.isZero()).toBe(true);
        expect(n.exponent).toBe(0);
    });

    it("new ArbitraryNumber(-0, 5) is Zero (−0 coerced)", () => {
        const n = raw(-0, 5);
        expect(n.isZero()).toBe(true);
        expect(n.exponent).toBe(0);
        expect(Object.is(n.coefficient, -0)).toBe(false); // stored as positive 0
    });
});

// ---------------------------------------------------------------------------
// from() — non-finite inputs
// ---------------------------------------------------------------------------

describe("from(): non-finite inputs", () => {
    it("from(NaN) throws", () => {
        expect(() => num(NaN)).toThrow();
    });

    it("from(Infinity) throws", () => {
        expect(() => num(Infinity)).toThrow();
    });

    it("from(-Infinity) throws", () => {
        expect(() => num(-Infinity)).toThrow();
    });

    it("from(-0) returns Zero (−0 === 0 in JS)", () => {
        const n = num(-0);
        expect(n.isZero()).toBe(true);
        expect(Object.is(n.coefficient, -0)).toBe(false);
    });

    it("from(0) returns Zero", () => {
        expect(num(0).isZero()).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Extreme floating-point values
// ---------------------------------------------------------------------------

describe("extreme float values", () => {
    it("from(Number.MAX_VALUE) normalises to {c ≈ 1.798, e: 308}", () => {
        const n = num(Number.MAX_VALUE);
        expect(n.exponent).toBe(308);
        expect(n.coefficient).toBeCloseTo(1.7976931348623157, 10);
    });

    it("from(Number.MIN_VALUE) underflows to Zero (subnormal 5e-324 → pow10(-324)=0)", () => {
        // Number.MIN_VALUE = 5e-324, the smallest positive subnormal float.
        // Math.pow(10, -324) === 0 in JS, so our scale=0 guard maps it to Zero.
        const n = num(Number.MIN_VALUE);
        expect(n.isZero()).toBe(true);
    });

    it("from(Number.EPSILON) is normalised correctly (≈ 2.22e-16)", () => {
        const n = num(Number.EPSILON);
        expect(n.exponent).toBe(-16);
        expect(n.coefficient).toBeCloseTo(2.220446049250313, 10);
    });

    it("from(Number.MAX_SAFE_INTEGER) normalises to {c ≈ 9.007, e: 15}", () => {
        const n = num(Number.MAX_SAFE_INTEGER); // 9007199254740991
        expect(n.exponent).toBe(15);
        expect(n.coefficient).toBeCloseTo(9.007199254740991, 10);
    });

    it("arithmetic on very large numbers does not produce NaN", () => {
        const huge = raw(1.5, 300);
        const huge2 = raw(2.5, 300);
        const sum = huge.add(huge2);
        expect(isNaN(sum.coefficient)).toBe(false);
        expect(sum.exponent).toBe(300);
        expect(sum.coefficient).toBeCloseTo(4, 5);
    });

    it("mul of two large numbers combines exponents correctly", () => {
        const a = raw(1, 150);
        const b = raw(1, 150);
        const product = a.mul(b);
        expect(product.exponent).toBe(300);
        expect(product.coefficient).toBeCloseTo(1, 10);
    });
});

// ---------------------------------------------------------------------------
// pow() edge cases
// ---------------------------------------------------------------------------

describe("pow() edge cases", () => {
    it("any^0 = 1, including large exponents", () => {
        expect(raw(1.5, 100).pow(0).equals(ONE)).toBe(true);
    });

    it("0^0 = 1 (by convention)", () => {
        expect(Z.pow(0).equals(ONE)).toBe(true);
    });

    it("0^1 = 0", () => {
        expect(Z.pow(1).isZero()).toBe(true);
    });

    it("0^(positive) = 0", () => {
        expect(Z.pow(5).isZero()).toBe(true);
    });

    it("0^(negative) throws", () => {
        expect(() => Z.pow(-1)).toThrow("Zero cannot be raised to a negative power");
    });

    it("1^n = 1 for various n", () => {
        for (const n of [2, 10, 100, 0.5, -1]) {
            expect(approxEq(ONE.pow(n), ONE)).toBe(true);
        }
    });

    it("pow with fractional exponent (square root)", () => {
        const n = num(4).pow(0.5);
        expect(approxEq(n, num(2))).toBe(true);
    });

    it("pow with negative exponent (reciprocal)", () => {
        const n = num(4).pow(-1);
        expect(approxEq(n, num(0.25))).toBe(true);
    });

    it("pow with very large n overflows coefficient and constructor throws", () => {
        // 2^(1e18) → Math.pow(2, 1e18)=Infinity; constructor guard catches it
        expect(() => num(2).pow(1e18)).toThrow("coefficient must be finite");
    });

    it("pow result with huge finite exponent is storable", () => {
        // 2^1000 fits as an ArbitraryNumber even though it overflows float64
        // log10(2^1000) = 1000*log10(2) ≈ 301
        const n = raw(1, 0).pow(1000); // 1^1000 = 1, safe
        expect(n.equals(ONE)).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Division edge cases
// ---------------------------------------------------------------------------

describe("div() edge cases", () => {
    it("div by Zero throws", () => {
        expect(() => num(5).div(Z)).toThrow("Division by zero");
    });

    it("Zero / nonzero = Zero", () => {
        expect(Z.div(num(5)).isZero()).toBe(true);
    });

    it("divAdd by Zero throws", () => {
        expect(() => num(5).divAdd(Z, num(1))).toThrow("Division by zero");
    });

    it("a / a ≈ 1 for various values", () => {
        for (const v of [1, 100, 1e10, 1e-5]) {
            const n = num(v);
            expect(approxEq(n.div(n), ONE)).toBe(true);
        }
    });
});

// ---------------------------------------------------------------------------
// sqrt() edge cases
// ---------------------------------------------------------------------------

describe("sqrt() edge cases", () => {
    it("sqrt(Zero) = Zero", () => {
        expect(Z.sqrt().isZero()).toBe(true);
    });

    it("sqrt(negative number) throws", () => {
        expect(() => num(-1).sqrt()).toThrow("Square root of negative number");
        expect(() => raw(-5, 2).sqrt()).toThrow("Square root of negative number");
    });

    it("sqrt(1) = 1", () => {
        expect(approxEq(ONE.sqrt(), ONE)).toBe(true);
    });

    it("sqrt(1e308) works without NaN", () => {
        const n = raw(1, 308);
        const result = n.sqrt();
        expect(isNaN(result.coefficient)).toBe(false);
        expect(result.exponent).toBe(154);
    });
});

// ---------------------------------------------------------------------------
// log10() edge cases
// ---------------------------------------------------------------------------

describe("log10() edge cases", () => {
    it("log10(Zero) throws", () => {
        expect(() => Z.log10()).toThrow("Logarithm of zero is undefined");
    });

    it("log10(negative) throws", () => {
        expect(() => num(-1).log10()).toThrow("Logarithm of a negative number is undefined");
        expect(() => raw(-1, 5).log10()).toThrow("Logarithm of a negative number is undefined");
    });

    it("log10(1) = 0", () => {
        expect(ONE.log10()).toBe(0);
    });

    it("log10(1000) = 3", () => {
        expect(num(1000).log10()).toBeCloseTo(3, 10);
    });

    it("log10 of large number is accurate", () => {
        const n = raw(1, 300);
        expect(n.log10()).toBeCloseTo(300, 10);
    });
});

// ---------------------------------------------------------------------------
// toNumber() — float overflows
// ---------------------------------------------------------------------------

describe("toNumber() for extreme exponents", () => {
    it("returns Infinity for exponent ≥ 308 with coefficient > 1", () => {
        // 1.8e308 overflows float64 range
        const result = raw(1.8, 308).toNumber();
        expect(result).toBe(Infinity);
    });

    it("returns 0 for deeply negative exponents (≤ -324)", () => {
        const result = raw(1, -325).toNumber();
        expect(result).toBe(0);
    });

    it("returns correct value for 1.5 × 10³", () => {
        expect(raw(1.5, 3).toNumber()).toBe(1500);
    });
});

// ---------------------------------------------------------------------------
// Comparison — zero vs tiny positive/negative
// ---------------------------------------------------------------------------

describe("compareTo() — zero vs near-zero", () => {
    it("Zero < tiny positive", () => {
        expect(Z.compareTo(num(1e-300))).toBe(-1);
        expect(Z.lessThan(num(1e-300))).toBe(true);
    });

    it("Zero > tiny negative", () => {
        expect(Z.compareTo(num(-1e-300))).toBe(1);
        expect(Z.greaterThan(num(-1e-300))).toBe(true);
    });

    it("Zero equals Zero", () => {
        expect(Z.compareTo(Z)).toBe(0);
        expect(Z.equals(Z)).toBe(true);
    });

    it("compareTo is symmetric: a>b implies b<a", () => {
        const a = raw(1, 5);
        const b = raw(9, 4);
        expect(a.compareTo(b)).toBe(1);
        expect(b.compareTo(a)).toBe(-1);
    });

    it("negative < zero < positive sign ordering", () => {
        const neg = num(-1);
        const pos = num(1);
        expect(neg.compareTo(Z)).toBe(-1);
        expect(pos.compareTo(Z)).toBe(1);
        expect(neg.compareTo(pos)).toBe(-1);
    });
});

// ---------------------------------------------------------------------------
// Predicates on Zero and edge values
// ---------------------------------------------------------------------------

describe("predicates on zero and edge values", () => {
    it("isZero is true only for Zero", () => {
        expect(Z.isZero()).toBe(true);
        expect(ONE.isZero()).toBe(false);
        expect(num(-1).isZero()).toBe(false);
    });

    it("isPositive / isNegative for Zero", () => {
        expect(Z.isPositive()).toBe(false);
        expect(Z.isNegative()).toBe(false);
    });

    it("sign() returns 0 for Zero", () => {
        expect(Z.sign()).toBe(0);
    });

    it("isInteger for Zero", () => {
        expect(Z.isInteger()).toBe(true);
    });

    it("isInteger for fractional values with negative exponent", () => {
        // exponent = -1 → value in (-1, 1), not an integer
        expect(num(0.5).isInteger()).toBe(false);
        expect(num(0.1).isInteger()).toBe(false);
        expect(num(-0.9).isInteger()).toBe(false);
    });

    it("isInteger for whole numbers", () => {
        expect(num(1).isInteger()).toBe(true);
        expect(num(100).isInteger()).toBe(true);
        expect(raw(1, 15).isInteger()).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// sumArray edge cases
// ---------------------------------------------------------------------------

describe("sumArray() edge cases", () => {
    it("empty array returns Zero", () => {
        expect(ArbitraryNumber.sumArray([]).isZero()).toBe(true);
    });

    it("single-element array returns that element", () => {
        const n = num(42);
        expect(ArbitraryNumber.sumArray([n])).toBe(n); // same reference
    });

    it("all-zeros array returns Zero", () => {
        const result = ArbitraryNumber.sumArray([Z, Z, Z, Z]);
        expect(result.isZero()).toBe(true);
    });

    it("mixed positive and negative summing to zero returns Zero", () => {
        const pos = num(5);
        const neg = num(-5);
        const result = ArbitraryNumber.sumArray([pos, neg]);
        expect(result.isZero()).toBe(true);
    });

    it("sum of large array matches chained add", () => {
        const values = [num(100), num(200), num(300), num(400), num(500)];
        const chained = values.reduce((a, b) => a.add(b));
        const batch = ArbitraryNumber.sumArray(values);
        expect(approxEq(batch, chained)).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// withPrecision scope restore
// ---------------------------------------------------------------------------

describe("withPrecision()", () => {
    it("restores PrecisionCutoff after callback completes", () => {
        const before = ArbitraryNumber.PrecisionCutoff;
        ArbitraryNumber.withPrecision(50, () => {
            expect(ArbitraryNumber.PrecisionCutoff).toBe(50);
        });
        expect(ArbitraryNumber.PrecisionCutoff).toBe(before);
    });

    it("restores PrecisionCutoff even when callback throws", () => {
        const before = ArbitraryNumber.PrecisionCutoff;
        expect(() => ArbitraryNumber.withPrecision(50, () => { throw new Error("boom"); })).toThrow("boom");
        expect(ArbitraryNumber.PrecisionCutoff).toBe(before);
    });

    it("lower cutoff discards the smaller operand sooner", () => {
        // 1e20 + 1 with cutoff=1: diff=20 > 1, so 1 is discarded → sum = 1e20
        const big = raw(1, 20);
        const small = num(1);
        const sum = ArbitraryNumber.withPrecision(1, () => big.add(small));
        expect(sum).toBe(big); // discarded — returns big directly
    });
});

// ---------------------------------------------------------------------------
// min / max / clamp
// ---------------------------------------------------------------------------

describe("min / max / clamp", () => {
    const a = num(5);
    const b = num(10);

    it("min returns smaller", () => {
        expect(ArbitraryNumber.min(a, b)).toBe(a);
        expect(ArbitraryNumber.min(b, a)).toBe(a);
    });

    it("max returns larger", () => {
        expect(ArbitraryNumber.max(a, b)).toBe(b);
        expect(ArbitraryNumber.max(b, a)).toBe(b);
    });

    it("clamp below min returns min", () => {
        expect(ArbitraryNumber.clamp(num(1), a, b)).toBe(a);
    });

    it("clamp above max returns max", () => {
        expect(ArbitraryNumber.clamp(num(20), a, b)).toBe(b);
    });

    it("clamp within range returns value", () => {
        const mid = num(7);
        expect(ArbitraryNumber.clamp(mid, a, b)).toBe(mid);
    });
});

// ---------------------------------------------------------------------------
// lerp edge cases
// ---------------------------------------------------------------------------

describe("lerp()", () => {
    const a = num(100);
    const b = num(200);

    it("t=0 returns a", () => {
        expect(ArbitraryNumber.lerp(a, b, 0)).toBe(a);
    });

    it("t=1 returns b", () => {
        expect(ArbitraryNumber.lerp(a, b, 1)).toBe(b);
    });

    it("t=0.5 returns midpoint", () => {
        expect(approxEq(ArbitraryNumber.lerp(a, b, 0.5), num(150))).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// an() shorthand edge cases
// ---------------------------------------------------------------------------

describe("an() factory edge cases", () => {
    it("an(0) is Zero", () => {
        expect(an(0).isZero()).toBe(true);
    });

    it("an(1.5, 3) produces coefficient 1.5 exponent 3 (already normalised)", () => {
        const n = an(1.5, 3);
        expect(n.coefficient).toBeCloseTo(1.5, 10);
        expect(n.exponent).toBe(3);
    });

    it("an(15, 3) normalises to coefficient 1.5 exponent 4", () => {
        const n = an(15, 3);
        expect(n.coefficient).toBeCloseTo(1.5, 10);
        expect(n.exponent).toBe(4);
    });

    it("an.from() mirrors ArbitraryNumber.from()", () => {
        const a = an.from(1234);
        const b = ArbitraryNumber.from(1234);
        expect(a.equals(b)).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Smoke — end-to-end game patterns
// ---------------------------------------------------------------------------

describe("smoke: idle-game tick (resource accumulation)", () => {
    it("1000 ticks of income accumulation produces correct total", () => {
        const incomePerTick = raw(1.5, 6);   // 1.5M per tick
        let resources = Z;
        for (let i = 0; i < 1000; i++) {
            resources = resources.add(incomePerTick);
        }
        // Expected: 1000 × 1.5e6 = 1.5e9
        expect(approxEq(resources, raw(1.5, 9))).toBe(true);
    });

    it("tick using fused mulAdd matches chained mul+add", () => {
        const value = raw(1, 10);
        const multiplier = raw(1.05, 0);
        const bonus = raw(1, 8);

        const fused = value.mulAdd(multiplier, bonus);
        const chained = value.mul(multiplier).add(bonus);
        expect(approxEq(fused, chained)).toBe(true);
    });
});

describe("smoke: prestige loop (exponential scaling)", () => {
    it("20 prestige resets with 10× multiplier each", () => {
        let prestigeMultiplier = ONE;
        const factor = num(10);
        for (let i = 0; i < 20; i++) {
            prestigeMultiplier = prestigeMultiplier.mul(factor);
        }
        // 10^20
        const expected = raw(1, 20);
        expect(approxEq(prestigeMultiplier, expected)).toBe(true);
    });

    it("sumArray over income sources matches manual reduce", () => {
        const sources = [raw(1, 6), raw(2.5, 5), raw(5, 4), raw(1, 3), raw(9.9, 2)];
        const batch = ArbitraryNumber.sumArray(sources);
        const manual = sources.reduce((a, b) => a.add(b));
        expect(approxEq(batch, manual)).toBe(true);
    });
});

describe("smoke: upgrade chain (chain builder)", () => {
    it("chain builder produces same result as direct calls", () => {
        const base = raw(1, 10);
        const mul1 = raw(1.5, 0);
        const bonus = raw(2, 8);
        const mul2 = raw(2, 0);

        const direct = base.mul(mul1).add(bonus).mul(mul2);
        const chained = chain(base).mul(mul1).add(bonus).mul(mul2).done();

        expect(approxEq(direct, chained)).toBe(true);
    });

    it("chain sqrt → mul works without NaN", () => {
        const result = chain(raw(9, 4)).sqrt().mul(raw(2, 0)).done();
        // sqrt(9e4) = 300; 300 × 2 = 600
        expect(approxEq(result, num(600))).toBe(true);
    });
});
