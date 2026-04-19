/**
 * Comprehensive negative-number arithmetic tests.
 *
 * Covers: construction, add/sub mixed signs, mul/div sign rules, fused ops,
 * pow with negative base, comparisons across sign boundaries, abs/negate,
 * scale-cutoff with negative operands, and round-trip serialisation.
 */
import { describe, it, expect } from "vitest";
import { ArbitraryNumber } from "../../src/core/ArbitraryNumber";

const num = (v: number) => ArbitraryNumber.from(v);
const raw = (c: number, e: number) => new ArbitraryNumber(c, e);

function approxEqual(a: ArbitraryNumber, b: ArbitraryNumber, tol = 1e-9): boolean {
    if (a.coefficient === 0 && b.coefficient === 0) return true;
    if (a.exponent !== b.exponent) return false;

    const rel = Math.abs(a.coefficient - b.coefficient) / Math.max(Math.abs(a.coefficient), Math.abs(b.coefficient));
    return rel <= tol;
}

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

describe("negative — construction", () => {
    it("negative coefficient normalises to [-10, -1)", () => {
        const n = num(-1500);
        expect(n.coefficient).toBeCloseTo(-1.5, 10);
        expect(n.exponent).toBe(3);
    });

    it("raw(-15, 3) normalises to {c: -1.5, e: 4}", () => {
        const n = raw(-15, 3);
        expect(n.coefficient).toBeCloseTo(-1.5, 10);
        expect(n.exponent).toBe(4);
    });

    it("raw(-0.5, 0) normalises to {c: -5, e: -1}", () => {
        const n = raw(-0.5, 0);
        expect(n.coefficient).toBeCloseTo(-5, 10);
        expect(n.exponent).toBe(-1);
    });

    it("coefficient stays in (-10, -1] for a wide range of negative inputs", () => {
        const values = [-1, -9.99, -10, -1000, -1e10, -0.001, -0.1, -3.14];
        for (const v of values) {
            const n = num(v);
            expect(n.coefficient).toBeLessThan(0);
            expect(Math.abs(n.coefficient)).toBeGreaterThanOrEqual(1);
            expect(Math.abs(n.coefficient)).toBeLessThan(10);
        }
    });
});

// ---------------------------------------------------------------------------
// Addition — sign combinations
// ---------------------------------------------------------------------------

