import { describe, it, expect } from "vitest";
import { ArbitraryNumber } from "../../src/core/ArbitraryNumber";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Constructs an ArbitraryNumber from a plain JS number via normalisation. */
const num = (v: number) => ArbitraryNumber.from(v);

/** Constructs an ArbitraryNumber with an explicit coefficient and exponent. */
const raw = (c: number, e: number) => new ArbitraryNumber(c, e);

/**
 * Checks approximate equality between two ArbitraryNumbers.
 * Relative tolerance of 1e-10 is used to allow for floating-point rounding.
 */
function approxEqual(a: ArbitraryNumber, b: ArbitraryNumber, tol = 1e-10): boolean {
    if (a.coefficient === 0 && b.coefficient === 0) return true;
    if (a.exponent !== b.exponent) return false;

    const rel = Math.abs(a.coefficient - b.coefficient) / Math.max(Math.abs(a.coefficient), Math.abs(b.coefficient));
    return rel <= tol;
}

// ---------------------------------------------------------------------------
// mulAdd tests
// ---------------------------------------------------------------------------

describe("mulAdd — fused multiply-add", () => {

    describe("equivalence with .mul().add()", () => {
        it("basic: (2 × 3) + 4 = 10", () => {
            const result = num(2).mulAdd(num(3), num(4));
            const expected = num(2).mul(num(3)).add(num(4));
            expect(result.equals(expected)).toBe(true);
        });

        it("large numbers: (1.5e6 × 2.0e3) + 5.0e8", () => {
            const a = raw(1.5, 6);
            const mult = raw(2.0, 3);
            const addend = raw(5.0, 8);
            const result = a.mulAdd(mult, addend);
            const expected = a.mul(mult).add(addend);
            expect(approxEqual(result, expected)).toBe(true);
        });

        it("many combinations of small values", () => {
            const values = [1, 2, 3, 5, 7, 10, 100, 1000];
            for (const av of values) {
                for (const mv of values) {
                    for (const bv of values) {
                        const a = num(av), m = num(mv), b = num(bv);
                        expect(approxEqual(a.mulAdd(m, b), a.mul(m).add(b))).toBe(true);
                    }
                }
            }
        });

        it("negative multiplier: (-2 × 3) + 10 = 4", () => {
            const result = num(-2).mulAdd(num(3), num(10));
            const expected = num(-2).mul(num(3)).add(num(10));
            expect(approxEqual(result, expected)).toBe(true);
        });

        it("negative addend: (2 × 3) + (-4) = 2", () => {
            const result = num(2).mulAdd(num(3), num(-4));
            const expected = num(2).mul(num(3)).add(num(-4));
            expect(approxEqual(result, expected)).toBe(true);
        });

        it("both negative: (-2 × -3) + (-4) = 2", () => {
            const result = num(-2).mulAdd(num(-3), num(-4));
            const expected = num(-2).mul(num(-3)).add(num(-4));
            expect(approxEqual(result, expected)).toBe(true);
        });

        it("product coefficient overflows: (9 × 2) + 1 = 19", () => {
            const result = num(9).mulAdd(num(2), num(1));
            const expected = num(9).mul(num(2)).add(num(1));
            expect(approxEqual(result, expected)).toBe(true);
        });

        it("extreme exponents: (1.5e50 × 2.0e10) + 3.0e60", () => {
            const a = raw(1.5, 50);
            const mult = raw(2.0, 10);
            const addend = raw(3.0, 60);
            expect(approxEqual(a.mulAdd(mult, addend), a.mul(mult).add(addend))).toBe(true);
        });

        it("same operands: a.mulAdd(a, a) = a*a + a", () => {
            const a = num(5);
            expect(approxEqual(a.mulAdd(a, a), a.mul(a).add(a))).toBe(true);
        });
    });

    describe("zero operand edge cases", () => {
        it("this=0: returns addend unchanged", () => {
            const result = num(0).mulAdd(num(5), num(10));
            expect(result.equals(num(10))).toBe(true);
        });

        it("multiplier=0: returns addend unchanged", () => {
            const result = num(5).mulAdd(ArbitraryNumber.Zero, num(10));
            expect(result.equals(num(10))).toBe(true);
        });

        it("addend=0: returns this*multiplier", () => {
            const result = num(5).mulAdd(num(3), ArbitraryNumber.Zero);
            expect(approxEqual(result, num(15))).toBe(true);
        });

        it("all zero: returns Zero", () => {
            const result = num(0).mulAdd(ArbitraryNumber.Zero, ArbitraryNumber.Zero);
            expect(result.equals(ArbitraryNumber.Zero)).toBe(true);
        });
    });

    describe("PrecisionCutoff boundary", () => {
        it("addend negligible (diff = 16 > cutoff): returns product only", () => {
            // product = 1.5e20, addend = 1.0e4 → diff = 16 > 15
            const a = raw(1.5, 19);
            const mult = ArbitraryNumber.One;
            const addend = raw(1.0, 4);
            const result = a.mulAdd(mult, addend);
            expect(approxEqual(result, a)).toBe(true);
        });

        it("addend NOT negligible (diff = 14 < cutoff): both contribute", () => {
            // a * 1 + addend; diff between exp 18 and 4 = 14 < 15, so addend contributes
            const result = raw(1.0, 18).mulAdd(num(1), raw(1.0, 4));
            expect(result.greaterThan(raw(1.0, 18))).toBe(true);
        });

        it("diff = 15 exactly (at cutoff): both contribute", () => {
            // diff = 19 - 4 = 15 exactly → included
            const result = raw(1.0, 19).mulAdd(num(1), raw(1.0, 4));
            expect(result.greaterThan(raw(1.0, 19))).toBe(true);
        });
    });
});

