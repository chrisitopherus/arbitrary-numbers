import { describe, it, expect } from "vitest";
import { ArbitraryNumber } from "../../src/core/ArbitraryNumber";
import { ArbitraryNumberOps } from "../../src/utility/ArbitraryNumberOps";

describe("ArbitraryNumberOps", () => {
    it("coerces plain numbers for add/sub/mul/div", () => {
        expect(ArbitraryNumberOps.add(1500, 2500).equals(ArbitraryNumber.from(4000))).toBe(true);
        expect(ArbitraryNumberOps.sub(4000, 1500).equals(ArbitraryNumber.from(2500))).toBe(true);
        expect(ArbitraryNumberOps.mul(2000, 3000).equals(ArbitraryNumber.from(6_000_000))).toBe(true);
        expect(ArbitraryNumberOps.div(6_000_000, 3000).equals(ArbitraryNumber.from(2000))).toBe(true);
    });

    it("supports mixed inputs", () => {
        const left = ArbitraryNumber.from(1500);
        expect(ArbitraryNumberOps.add(left, 500).equals(ArbitraryNumber.from(2000))).toBe(true);
        expect(ArbitraryNumberOps.compare(left, 1000)).toBe(1);
    });

    it("clamp works with mixed inputs", () => {
        expect(ArbitraryNumberOps.clamp(1500, 1000, 2000).equals(ArbitraryNumber.from(1500))).toBe(true);
    });

    describe("tryFrom", () => {
        it("converts a plain number", () => {
            const result = ArbitraryNumberOps.tryFrom(1500);
            expect(result).not.toBeNull();
            expect(result!.equals(ArbitraryNumber.from(1500))).toBe(true);
        });

        it("returns the ArbitraryNumber unchanged", () => {
            const n = ArbitraryNumber.from(1500);
            expect(ArbitraryNumberOps.tryFrom(n)).toBe(n);
        });

        it("returns null for Infinity", () => {
            expect(ArbitraryNumberOps.tryFrom(Infinity)).toBeNull();
        });

        it("returns null for -Infinity", () => {
            expect(ArbitraryNumberOps.tryFrom(-Infinity)).toBeNull();
        });

        it("returns null for NaN", () => {
            expect(ArbitraryNumberOps.tryFrom(NaN)).toBeNull();
        });

        it("returns Zero for 0", () => {
            const result = ArbitraryNumberOps.tryFrom(0);
            expect(result).not.toBeNull();
            expect(result!.equals(ArbitraryNumber.Zero)).toBe(true);
        });

        it("handles negative numbers", () => {
            const result = ArbitraryNumberOps.tryFrom(-1500);
            expect(result).not.toBeNull();
            expect(result!.equals(ArbitraryNumber.from(-1500))).toBe(true);
        });
    });
});
