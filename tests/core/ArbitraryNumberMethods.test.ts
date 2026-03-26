import { describe, it, expect } from "vitest";
import { ArbitraryNumber } from "../../src/core/ArbitraryNumber";

const num = (v: number) => ArbitraryNumber.from(v);
const raw = (c: number, e: number) => new ArbitraryNumber(c, e);

function approxEqual(a: ArbitraryNumber, b: ArbitraryNumber, tol = 1e-9): boolean {
    if (a.coefficient === 0 && b.coefficient === 0) return true;
    if (a.exponent !== b.exponent) return false;
    const rel = Math.abs(a.coefficient - b.coefficient) / Math.max(Math.abs(a.coefficient), Math.abs(b.coefficient));
    return rel <= tol;
}

// ---------------------------------------------------------------------------
// sqrt()
// ---------------------------------------------------------------------------

describe("sqrt()", () => {
    it("sqrt(4) = 2", () => {
        const result = num(4).sqrt();
        expect(approxEqual(result, num(2))).toBe(true);
    });

    it("sqrt(9) = 3", () => {
        expect(approxEqual(num(9).sqrt(), num(3))).toBe(true);
    });

    it("sqrt(1e4) = 100 (even exponent)", () => {
        const result = raw(1, 4).sqrt();
        expect(approxEqual(result, num(100))).toBe(true);
    });

    it("sqrt(1e5) = ~316.23 (odd exponent)", () => {
        const result = raw(1, 5).sqrt();
        const expected = num(Math.sqrt(1e5));
        expect(approxEqual(result, expected)).toBe(true);
    });

    it("sqrt(2.25e6) — even exponent with non-integer coefficient", () => {
        const result = raw(2.25, 6).sqrt();
        const expected = num(1500);
        expect(approxEqual(result, expected)).toBe(true);
    });

    it("sqrt(1e100) = 1e50 (large even exponent)", () => {
        const result = raw(1, 100).sqrt();
        expect(result.exponent).toBe(50);
        expect(Math.abs(result.coefficient - 1) < 1e-10).toBe(true);
    });

    it("sqrt(1e101) (large odd exponent)", () => {
        const result = raw(1, 101).sqrt();
        expect(result.exponent).toBe(50);
        expect(Math.abs(result.coefficient - Math.sqrt(10)) < 1e-10).toBe(true);
    });

    it("a.sqrt().pow(2) ≈ a for various positive values", () => {
        const values = [1, 2, 3, 4, 9, 16, 100, 1e6, 1e7, 1e20, 1e21];
        for (const v of values) {
            const a = num(v);
            const back = a.sqrt().pow(2);
            const rel = Math.abs(back.log10() - a.log10());
            expect(rel).toBeLessThan(1e-9);
        }
    });

    it("sqrt(0) returns Zero", () => {
        expect(ArbitraryNumber.Zero.sqrt().equals(ArbitraryNumber.Zero)).toBe(true);
    });

    it("sqrt of negative throws", () => {
        expect(() => num(-4).sqrt()).toThrow("Square root of negative number");
    });

    it("sqrt of negative coefficient throws", () => {
        expect(() => raw(-2.5, 3).sqrt()).toThrow("Square root of negative number");
    });
});

// ---------------------------------------------------------------------------
// round()
// ---------------------------------------------------------------------------

