import { describe, it, expect } from "vitest";
import { ArbitraryNumber } from "../../src/core/ArbitraryNumber";
import { ArbitraryNumberDomainError, ArbitraryNumberInputError } from "../../src/errors";

const num = (v: number) => ArbitraryNumber.from(v);
const raw = (c: number, e: number) => new ArbitraryNumber(c, e);

function approxEqual(a: ArbitraryNumber, b: ArbitraryNumber, tol = 1e-9): boolean {
    if (a.coefficient === 0 && b.coefficient === 0) return true;
    if (a.exponent !== b.exponent) return false;

    const rel = Math.abs(a.coefficient - b.coefficient) / Math.max(Math.abs(a.coefficient), Math.abs(b.coefficient));
    return rel <= tol;
}

// ---------------------------------------------------------------------------
// cbrt
// ---------------------------------------------------------------------------

describe("cbrt — cube root", () => {
    it("cbrt(0) = 0", () => {
        expect(ArbitraryNumber.Zero.cbrt().equals(ArbitraryNumber.Zero)).toBe(true);
    });

    it("cbrt(1) = 1", () => {
        expect(num(1).cbrt().equals(ArbitraryNumber.One)).toBe(true);
    });

    it("cbrt(8) = 2", () => {
        expect(approxEqual(num(8).cbrt(), num(2))).toBe(true);
    });

    it("cbrt(27) = 3", () => {
        expect(approxEqual(num(27).cbrt(), num(3))).toBe(true);
    });

    it("cbrt(1000) = 10", () => {
        expect(approxEqual(raw(1.0, 3).cbrt(), raw(1.0, 1))).toBe(true);
    });

    it("cbrt(1e9) = 1e3 — exponent divisible by 3", () => {
        const result = raw(1.0, 9).cbrt();
        expect(result.coefficient).toBeCloseTo(1.0, 10);
        expect(result.exponent).toBe(3);
    });

    it("cbrt(1e10) — exponent remainder 1", () => {
        const result = raw(1.0, 10).cbrt();
        // 10^(10/3) = 10^3 * 10^(1/3); coefficient = cbrt(1 * 10) = cbrt(10) ≈ 2.154
        expect(result.exponent).toBe(3);
        expect(result.coefficient).toBeCloseTo(Math.cbrt(10), 8);
    });

    it("cbrt(1e11) — exponent remainder 2", () => {
        const result = raw(1.0, 11).cbrt();
        // coefficient = cbrt(1 * 100) = cbrt(100) ≈ 4.642
        expect(result.exponent).toBe(3);
        expect(result.coefficient).toBeCloseTo(Math.cbrt(100), 8);
    });

    it("cbrt(-8) = -2 — negative number", () => {
        expect(approxEqual(num(-8).cbrt(), num(-2))).toBe(true);
    });

    it("cbrt(-27) = -3", () => {
        expect(approxEqual(num(-27).cbrt(), num(-3))).toBe(true);
    });

    it("cbrt(-1e9) = -1e3 — negative with exponent divisible by 3", () => {
        const result = raw(-1.0, 9).cbrt();
        expect(result.exponent).toBe(3);
        expect(result.coefficient).toBeCloseTo(-1.0, 10);
    });

    it("cbrt(x)^3 ≈ x for positive values", () => {
        const cases = [2, 5, 7, 100, 1000, 1e6, 1e9, 1e12];
        for (const v of cases) {
            const n = num(v);
            const cubed = n.cbrt().pow(3);
            expect(approxEqual(cubed, n, 1e-6)).toBe(true);
        }
    });

    it("cbrt(x)^3 ≈ x for large exponents", () => {
        const n = raw(1.5, 30);
        const cubed = n.cbrt().pow(3);
        expect(approxEqual(cubed, n, 1e-6)).toBe(true);
    });

    it("cbrt handles negative exponents correctly", () => {
        // 1e-9: exponent -9, remainder 0 → cbrt(1)*10^(-3)
        const result = raw(1.0, -9).cbrt();
        expect(result.exponent).toBe(-3);
        expect(result.coefficient).toBeCloseTo(1.0, 10);
    });
});

