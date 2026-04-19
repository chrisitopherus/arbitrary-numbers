/**
 * Arithmetic benchmarks — mitata
 *
 * Each bench body loops N times over a pre-built operand array so mitata's
 * per-call overhead is amortised away. Because ArbitraryNumber v2 mutates
 * in-place, operands are cloned into a fresh working copy at the top of each
 * bench iteration (outside the inner loop). This keeps the per-op cost pure
 * while correctly reflecting the mutable semantics.
 *
 * The inner loop folds `i` into the coefficient so V8 cannot dead-code-eliminate
 * the work. Operands stay within the same exponent range across all iterations
 * so the measured code path is stable.
 *
 * Scenarios
 * ─────────
 * small          both operands ≤ 1 000            exponent diff = 0
 * medium         operands ~ 1e6 – 1e9             exponent diff ≤ 3
 * large          operands ~ 1e50 – 1e60           well past MAX_SAFE_INT
 * near_cutoff    exponent diff = 14               both operands contribute
 * beyond_cutoff  exponent diff = 20               smaller discarded (short-circuit)
 */

import { bench, do_not_optimize, group, run, summary } from "mitata";
import { ArbitraryNumber } from "../src/core/ArbitraryNumber";

const N = 100; // inner loop iterations per bench invocation

// ─── Seed arrays — used to build fresh working copies each bench call ────────

const seedSmallA  = Array.from({ length: N }, (_, i) => new ArbitraryNumber(1.5 + i * 0.001, 2));
const seedSmallB  = Array.from({ length: N }, (_, i) => new ArbitraryNumber(2.5 + i * 0.001, 2));
const seedMediumA = Array.from({ length: N }, (_, i) => new ArbitraryNumber(1.5 + i * 0.001, 6));
const seedMediumB = Array.from({ length: N }, (_, i) => new ArbitraryNumber(3.2 + i * 0.001, 9));
const seedLargeA  = Array.from({ length: N }, (_, i) => new ArbitraryNumber(1.5 + i * 0.001, 50));
const seedLargeB  = Array.from({ length: N }, (_, i) => new ArbitraryNumber(3.2 + i * 0.001, 60));
const seedNcA     = Array.from({ length: N }, (_, i) => new ArbitraryNumber(1.5 + i * 0.001, 18));
const seedNcB     = Array.from({ length: N }, (_, i) => new ArbitraryNumber(1.0 + i * 0.001,  4));
const seedBcA     = Array.from({ length: N }, (_, i) => new ArbitraryNumber(1.5 + i * 0.001, 20));
const seedBcB     = Array.from({ length: N }, (_, i) => new ArbitraryNumber(1.0 + i * 0.001,  0));

// Native number equivalents (immutable — no clone needed)
const smallNA  = Array.from({ length: N }, (_, i) => 150 + i * 0.1);
const smallNB  = Array.from({ length: N }, (_, i) => 250 + i * 0.1);
const mediumNA = Array.from({ length: N }, (_, i) => 1.5e6 + i);
const mediumNB = Array.from({ length: N }, (_, i) => 3.2e9 + i);
const largeNA  = Array.from({ length: N }, () => 1.5e50);
const largeNB  = Array.from({ length: N }, () => 3.2e60);
const ncNA     = Array.from({ length: N }, () => 1.5e18);
const ncNB     = Array.from({ length: N }, (_, i) => 1e4 + i);
const bcNA     = Array.from({ length: N }, () => 1.5e20);
const bcNB     = Array.from({ length: N }, (_, i) => 1 + i * 0.001);

// ─── Helpers ─────────────────────────────────────────────────────────────────

const clone = (arr: ArbitraryNumber[]) => arr.map(n => n.clone());

// ─── Construction / normalisation ─────────────────────────────────────────