// ---------------------------------------------------------------------------
// addMul tests
// ---------------------------------------------------------------------------

describe("addMul — fused add-multiply", () => {

    describe("equivalence with .add().mul()", () => {
        it("basic: (2 + 3) × 4 = 20", () => {
            const result = num(2).addMul(num(3), num(4));
            const expected = num(2).add(num(3)).mul(num(4));
            expect(result.equals(expected)).toBe(true);
        });

        it("large numbers: (1.5e6 + 2.5e6) × 3.0e3", () => {
            const a = raw(1.5, 6);
            const addend = raw(2.5, 6);
            const mult = raw(3.0, 3);
            expect(approxEqual(a.addMul(addend, mult), a.add(addend).mul(mult))).toBe(true);
        });

        it("many combinations of small values", () => {
            const values = [1, 2, 3, 5, 7, 10, 100];
            for (const av of values) {
                for (const bv of values) {
                    for (const mv of values) {
                        const a = num(av), b = num(bv), m = num(mv);
                        expect(approxEqual(a.addMul(b, m), a.add(b).mul(m))).toBe(true);
                    }
                }
            }
        });

        it("negative addend: (5 + (-3)) × 2 = 4", () => {
            const result = num(5).addMul(num(-3), num(2));
            const expected = num(5).add(num(-3)).mul(num(2));
            expect(approxEqual(result, expected)).toBe(true);
        });

        it("negative multiplier: (5 + 3) × (-2) = -16", () => {
            const result = num(5).addMul(num(3), num(-2));
            const expected = num(5).add(num(3)).mul(num(-2));
            expect(approxEqual(result, expected)).toBe(true);
        });

        it("sum coefficient overflows: (9 + 2) × 3 = 33", () => {
            const result = num(9).addMul(num(2), num(3));
            const expected = num(9).add(num(2)).mul(num(3));
            expect(approxEqual(result, expected)).toBe(true);
        });

        it("extreme exponents: (1.5e50 + 2.0e50) × 3.0e10", () => {
            const a = raw(1.5, 50);
            const addend = raw(2.0, 50);
            const mult = raw(3.0, 10);
            expect(approxEqual(a.addMul(addend, mult), a.add(addend).mul(mult))).toBe(true);
        });

        it("same operands: a.addMul(a, a) = (a+a)*a", () => {
            const a = num(5);
            expect(approxEqual(a.addMul(a, a), a.add(a).mul(a))).toBe(true);
        });
    });

    describe("zero operand edge cases", () => {
        it("multiplier=0: returns Zero", () => {
            const result = num(5).addMul(num(3), ArbitraryNumber.Zero);
            expect(result.equals(ArbitraryNumber.Zero)).toBe(true);
        });

        it("this=0: (0 + addend) × mult = addend × mult", () => {
            const result = num(0).addMul(num(5), num(3));
            const expected = num(5).mul(num(3));
            expect(approxEqual(result, expected)).toBe(true);
        });

        it("addend=0: (this + 0) × mult = this × mult", () => {
            const result = num(5).addMul(ArbitraryNumber.Zero, num(3));
            const expected = num(5).mul(num(3));
            expect(approxEqual(result, expected)).toBe(true);
        });

        it("this=0 and addend=0: returns Zero", () => {
            const result = num(0).addMul(ArbitraryNumber.Zero, num(5));
            expect(result.equals(ArbitraryNumber.Zero)).toBe(true);
        });

        it("all zero: returns Zero", () => {
            const result = num(0).addMul(ArbitraryNumber.Zero, ArbitraryNumber.Zero);
            expect(result.equals(ArbitraryNumber.Zero)).toBe(true);
        });
    });

    describe("PrecisionCutoff boundary", () => {
        it("addend negligible (diff = 16 > cutoff): sum ≈ this alone", () => {
            // this = 1.5e20, addend = 1.0e4 → diff = 16 > 15
            const a = raw(1.5, 20);
            const addend = raw(1.0, 4);
            const mult = raw(2.0, 0);
            const result = a.addMul(addend, mult);
            const expected = a.mul(mult);
            expect(approxEqual(result, expected)).toBe(true);
        });

        it("addend NOT negligible (diff = 14 < cutoff): both contribute to sum", () => {
            const a = raw(1.0, 18);
            const addend = raw(1.0, 4);
            const mult = raw(2.0, 0);
            const result = a.addMul(addend, mult);
            const simpleResult = a.add(addend).mul(mult);
            expect(approxEqual(result, simpleResult)).toBe(true);
        });
    });
});