// ---------------------------------------------------------------------------
// log(base)
// ---------------------------------------------------------------------------

describe("log — arbitrary base logarithm", () => {
    it("log_10(1000) = 3", () => {
        expect(num(1000).log(10)).toBeCloseTo(3, 10);
    });

    it("log_2(8) = 3", () => {
        expect(num(8).log(2)).toBeCloseTo(3, 10);
    });

    it("log_2(1024) = 10", () => {
        expect(num(1024).log(2)).toBeCloseTo(10, 8);
    });

    it("log_e(e) ≈ 1", () => {
        expect(num(Math.E).log(Math.E)).toBeCloseTo(1, 10);
    });

    it("log_10(1e300) = 300", () => {
        expect(raw(1.0, 300).log(10)).toBeCloseTo(300, 8);
    });

    it("throws for zero", () => {
        expect(() => ArbitraryNumber.Zero.log(10)).toThrow(ArbitraryNumberDomainError);
    });

    it("throws for negative number", () => {
        expect(() => num(-5).log(10)).toThrow(ArbitraryNumberDomainError);
    });

    it("throws for base = 0", () => {
        expect(() => num(100).log(0)).toThrow(ArbitraryNumberDomainError);
    });

    it("throws for base = 1", () => {
        expect(() => num(100).log(1)).toThrow(ArbitraryNumberDomainError);
    });

    it("throws for base = -2", () => {
        expect(() => num(100).log(-2)).toThrow(ArbitraryNumberDomainError);
    });

    it("throws for base = Infinity", () => {
        expect(() => num(100).log(Infinity)).toThrow(ArbitraryNumberDomainError);
    });

    it("log_b(x) = log10(x) / log10(b) identity", () => {
        const x = raw(1.5, 6);
        const b = 3;
        expect(x.log(b)).toBeCloseTo(x.log10() / Math.log10(b), 10);
    });
});

// ---------------------------------------------------------------------------
// ln
// ---------------------------------------------------------------------------

describe("ln — natural logarithm", () => {
    it("ln(1) = 0", () => {
        expect(num(1).ln()).toBeCloseTo(0, 10);
    });

    it("ln(e) ≈ 1", () => {
        expect(num(Math.E).ln()).toBeCloseTo(1, 10);
    });

    it("ln(e^10) ≈ 10", () => {
        expect(num(Math.E ** 10).ln()).toBeCloseTo(10, 6);
    });

    it("ln(1e300) = 300 * ln(10)", () => {
        expect(raw(1.0, 300).ln()).toBeCloseTo(300 * Math.LN10, 6);
    });

    it("throws for zero", () => {
        expect(() => ArbitraryNumber.Zero.ln()).toThrow(ArbitraryNumberDomainError);
    });

    it("throws for negative number", () => {
        expect(() => num(-5).ln()).toThrow(ArbitraryNumberDomainError);
    });

    it("ln(x) = log(x, e) identity", () => {
        const x = raw(1.5, 6);
        expect(x.ln()).toBeCloseTo(x.log(Math.E), 10);
    });
});

// ---------------------------------------------------------------------------
// exp10
// ---------------------------------------------------------------------------

describe("exp10 — 10^n", () => {
    it("exp10(0) = 1", () => {
        expect(ArbitraryNumber.exp10(0).equals(ArbitraryNumber.One)).toBe(true);
    });

    it("exp10(3) = 1000", () => {
        const result = ArbitraryNumber.exp10(3);
        expect(result.coefficient).toBeCloseTo(1.0, 10);
        expect(result.exponent).toBe(3);
    });

    it("exp10(6) = 1e6", () => {
        const result = ArbitraryNumber.exp10(6);
        expect(result.exponent).toBe(6);
        expect(result.coefficient).toBeCloseTo(1.0, 10);
    });

    it("exp10(3.5) = 10^3.5 ≈ 3162.3", () => {
        const result = ArbitraryNumber.exp10(3.5);
        expect(result.toNumber()).toBeCloseTo(Math.pow(10, 3.5), 6);
    });

    it("exp10(-3) = 0.001", () => {
        const result = ArbitraryNumber.exp10(-3);
        expect(result.toNumber()).toBeCloseTo(0.001, 10);
    });

    it("exp10(log10(x)) ≈ x — inverse of log10", () => {
        const x = raw(1.5, 6);
        const roundTrip = ArbitraryNumber.exp10(x.log10());
        expect(approxEqual(roundTrip, x, 1e-8)).toBe(true);
    });

    it("exp10(300) — very large exponent", () => {
        const result = ArbitraryNumber.exp10(300);
        expect(result.exponent).toBe(300);
        expect(result.coefficient).toBeCloseTo(1.0, 10);
    });

    it("throws for NaN", () => {
        expect(() => ArbitraryNumber.exp10(NaN)).toThrow(ArbitraryNumberInputError);
    });

    it("throws for Infinity", () => {
        expect(() => ArbitraryNumber.exp10(Infinity)).toThrow(ArbitraryNumberInputError);
    });
});

