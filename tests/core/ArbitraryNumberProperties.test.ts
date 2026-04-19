import { describe, it } from "vitest";
import * as fc from "fast-check";
import { ArbitraryNumber } from "../../src/core/ArbitraryNumber";

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

const smallExp = fc.integer({ min: -6, max: 6 });

const positiveNumber = fc.integer({ min: 1, max: 999999 }).map(n => n);

// ArbitraryNumber arbitrary: coefficient in [1, 10), exponent in [-6, 6]
const arbitraryNum = fc.tuple(
    fc.integer({ min: 100, max: 999 }).map(n => n / 100),
    smallExp,
).map(([c, e]) => new ArbitraryNumber(c, e));

const arbitraryNumWithNeg = fc.tuple(
    fc.integer({ min: 100, max: 999 }).map(n => n / 100),
    smallExp,
    fc.boolean(),
).map(([c, e, neg]) => new ArbitraryNumber(neg ? -c : c, e));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function closeEnough(a: ArbitraryNumber, b: ArbitraryNumber, relTol = 1e-9): boolean {
    const av = a.toNumber();
    const bv = b.toNumber();

    if (av === 0 && bv === 0) return true;

    const denom = Math.max(Math.abs(av), Math.abs(bv));
    return Math.abs(av - bv) / denom < relTol;
}

// ---------------------------------------------------------------------------
// Commutativity — use clones so each call gets a fresh instance
// ---------------------------------------------------------------------------

describe("property: add commutativity — a + b = b + a", () => {
    it("holds for positive pairs", () => {
        fc.assert(fc.property(arbitraryNum, arbitraryNum, (a, b) => {
            return a.clone().add(b.clone()).equals(b.clone().add(a.clone()));
        }), { numRuns: 200 });
    });
});

describe("property: mul commutativity — a * b = b * a", () => {
    it("holds for all pairs", () => {
        fc.assert(fc.property(arbitraryNumWithNeg, arbitraryNumWithNeg, (a, b) => {
            return closeEnough(a.clone().mul(b.clone()), b.clone().mul(a.clone()));
        }), { numRuns: 200 });
    });
});

// ---------------------------------------------------------------------------
// Associativity (approximate — floating-point rounding can produce tiny diffs)
// ---------------------------------------------------------------------------

describe("property: add associativity — (a + b) + c ≈ a + (b + c)", () => {
    it("holds within 1e-9 relative tolerance for same-exponent values", () => {
        fc.assert(fc.property(
            fc.integer({ min: 1, max: 99_999 }),
            fc.integer({ min: 1, max: 99_999 }),
            fc.integer({ min: 1, max: 99_999 }),
            (av, bv, cv) => {
                const lhs = ArbitraryNumber.from(av).add(ArbitraryNumber.from(bv)).add(ArbitraryNumber.from(cv));
                const rhs = ArbitraryNumber.from(av).add(ArbitraryNumber.from(bv).add(ArbitraryNumber.from(cv)));
                return closeEnough(lhs, rhs);
            }), { numRuns: 300 });
    });
});

describe("property: mul associativity — (a * b) * c ≈ a * (b * c)", () => {
    it("holds within 1e-9 relative tolerance for small coefficients", () => {
        fc.assert(fc.property(
            fc.integer({ min: 100, max: 500 }).map(n => n / 100),
            fc.integer({ min: 100, max: 500 }).map(n => n / 100),
            fc.integer({ min: 100, max: 500 }).map(n => n / 100),
            (av, bv, cv) => {
                const lhs = ArbitraryNumber.from(av).mul(ArbitraryNumber.from(bv)).mul(ArbitraryNumber.from(cv));
                const rhs = ArbitraryNumber.from(av).mul(ArbitraryNumber.from(bv).mul(ArbitraryNumber.from(cv)));
                return closeEnough(lhs, rhs);
            }), { numRuns: 300 });
    });
});

// ---------------------------------------------------------------------------
// Distributivity
// ---------------------------------------------------------------------------

describe("property: distributivity — a * (b + c) ≈ a*b + a*c", () => {
    it("holds within 1e-9 for same-magnitude values", () => {
        fc.assert(fc.property(
            fc.integer({ min: 1, max: 9999 }),
            fc.integer({ min: 1, max: 9999 }),
            fc.integer({ min: 1, max: 9999 }),
            (av, bv, cv) => {
                const lhs = ArbitraryNumber.from(av).mul(ArbitraryNumber.from(bv).add(ArbitraryNumber.from(cv)));
                const rhs = ArbitraryNumber.from(av).mul(ArbitraryNumber.from(bv)).add(ArbitraryNumber.from(av).mul(ArbitraryNumber.from(cv)));
                return closeEnough(lhs, rhs);
            }), { numRuns: 200 });
    });
});