summary(() => {
    group("construction — already normalised coefficient", () => {
        bench("native literal                    ", () => {
            let v = 0;
            for (let i = 0; i < N; i++) v = smallNA[i]!;
            do_not_optimize(v);
        });
        bench("ArbitraryNumber.from(number)      ", () => {
            let v: ArbitraryNumber = ArbitraryNumber.Zero;
            for (let i = 0; i < N; i++) v = ArbitraryNumber.from(smallNA[i]!);
            do_not_optimize(v);
        });
        bench("new ArbitraryNumber(1.5, 3)       ", () => {
            let v: ArbitraryNumber = ArbitraryNumber.Zero;
            for (let i = 0; i < N; i++) v = new ArbitraryNumber(seedSmallA[i]!.coefficient, 3);
            do_not_optimize(v);
        });
        bench("clone()                           ", () => {
            let v: ArbitraryNumber = ArbitraryNumber.Zero;
            for (let i = 0; i < N; i++) v = seedSmallA[i]!.clone();
            do_not_optimize(v);
        });
    });

    group("construction — coefficient needs normalisation", () => {
        bench("native manual (log10 + divide)    ", () => {
            let v = 0;
            for (let i = 0; i < N; i++) {
                const c = 15000 + i;
                const shift = Math.floor(Math.log10(Math.abs(c)));
                v = c / (10 ** shift);
            }
            do_not_optimize(v);
        });
        bench("new ArbitraryNumber(15000, 0)     ", () => {
            let v: ArbitraryNumber = ArbitraryNumber.Zero;
            for (let i = 0; i < N; i++) v = new ArbitraryNumber(15000 + i, 0);
            do_not_optimize(v);
        });
    });
});

// ─── add ──────────────────────────────────────────────────────────────────

summary(() => {
    group("add — small (exponent diff = 0)", () => {
        bench("native +       ", () => {
            let v = 0;
            for (let i = 0; i < N; i++) v = smallNA[i]! + smallNB[i]!;
            do_not_optimize(v);
        });
        bench("ArbitraryNumber", () => {
            const a = clone(seedSmallA), b = clone(seedSmallB);
            let v: ArbitraryNumber = ArbitraryNumber.Zero;
            for (let i = 0; i < N; i++) v = a[i]!.add(b[i]!);
            do_not_optimize(v);
        });
    });

    group("add — medium (exponent diff ≤ 3)", () => {
        bench("native +       ", () => {
            let v = 0;
            for (let i = 0; i < N; i++) v = mediumNA[i]! + mediumNB[i]!;
            do_not_optimize(v);
        });
        bench("ArbitraryNumber", () => {
            const a = clone(seedMediumA), b = clone(seedMediumB);
            let v: ArbitraryNumber = ArbitraryNumber.Zero;
            for (let i = 0; i < N; i++) v = a[i]!.add(b[i]!);
            do_not_optimize(v);
        });
    });

    group("add — large (exponent diff = 10, beyond MAX_SAFE_INT)", () => {
        bench("native +       ", () => {
            let v = 0;
            for (let i = 0; i < N; i++) v = largeNA[i]! + largeNB[i]!;
            do_not_optimize(v);
        });
        bench("ArbitraryNumber", () => {
            const a = clone(seedLargeA), b = clone(seedLargeB);
            let v: ArbitraryNumber = ArbitraryNumber.Zero;
            for (let i = 0; i < N; i++) v = a[i]!.add(b[i]!);
            do_not_optimize(v);
        });
    });

    group("add — near precision cutoff (diff = 14, both contribute)", () => {
        bench("native +       ", () => {
            let v = 0;
            for (let i = 0; i < N; i++) v = ncNA[i]! + ncNB[i]!;
            do_not_optimize(v);
        });
        bench("ArbitraryNumber", () => {
            const a = clone(seedNcA), b = clone(seedNcB);
            let v: ArbitraryNumber = ArbitraryNumber.Zero;
            for (let i = 0; i < N; i++) v = a[i]!.add(b[i]!);
            do_not_optimize(v);
        });
    });

    group("add — beyond precision cutoff (diff = 20, short-circuits)", () => {
        bench("native +       ", () => {
            let v = 0;
            for (let i = 0; i < N; i++) v = bcNA[i]! + bcNB[i]!;
            do_not_optimize(v);
        });
        bench("ArbitraryNumber", () => {
            const a = clone(seedBcA), b = clone(seedBcB);
            let v: ArbitraryNumber = ArbitraryNumber.Zero;
            for (let i = 0; i < N; i++) v = a[i]!.add(b[i]!);
            do_not_optimize(v);
        });
    });
});

