import { describe, it, expect } from "vitest";
import { ArbitraryNumber } from "../../src/core/ArbitraryNumber";
import { formula } from "../../src/core/AnFormula";
import { chain } from "../../src/core/AnChain";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const num = (v: number) => ArbitraryNumber.from(v);
const raw = (c: number, e: number) => new ArbitraryNumber(c, e);

function approxEqual(a: ArbitraryNumber, b: ArbitraryNumber, tol = 1e-10): boolean {
    if (a.coefficient === 0 && b.coefficient === 0) return true;
    if (a.exponent !== b.exponent) return false;

    const rel =
        Math.abs(a.coefficient - b.coefficient) /
        Math.max(Math.abs(a.coefficient), Math.abs(b.coefficient));
    return rel <= tol;
}

// ---------------------------------------------------------------------------
// Construction & naming
// ---------------------------------------------------------------------------

describe("formula() / AnFormula.create() — construction", () => {
    it("creates an empty formula with no name", () => {
        const f = formula();
        expect(f.name).toBeUndefined();
    });

    it("creates a formula with a name", () => {
        const f = formula("Damage");
        expect(f.name).toBe("Damage");
    });

    it("apply() on empty formula returns the input unchanged (ArbitraryNumber)", () => {
        const a = raw(1.5, 6);
        expect(formula().apply(a)).toBe(a);
    });

    it("apply() on empty formula accepts a plain number", () => {
        const result = formula().apply(1500);
        expect(approxEqual(result, num(1500))).toBe(true);
    });
});

describe("named()", () => {
    it("returns a formula with the given name", () => {
        const f = formula().mul(raw(2, 0)).named("Double");
        expect(f.name).toBe("Double");
    });

    it("does not mutate the original", () => {
        const f = formula("Original").mul(raw(2, 0));
        f.named("Renamed");
        expect(f.name).toBe("Original");
    });

    it("named formula applies the same steps", () => {
        const f = formula().mul(raw(2, 0));
        const named = f.named("Double");
        expect(approxEqual(named.apply(raw(5, 0)), raw(1, 1))).toBe(true); // 5 × 2 = 10
    });
});

// ---------------------------------------------------------------------------
// Immutability
// ---------------------------------------------------------------------------

