/**
 * Tests for FrozenArbitraryNumber and .freeze().
 *
 * Covers:
 *  - Zero / One / Ten are FrozenArbitraryNumber instances at runtime
 *  - Zero / One / Ten typed as FrozenArbitraryNumber (compile-time)
 *  - .freeze() produces a FrozenArbitraryNumber with the correct value
 *  - .freeze() throws ArbitraryNumberMutationError on every mutating method
 *  - .clone() on a frozen instance returns a mutable ArbitraryNumber
 *  - Read-only methods work on frozen instances
 */

import { describe, it, expect } from "vitest";
import { ArbitraryNumber, FrozenArbitraryNumber } from "../../src/core/ArbitraryNumber";
import { ArbitraryNumberMutationError } from "../../src/errors";

const num = (v: number) => ArbitraryNumber.from(v);
const raw = (c: number, e: number) => new ArbitraryNumber(c, e);

// ── Static singletons ────────────────────────────────────────────────────────

describe("ArbitraryNumber.Zero / One / Ten are FrozenArbitraryNumber", () => {
    it("Zero is instanceof FrozenArbitraryNumber", () => {
        expect(ArbitraryNumber.Zero).toBeInstanceOf(FrozenArbitraryNumber);
    });
    it("One is instanceof FrozenArbitraryNumber", () => {
        expect(ArbitraryNumber.One).toBeInstanceOf(FrozenArbitraryNumber);
    });
    it("Ten is instanceof FrozenArbitraryNumber", () => {
        expect(ArbitraryNumber.Ten).toBeInstanceOf(FrozenArbitraryNumber);
    });
    it("Zero is also instanceof ArbitraryNumber", () => {
        expect(ArbitraryNumber.Zero).toBeInstanceOf(ArbitraryNumber);
    });
    it("Zero has the correct value: { coefficient: 0, exponent: 0 }", () => {
        expect(ArbitraryNumber.Zero.coefficient).toBe(0);
        expect(ArbitraryNumber.Zero.exponent).toBe(0);
    });
    it("One has the correct value: { coefficient: 1, exponent: 0 }", () => {
        expect(ArbitraryNumber.One.coefficient).toBe(1);
        expect(ArbitraryNumber.One.exponent).toBe(0);
    });
    it("Ten has the correct value: { coefficient: 1, exponent: 1 }", () => {
        expect(ArbitraryNumber.Ten.coefficient).toBe(1);
        expect(ArbitraryNumber.Ten.exponent).toBe(1);
    });
});

// ── .freeze() factory ────────────────────────────────────────────────────────

describe("ArbitraryNumber.freeze()", () => {
    it("returns a FrozenArbitraryNumber", () => {
        expect(num(1500).freeze()).toBeInstanceOf(FrozenArbitraryNumber);
    });
    it("frozen instance has the same value as the original", () => {
        const orig = raw(1.5, 3);
        const frozen = orig.freeze();
        expect(frozen.coefficient).toBe(1.5);
        expect(frozen.exponent).toBe(3);
    });
    it("freezing does not mutate the original", () => {
        const orig = raw(2.5, 4);
        orig.freeze();
        expect(orig.coefficient).toBe(2.5);
        expect(orig.exponent).toBe(4);
    });
    it("frozen instance is still instanceof ArbitraryNumber", () => {
        expect(num(42).freeze()).toBeInstanceOf(ArbitraryNumber);
    });
    it("can freeze Zero (already frozen) — returns new FrozenArbitraryNumber", () => {
        const f = ArbitraryNumber.Zero.freeze();
        expect(f).toBeInstanceOf(FrozenArbitraryNumber);
        expect(f.isZero()).toBe(true);
    });
});

// ── Mutation throws ───────────────────────────────────────────────────────────