// ---------------------------------------------------------------------------
// mulSub tests
// ---------------------------------------------------------------------------

describe("mulSub — fused multiply-subtract", () => {

    describe("equivalence with .mul().sub()", () => {
        it("basic: (2 × 3) − 4 = 2", () => {
            const result = num(2).mulSub(num(3), num(4));
            const expected = num(2).mul(num(3)).sub(num(4));
            expect(approxEqual(result, expected)).toBe(true);
        });

        it("large numbers: (1.5e6 × 2.0e3) − 5.0e8", () => {
            const a = raw(1.5, 6);
            const mult = raw(2.0, 3);
            const sub = raw(5.0, 8);
            expect(approxEqual(a.mulSub(mult, sub), a.mul(mult).sub(sub))).toBe(true);
        });

        it("many combinations of small values", () => {
            const values = [1, 2, 3, 5, 7, 10, 100, 1000];
            for (const av of values) {
                for (const mv of values) {
                    for (const sv of values) {
                        const a = num(av), m = num(mv), s = num(sv);
                        expect(approxEqual(a.mulSub(m, s), a.mul(m).sub(s))).toBe(true);
                    }
                }
            }
        });

        it("negative multiplier: (-2 × 3) − 1 = -7", () => {
            expect(approxEqual(num(-2).mulSub(num(3), num(1)), num(-2).mul(num(3)).sub(num(1)))).toBe(true);
        });

        it("subtrahend larger than product: (2 × 3) − 100 = -94", () => {
            expect(approxEqual(num(2).mulSub(num(3), num(100)), num(2).mul(num(3)).sub(num(100)))).toBe(true);
        });

        it("extreme exponents: (1.5e50 × 2.0e10) − 3.0e60", () => {
            const a = raw(1.5, 50);
            const mult = raw(2.0, 10);
            const sub = raw(3.0, 60);
            expect(approxEqual(a.mulSub(mult, sub), a.mul(mult).sub(sub))).toBe(true);
        });
    });

    describe("zero operand edge cases", () => {
        it("this=0: returns −subtrahend", () => {
            const result = num(0).mulSub(num(5), num(10));
            const expected = num(-10);
            expect(approxEqual(result, expected)).toBe(true);
        });

        it("multiplier=0: returns −subtrahend", () => {
            const result = num(5).mulSub(ArbitraryNumber.Zero, num(10));
            expect(approxEqual(result, num(-10))).toBe(true);
        });

        it("subtrahend=0: returns this*multiplier", () => {
            const result = num(5).mulSub(num(3), ArbitraryNumber.Zero);
            expect(approxEqual(result, num(15))).toBe(true);
        });

        it("all zero: returns Zero", () => {
            const result = num(0).mulSub(ArbitraryNumber.Zero, ArbitraryNumber.Zero);
            expect(result.equals(ArbitraryNumber.Zero)).toBe(true);
        });
    });
});

