import { describe, it, expect } from "vitest";
import { ArbitraryNumber } from "../../src/core/ArbitraryNumber";
import { ArbitraryNumberDomainError } from "../../src/errors";

const num = (v: number) => ArbitraryNumber.from(v);
const raw = (c: number, e: number) => new ArbitraryNumber(c, e);

function approxEqual(a: ArbitraryNumber, b: ArbitraryNumber, tol = 1e-10): boolean {
    if (a.coefficient === 0 && b.coefficient === 0) return true;
    if (a.exponent !== b.exponent) return false;

    const rel = Math.abs(a.coefficient - b.coefficient) / Math.max(Math.abs(a.coefficient), Math.abs(b.coefficient));
    return rel <= tol;
}

describe("mulDiv — fused multiply-divide", () => {

    describe("equivalence with .mul().div()", () => {
        it("basic: (6 × 2) / 3 = 4", () => {
            expect(num(6).mulDiv(num(2), num(3)).equals(num(4))).toBe(true);
        });

        it("(10 × 5) / 2 = 25", () => {
            expect(num(10).mulDiv(num(5), num(2)).equals(num(25))).toBe(true);
        });

        it("matches .mul().div() for many small values", () => {
            const values = [1, 2, 3, 5, 7, 10, 100, 1000];
            for (const av of values) {
                for (const mv of values) {
                    for (const dv of values) {
                        const a = num(av), m = num(mv), d = num(dv);
                        expect(approxEqual(a.mulDiv(m, d), a.mul(m).div(d))).toBe(true);
                    }
                }
            }
        });

        it("large exponents: (1.5e6 × 2e3) / 1e4", () => {
            const a = raw(1.5, 6);
            const m = raw(2.0, 3);
            const d = raw(1.0, 4);
            expect(approxEqual(a.mulDiv(m, d), a.mul(m).div(d))).toBe(true);
        });

        it("result coefficient >= 10 — normalises down", () => {
            // 9 * 9 / 1 = 81 → normalises to 8.1e+1
            const result = num(9).mulDiv(num(9), num(1));
            const expected = num(9).mul(num(9)).div(num(1));
            expect(approxEqual(result, expected)).toBe(true);
        });

        it("result coefficient < 1 — normalises up", () => {
            // 1 * 1 / 9 = 0.111... → normalises to 1.11...e-1
            const result = num(1).mulDiv(num(1), num(9));
            const expected = num(1).mul(num(1)).div(num(9));
            expect(approxEqual(result, expected)).toBe(true);
        });

        it("negative multiplier: (-6 × 2) / 3 = -4", () => {
            expect(approxEqual(num(-6).mulDiv(num(2), num(3)), num(-4))).toBe(true);
        });

        it("negative divisor: (6 × 2) / -3 = -4", () => {
            expect(approxEqual(num(6).mulDiv(num(2), num(-3)), num(-4))).toBe(true);
        });

        it("negative both: (-6 × 2) / -3 = 4", () => {
            expect(approxEqual(num(-6).mulDiv(num(2), num(-3)), num(4))).toBe(true);
        });

        it("this = zero returns zero", () => {
            const result = num(0).mulDiv(num(5), num(2));
            expect(result.equals(ArbitraryNumber.Zero)).toBe(true);
        });

        it("multiplier = zero returns zero", () => {
            const result = num(10).mulDiv(ArbitraryNumber.Zero, num(2));
            expect(result.equals(ArbitraryNumber.Zero)).toBe(true);
        });

        it("divisor = zero throws ArbitraryNumberDomainError", () => {
            expect(() => num(10).mulDiv(num(5), ArbitraryNumber.Zero))
                .toThrow(ArbitraryNumberDomainError);
        });

        it("divisor = zero throws before multiply (this = zero still throws)", () => {
            // Even if this is zero, a zero divisor is an error
            expect(() => ArbitraryNumber.Zero.mulDiv(ArbitraryNumber.Zero, ArbitraryNumber.Zero))
                .toThrow(ArbitraryNumberDomainError);
        });
    });

    describe("idle-game tick pattern: (production * deltaTime) / cost", () => {
        it("production 1e6 * deltaTime 0.016 / cost 1e3", () => {
            const production = raw(1.0, 6);
            const deltaTime = num(0.016);
            const cost = raw(1.0, 3);
            const result = production.mulDiv(deltaTime, cost);
            const expected = production.mul(deltaTime).div(cost);
            expect(approxEqual(result, expected)).toBe(true);
        });

        it("very large numbers: 1e300 * 1e300 / 1e300 = 1e300", () => {
            const a = raw(1.0, 300);
            const b = raw(1.0, 300);
            const c = raw(1.0, 300);
            const result = a.mulDiv(b, c);
            expect(result.coefficient).toBeCloseTo(1.0, 10);
            expect(result.exponent).toBe(300);
        });

        it("asymmetric exponents: 1e100 * 1e200 / 1e50 = 1e250", () => {
            const result = raw(1.0, 100).mulDiv(raw(1.0, 200), raw(1.0, 50));
            const expected = raw(1.0, 100).mul(raw(1.0, 200)).div(raw(1.0, 50));
            expect(approxEqual(result, expected)).toBe(true);
        });
    });

    describe("exponent arithmetic", () => {
        it("exponents add for multiplier and subtract for divisor", () => {
            // (c1*10^e1) * (c2*10^e2) / (c3*10^e3) → exponent = e1+e2-e3
            const result = raw(2.0, 5).mulDiv(raw(3.0, 4), raw(6.0, 3));
            // (2*3)/6 = 1, exponent = 5+4-3 = 6
            expect(result.coefficient).toBeCloseTo(1.0, 10);
            expect(result.exponent).toBe(6);
        });

        it("negative exponents", () => {
            const result = raw(1.0, -3).mulDiv(raw(1.0, -3), raw(1.0, 3));
            // exponent = -3 + -3 - 3 = -9
            expect(result.exponent).toBe(-9);
        });
    });

    describe("PrecisionCutoff interaction", () => {
        it("matches .mul().div() output near the precision boundary", () => {
            const a = raw(1.5, 15);
            const m = raw(1.0, 0);
            const d = raw(1.0, 0);
            expect(approxEqual(a.mulDiv(m, d), a.mul(m).div(d))).toBe(true);
        });
    });
});