describe("FrozenArbitraryNumber — mutating methods throw", () => {
    const frozen = () => raw(3, 2).freeze();
    const other = raw(1, 0);

    it("add throws", () => {
        expect(() => frozen().add(other)).toThrow(ArbitraryNumberMutationError);
    });
    it("sub throws", () => {
        expect(() => frozen().sub(other)).toThrow(ArbitraryNumberMutationError);
    });
    it("mul throws", () => {
        expect(() => frozen().mul(other)).toThrow(ArbitraryNumberMutationError);
    });
    it("div throws", () => {
        expect(() => frozen().div(other)).toThrow(ArbitraryNumberMutationError);
    });
    it("negate throws", () => {
        expect(() => frozen().negate()).toThrow(ArbitraryNumberMutationError);
    });
    it("abs throws", () => {
        expect(() => frozen().abs()).toThrow(ArbitraryNumberMutationError);
    });
    it("pow throws", () => {
        expect(() => frozen().pow(2)).toThrow(ArbitraryNumberMutationError);
    });
    it("mulAdd throws", () => {
        expect(() => frozen().mulAdd(other, other)).toThrow(ArbitraryNumberMutationError);
    });
    it("addMul throws", () => {
        expect(() => frozen().addMul(other, other)).toThrow(ArbitraryNumberMutationError);
    });
    it("mulSub throws", () => {
        expect(() => frozen().mulSub(other, other)).toThrow(ArbitraryNumberMutationError);
    });
    it("subMul throws", () => {
        expect(() => frozen().subMul(other, other)).toThrow(ArbitraryNumberMutationError);
    });
    it("divAdd throws", () => {
        expect(() => frozen().divAdd(other, other)).toThrow(ArbitraryNumberMutationError);
    });
    it("mulDiv throws", () => {
        expect(() => frozen().mulDiv(other, other)).toThrow(ArbitraryNumberMutationError);
    });
    it("floor throws", () => {
        expect(() => frozen().floor()).toThrow(ArbitraryNumberMutationError);
    });
    it("ceil throws", () => {
        expect(() => frozen().ceil()).toThrow(ArbitraryNumberMutationError);
    });
    it("round throws", () => {
        expect(() => frozen().round()).toThrow(ArbitraryNumberMutationError);
    });
    it("trunc throws", () => {
        expect(() => frozen().trunc()).toThrow(ArbitraryNumberMutationError);
    });
    it("sqrt throws", () => {
        expect(() => frozen().sqrt()).toThrow(ArbitraryNumberMutationError);
    });
    it("cbrt throws", () => {
        expect(() => frozen().cbrt()).toThrow(ArbitraryNumberMutationError);
    });
    it("error message includes the method name", () => {
        try {
            frozen().add(other);
        } catch (e) {
            expect((e as Error).message).toContain("add");
        }
    });
    it("Zero.add throws with mutation error (not a silent corruption)", () => {
        expect(() => (ArbitraryNumber.Zero as FrozenArbitraryNumber).add(other))
            .toThrow(ArbitraryNumberMutationError);
    });
});

// ── Read-only methods work on frozen ────────────────────────────────────────

describe("FrozenArbitraryNumber — read-only methods work normally", () => {
    const frozen = raw(3, 5).freeze(); // 3e5

    it("compareTo works", () => {
        expect(frozen.compareTo(raw(1, 5))).toBe(1);
    });
    it("greaterThan works", () => {
        expect(frozen.greaterThan(raw(1, 4))).toBe(true);
    });
    it("equals works", () => {
        expect(frozen.equals(raw(3, 5))).toBe(true);
    });
    it("isZero returns false for non-zero frozen", () => {
        expect(frozen.isZero()).toBe(false);
    });
    it("isPositive returns true", () => {
        expect(frozen.isPositive()).toBe(true);
    });
    it("log10 works", () => {
        expect(Math.abs(frozen.log10() - Math.log10(3e5))).toBeLessThan(1e-9);
    });
    it("toNumber works", () => {
        expect(frozen.toNumber()).toBeCloseTo(3e5);
    });
    it("toString works", () => {
        expect(typeof frozen.toString()).toBe("string");
    });
    it("toJSON works", () => {
        expect(frozen.toJSON()).toEqual({ c: 3, e: 5 });
    });
    it("toRawString works", () => {
        expect(frozen.toRawString()).toBe("3|5");
    });
    it("sign returns 1 for positive", () => {
        expect(frozen.sign()).toBe(1);
    });
});

// ── clone() escapes the freeze ────────────────────────────────────────────────

describe("FrozenArbitraryNumber.clone()", () => {
    it("returns a plain ArbitraryNumber (not frozen)", () => {
        const cloned = raw(5, 3).freeze().clone();
        expect(cloned).toBeInstanceOf(ArbitraryNumber);
        expect(cloned).not.toBeInstanceOf(FrozenArbitraryNumber);
    });
    it("cloned instance is mutable — add does not throw", () => {
        const cloned = raw(5, 3).freeze().clone();
        expect(() => cloned.add(raw(1, 0))).not.toThrow();
    });
    it("cloned instance has the correct value", () => {
        const cloned = raw(2.5, 7).freeze().clone();
        expect(cloned.coefficient).toBe(2.5);
        expect(cloned.exponent).toBe(7);
    });
    it("mutating clone does not affect the frozen original", () => {
        const frozen = raw(1, 3).freeze();
        const cloned = frozen.clone();
        cloned.add(raw(1, 3));
        expect(frozen.coefficient).toBe(1);
        expect(frozen.exponent).toBe(3);
    });
});