describe("negative — addition sign combinations", () => {
    it("neg + neg = more negative: −1500 + −2500 = −4000", () => {
        expect(num(-1500).add(num(-2500)).equals(num(-4000))).toBe(true);
    });

    it("pos + neg (pos wins): 3000 + (−1000) = 2000", () => {
        expect(num(3000).add(num(-1000)).equals(num(2000))).toBe(true);
    });

    it("pos + neg (neg wins): 1000 + (−3000) = −2000", () => {
        expect(num(1000).add(num(-3000)).equals(num(-2000))).toBe(true);
    });

    it("neg + pos (neg wins): −3000 + 1000 = −2000", () => {
        expect(num(-3000).add(num(1000)).equals(num(-2000))).toBe(true);
    });

    it("neg + pos (pos wins): −1000 + 3000 = 2000", () => {
        expect(num(-1000).add(num(3000)).equals(num(2000))).toBe(true);
    });

    it("additive inverse: a + (−a) = 0 for negative a", () => {
        expect(num(-1500).add(num(1500)).isZero()).toBe(true);
    });

    it("additive inverse: (−a) + (−a) + a + a = 0", () => {
        const result = num(-500).add(num(-500)).add(num(500)).add(num(500));
        expect(result.isZero()).toBe(true);
    });

    it("neg + neg at different exponents: −1e6 + −1e3 ≈ −1e6", () => {
        const result = raw(-1, 6).add(raw(-1, 3));
        expect(result.isNegative()).toBe(true);
        expect(result.exponent).toBe(6);
        expect(result.coefficient).toBeLessThan(-1);
    });

    it("pos + neg that nearly cancels: 1.0001e6 + (−1e6) = tiny positive", () => {
        const a = raw(1.0001, 6);
        const b = raw(-1, 6);
        const result = a.add(b);
        expect(result.isPositive()).toBe(true);
        expect(result.exponent).toBeLessThan(6);
    });

    it("neg + pos that nearly cancels: −1.0001e6 + 1e6 = tiny negative", () => {
        const a = raw(-1.0001, 6);
        const b = raw(1, 6);
        const result = a.add(b);
        expect(result.isNegative()).toBe(true);
        expect(result.exponent).toBeLessThan(6);
    });

    it("neg large scale + tiny pos — tiny pos is negligible at cutoff+1", () => {
        const huge = raw(-1, 20);
        const tiny = raw(1, 0);
        const result = huge.clone().add(tiny);
        expect(approxEqual(result, huge)).toBe(true);
    });

    it("neg + neg overflow normalises correctly: −5000 + −6000 = −11000", () => {
        expect(num(-5000).add(num(-6000)).equals(num(-11000))).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Subtraction — sign combinations
// ---------------------------------------------------------------------------

describe("negative — subtraction sign combinations", () => {
    it("neg − pos = more negative: −2000 − 1000 = −3000", () => {
        expect(num(-2000).sub(num(1000)).equals(num(-3000))).toBe(true);
    });

    it("pos − neg = sum: 2000 − (−1000) = 3000", () => {
        expect(num(2000).sub(num(-1000)).equals(num(3000))).toBe(true);
    });

    it("neg − neg (first more negative): −3000 − (−1000) = −2000", () => {
        expect(num(-3000).sub(num(-1000)).equals(num(-2000))).toBe(true);
    });

    it("neg − neg (second more negative): −1000 − (−3000) = 2000", () => {
        expect(num(-1000).sub(num(-3000)).equals(num(2000))).toBe(true);
    });

    it("neg − neg cancels: −1500 − (−1500) = 0", () => {
        expect(num(-1500).sub(num(-1500)).isZero()).toBe(true);
    });

    it("0 − neg = positive: 0 − (−1500) = 1500", () => {
        expect(ArbitraryNumber.Zero.clone().sub(num(-1500)).equals(num(1500))).toBe(true);
    });

    it("a − b = a + (−b) identity holds for mixed signs", () => {
        const pairs: Array<[number, number]> = [
            [5000, -2000],
            [-5000, 2000],
            [-5000, -2000],
            [1, -1],
        ];
        for (const [av, bv] of pairs) {
            const a1 = num(av), b1 = num(bv);
            const a2 = num(av), b2 = num(bv);
            expect(approxEqual(a1.sub(b1), a2.add(b2.clone().mul(raw(-1, 0))))).toBe(true);
        }
    });
});

// ---------------------------------------------------------------------------
// Multiplication — sign rules
// ---------------------------------------------------------------------------

describe("negative — multiplication sign rules", () => {
    it("pos × pos = pos", () => {
        expect(num(3).mul(num(4)).isPositive()).toBe(true);
        expect(num(3).mul(num(4)).equals(num(12))).toBe(true);
    });

    it("neg × pos = neg", () => {
        expect(num(-3).mul(num(4)).isNegative()).toBe(true);
        expect(num(-3).mul(num(4)).equals(num(-12))).toBe(true);
    });

    it("pos × neg = neg", () => {
        expect(num(3).mul(num(-4)).isNegative()).toBe(true);
        expect(num(3).mul(num(-4)).equals(num(-12))).toBe(true);
    });

    it("neg × neg = pos", () => {
        expect(num(-3).mul(num(-4)).isPositive()).toBe(true);
        expect(num(-3).mul(num(-4)).equals(num(12))).toBe(true);
    });

    it("neg × zero = zero", () => {
        expect(num(-3000).mul(ArbitraryNumber.Zero).isZero()).toBe(true);
    });

    it("commutativity holds across signs: (−a) × b = b × (−a)", () => {
        const a = num(-3000), b = num(2000);
        expect(approxEqual(a.clone().mul(b.clone()), b.clone().mul(a.clone()))).toBe(true);
    });

    it("associativity: ((−a) × b) × c = (−a) × (b × c)", () => {
        const a = raw(-1.5, 3), b = raw(2, 2), c = raw(3, 1);
        const lhs = a.clone().mul(b.clone()).mul(c.clone());
        const rhs = a.clone().mul(b.clone().mul(c.clone()));
        expect(approxEqual(lhs, rhs)).toBe(true);
    });

    it("large-exponent negative × positive keeps correct sign and exponent", () => {
        // −1.5e300 × 2e100 = −3e400 (exponents add, coefficients multiply: −1.5×2=−3, already normalised)
        const result = raw(-1.5, 300).mul(raw(2, 100));
        expect(result.isNegative()).toBe(true);
        expect(result.exponent).toBe(400);
        expect(result.coefficient).toBeCloseTo(-3, 9);
    });

    it("three negatives multiplied = negative", () => {
        const result = num(-2).mul(num(-3)).mul(num(-4));
        expect(result.isNegative()).toBe(true);
        expect(result.equals(num(-24))).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Division — sign rules
// ---------------------------------------------------------------------------

describe("negative — division sign rules", () => {
    it("neg / pos = neg", () => {
        expect(num(-12).div(num(4)).equals(num(-3))).toBe(true);
    });

    it("pos / neg = neg", () => {
        expect(num(12).div(num(-4)).equals(num(-3))).toBe(true);
    });

    it("neg / neg = pos", () => {
        expect(num(-12).div(num(-4)).equals(num(3))).toBe(true);
    });

    it("(−a) / (−a) = 1", () => {
        expect(approxEqual(num(-1500).div(num(-1500)), ArbitraryNumber.One)).toBe(true);
    });

    it("(neg × pos) / pos round-trips: (−6 × 3) / 3 = −6", () => {
        const result = num(-6).mul(num(3)).div(num(3));
        expect(approxEqual(result, num(-6))).toBe(true);
    });

    it("large-exponent neg / neg produces positive", () => {
        const result = raw(-1.5, 300).div(raw(-3, 100));
        expect(result.isPositive()).toBe(true);
        expect(result.exponent).toBe(199);
        expect(result.coefficient).toBeCloseTo(5, 9);
    });
});

// ---------------------------------------------------------------------------
// Fused ops with negative numbers
// ---------------------------------------------------------------------------

describe("negative — fused mulAdd", () => {
    it("(neg × pos) + pos: (−2 × 3) + 10 = 4", () => {
        const result = num(-2).mulAdd(num(3), num(10));
        expect(result.equals(num(4))).toBe(true);
    });

    it("(pos × neg) + pos: (2 × −3) + 10 = 4", () => {
        const result = num(2).mulAdd(num(-3), num(10));
        expect(result.equals(num(4))).toBe(true);
    });

    it("(neg × neg) + neg: (−2 × −3) + (−10) = −4", () => {
        const result = num(-2).mulAdd(num(-3), num(-10));
        expect(result.equals(num(-4))).toBe(true);
    });

    it("matches .mul().add() for all sign combinations", () => {
        const signs: Array<[number, number, number]> = [
            [-2, 3, 4],
            [2, -3, 4],
            [-2, -3, 4],
            [-2, 3, -4],
            [2, -3, -4],
            [-2, -3, -4],
        ];
        for (const [a, m, addend] of signs) {
            const fused = num(a).mulAdd(num(m), num(addend));
            const ref   = num(a).mul(num(m)).add(num(addend));
            expect(approxEqual(fused, ref)).toBe(true);
        }
    });
});

describe("negative — fused mulSub", () => {
    it("(neg × pos) − pos: (−2 × 3) − 4 = −10", () => {
        const result = num(-2).mulSub(num(3), num(4));
        expect(result.equals(num(-10))).toBe(true);
    });

    it("(pos × pos) − neg: (2 × 3) − (−4) = 10", () => {
        const result = num(2).mulSub(num(3), num(-4));
        expect(result.equals(num(10))).toBe(true);
    });

    it("matches .mul().sub() for all sign combinations", () => {
        const signs: Array<[number, number, number]> = [
            [-2, 3, 4],
            [2, -3, 4],
            [-2, -3, 4],
            [-2, 3, -4],
            [2, -3, -4],
            [-2, -3, -4],
        ];
        for (const [a, m, s] of signs) {
            const fused = num(a).mulSub(num(m), num(s));
            const ref   = num(a).mul(num(m)).sub(num(s));
            expect(approxEqual(fused, ref)).toBe(true);
        }
    });
});

describe("negative — fused mulDiv", () => {
    it("(neg × pos) / pos: (−6 × 2) / 3 = −4", () => {
        expect(approxEqual(num(-6).mulDiv(num(2), num(3)), num(-4))).toBe(true);
    });

    it("(pos × pos) / neg: (6 × 2) / (−3) = −4", () => {
        expect(approxEqual(num(6).mulDiv(num(2), num(-3)), num(-4))).toBe(true);
    });

    it("(neg × neg) / neg: (−6 × −2) / (−3) = −4", () => {
        expect(approxEqual(num(-6).mulDiv(num(-2), num(-3)), num(-4))).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// pow with negative base
// ---------------------------------------------------------------------------

describe("negative — pow", () => {
    it("(−2)^2 = 4 (even exponent → positive)", () => {
        expect(approxEqual(num(-2).pow(2), num(4))).toBe(true);
    });

    it("(−2)^3 = −8 (odd exponent → negative)", () => {
        expect(approxEqual(num(-2).pow(3), num(-8))).toBe(true);
    });

    it("(−2)^4 = 16", () => {
        expect(approxEqual(num(-2).pow(4), num(16))).toBe(true);
    });

    it("(−10)^3 = −1000 normalises correctly", () => {
        expect(approxEqual(num(-10).pow(3), num(-1000))).toBe(true);
    });

    it("(−1.5)^2 ≈ 2.25", () => {
        expect(approxEqual(num(-1.5).pow(2), num(2.25))).toBe(true);
    });

    it("(−1.5e3)^2 ≈ 2.25e6", () => {
        expect(approxEqual(raw(-1.5, 3).pow(2), raw(2.25, 6), 1e-8)).toBe(true);
    });

    it("(−1)^n alternates sign correctly for n=1..10", () => {
        for (let n = 1; n <= 10; n++) {
            const result = num(-1).pow(n);
            const expectedSign = n % 2 === 0 ? 1 : -1;
            expect(result.coefficient * expectedSign).toBeGreaterThan(0);
        }
    });
});

// ---------------------------------------------------------------------------
// cbrt with negative base
// ---------------------------------------------------------------------------

describe("negative — cbrt", () => {
    it("cbrt(−8) = −2", () => {
        expect(approxEqual(num(-8).cbrt(), num(-2))).toBe(true);
    });

    it("cbrt(−27) = −3", () => {
        expect(approxEqual(num(-27).cbrt(), num(-3))).toBe(true);
    });

    it("cbrt(−1000) = −10", () => {
        expect(approxEqual(num(-1000).cbrt(), num(-10))).toBe(true);
    });

    it("cbrt(x)^3 ≈ x for negative values", () => {
        const cases = [-2, -5, -27, -100, -1e6, -1e9];
        for (const v of cases) {
            const n = num(v);
            const cubed = n.cbrt().pow(3);
            expect(approxEqual(cubed, n, 1e-6)).toBe(true);
        }
    });
});

// ---------------------------------------------------------------------------
// Comparison across sign boundaries
// ---------------------------------------------------------------------------

describe("negative — comparisons", () => {
    it("positive > 0 > negative", () => {
        const pos = num(1), neg = num(-1);
        expect(pos.greaterThan(ArbitraryNumber.Zero)).toBe(true);
        expect(ArbitraryNumber.Zero.greaterThan(neg)).toBe(true);
        expect(pos.greaterThan(neg)).toBe(true);
    });

    it("among negatives: larger magnitude = smaller value (−10000 < −1000)", () => {
        expect(num(-10000).lessThan(num(-1000))).toBe(true);
        expect(num(-1000).greaterThan(num(-10000))).toBe(true);
    });

    it("negative and positive are never equal", () => {
        expect(num(-5).equals(num(5))).toBe(false);
    });

    it("equals: −1500 === −1500", () => {
        expect(num(-1500).equals(num(-1500))).toBe(true);
    });

    it("compareTo(neg, pos) is negative (neg < pos)", () => {
        expect(num(-1).compareTo(num(1))).toBeLessThan(0);
    });

    it("compareTo(pos, neg) is positive", () => {
        expect(num(1).compareTo(num(-1))).toBeGreaterThan(0);
    });

    it("compareTo(neg, neg) ordering: −1 > −2", () => {
        expect(num(-1).compareTo(num(-2))).toBeGreaterThan(0);
    });

    it("large negative vs large positive — correct sign", () => {
        expect(raw(-1.5, 300).lessThan(raw(1.5, 300))).toBe(true);
        expect(raw(1.5, 300).greaterThan(raw(-1.5, 300))).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// abs and negate
// ---------------------------------------------------------------------------

describe("negative — abs and negate", () => {
    it("abs of negative = positive with same magnitude", () => {
        const n = num(-1500);
        const a = n.clone().abs();
        expect(a.isPositive()).toBe(true);
        expect(a.equals(num(1500))).toBe(true);
    });

    it("abs is idempotent: abs(abs(x)) = abs(x)", () => {
        const n = num(-1500);
        const a1 = n.clone().abs();
        const a2 = a1.clone().abs();
        expect(a1.equals(a2)).toBe(true);
    });

    it("|neg| = |pos| for same magnitude", () => {
        expect(num(-1500).clone().abs().equals(num(1500).clone().abs())).toBe(true);
    });

    it("negate flips sign: negate(−1500) = 1500", () => {
        expect(num(-1500).clone().negate().equals(num(1500))).toBe(true);
    });

    it("negate flips sign: negate(1500) = −1500", () => {
        expect(num(1500).clone().negate().equals(num(-1500))).toBe(true);
    });

    it("double negate = identity", () => {
        const n = num(-1500);
        expect(approxEqual(n.clone().negate().negate(), n)).toBe(true);
    });

    it("negate(0) = 0", () => {
        expect(ArbitraryNumber.Zero.clone().negate().isZero()).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Mixed sign — mathematical identities
// ---------------------------------------------------------------------------

describe("negative — distributive law", () => {
    it("a × (b + c) = a×b + a×c when a is negative", () => {
        const a = num(-3), b = num(4), c = num(5);
        const lhs = a.clone().mul(b.clone().add(c.clone()));
        const rhs = a.clone().mul(b.clone()).add(a.clone().mul(c.clone()));
        expect(approxEqual(lhs, rhs)).toBe(true);
    });

    it("(−a) × (b − c) = −a×b + a×c", () => {
        const a = num(3), b = num(10), c = num(4);
        const na = a.clone().negate();
        const lhs = na.clone().mul(b.clone().sub(c.clone()));
        const rhs = na.clone().mul(b.clone()).add(a.clone().mul(c.clone()));
        expect(approxEqual(lhs, rhs)).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Serialisation round-trip
// ---------------------------------------------------------------------------

describe("negative — serialisation round-trip", () => {
    it("toJSON / fromJSON round-trips a negative number", () => {
        const n = raw(-1.5, 6);
        const json = n.toJSON();
        const restored = ArbitraryNumber.fromJSON(json);
        expect(approxEqual(restored, n)).toBe(true);
    });

    it("toRawString / parse round-trips a negative number", () => {
        const n = raw(-1.5, 6);
        const s = n.toRawString();
        const restored = ArbitraryNumber.parse(s);
        expect(approxEqual(restored, n)).toBe(true);
    });

    it("toNumber preserves sign: toNumber(−1500) = −1500", () => {
        expect(num(-1500).toNumber()).toBe(-1500);
    });

    it("toNumber preserves sign for large negative: raw(−1.5, 5) = −150000", () => {
        expect(raw(-1.5, 5).toNumber()).toBe(-150000);
    });
});