describe("immutability", () => {
    it("each method returns a new AnFormula instance", () => {
        const base = formula();
        const withAdd = base.add(raw(1, 0));
        expect(withAdd).not.toBe(base);
    });

    it("base formula is unchanged after one branch", () => {
        const base = formula().mul(raw(2, 0));
        const withFloor = base.floor();
        expect(approxEqual(base.apply(raw(3, 0)), raw(6, 0))).toBe(true);
        expect(approxEqual(withFloor.apply(raw(3, 0)), raw(6, 0))).toBe(true); // floor(6) = 6
    });

    it("two branches from the same base are independent", () => {
        const step1 = formula().add(raw(1, 0));
        const step2a = step1.mul(raw(2, 0));   // (5 + 1) × 2 = 12
        const step2b = step1.mul(raw(3, 0));   // (5 + 1) × 3 = 18
        expect(approxEqual(step1.apply(raw(5, 0)), raw(6, 0))).toBe(true);
        expect(approxEqual(step2a.apply(raw(5, 0)), num(12))).toBe(true);
        expect(approxEqual(step2b.apply(raw(5, 0)), num(18))).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Arithmetic steps
// ---------------------------------------------------------------------------

describe("arithmetic steps", () => {
    it("add", () => {
        const f = formula().add(raw(2, 3));            // +2000
        expect(approxEqual(f.apply(num(1000)), num(3000))).toBe(true);
    });

    it("sub", () => {
        const f = formula().sub(raw(5, 2));            // -500
        expect(approxEqual(f.apply(num(1000)), num(500))).toBe(true);
    });

    it("mul", () => {
        const f = formula().mul(raw(3, 0));            // ×3
        expect(approxEqual(f.apply(num(1000)), num(3000))).toBe(true);
    });

    it("div", () => {
        const f = formula().div(raw(4, 0));            // ÷4
        expect(approxEqual(f.apply(num(1000)), num(250))).toBe(true);
    });

    it("pow", () => {
        const f = formula().pow(2);
        expect(approxEqual(f.apply(num(100)), num(10000))).toBe(true);
    });

    it("chains multiple arithmetic steps in order", () => {
        // (100 + 50) × 2 = 300
        const f = formula().add(num(50)).mul(raw(2, 0));
        expect(approxEqual(f.apply(num(100)), num(300))).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Fused steps
// ---------------------------------------------------------------------------

describe("fused steps", () => {
    it("mulAdd: (value × mult) + add", () => {
        // 1000 × 2 + 500 = 2500
        const f = formula().mulAdd(raw(2, 0), raw(5, 2));
        expect(approxEqual(f.apply(num(1000)), num(2500))).toBe(true);
    });

    it("addMul: (value + add) × mult", () => {
        // (1000 + 500) × 2 = 3000
        const f = formula().addMul(raw(5, 2), raw(2, 0));
        expect(approxEqual(f.apply(num(1000)), num(3000))).toBe(true);
    });

    it("mulSub: (value × mult) − sub", () => {
        // 1000 × 3 - 500 = 2500
        const f = formula().mulSub(raw(3, 0), raw(5, 2));
        expect(approxEqual(f.apply(num(1000)), num(2500))).toBe(true);
    });

    it("subMul: (value − sub) × mult", () => {
        // (1000 - 200) × 4 = 3200
        const f = formula().subMul(raw(2, 2), raw(4, 0));
        expect(approxEqual(f.apply(num(1000)), num(3200))).toBe(true);
    });

    it("divAdd: (value ÷ div) + add", () => {
        // 1000 ÷ 4 + 100 = 350
        const f = formula().divAdd(raw(4, 0), raw(1, 2));
        expect(approxEqual(f.apply(num(1000)), num(350))).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Unary steps
// ---------------------------------------------------------------------------

describe("unary steps", () => {
    it("abs", () => {
        const f = formula().abs();
        expect(approxEqual(f.apply(new ArbitraryNumber(-5, 0)), raw(5, 0))).toBe(true);
    });

    it("neg", () => {
        const f = formula().neg();
        expect(f.apply(raw(5, 0)).coefficient).toBe(-5);
    });

    it("sqrt", () => {
        const f = formula().sqrt();
        expect(approxEqual(f.apply(num(9)), raw(3, 0))).toBe(true);
    });

    it("floor", () => {
        const f = formula().floor();
        expect(approxEqual(f.apply(new ArbitraryNumber(1.9, 0)), raw(1, 0))).toBe(true);
    });

    it("ceil", () => {
        const f = formula().ceil();
        expect(approxEqual(f.apply(new ArbitraryNumber(1.1, 0)), raw(2, 0))).toBe(true);
    });

    it("round", () => {
        const f = formula().round();
        expect(approxEqual(f.apply(new ArbitraryNumber(1.5, 0)), raw(2, 0))).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Composition — then()
// ---------------------------------------------------------------------------

describe("then() — composition", () => {
    it("combines two formulas in order", () => {
        const double = formula().mul(raw(2, 0));
        const addTen = formula().add(raw(1, 1));
        const combined = double.then(addTen);
        // 5 × 2 + 10 = 20
        expect(approxEqual(combined.apply(raw(5, 0)), num(20))).toBe(true);
    });

    it("composition order matters", () => {
        const double = formula().mul(raw(2, 0));
        const addTen = formula().add(raw(1, 1));
        const ab = double.then(addTen);   // (5 × 2) + 10 = 20
        const ba = addTen.then(double);   // (5 + 10) × 2 = 30
        expect(approxEqual(ab.apply(raw(5, 0)), num(20))).toBe(true);
        expect(approxEqual(ba.apply(raw(5, 0)), num(30))).toBe(true);
    });

    it("does not mutate either operand", () => {
        const f1 = formula().mul(raw(2, 0));
        const f2 = formula().add(raw(5, 0));
        f1.then(f2);
        expect(approxEqual(f1.apply(raw(3, 0)), raw(6, 0))).toBe(true);
        expect(approxEqual(f2.apply(raw(3, 0)), raw(8, 0))).toBe(true);
    });

    it("empty formula composed with another is equivalent to the other", () => {
        const empty = formula();
        const double = formula().mul(raw(2, 0));
        const combined = empty.then(double);
        expect(approxEqual(combined.apply(raw(5, 0)), double.apply(raw(5, 0)))).toBe(true);
    });

    it("preserves the left formula's name", () => {
        const f1 = formula("Left").mul(raw(2, 0));
        const f2 = formula("Right").add(raw(1, 0));
        const composed = f1.then(f2);
        expect(composed.name).toBe("Left");
    });
});

// ---------------------------------------------------------------------------
// Reusability
// ---------------------------------------------------------------------------

describe("reusability", () => {
    it("same formula can be applied multiple times", () => {
        const f = formula().mul(raw(2, 0)).add(raw(1, 0));
        expect(approxEqual(f.apply(raw(5, 0)), num(11))).toBe(true);
        expect(approxEqual(f.apply(raw(5, 0)), num(11))).toBe(true);
        expect(approxEqual(f.apply(num(10)), num(21))).toBe(true);
    });

    it("formula applied to different values gives different results", () => {
        // Armor reduction: (base − 200) × 0.75, floored
        const armorReduction = formula("Armor Reduction")
            .subMul(raw(2, 2), new ArbitraryNumber(7.5, -1))
            .floor();

        const physDmg = armorReduction.apply(num(1000)); // (1000 − 200) × 0.75 = 600
        const magDmg  = armorReduction.apply(num(500));  // (500  − 200) × 0.75 = 225

        expect(approxEqual(physDmg, num(600))).toBe(true);
        expect(approxEqual(magDmg, num(225))).toBe(true);
    });

    it("formula and chain produce the same result for equivalent expressions", () => {
        const mult = raw(2, 0);
        const add  = raw(5, 2);
        const base = raw(1, 3);

        const viaChain   = chain(base).mulAdd(mult, add).floor().done();
        const viaFormula = formula().mulAdd(mult, add).floor().apply(base);

        expect(approxEqual(viaChain, viaFormula)).toBe(true);
    });
});
