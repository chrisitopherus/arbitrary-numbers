import { describe, it, expect } from "vitest";
import { ArbitraryNumber } from "../../src/core/ArbitraryNumber";
import { AnChain, chain } from "../../src/core/AnChain";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const num = (v: number) => ArbitraryNumber.from(v);
const raw = (c: number, e: number) => new ArbitraryNumber(c, e);

function approxEqual(a: ArbitraryNumber, b: ArbitraryNumber, tol = 1e-10): boolean {
    if (a.coefficient === 0 && b.coefficient === 0) return true;
    if (a.exponent !== b.exponent) return false;
    const rel = Math.abs(a.coefficient - b.coefficient) /
        Math.max(Math.abs(a.coefficient), Math.abs(b.coefficient));
    return rel <= tol;
}

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

describe("chain() / AnChain.from() — construction", () => {
    it("accepts an ArbitraryNumber", () => {
        const a = raw(1.5, 6);
        expect(chain(a).done()).toBe(a);
    });

    it("accepts a number", () => {
        const result = chain(1500).done();
        expect(approxEqual(result, num(1500))).toBe(true);
    });

    it("accepts a numeric string", () => {
        const result = chain("250").done();
        expect(approxEqual(result, num(250))).toBe(true);
    });

    it("AnChain.from and chain() produce the same result", () => {
        const a = AnChain.from(num(42)).done();
        const b = chain(num(42)).done();
        expect(a.equals(b)).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Arithmetic delegation
// ---------------------------------------------------------------------------

describe("arithmetic methods delegate to ArbitraryNumber", () => {
    it("add — chain(a).add(b) === a.add(b)", () => {
        const a = raw(1.5, 6);
        const b = raw(2.0, 3);
        expect(chain(a).add(b).done().equals(a.add(b))).toBe(true);
    });

    it("sub — chain(a).sub(b) === a.sub(b)", () => {
        const a = raw(1.5, 6);
        const b = raw(2.0, 3);
        expect(chain(a).sub(b).done().equals(a.sub(b))).toBe(true);
    });

    it("mul — chain(a).mul(b) === a.mul(b)", () => {
        const a = raw(1.5, 6);
        const b = raw(2.0, 3);
        expect(chain(a).mul(b).done().equals(a.mul(b))).toBe(true);
    });

    it("div — chain(a).div(b) === a.div(b)", () => {
        const a = raw(1.5, 6);
        const b = raw(2.0, 3);
        expect(approxEqual(chain(a).div(b).done(), a.div(b))).toBe(true);
    });

    it("pow — chain(a).pow(2) === a.pow(2)", () => {
        const a = raw(1.5, 4);
        expect(approxEqual(chain(a).pow(2).done(), a.pow(2))).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Unary methods
// ---------------------------------------------------------------------------

describe("unary methods delegate to ArbitraryNumber", () => {
    it("abs — chain(-5).abs() = 5", () => {
        expect(chain(num(-5)).abs().done().equals(num(5))).toBe(true);
    });

    it("neg — chain(5).neg() = -5", () => {
        expect(chain(num(5)).neg().done().equals(num(-5))).toBe(true);
    });

    it("sqrt — chain(9).sqrt() ≈ 3", () => {
        expect(approxEqual(chain(num(9)).sqrt().done(), num(3))).toBe(true);
    });

    it("floor — chain(3.7) → 3", () => {
        const result = chain(num(3.7)).floor().done();
        expect(approxEqual(result, num(3))).toBe(true);
    });

    it("ceil — chain(3.2) → 4", () => {
        const result = chain(num(3.2)).ceil().done();
        expect(approxEqual(result, num(4))).toBe(true);
    });

    it("round — chain(3.5) → 4", () => {
        const result = chain(num(3.5)).round().done();
        expect(approxEqual(result, num(4))).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Fused operations
// ---------------------------------------------------------------------------

describe("fused operations delegate correctly", () => {
    const a    = raw(1.5, 6);
    const mult = raw(2.0, 3);
    const add  = raw(3.0, 8);
    const sub  = raw(1.0, 7);

    it("mulAdd — chain(a).mulAdd(mult, add) === a.mulAdd(mult, add)", () => {
        expect(approxEqual(chain(a).mulAdd(mult, add).done(), a.mulAdd(mult, add))).toBe(true);
    });

    it("addMul — chain(a).addMul(add, mult) === a.addMul(add, mult)", () => {
        expect(approxEqual(chain(a).addMul(add, mult).done(), a.addMul(add, mult))).toBe(true);
    });

    it("mulSub — chain(a).mulSub(mult, sub) === a.mulSub(mult, sub)", () => {
        expect(approxEqual(chain(a).mulSub(mult, sub).done(), a.mulSub(mult, sub))).toBe(true);
    });

    it("subMul — chain(a).subMul(sub, mult) === a.subMul(sub, mult)", () => {
        expect(approxEqual(chain(a).subMul(sub, mult).done(), a.subMul(sub, mult))).toBe(true);
    });

    it("divAdd — chain(a).divAdd(mult, add) === a.divAdd(mult, add)", () => {
        expect(approxEqual(chain(a).divAdd(mult, add).done(), a.divAdd(mult, add))).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Chaining / fluency
// ---------------------------------------------------------------------------

describe("multi-step chaining", () => {
    it("each step is applied in order", () => {
        // (((10 + 5) × 2) − 3) = 27
        const result = chain(num(10))
            .add(num(5))
            .mul(num(2))
            .sub(num(3))
            .done();
        expect(approxEqual(result, num(27))).toBe(true);
    });

    it("chain with fused ops matches equivalent direct chain", () => {
        const base    = raw(1.5, 6);
        const mult    = raw(2.0, 3);
        const bonus   = raw(3.0, 8);
        const penalty = raw(1.0, 7);

        const viChain  = chain(base).mulAdd(mult, bonus).sub(penalty).done();
        const vsDirect = base.mulAdd(mult, bonus).sub(penalty);
        expect(approxEqual(viChain, vsDirect)).toBe(true);
    });

    it("returns this on each step (fluent identity)", () => {
        const c = chain(num(1));
        const r1 = c.add(num(1));
        const r2 = r1.mul(num(2));
        expect(r1).toBe(c);
        expect(r2).toBe(c);
    });

    it("game formula — (base − armour) × mult + flatBonus", () => {
        const base      = raw(5.0, 4);  // 50,000
        const armour    = raw(1.0, 3);  // 1,000
        const mult      = raw(2.5, 0);  // 2.5
        const flatBonus = raw(3.0, 3);  // 3,000

        const result = chain(base)
            .subMul(armour, mult)
            .add(flatBonus)
            .done();

        const expected = base.sub(armour).mul(mult).add(flatBonus);
        expect(approxEqual(result, expected)).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// done()
// ---------------------------------------------------------------------------

describe("done()", () => {
    it("returns an ArbitraryNumber", () => {
        expect(chain(num(42)).done()).toBeInstanceOf(ArbitraryNumber);
    });

    it("calling done() multiple times returns the same reference", () => {
        const c = chain(num(1)).add(num(2));
        expect(c.done()).toBe(c.done());
    });
});