// ---------------------------------------------------------------------------
// subMul tests
// ---------------------------------------------------------------------------

describe("subMul — fused subtract-multiply", () => {

    describe("equivalence with .sub().mul()", () => {
        it("basic: (5 − 2) × 3 = 9", () => {
            const result = num(5).subMul(num(2), num(3));
            const expected = num(5).sub(num(2)).mul(num(3));
            expect(approxEqual(result, expected)).toBe(true);
        });

        it("large numbers: (1.5e9 − 3.0e8) × 2.0e3", () => {
            const a = raw(1.5, 9);
            const sub = raw(3.0, 8);
            const mult = raw(2.0, 3);
            expect(approxEqual(a.subMul(sub, mult), a.sub(sub).mul(mult))).toBe(true);
        });

        it("many combinations of small values", () => {
            const values = [1, 2, 3, 5, 7, 10, 100];
            for (const av of values) {
                for (const sv of values) {
                    for (const mv of values) {
                        const a = num(av), s = num(sv), m = num(mv);
                        expect(approxEqual(a.subMul(s, m), a.sub(s).mul(m))).toBe(true);
                    }
                }
            }
        });

        it("negative multiplier: (5 − 2) × (−3) = −9", () => {
            expect(approxEqual(num(5).subMul(num(2), num(-3)), num(5).sub(num(2)).mul(num(-3)))).toBe(true);
        });

        it("subtrahend > this: (2 − 5) × 3 = −9", () => {
            expect(approxEqual(num(2).subMul(num(5), num(3)), num(2).sub(num(5)).mul(num(3)))).toBe(true);
        });

        it("extreme exponents: (1.5e50 − 2.0e50) × 3.0e10", () => {
            const a = raw(1.5, 50);
            const sub = raw(2.0, 50);
            const mult = raw(3.0, 10);
            expect(approxEqual(a.subMul(sub, mult), a.sub(sub).mul(mult))).toBe(true);
        });
    });

    describe("zero operand edge cases", () => {
        it("multiplier=0: returns Zero", () => {
            expect(num(5).subMul(num(2), ArbitraryNumber.Zero).equals(ArbitraryNumber.Zero)).toBe(true);
        });

        it("this=0: (0 − sub) × mult = −sub × mult", () => {
            const result = num(0).subMul(num(5), num(3));
            const expected = num(-5).mul(num(3));
            expect(approxEqual(result, expected)).toBe(true);
        });

        it("subtrahend=0: (this − 0) × mult = this × mult", () => {
            const result = num(5).subMul(ArbitraryNumber.Zero, num(3));
            expect(approxEqual(result, num(5).mul(num(3)))).toBe(true);
        });

        it("this=0 and subtrahend=0: returns Zero", () => {
            const result = num(0).subMul(ArbitraryNumber.Zero, num(5));
            expect(result.equals(ArbitraryNumber.Zero)).toBe(true);
        });
    });
});