// ─── sub ──────────────────────────────────────────────────────────────────

summary(() => {
    group("sub — small", () => {
        bench("native -       ", () => {
            let v = 0;
            for (let i = 0; i < N; i++) v = mediumNB[i]! - mediumNA[i]!;
            do_not_optimize(v);
        });
        bench("ArbitraryNumber", () => {
            const a = clone(seedMediumA), b = clone(seedMediumB);
            let v: ArbitraryNumber = ArbitraryNumber.Zero;
            for (let i = 0; i < N; i++) v = b[i]!.sub(a[i]!);
            do_not_optimize(v);
        });
    });

    group("sub — large (beyond MAX_SAFE_INT)", () => {
        bench("native -       ", () => {
            let v = 0;
            for (let i = 0; i < N; i++) v = largeNB[i]! - largeNA[i]!;
            do_not_optimize(v);
        });
        bench("ArbitraryNumber", () => {
            const a = clone(seedLargeA), b = clone(seedLargeB);
            let v: ArbitraryNumber = ArbitraryNumber.Zero;
            for (let i = 0; i < N; i++) v = b[i]!.sub(a[i]!);
            do_not_optimize(v);
        });
    });
});

// ─── mul ──────────────────────────────────────────────────────────────────

summary(() => {
    group("mul — small", () => {
        bench("native *       ", () => {
            let v = 0;
            for (let i = 0; i < N; i++) v = smallNA[i]! * smallNB[i]!;
            do_not_optimize(v);
        });
        bench("ArbitraryNumber", () => {
            const a = clone(seedSmallA), b = clone(seedSmallB);
            let v: ArbitraryNumber = ArbitraryNumber.Zero;
            for (let i = 0; i < N; i++) v = a[i]!.mul(b[i]!);
            do_not_optimize(v);
        });
    });

    group("mul — medium", () => {
        bench("native *       ", () => {
            let v = 0;
            for (let i = 0; i < N; i++) v = mediumNA[i]! * mediumNB[i]!;
            do_not_optimize(v);
        });
        bench("ArbitraryNumber", () => {
            const a = clone(seedMediumA), b = clone(seedMediumB);
            let v: ArbitraryNumber = ArbitraryNumber.Zero;
            for (let i = 0; i < N; i++) v = a[i]!.mul(b[i]!);
            do_not_optimize(v);
        });
    });

    group("mul — large (beyond MAX_SAFE_INT)", () => {
        bench("native *       ", () => {
            let v = 0;
            for (let i = 0; i < N; i++) v = largeNA[i]! * largeNB[i]!;
            do_not_optimize(v);
        });
        bench("ArbitraryNumber", () => {
            const a = clone(seedLargeA), b = clone(seedLargeB);
            let v: ArbitraryNumber = ArbitraryNumber.Zero;
            for (let i = 0; i < N; i++) v = a[i]!.mul(b[i]!);
            do_not_optimize(v);
        });
    });
});

// ─── div ──────────────────────────────────────────────────────────────────