describe("round()", () => {
    it("1.5 rounds to 2", () => {
        expect(num(1.5).round().equals(num(2))).toBe(true);
    });

    it("1.4 rounds to 1", () => {
        expect(num(1.4).round().equals(num(1))).toBe(true);
    });

    it("1.0 rounds to 1", () => {
        expect(num(1.0).round().equals(num(1))).toBe(true);
    });

    it("-1.5 rounds to -1 (half-up)", () => {
        expect(num(-1.5).round().equals(num(-1))).toBe(true);
    });

    it("-1.6 rounds to -2", () => {
        expect(num(-1.6).round().equals(num(-2))).toBe(true);
    });

    it("0.4 rounds to 0 (Zero)", () => {
        expect(num(0.4).round().equals(ArbitraryNumber.Zero)).toBe(true);
    });

    it("0.6 rounds to 1", () => {
        expect(num(0.6).round().equals(num(1))).toBe(true);
    });

    it("0.5 rounds to 1", () => {
        // exponent = -1, coefficient = 5 → 5 × 0.1 = 0.5 → Math.round(0.5) = 1
        expect(num(0.5).round().equals(num(1))).toBe(true);
    });

    it("-0.5 rounds to 0 (Math.round half-toward-+inf)", () => {
        // JS Math.round(-0.5) = 0
        expect(num(-0.5).round().equals(ArbitraryNumber.Zero)).toBe(true);
    });

    it("-0.6 rounds to -1", () => {
        expect(num(-0.6).round().equals(num(-1))).toBe(true);
    });

    it("0.09 rounds to 0 (exponent <= -2, always zero)", () => {
        // {coefficient: 9, exponent: -2} → value = 0.09 → rounds to 0
        expect(raw(9, -2).round().equals(ArbitraryNumber.Zero)).toBe(true);
    });

    it("large exponent (≥ PrecisionCutoff) returns unchanged", () => {
        const big = raw(1.5, 20);
        expect(big.round() === big).toBe(true);
    });

    it("zero returns Zero", () => {
        expect(ArbitraryNumber.Zero.round().equals(ArbitraryNumber.Zero)).toBe(true);
    });

    it("15.7 → 16", () => {
        expect(num(15.7).round().equals(num(16))).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// sign()
// ---------------------------------------------------------------------------

describe("sign()", () => {
    it("positive number returns 1", () => {
        expect(raw(1.5, 3).sign()).toBe(1);
    });

    it("negative number returns -1", () => {
        expect(raw(-1.5, 3).sign()).toBe(-1);
    });

    it("zero returns 0", () => {
        expect(ArbitraryNumber.Zero.sign()).toBe(0);
    });

    it("One returns 1", () => {
        expect(ArbitraryNumber.One.sign()).toBe(1);
    });
});

// ---------------------------------------------------------------------------
// toNumber()
// ---------------------------------------------------------------------------

describe("toNumber()", () => {
    it("1500 converts correctly", () => {
        expect(raw(1.5, 3).toNumber()).toBe(1500);
    });

    it("zero converts to 0", () => {
        expect(ArbitraryNumber.Zero.toNumber()).toBe(0);
    });

    it("1e400 returns Infinity", () => {
        expect(raw(1, 400).toNumber()).toBe(Infinity);
    });

    it("negative values convert correctly", () => {
        expect(raw(-2.5, 2).toNumber()).toBe(-250);
    });

    it("small value: 0.005 = 5e-3", () => {
        expect(Math.abs(num(0.005).toNumber() - 0.005) < 1e-15).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// isZero(), isPositive(), isNegative(), isInteger()
// ---------------------------------------------------------------------------

describe("isZero()", () => {
    it("Zero is zero", () => expect(ArbitraryNumber.Zero.isZero()).toBe(true));
    it("One is not zero", () => expect(ArbitraryNumber.One.isZero()).toBe(false));
    it("negative is not zero", () => expect(raw(-1, 0).isZero()).toBe(false));
});

describe("isPositive()", () => {
    it("positive number returns true", () => expect(raw(1.5, 3).isPositive()).toBe(true));
    it("zero returns false", () => expect(ArbitraryNumber.Zero.isPositive()).toBe(false));
    it("negative returns false", () => expect(raw(-1.5, 3).isPositive()).toBe(false));
});

describe("isNegative()", () => {
    it("negative number returns true", () => expect(raw(-1.5, 3).isNegative()).toBe(true));
    it("zero returns false", () => expect(ArbitraryNumber.Zero.isNegative()).toBe(false));
    it("positive returns false", () => expect(raw(1.5, 3).isNegative()).toBe(false));
});

describe("isInteger()", () => {
    it("zero is integer", () => expect(ArbitraryNumber.Zero.isInteger()).toBe(true));
    it("1 is integer", () => expect(num(1).isInteger()).toBe(true));
    it("5 is integer", () => expect(num(5).isInteger()).toBe(true));
    it("1000 is integer", () => expect(num(1000).isInteger()).toBe(true));
    it("1.5 is not integer", () => expect(num(1.5).isInteger()).toBe(false));
    it("0.5 is not integer", () => expect(num(0.5).isInteger()).toBe(false));
    it("0.1 is not integer (exponent = -1)", () => {
        // Regression: normalised {c:1, e:-1} — any negative exponent is non-integer
        expect(raw(1, -1).isInteger()).toBe(false);
    });
    it("1e-10 is not integer (exponent = -10, was gated at < -15 before)", () => {
        expect(raw(1, -10).isInteger()).toBe(false);
    });
    it("very large (exponent >= PrecisionCutoff) is always integer", () => {
        expect(raw(1.5, 20).isInteger()).toBe(true);
    });
    it("tiny negative exponent: 1e-20 is not integer", () => {
        expect(raw(1, -20).isInteger()).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// Static min(a, b) and max(a, b)
// ---------------------------------------------------------------------------

describe("ArbitraryNumber.min()", () => {
    it("returns the smaller when a < b", () => {
        const a = num(100), b = num(200);
        expect(ArbitraryNumber.min(a, b) === a).toBe(true);
    });

    it("returns the smaller when a > b", () => {
        const a = num(300), b = num(200);
        expect(ArbitraryNumber.min(a, b) === b).toBe(true);
    });

    it("returns b when a = b (both equal, returns b)", () => {
        const a = num(100), b = num(100);
        // min returns a when a is not less than b (a.lessThan(b) = false → returns b)
        expect(ArbitraryNumber.min(a, b).equals(num(100))).toBe(true);
    });

    it("works with large exponents", () => {
        const a = raw(1, 50), b = raw(1, 60);
        expect(ArbitraryNumber.min(a, b) === a).toBe(true);
    });
});

describe("ArbitraryNumber.max()", () => {
    it("returns the larger when a > b", () => {
        const a = num(300), b = num(200);
        expect(ArbitraryNumber.max(a, b) === a).toBe(true);
    });

    it("returns the larger when a < b", () => {
        const a = num(100), b = num(200);
        expect(ArbitraryNumber.max(a, b) === b).toBe(true);
    });

    it("returns b when a = b", () => {
        const a = num(100), b = num(100);
        expect(ArbitraryNumber.max(a, b).equals(num(100))).toBe(true);
    });

    it("works with negative numbers", () => {
        const a = num(-100), b = num(-200);
        expect(ArbitraryNumber.max(a, b) === a).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Static lerp(a, b, t)
// ---------------------------------------------------------------------------

describe("ArbitraryNumber.lerp()", () => {
    it("t=0 returns a", () => {
        const a = num(100), b = num(200);
        expect(ArbitraryNumber.lerp(a, b, 0) === a).toBe(true);
    });

    it("t=1 returns b", () => {
        const a = num(100), b = num(200);
        expect(ArbitraryNumber.lerp(a, b, 1) === b).toBe(true);
    });

    it("t=0.5 returns midpoint", () => {
        const a = num(100), b = num(200);
        const mid = ArbitraryNumber.lerp(a, b, 0.5);
        expect(approxEqual(mid, num(150))).toBe(true);
    });

    it("t=0.25 returns quarter point", () => {
        const a = num(0), b = num(400);
        const result = ArbitraryNumber.lerp(a, b, 0.25);
        expect(approxEqual(result, num(100))).toBe(true);
    });

    it("extrapolation: t=2 gives a + 2*(b-a)", () => {
        const a = num(100), b = num(200);
        const result = ArbitraryNumber.lerp(a, b, 2);
        expect(approxEqual(result, num(300))).toBe(true);
    });

    it("works with large ArbitraryNumbers", () => {
        const a = raw(1, 50), b = raw(3, 50);
        const mid = ArbitraryNumber.lerp(a, b, 0.5);
        expect(approxEqual(mid, raw(2, 50))).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Static withPrecision(cutoff, fn)
// ---------------------------------------------------------------------------

describe("ArbitraryNumber.withPrecision()", () => {
    it("restores previous PrecisionCutoff after fn", () => {
        const prev = ArbitraryNumber.PrecisionCutoff;
        ArbitraryNumber.withPrecision(50, () => {
            // inside fn
        });
        expect(ArbitraryNumber.PrecisionCutoff).toBe(prev);
    });

    it("uses the new cutoff during fn", () => {
        let cutoffDuring = -1;
        ArbitraryNumber.withPrecision(50, () => {
            cutoffDuring = ArbitraryNumber.PrecisionCutoff;
        });
        expect(cutoffDuring).toBe(50);
    });

    it("restores cutoff even if fn throws", () => {
        const prev = ArbitraryNumber.PrecisionCutoff;
        try {
            ArbitraryNumber.withPrecision(50, () => { throw new Error("test"); });
        } catch {
            // expected
        }
        expect(ArbitraryNumber.PrecisionCutoff).toBe(prev);
    });

    it("returns the value from fn", () => {
        const result = ArbitraryNumber.withPrecision(50, () => num(42));
        expect(result.equals(num(42))).toBe(true);
    });

    it("lower cutoff discards addend that would normally contribute", () => {
        // diff = 6 < default 15 → normally both contribute; with cutoff 5 → small is discarded
        const big = raw(1.0, 6);
        const small = raw(1.0, 0);
        const resultDefault = big.add(small);          // both contribute → result > big
        const resultLowPrecision = ArbitraryNumber.withPrecision(5, () => big.add(small));
        expect(resultDefault.greaterThan(big)).toBe(true);
        expect(resultLowPrecision.equals(big)).toBe(true);
    });
});