// ---------------------------------------------------------------------------
// divAdd tests
// ---------------------------------------------------------------------------

describe("divAdd — fused divide-add", () => {

    describe("equivalence with .div().add()", () => {
        it("basic: (6 ÷ 2) + 4 = 7", () => {
            const result = num(6).divAdd(num(2), num(4));
            const expected = num(6).div(num(2)).add(num(4));
            expect(approxEqual(result, expected)).toBe(true);
        });

        it("large numbers: (1.5e9 ÷ 3.0e3) + 5.0e5", () => {
            const a = raw(1.5, 9);
            const div = raw(3.0, 3);
            const add = raw(5.0, 5);
            expect(approxEqual(a.divAdd(div, add), a.div(div).add(add))).toBe(true);
        });

        it("many combinations of small values", () => {
            const values = [1, 2, 3, 5, 10, 100];
            for (const av of values) {
                for (const dv of values) {
                    for (const bv of values) {
                        const a = num(av), d = num(dv), b = num(bv);
                        expect(approxEqual(a.divAdd(d, b), a.div(d).add(b))).toBe(true);
                    }
                }
            }
        });

        it("fractional result: (1 ÷ 4) + 0.5 = 0.75", () => {
            expect(approxEqual(num(1).divAdd(num(4), num(0.5)), num(0.75))).toBe(true);
        });

        it("negative numerator: (-6 ÷ 2) + 1 = -2", () => {
            expect(approxEqual(num(-6).divAdd(num(2), num(1)), num(-2))).toBe(true);
        });

        it("extreme exponents: 1.5e60 ÷ 3.0e10 + 2.0e50", () => {
            const a = raw(1.5, 60);
            const div = raw(3.0, 10);
            const add = raw(2.0, 50);
            expect(approxEqual(a.divAdd(div, add), a.div(div).add(add))).toBe(true);
        });
    });

    describe("zero operand edge cases", () => {
        it("this=0: returns addend", () => {
            const result = num(0).divAdd(num(5), num(10));
            expect(result.equals(num(10))).toBe(true);
        });

        it("addend=0: returns this/div", () => {
            const result = num(6).divAdd(num(2), ArbitraryNumber.Zero);
            expect(approxEqual(result, num(3))).toBe(true);
        });

        it("divisor=0 throws", () => {
            expect(() => num(5).divAdd(ArbitraryNumber.Zero, num(1))).toThrow("Division by zero");
        });
    });
});

// ---------------------------------------------------------------------------
// sumArray tests
// ---------------------------------------------------------------------------