summary(() => {
    group("div — small", () => {
        bench("native /       ", () => {
            let v = 0;
            for (let i = 0; i < N; i++) v = smallNB[i]! / smallNA[i]!;
            do_not_optimize(v);
        });
        bench("ArbitraryNumber", () => {
            const a = clone(seedSmallA), b = clone(seedSmallB);
            let v: ArbitraryNumber = ArbitraryNumber.Zero;
            for (let i = 0; i < N; i++) v = b[i]!.div(a[i]!);
            do_not_optimize(v);
        });
    });

    group("div — medium", () => {
        bench("native /       ", () => {
            let v = 0;
            for (let i = 0; i < N; i++) v = mediumNB[i]! / mediumNA[i]!;
            do_not_optimize(v);
        });
        bench("ArbitraryNumber", () => {
            const a = clone(seedMediumA), b = clone(seedMediumB);
            let v: ArbitraryNumber = ArbitraryNumber.Zero;
            for (let i = 0; i < N; i++) v = b[i]!.div(a[i]!);
            do_not_optimize(v);
        });
    });

    group("div — large (beyond MAX_SAFE_INT)", () => {
        bench("native /       ", () => {
            let v = 0;
            for (let i = 0; i < N; i++) v = largeNB[i]! / largeNA[i]!;
            do_not_optimize(v);
        });
        bench("ArbitraryNumber", () => {
            const a = clone(seedLargeA), b = clone(seedLargeB);
            let v: ArbitraryNumber = ArbitraryNumber.Zero;
            for (let i = 0; i < N; i++) v = b[i]!.div(a[i]!);
            do_not_optimize(v);
        });
    });
});

// ─── compareTo ────────────────────────────────────────────────────────────

summary(() => {
    group("compareTo — same exponent", () => {
        bench("native ternary ", () => {
            let v = 0;
            for (let i = 0; i < N; i++) v = smallNA[i]! < smallNB[i]! ? -1 : smallNA[i]! > smallNB[i]! ? 1 : 0;
            do_not_optimize(v);
        });
        bench("ArbitraryNumber", () => {
            let v = 0;
            for (let i = 0; i < N; i++) v = seedSmallA[i]!.compareTo(seedSmallB[i]!);
            do_not_optimize(v);
        });
    });

    group("compareTo — large exponents (beyond MAX_SAFE_INT)", () => {
        bench("native ternary ", () => {
            let v = 0;
            for (let i = 0; i < N; i++) v = largeNA[i]! < largeNB[i]! ? -1 : largeNA[i]! > largeNB[i]! ? 1 : 0;
            do_not_optimize(v);
        });
        bench("ArbitraryNumber", () => {
            let v = 0;
            for (let i = 0; i < N; i++) v = seedLargeA[i]!.compareTo(seedLargeB[i]!);
            do_not_optimize(v);
        });
    });
});

// ─── Chained — idle-game tick ─────────────────────────────────────────────

summary(() => {
    const seedGold   = Array.from({ length: N }, (_, i) => new ArbitraryNumber(1.0 + i * 0.001,   9));
    const seedGps    = Array.from({ length: N }, (_, i) => new ArbitraryNumber(1.5 + i * 0.001,   3));
    const seedMult   = Array.from({ length: N }, (_, i) => new ArbitraryNumber(2.0 + i * 0.001,   2));
    const seedDt     = Array.from({ length: N }, (_, i) => new ArbitraryNumber(1.667 + i * 0.001, -2));
    const nGold      = Array.from({ length: N }, (_, i) => 1e9 + i);
    const nGps       = Array.from({ length: N }, (_, i) => 1500 + i * 0.1);
    const nMult      = Array.from({ length: N }, (_, i) => 200 + i * 0.01);
    const nDt        = Array.from({ length: N }, (_, i) => 0.01667 + i * 0.00001);

    group("chained — idle-game tick  (gold += gps × mult × dt)", () => {
        bench("native expressions ", () => {
            let v = 0;
            for (let i = 0; i < N; i++) v = nGold[i]! + nGps[i]! * nMult[i]! * nDt[i]!;
            do_not_optimize(v);
        });
        bench("ArbitraryNumber     ", () => {
            const gold = clone(seedGold), gps = clone(seedGps);
            const mult = clone(seedMult), dt  = clone(seedDt);
            let v: ArbitraryNumber = ArbitraryNumber.Zero;
            for (let i = 0; i < N; i++) v = gold[i]!.add(gps[i]!.mul(mult[i]!).mul(dt[i]!));
            do_not_optimize(v);
        });
    });
});