// ---------------------------------------------------------------------------
// trunc
// ---------------------------------------------------------------------------

describe("trunc — truncate toward zero", () => {
    it("trunc(0) = 0", () => {
        expect(ArbitraryNumber.Zero.trunc().equals(ArbitraryNumber.Zero)).toBe(true);
    });

    it("trunc(1.7) = 1", () => {
        expect(num(1.7).trunc().equals(ArbitraryNumber.One)).toBe(true);
    });

    it("trunc(1.0) = 1", () => {
        expect(num(1.0).trunc().equals(ArbitraryNumber.One)).toBe(true);
    });

    it("trunc(-1.7) = -1 — rounds toward zero, not -∞", () => {
        expect(num(-1.7).trunc().equals(num(-1))).toBe(true);
    });

    it("trunc(-1.7) ≠ floor(-1.7)", () => {
        const n = num(-1.7);
        expect(n.trunc().equals(n.floor())).toBe(false);
    });

    it("trunc(1.9) = 1", () => {
        expect(num(1.9).trunc().equals(ArbitraryNumber.One)).toBe(true);
    });

    it("trunc(-1.9) = -1", () => {
        expect(num(-1.9).trunc().equals(num(-1))).toBe(true);
    });

    it("exponent < 0 always returns 0", () => {
        expect(raw(5.0, -1).trunc().equals(ArbitraryNumber.Zero)).toBe(true);
        expect(raw(9.9, -3).trunc().equals(ArbitraryNumber.Zero)).toBe(true);
        expect(raw(-5.0, -1).trunc().equals(ArbitraryNumber.Zero)).toBe(true);
    });

    it("large exponent — returns unchanged", () => {
        const n = raw(1.5, 20);
        expect(n.trunc().equals(n)).toBe(true);
    });

    it("integer value — unchanged", () => {
        expect(num(42).trunc().equals(num(42))).toBe(true);
        expect(num(1000).trunc().equals(num(1000))).toBe(true);
    });

    it("trunc(x) and floor(x) agree for positive x", () => {
        const values = [1.1, 2.9, 5.5, 100.7, 999.9];
        for (const v of values) {
            const n = num(v);
            expect(n.trunc().equals(n.floor())).toBe(true);
        }
    });
});

// ---------------------------------------------------------------------------
// productArray
// ---------------------------------------------------------------------------