describe("sumArray — batch addition", () => {

    describe("edge cases: empty, single, two elements", () => {
        it("empty array returns Zero", () => {
            expect(ArbitraryNumber.sumArray([]).equals(ArbitraryNumber.Zero)).toBe(true);
        });

        it("single element is returned as-is", () => {
            const a = num(1500);
            expect(ArbitraryNumber.sumArray([a]) === a).toBe(true);
        });

        it("two equal elements: [1000, 1000] = 2000", () => {
            const result = ArbitraryNumber.sumArray([num(1000), num(1000)]);
            expect(approxEqual(result, num(2000))).toBe(true);
        });

        it("two different elements: [1500, 2500] = 4000", () => {
            const result = ArbitraryNumber.sumArray([num(1500), num(2500)]);
            expect(approxEqual(result, num(4000))).toBe(true);
        });
    });

    describe("equivalence with chained .add()", () => {
        it("three elements: [1000, 500, 250] = 1750", () => {
            const a = num(1000), b = num(500), c = num(250);
            const sumResult = ArbitraryNumber.sumArray([a, b, c]);
            const chainResult = a.add(b).add(c);
            expect(approxEqual(sumResult, chainResult)).toBe(true);
        });

        it("50 elements all equal to 1.0e6", () => {
            const arr = Array.from({ length: 50 }, () => raw(1.0, 6));
            const sumResult = ArbitraryNumber.sumArray(arr);
            const chainResult = arr.reduce((acc, v) => acc.add(v), num(0));
            expect(approxEqual(sumResult, chainResult)).toBe(true);
        });

        it("50 elements at varying exponents", () => {
            const arr: ArbitraryNumber[] = [];
            for (let i = 0; i < 50; i++) {
                arr.push(raw(1.0 + i * 0.1, i % 10));
            }

            const sumResult = ArbitraryNumber.sumArray(arr);
            const chainResult = arr.reduce((acc, v) => acc.add(v), num(0));
            expect(approxEqual(sumResult, chainResult, 1e-8)).toBe(true);
        });

        it("array with zeros: [0, 1000, 0, 500, 0] = 1500", () => {
            const arr = [ArbitraryNumber.Zero, num(1000), ArbitraryNumber.Zero, num(500), ArbitraryNumber.Zero];
            expect(approxEqual(ArbitraryNumber.sumArray(arr), num(1500))).toBe(true);
        });

        it("all zeros: returns Zero", () => {
            const arr = [ArbitraryNumber.Zero, ArbitraryNumber.Zero, ArbitraryNumber.Zero];
            expect(ArbitraryNumber.sumArray(arr).equals(ArbitraryNumber.Zero)).toBe(true);
        });

        it("mixed positive and negative: [3000, -1000, 500] = 2500", () => {
            const arr = [num(3000), num(-1000), num(500)];
            const sumResult = ArbitraryNumber.sumArray(arr);
            const chainResult = arr.reduce((acc, v) => acc.add(v), num(0));
            expect(approxEqual(sumResult, chainResult)).toBe(true);
        });
    });

    describe("negligible element handling", () => {
        it("elements far below the pivot are ignored (diff > PrecisionCutoff)", () => {
            // 1e20 dominates; 1e0 is 20 orders below
            const arr = [raw(1.0, 20), raw(1.0, 0)];
            const result = ArbitraryNumber.sumArray(arr);
            expect(result.equals(raw(1.0, 20))).toBe(true);
        });

        it("element at exactly the cutoff boundary contributes", () => {
            // 1e18 and 1e3 → diff = 15 = PrecisionCutoff → should contribute
            const big = raw(1.0, 18);
            const small = raw(1.0, 3);
            const result = ArbitraryNumber.sumArray([big, small]);
            expect(result.greaterThan(big)).toBe(true);
        });

        it("element just beyond cutoff is discarded", () => {
            // diff = 16 > 15
            const big = raw(1.0, 20);
            const small = raw(1.0, 4);
            const result = ArbitraryNumber.sumArray([big, small]);
            expect(result.equals(big)).toBe(true);
        });
    });

    describe("50-element income aggregation pattern", () => {
        it("sumArray(50 sources) equals chained add", () => {
            const sources: ArbitraryNumber[] = [];
            // Simulate 50 income sources with varying magnitudes
            for (let i = 0; i < 50; i++) {
                sources.push(raw(1.0 + (i % 9) * 0.1, i % 8));
            }

            const sumResult = ArbitraryNumber.sumArray(sources);
            const chainResult = sources.reduce((acc, v) => acc.add(v), num(0));
            expect(approxEqual(sumResult, chainResult, 1e-8)).toBe(true);
        });

        it("order doesn't affect result (commutativity)", () => {
            const sources: ArbitraryNumber[] = [
                raw(1.5, 6), raw(2.3, 7), raw(4.1, 5), raw(9.9, 8), raw(1.1, 3),
            ];
            const reversed = [...sources].reverse();
            expect(approxEqual(ArbitraryNumber.sumArray(sources), ArbitraryNumber.sumArray(reversed))).toBe(true);
        });
    });
});