// ---------------------------------------------------------------------------
// sqrt / pow round-trip
// ---------------------------------------------------------------------------

describe("property: sqrt(x)^2 ≈ x", () => {
    it("holds for positive arbitraryNumbers", () => {
        fc.assert(fc.property(arbitraryNum, (a) => {
            return closeEnough(a.clone().sqrt().pow(2), a, 1e-8);
        }), { numRuns: 200 });
    });
});

describe("property: pow(2).sqrt() ≈ x (= pow(0.5) round-trip)", () => {
    it("holds for positive values with exponent=0", () => {
        fc.assert(fc.property(
            fc.integer({ min: 100, max: 999 }).map(n => new ArbitraryNumber(n / 100, 0)),
            (a) => {
                return closeEnough(a.clone().pow(2).sqrt(), a, 1e-7);
            }), { numRuns: 200 });
    });
});

// ---------------------------------------------------------------------------
// toNumber / from round-trip
// ---------------------------------------------------------------------------

describe("property: ArbitraryNumber.from(n).toNumber() ≈ n", () => {
    it("holds for finite JS numbers in [-1e12, 1e12]", () => {
        fc.assert(fc.property(
            fc.integer({ min: -1_000_000_000, max: 1_000_000_000 }).filter(n => n !== 0),
            (n) => {
                const an = ArbitraryNumber.from(n);
                const back = an.toNumber();
                const rel = Math.abs(n - back) / Math.abs(n);
                return rel < 1e-12;
            }), { numRuns: 500 });
    });
});

// ---------------------------------------------------------------------------
// fromJSON / toJSON round-trip
// ---------------------------------------------------------------------------

describe("property: fromJSON(toJSON(x)) equals x", () => {
    it("holds for all ArbitraryNumbers", () => {
        fc.assert(fc.property(arbitraryNumWithNeg, (a) => {
            const serialized = JSON.parse(JSON.stringify(a.toJSON()));
            return ArbitraryNumber.fromJSON(serialized).equals(a);
        }), { numRuns: 300 });
    });
});

// ---------------------------------------------------------------------------
// Fused op equivalence — use fresh instances for each side of the comparison
// ---------------------------------------------------------------------------

describe("property: mulAdd fused = mul + add", () => {
    it("holds for all inputs", () => {
        fc.assert(fc.property(arbitraryNum, arbitraryNum, arbitraryNum, (a, b, c) => {
            const fused = a.clone().mulAdd(b.clone(), c.clone());
            const stepped = a.clone().mul(b.clone()).add(c.clone());
            return closeEnough(fused, stepped);
        }), { numRuns: 200 });
    });
});

describe("property: addMul fused = add + mul", () => {
    it("holds for all inputs", () => {
        fc.assert(fc.property(arbitraryNum, arbitraryNum, arbitraryNum, (a, b, c) => {
            const fused = a.clone().addMul(b.clone(), c.clone());
            const stepped = a.clone().add(b.clone()).mul(c.clone());
            return closeEnough(fused, stepped);
        }), { numRuns: 200 });
    });
});

describe("property: mulDiv fused = mul + div", () => {
    it("holds for all inputs", () => {
        fc.assert(fc.property(arbitraryNum, arbitraryNum, positiveNumber, (a, b, cv) => {
            const c = ArbitraryNumber.from(cv);
            const fused = a.clone().mulDiv(b.clone(), c.clone());
            const stepped = a.clone().mul(b.clone()).div(c.clone());
            return closeEnough(fused, stepped);
        }), { numRuns: 200 });
    });
});

describe("property: divAdd fused = div + add", () => {
    it("holds for all inputs", () => {
        fc.assert(fc.property(arbitraryNum, positiveNumber, arbitraryNum, (a, bv, c) => {
            const b = ArbitraryNumber.from(bv);
            const fused = a.clone().divAdd(b.clone(), c.clone());
            const stepped = a.clone().div(b.clone()).add(c.clone());
            return closeEnough(fused, stepped);
        }), { numRuns: 200 });
    });
});

// ---------------------------------------------------------------------------
// sumArray equivalence
// ---------------------------------------------------------------------------

describe("property: sumArray ≈ chained add for small arrays", () => {
    it("holds for arrays of 1-8 positive ArbitraryNumbers", () => {
        fc.assert(fc.property(
            fc.array(arbitraryNum, { minLength: 1, maxLength: 8 }),
            (arr) => {
                const summed = ArbitraryNumber.sumArray(arr);
                // Use a fresh accumulator — don't mutate array elements
                const chained = arr.reduce((acc, n) => acc.add(n.clone()), ArbitraryNumber.from(0));
                return closeEnough(summed, chained, 1e-8);
            }), { numRuns: 200 });
    });
});