describe("productArray", () => {
    it("empty array returns One", () => {
        expect(ArbitraryNumber.productArray([]).equals(ArbitraryNumber.One)).toBe(true);
    });

    it("single element returned as-is", () => {
        const n = raw(1.5, 6);
        expect(ArbitraryNumber.productArray([n]).equals(n)).toBe(true);
    });

    it("[2, 3, 4] = 24", () => {
        const result = ArbitraryNumber.productArray([num(2), num(3), num(4)]);
        expect(approxEqual(result, num(24))).toBe(true);
    });

    it("[1e3, 1e3, 1e3] = 1e9", () => {
        const result = ArbitraryNumber.productArray([raw(1.0, 3), raw(1.0, 3), raw(1.0, 3)]);
        expect(result.exponent).toBe(9);
        expect(result.coefficient).toBeCloseTo(1.0, 10);
    });

    it("any zero element returns Zero", () => {
        const result = ArbitraryNumber.productArray([num(5), ArbitraryNumber.Zero, num(10)]);
        expect(result.equals(ArbitraryNumber.Zero)).toBe(true);
    });

    it("matches chained .mul() for small arrays", () => {
        const nums = [num(2), num(3), num(5), num(7)];
        const product = ArbitraryNumber.productArray(nums);
        const chained = num(2).mul(num(3)).mul(num(5)).mul(num(7));
        expect(approxEqual(product, chained)).toBe(true);
    });

    it("large exponents: 1e100 * 1e100 * 1e100 = 1e300", () => {
        const result = ArbitraryNumber.productArray([raw(1.0, 100), raw(1.0, 100), raw(1.0, 100)]);
        expect(result.exponent).toBe(300);
        expect(result.coefficient).toBeCloseTo(1.0, 10);
    });

    it("negative numbers: 2 * (-3) = -6", () => {
        const result = ArbitraryNumber.productArray([num(2), num(-3)]);
        expect(approxEqual(result, num(-6))).toBe(true);
    });

    it("two negatives: (-2) * (-3) = 6", () => {
        const result = ArbitraryNumber.productArray([num(-2), num(-3)]);
        expect(approxEqual(result, num(6))).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// maxOfArray / minOfArray
// ---------------------------------------------------------------------------

describe("maxOfArray", () => {
    it("empty array returns Zero", () => {
        expect(ArbitraryNumber.maxOfArray([]).equals(ArbitraryNumber.Zero)).toBe(true);
    });

    it("single element returned as-is", () => {
        const n = raw(1.5, 6);
        expect(ArbitraryNumber.maxOfArray([n]).equals(n)).toBe(true);
    });

    it("returns largest of [1, 3, 2]", () => {
        expect(ArbitraryNumber.maxOfArray([num(1), num(3), num(2)]).equals(num(3))).toBe(true);
    });

    it("returns largest of [1e6, 1e3, 1e9]", () => {
        expect(ArbitraryNumber.maxOfArray([raw(1.0, 6), raw(1.0, 3), raw(1.0, 9)]).equals(raw(1.0, 9))).toBe(true);
    });

    it("negative numbers: max([-5, -1, -3]) = -1", () => {
        expect(ArbitraryNumber.maxOfArray([num(-5), num(-1), num(-3)]).equals(num(-1))).toBe(true);
    });

    it("mixed: max([-1, 0, 1]) = 1", () => {
        expect(ArbitraryNumber.maxOfArray([num(-1), ArbitraryNumber.Zero, num(1)]).equals(num(1))).toBe(true);
    });

    it("all equal: returns first-equal element", () => {
        const a = num(5);
        const b = num(5);
        const result = ArbitraryNumber.maxOfArray([a, b]);
        expect(result.equals(num(5))).toBe(true);
    });
});

describe("minOfArray", () => {
    it("empty array returns Zero", () => {
        expect(ArbitraryNumber.minOfArray([]).equals(ArbitraryNumber.Zero)).toBe(true);
    });

    it("single element returned as-is", () => {
        const n = raw(1.5, 6);
        expect(ArbitraryNumber.minOfArray([n]).equals(n)).toBe(true);
    });

    it("returns smallest of [3, 1, 2]", () => {
        expect(ArbitraryNumber.minOfArray([num(3), num(1), num(2)]).equals(num(1))).toBe(true);
    });

    it("returns smallest of [1e6, 1e3, 1e9]", () => {
        expect(ArbitraryNumber.minOfArray([raw(1.0, 6), raw(1.0, 3), raw(1.0, 9)]).equals(raw(1.0, 3))).toBe(true);
    });

    it("negative numbers: min([-5, -1, -3]) = -5", () => {
        expect(ArbitraryNumber.minOfArray([num(-5), num(-1), num(-3)]).equals(num(-5))).toBe(true);
    });

    it("mixed: min([-1, 0, 1]) = -1", () => {
        expect(ArbitraryNumber.minOfArray([num(-1), ArbitraryNumber.Zero, num(1)]).equals(num(-1))).toBe(true);
    });
});
