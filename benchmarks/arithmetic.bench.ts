/**
 * Arithmetic benchmarks — mitata
 *
 * Each bench body loops N times over stable operands so mitata's per-call
 * overhead is amortized away. The loop counter is folded into the input so
 * V8 cannot dead-code-eliminate the work. Operands stay within the same
 * exponent range across all iterations so the measured code path is stable
 * (no accidental short-circuit or overflow after a few iterations).
 *
 * Reported avg / N = per-operation cost of the library itself.
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
import { ArbitraryNumberArithmetic } from "../src/utility/ArbitraryNumberArithmetic";
import { chain } from "../src/core/AnChain";

const N = 100; // inner loop iterations per bench invocation

// ─── Pre-built operand arrays — vary the coefficient slightly to defeat DCE
//     while keeping exponents fixed so the hot code path stays constant.

const smallA  = Array.from({ length: N }, (_, i) => new ArbitraryNumber(1.5 + i * 0.001, 2));
const smallB  = Array.from({ length: N }, (_, i) => new ArbitraryNumber(2.5 + i * 0.001, 2));
const mediumA = Array.from({ length: N }, (_, i) => new ArbitraryNumber(1.5 + i * 0.001, 6));
const mediumB = Array.from({ length: N }, (_, i) => new ArbitraryNumber(3.2 + i * 0.001, 9));
const largeA  = Array.from({ length: N }, (_, i) => new ArbitraryNumber(1.5 + i * 0.001, 50));
const largeB  = Array.from({ length: N }, (_, i) => new ArbitraryNumber(3.2 + i * 0.001, 60));
const ncA     = Array.from({ length: N }, (_, i) => new ArbitraryNumber(1.5 + i * 0.001, 18));
const ncB     = Array.from({ length: N }, (_, i) => new ArbitraryNumber(1.0 + i * 0.001,  4));
const bcA     = Array.from({ length: N }, (_, i) => new ArbitraryNumber(1.5 + i * 0.001, 20));
const bcB     = Array.from({ length: N }, (_, i) => new ArbitraryNumber(1.0 + i * 0.001,  0));

// Native number equivalents
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

// ─── Construction / normalisation ─────────────────────────────────────────

summary(() => {
    group("construction — already normalised coefficient", () => {
        bench("native literal                    ", () => {
            let v = 0;
            for (let i = 0; i < N; i++) v = smallNA[i]!;
            do_not_optimize(v);
        });
        bench("ArbitraryNumber.from(number)      ", () => {
            let v = ArbitraryNumber.Zero;
            for (let i = 0; i < N; i++) v = ArbitraryNumber.from(smallNA[i]!);
            do_not_optimize(v);
        });
        bench("new ArbitraryNumber(1.5, 3)       ", () => {
            let v = ArbitraryNumber.Zero;
            for (let i = 0; i < N; i++) v = new ArbitraryNumber(smallA[i]!.coefficient, 3);
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
        bench("ArbitraryNumberArithmetic.normalize", () => {
            let v: ReturnType<typeof ArbitraryNumberArithmetic.normalize> = { coefficient: 0, exponent: 0 };
            for (let i = 0; i < N; i++)
                v = ArbitraryNumberArithmetic.normalize({ coefficient: 15000 + i, exponent: 0 });
            do_not_optimize(v);
        });
        bench("new ArbitraryNumber(15000, 0)     ", () => {
            let v = ArbitraryNumber.Zero;
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
            let v = ArbitraryNumber.Zero;
            for (let i = 0; i < N; i++) v = smallA[i]!.add(smallB[i]!);
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
            let v = ArbitraryNumber.Zero;
            for (let i = 0; i < N; i++) v = mediumA[i]!.add(mediumB[i]!);
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
            let v = ArbitraryNumber.Zero;
            for (let i = 0; i < N; i++) v = largeA[i]!.add(largeB[i]!);
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
            let v = ArbitraryNumber.Zero;
            for (let i = 0; i < N; i++) v = ncA[i]!.add(ncB[i]!);
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
            let v = ArbitraryNumber.Zero;
            for (let i = 0; i < N; i++) v = bcA[i]!.add(bcB[i]!);
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
            let v = ArbitraryNumber.Zero;
            for (let i = 0; i < N; i++) v = mediumB[i]!.sub(mediumA[i]!);
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
            let v = ArbitraryNumber.Zero;
            for (let i = 0; i < N; i++) v = largeB[i]!.sub(largeA[i]!);
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
            let v = ArbitraryNumber.Zero;
            for (let i = 0; i < N; i++) v = smallA[i]!.mul(smallB[i]!);
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
            let v = ArbitraryNumber.Zero;
            for (let i = 0; i < N; i++) v = mediumA[i]!.mul(mediumB[i]!);
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
            let v = ArbitraryNumber.Zero;
            for (let i = 0; i < N; i++) v = largeA[i]!.mul(largeB[i]!);
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
            let v = ArbitraryNumber.Zero;
            for (let i = 0; i < N; i++) v = smallB[i]!.div(smallA[i]!);
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
            let v = ArbitraryNumber.Zero;
            for (let i = 0; i < N; i++) v = mediumB[i]!.div(mediumA[i]!);
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
            let v = ArbitraryNumber.Zero;
            for (let i = 0; i < N; i++) v = largeB[i]!.div(largeA[i]!);
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
            for (let i = 0; i < N; i++) v = smallA[i]!.compareTo(smallB[i]!);
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
            for (let i = 0; i < N; i++) v = largeA[i]!.compareTo(largeB[i]!);
            do_not_optimize(v);
        });
    });
});

// ─── Chained — idle-game tick ─────────────────────────────────────────────

summary(() => {
    const goldArr   = Array.from({ length: N }, (_, i) => new ArbitraryNumber(1.0 + i * 0.001,   9));
    const gpsArr    = Array.from({ length: N }, (_, i) => new ArbitraryNumber(1.5 + i * 0.001,   3));
    const multArr   = Array.from({ length: N }, (_, i) => new ArbitraryNumber(2.0 + i * 0.001,   2));
    const dtArr     = Array.from({ length: N }, (_, i) => new ArbitraryNumber(1.667 + i * 0.001, -2));
    const nGold     = Array.from({ length: N }, (_, i) => 1e9 + i);
    const nGps      = Array.from({ length: N }, (_, i) => 1500 + i * 0.1);
    const nMult     = Array.from({ length: N }, (_, i) => 200 + i * 0.01);
    const nDt       = Array.from({ length: N }, (_, i) => 0.01667 + i * 0.00001);

    group("chained — idle-game tick  (gold += gps × mult × dt)", () => {
        bench("native expressions ", () => {
            let v = 0;
            for (let i = 0; i < N; i++) v = nGold[i]! + nGps[i]! * nMult[i]! * nDt[i]!;
            do_not_optimize(v);
        });
        bench("ArbitraryNumber     ", () => {
            let v = ArbitraryNumber.Zero;
            for (let i = 0; i < N; i++) v = goldArr[i]!.add(gpsArr[i]!.mul(multArr[i]!).mul(dtArr[i]!));
            do_not_optimize(v);
        });
    });
});

// ─── Fused operations ─────────────────────────────────────────────────────

summary(() => {
    const baseArr = Array.from({ length: N }, (_, i) => new ArbitraryNumber(1.5 + i * 0.001, 6));
    const multArr = Array.from({ length: N }, (_, i) => new ArbitraryNumber(2.0 + i * 0.001, 3));
    const addArr  = Array.from({ length: N }, (_, i) => new ArbitraryNumber(3.0 + i * 0.001, 8));

    group("fused mulAdd vs chained mul+add", () => {
        bench("chained  .mul().add()", () => {
            let v = ArbitraryNumber.Zero;
            for (let i = 0; i < N; i++) v = baseArr[i]!.mul(multArr[i]!).add(addArr[i]!);
            do_not_optimize(v);
        });
        bench("fused    .mulAdd()    ", () => {
            let v = ArbitraryNumber.Zero;
            for (let i = 0; i < N; i++) v = baseArr[i]!.mulAdd(multArr[i]!, addArr[i]!);
            do_not_optimize(v);
        });
    });

    group("fused addMul vs chained add+mul", () => {
        bench("chained  .add().mul()", () => {
            let v = ArbitraryNumber.Zero;
            for (let i = 0; i < N; i++) v = baseArr[i]!.add(addArr[i]!).mul(multArr[i]!);
            do_not_optimize(v);
        });
        bench("fused    .addMul()   ", () => {
            let v = ArbitraryNumber.Zero;
            for (let i = 0; i < N; i++) v = baseArr[i]!.addMul(addArr[i]!, multArr[i]!);
            do_not_optimize(v);
        });
    });
});

summary(() => {
    const sources50 = Array.from({ length: 50 }, (_, i) =>
        new ArbitraryNumber(1.0 + (i % 9) * 0.1, i % 8));

    group("sumArray(50) vs chained add(50)", () => {
        bench("chained  .reduce(.add)", () =>
            do_not_optimize(
                sources50.reduce((acc, v) => acc.add(v), ArbitraryNumber.Zero)
            ));
        bench("sumArray([50])        ", () =>
            do_not_optimize(ArbitraryNumber.sumArray(sources50)));
    });
});

// ─── sqrt vs pow(0.5) ────────────────────────────────────────────────────

summary(() => {
    // Use a fixed even exponent so sqrt() always takes the fast path and
    // the coefficient stays in [1,10) through the whole loop.
    const sqrtArr = Array.from({ length: N }, (_, i) => new ArbitraryNumber(1.5 + i * 0.001, 6));

    group("sqrt() vs pow(0.5)", () => {
        bench("pow(0.5)", () => {
            let v = ArbitraryNumber.Zero;
            for (let i = 0; i < N; i++) v = sqrtArr[i]!.pow(0.5);
            do_not_optimize(v);
        });
        bench("sqrt()  ", () => {
            let v = ArbitraryNumber.Zero;
            for (let i = 0; i < N; i++) v = sqrtArr[i]!.sqrt();
            do_not_optimize(v);
        });
    });
});

// ─── Tier 2 fused vs chained ─────────────────────────────────────────────

summary(() => {
    const baseArr = Array.from({ length: N }, (_, i) => new ArbitraryNumber(1.5 + i * 0.001, 6));
    const multArr = Array.from({ length: N }, (_, i) => new ArbitraryNumber(2.0 + i * 0.001, 3));
    const opArr   = Array.from({ length: N }, (_, i) => new ArbitraryNumber(3.0 + i * 0.001, 8));

    group("fused mulSub vs chained mul+sub", () => {
        bench("chained  .mul().sub()", () => {
            let v = ArbitraryNumber.Zero;
            for (let i = 0; i < N; i++) v = baseArr[i]!.mul(multArr[i]!).sub(opArr[i]!);
            do_not_optimize(v);
        });
        bench("fused    .mulSub()   ", () => {
            let v = ArbitraryNumber.Zero;
            for (let i = 0; i < N; i++) v = baseArr[i]!.mulSub(multArr[i]!, opArr[i]!);
            do_not_optimize(v);
        });
    });

    group("fused subMul vs chained sub+mul", () => {
        bench("chained  .sub().mul()", () => {
            let v = ArbitraryNumber.Zero;
            for (let i = 0; i < N; i++) v = baseArr[i]!.sub(opArr[i]!).mul(multArr[i]!);
            do_not_optimize(v);
        });
        bench("fused    .subMul()   ", () => {
            let v = ArbitraryNumber.Zero;
            for (let i = 0; i < N; i++) v = baseArr[i]!.subMul(opArr[i]!, multArr[i]!);
            do_not_optimize(v);
        });
    });

    group("fused divAdd vs chained div+add", () => {
        bench("chained  .div().add()", () => {
            let v = ArbitraryNumber.Zero;
            for (let i = 0; i < N; i++) v = baseArr[i]!.div(multArr[i]!).add(opArr[i]!);
            do_not_optimize(v);
        });
        bench("fused    .divAdd()   ", () => {
            let v = ArbitraryNumber.Zero;
            for (let i = 0; i < N; i++) v = baseArr[i]!.divAdd(multArr[i]!, opArr[i]!);
            do_not_optimize(v);
        });
    });
});

// ─── AnChain builder vs direct method chaining ──────────────────────────

summary(() => {
    const baseArr    = Array.from({ length: N }, (_, i) => new ArbitraryNumber(1.5 + i * 0.001, 6));
    const multArr    = Array.from({ length: N }, (_, i) => new ArbitraryNumber(2.0 + i * 0.001, 3));
    const bonusArr   = Array.from({ length: N }, (_, i) => new ArbitraryNumber(3.0 + i * 0.001, 8));
    const penaltyArr = Array.from({ length: N }, (_, i) => new ArbitraryNumber(1.0 + i * 0.001, 7));

    group("AnChain builder vs direct chaining (3-step formula)", () => {
        bench("direct   .mulAdd().sub()", () => {
            let v = ArbitraryNumber.Zero;
            for (let i = 0; i < N; i++) v = baseArr[i]!.mulAdd(multArr[i]!, bonusArr[i]!).sub(penaltyArr[i]!);
            do_not_optimize(v);
        });
        bench("chain()  .mulAdd().sub().done()", () => {
            let v = ArbitraryNumber.Zero;
            for (let i = 0; i < N; i++) v = chain(baseArr[i]!).mulAdd(multArr[i]!, bonusArr[i]!).sub(penaltyArr[i]!).done();
            do_not_optimize(v);
        });
    });
});

await run({ colors: true });
