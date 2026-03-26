import { describe, it, expect } from "vitest";
import { ArbitraryNumber } from "../../src/core/ArbitraryNumber";
import { ArbitraryNumberUtility } from "../../src/utility/ArbitraryNumberUtility";

describe("ArbitraryNumberUtility", () => {
    describe("meetsOrExceeds", () => {
        it("returns true when value is greater than threshold", () => {
            expect(ArbitraryNumberUtility.meetsOrExceeds(2000, 1500)).toBe(true);
        });

        it("returns true when value equals threshold", () => {
            expect(ArbitraryNumberUtility.meetsOrExceeds(1500, 1500)).toBe(true);
        });

        it("returns false when value is lower than threshold", () => {
            expect(ArbitraryNumberUtility.meetsOrExceeds(1000, 1500)).toBe(false);
        });
    });

    describe("wholeMultipleCount", () => {
        it("returns floor(total / step)", () => {
            expect(ArbitraryNumberUtility.wholeMultipleCount(1000, 300).equals(ArbitraryNumber.from(3))).toBe(true);
        });

        it("returns zero for non-positive totals", () => {
            expect(ArbitraryNumberUtility.wholeMultipleCount(0, 300).equals(ArbitraryNumber.Zero)).toBe(true);
            expect(ArbitraryNumberUtility.wholeMultipleCount(-100, 300).equals(ArbitraryNumber.Zero)).toBe(true);
        });

        it("supports ArbitraryNumber inputs", () => {
            const total = ArbitraryNumber.from(10_000);
            const step = ArbitraryNumber.from(2500);
            expect(ArbitraryNumberUtility.wholeMultipleCount(total, step).equals(ArbitraryNumber.from(4))).toBe(true);
        });

        it("throws for non-positive step", () => {
            expect(() => ArbitraryNumberUtility.wholeMultipleCount(1000, 0)).toThrow("step must be greater than zero");
            expect(() => ArbitraryNumberUtility.wholeMultipleCount(1000, -5)).toThrow("step must be greater than zero");
        });
    });

    describe("subtractWithFloor", () => {
        it("subtracts but does not go below floor", () => {
            expect(ArbitraryNumberUtility.subtractWithFloor(1000, 200, 0).equals(ArbitraryNumber.from(800))).toBe(true);
            expect(ArbitraryNumberUtility.subtractWithFloor(1000, 2000, 0).equals(ArbitraryNumber.Zero)).toBe(true);
        });

        it("defaults floor to zero", () => {
            expect(ArbitraryNumberUtility.subtractWithFloor(1000, 200).equals(ArbitraryNumber.from(800))).toBe(true);
            expect(ArbitraryNumberUtility.subtractWithFloor(1000, 2000).equals(ArbitraryNumber.Zero)).toBe(true);
        });
    });

});
