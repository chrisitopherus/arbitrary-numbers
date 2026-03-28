import { describe, it, expect } from "vitest";
import { ArbitraryNumber } from "../../src/core/ArbitraryNumber";
import { ArbitraryNumberGuard } from "../../src/utility/ArbitraryNumberGuard";

describe("ArbitraryNumberGuard", () => {
    // -----------------------------------------------------------------------
    // isArbitraryNumber
    // -----------------------------------------------------------------------
    describe("isArbitraryNumber", () => {
        it("returns true for an ArbitraryNumber instance", () => {
            expect(ArbitraryNumberGuard.isArbitraryNumber(new ArbitraryNumber(1.5, 3))).toBe(true);
        });

        it("returns true for ArbitraryNumber.Zero", () => {
            expect(ArbitraryNumberGuard.isArbitraryNumber(ArbitraryNumber.Zero)).toBe(true);
        });

        it("returns true for ArbitraryNumber.One", () => {
            expect(ArbitraryNumberGuard.isArbitraryNumber(ArbitraryNumber.One)).toBe(true);
        });

        it("returns false for a plain object with coefficient and exponent", () => {
            expect(ArbitraryNumberGuard.isArbitraryNumber({ coefficient: 1, exponent: 0 })).toBe(false);
        });

        it("returns false for null", () => {
            expect(ArbitraryNumberGuard.isArbitraryNumber(null)).toBe(false);
        });

        it("returns false for undefined", () => {
            expect(ArbitraryNumberGuard.isArbitraryNumber(undefined)).toBe(false);
        });

        it("returns false for a number primitive", () => {
            expect(ArbitraryNumberGuard.isArbitraryNumber(42)).toBe(false);
        });

        it("returns false for a string", () => {
            expect(ArbitraryNumberGuard.isArbitraryNumber("1.5e3")).toBe(false);
        });

        it("returns false for an empty object", () => {
            expect(ArbitraryNumberGuard.isArbitraryNumber({})).toBe(false);
        });

        it("returns false for an array", () => {
            expect(ArbitraryNumberGuard.isArbitraryNumber([])).toBe(false);
        });
    });

    // -----------------------------------------------------------------------
    // isZero
    // -----------------------------------------------------------------------
    describe("isZero", () => {
        it("returns true for ArbitraryNumber.Zero", () => {
            expect(ArbitraryNumberGuard.isZero(ArbitraryNumber.Zero)).toBe(true);
        });

        it("returns true for any ArbitraryNumber with coefficient 0", () => {
            expect(ArbitraryNumberGuard.isZero(new ArbitraryNumber(0, 0))).toBe(true);
            expect(ArbitraryNumberGuard.isZero(new ArbitraryNumber(0, 5))).toBe(true);
            expect(ArbitraryNumberGuard.isZero(new ArbitraryNumber(0, -3))).toBe(true);
        });

        it("returns false for ArbitraryNumber.One", () => {
            expect(ArbitraryNumberGuard.isZero(ArbitraryNumber.One)).toBe(false);
        });

        it("returns false for a non-zero ArbitraryNumber", () => {
            expect(ArbitraryNumberGuard.isZero(new ArbitraryNumber(1.5, 3))).toBe(false);
        });

        it("returns false for a negative coefficient ArbitraryNumber", () => {
            expect(ArbitraryNumberGuard.isZero(new ArbitraryNumber(-1.5, 3))).toBe(false);
        });

        it("returns false for a plain object with coefficient 0 (not an ArbitraryNumber)", () => {
            expect(ArbitraryNumberGuard.isZero({ coefficient: 0, exponent: 0 })).toBe(false);
        });

        it("returns false for null", () => {
            expect(ArbitraryNumberGuard.isZero(null)).toBe(false);
        });

        it("returns false for undefined", () => {
            expect(ArbitraryNumberGuard.isZero(undefined)).toBe(false);
        });

        it("returns false for the number 0", () => {
            expect(ArbitraryNumberGuard.isZero(0)).toBe(false);
        });

        it("returns false for an empty object", () => {
            expect(ArbitraryNumberGuard.isZero({})).toBe(false);
        });
    });
});