// ─── Fused operations ─────────────────────────────────────────────────────

summary(() => {
    const seedBase = Array.from({ length: N }, (_, i) => new ArbitraryNumber(1.5 + i * 0.001, 6));
    const seedMult = Array.from({ length: N }, (_, i) => new ArbitraryNumber(2.0 + i * 0.001, 3));
    const seedAdd  = Array.from({ length: N }, (_, i) => new ArbitraryNumber(3.0 + i * 0.001, 8));

    group("fused mulAdd vs chained mul+add", () => {
        bench("chained  .mul().add()", () => {
            const base = clone(seedBase), mult = clone(seedMult), add = clone(seedAdd);
            let v: ArbitraryNumber = ArbitraryNumber.Zero;
            for (let i = 0; i < N; i++) v = base[i]!.mul(mult[i]!).add(add[i]!);
            do_not_optimize(v);
        });
        bench("fused    .mulAdd()    ", () => {
            const base = clone(seedBase), mult = clone(seedMult), add = clone(seedAdd);
            let v: ArbitraryNumber = ArbitraryNumber.Zero;
            for (let i = 0; i < N; i++) v = base[i]!.mulAdd(mult[i]!, add[i]!);
            do_not_optimize(v);
        });
    });

    group("fused addMul vs chained add+mul", () => {
        bench("chained  .add().mul()", () => {
            const base = clone(seedBase), mult = clone(seedMult), add = clone(seedAdd);
            let v: ArbitraryNumber = ArbitraryNumber.Zero;
            for (let i = 0; i < N; i++) v = base[i]!.add(add[i]!).mul(mult[i]!);
            do_not_optimize(v);
        });
        bench("fused    .addMul()   ", () => {
            const base = clone(seedBase), mult = clone(seedMult), add = clone(seedAdd);
            let v: ArbitraryNumber = ArbitraryNumber.Zero;
            for (let i = 0; i < N; i++) v = base[i]!.addMul(add[i]!, mult[i]!);
            do_not_optimize(v);
        });
    });
});

summary(() => {
    const seedSources50 = Array.from({ length: 50 }, (_, i) =>
        new ArbitraryNumber(1.0 + (i % 9) * 0.1, i % 8));

    group("sumArray(50) vs chained add(50)", () => {
        bench("chained  .reduce(.add)", () => {
            const sources = clone(seedSources50);
            do_not_optimize(
                sources.reduce((acc, v) => acc.add(v), new ArbitraryNumber(0, 0))
            );
        });
        bench("sumArray([50])        ", () =>
            do_not_optimize(ArbitraryNumber.sumArray(seedSources50)));
    });
});

// ─── sqrt vs pow(0.5) ────────────────────────────────────────────────────

summary(() => {
    const seedSqrt = Array.from({ length: N }, (_, i) => new ArbitraryNumber(1.5 + i * 0.001, 6));

    group("sqrt() vs pow(0.5)", () => {
        bench("pow(0.5)", () => {
            const arr = clone(seedSqrt);
            let v: ArbitraryNumber = ArbitraryNumber.Zero;
            for (let i = 0; i < N; i++) v = arr[i]!.pow(0.5);
            do_not_optimize(v);
        });
        bench("sqrt()  ", () => {
            const arr = clone(seedSqrt);
            let v: ArbitraryNumber = ArbitraryNumber.Zero;
            for (let i = 0; i < N; i++) v = arr[i]!.sqrt();
            do_not_optimize(v);
        });
    });
});

// ─── Tier 2 fused vs chained ─────────────────────────────────────────────

summary(() => {
    const seedBase = Array.from({ length: N }, (_, i) => new ArbitraryNumber(1.5 + i * 0.001, 6));
    const seedMult = Array.from({ length: N }, (_, i) => new ArbitraryNumber(2.0 + i * 0.001, 3));
    const seedOp   = Array.from({ length: N }, (_, i) => new ArbitraryNumber(3.0 + i * 0.001, 8));

    group("fused mulSub vs chained mul+sub", () => {
        bench("chained  .mul().sub()", () => {
            const base = clone(seedBase), mult = clone(seedMult), op = clone(seedOp);
            let v: ArbitraryNumber = ArbitraryNumber.Zero;
            for (let i = 0; i < N; i++) v = base[i]!.mul(mult[i]!).sub(op[i]!);
            do_not_optimize(v);
        });
        bench("fused    .mulSub()   ", () => {
            const base = clone(seedBase), mult = clone(seedMult), op = clone(seedOp);
            let v: ArbitraryNumber = ArbitraryNumber.Zero;
            for (let i = 0; i < N; i++) v = base[i]!.mulSub(mult[i]!, op[i]!);
            do_not_optimize(v);
        });
    });

    group("fused subMul vs chained sub+mul", () => {
        bench("chained  .sub().mul()", () => {
            const base = clone(seedBase), mult = clone(seedMult), op = clone(seedOp);
            let v: ArbitraryNumber = ArbitraryNumber.Zero;
            for (let i = 0; i < N; i++) v = base[i]!.sub(op[i]!).mul(mult[i]!);
            do_not_optimize(v);
        });
        bench("fused    .subMul()   ", () => {
            const base = clone(seedBase), mult = clone(seedMult), op = clone(seedOp);
            let v: ArbitraryNumber = ArbitraryNumber.Zero;
            for (let i = 0; i < N; i++) v = base[i]!.subMul(op[i]!, mult[i]!);
            do_not_optimize(v);
        });
    });

    group("fused divAdd vs chained div+add", () => {
        bench("chained  .div().add()", () => {
            const base = clone(seedBase), mult = clone(seedMult), op = clone(seedOp);
            let v: ArbitraryNumber = ArbitraryNumber.Zero;
            for (let i = 0; i < N; i++) v = base[i]!.div(mult[i]!).add(op[i]!);
            do_not_optimize(v);
        });
        bench("fused    .divAdd()   ", () => {
            const base = clone(seedBase), mult = clone(seedMult), op = clone(seedOp);
            let v: ArbitraryNumber = ArbitraryNumber.Zero;
            for (let i = 0; i < N; i++) v = base[i]!.divAdd(mult[i]!, op[i]!);
            do_not_optimize(v);
        });
    });
});

// ─── formula.applyInPlace vs formula.apply ────────────────────────────────

import { formula } from "../src/core/AnFormula";

summary(() => {
    const seedBase    = Array.from({ length: N }, (_, i) => new ArbitraryNumber(1.5 + i * 0.001, 6));
    const multiplier  = new ArbitraryNumber(2.0, 3);
    const bonus       = new ArbitraryNumber(3.0, 8);
    const penalty     = new ArbitraryNumber(1.0, 7);

    const f = formula().mulAdd(multiplier, bonus).sub(penalty);

    group("formula.apply vs formula.applyInPlace (3-step formula)", () => {
        bench("apply()        (clones input)", () => {
            let v: ArbitraryNumber = ArbitraryNumber.Zero;
            for (let i = 0; i < N; i++) v = f.apply(seedBase[i]!);
            do_not_optimize(v);
        });
        bench("applyInPlace() (mutates input)", () => {
            const arr = clone(seedBase);
            for (let i = 0; i < N; i++) f.applyInPlace(arr[i]!);
            do_not_optimize(arr[N - 1]!);
        });
    });
});

await run({ colors: true });
