/**
 * Arithmetic benchmarks — mitata
 *
 * Each `group` compares ArbitraryNumber against an equivalent native JS number
 * operation.  Native is listed first in every group so mitata uses it as the
 * reference point in summary output.
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

// ─── Pre-built operands ────────────────────────────────────────────────────
// Created once so each bench only measures the operation itself.

const small = {
    a:  new ArbitraryNumber(1.5, 2),  // 150
    b:  new ArbitraryNumber(2.5, 2),  // 250
    na: 150,
    nb: 250,
};
const medium = {
    a:  new ArbitraryNumber(1.5, 6),  // 1.5e6
    b:  new ArbitraryNumber(3.2, 9),  // 3.2e9
    na: 1.5e6,
    nb: 3.2e9,
};
const large = {
    a:  new ArbitraryNumber(1.5, 50), // 1.5e50
    b:  new ArbitraryNumber(3.2, 60), // 3.2e60
    na: 1.5e50,
    nb: 3.2e60,
};
const nearCutoff = {
    a:  new ArbitraryNumber(1.5, 18), // 1.5e18 — diff = 14, both contribute
    b:  new ArbitraryNumber(1.0,  4), // 1e4
    na: 1.5e18,
    nb: 1e4,
};
const beyondCutoff = {
    a:  new ArbitraryNumber(1.5, 20), // 1.5e20 — diff = 20, b discarded
    b:  new ArbitraryNumber(1.0,  0), // 1
    na: 1.5e20,
    nb: 1,
};

// ─── Construction / normalisation ─────────────────────────────────────────

summary(() => {
    group("construction — already normalised coefficient", () => {
        bench("native literal                    ", () => do_not_optimize(1500));
        bench("ArbitraryNumber.from(number)      ", () => do_not_optimize(ArbitraryNumber.from(1500)));
        bench("new ArbitraryNumber(1.5, 3)       ", () => do_not_optimize(new ArbitraryNumber(1.5, 3)));
    });

    group("construction — coefficient needs normalisation", () => {
        bench("native manual (log10 + divide)    ", () => {
            const c = 15000;
            const shift = Math.floor(Math.log10(Math.abs(c)));
            do_not_optimize(c / (10 ** shift));
        });
        bench("ArbitraryNumberArithmetic.normalize", () =>
            do_not_optimize(ArbitraryNumberArithmetic.normalize({ coefficient: 15000, exponent: 0 })));
        bench("new ArbitraryNumber(15000, 0)     ", () => do_not_optimize(new ArbitraryNumber(15000, 0)));
    });
});

// ─── add ──────────────────────────────────────────────────────────────────

summary(() => {
    group("add — small (exponent diff = 0)", () => {
        bench("native +       ", () => do_not_optimize(small.na + small.nb));
        bench("ArbitraryNumber", () => do_not_optimize(small.a.add(small.b)));
    });

    group("add — medium (exponent diff ≤ 3)", () => {
        bench("native +       ", () => do_not_optimize(medium.na + medium.nb));
        bench("ArbitraryNumber", () => do_not_optimize(medium.a.add(medium.b)));
    });

    group("add — large (exponent diff = 10, beyond MAX_SAFE_INT)", () => {
        bench("native +       ", () => do_not_optimize(large.na + large.nb));
        bench("ArbitraryNumber", () => do_not_optimize(large.a.add(large.b)));
    });

    group("add — near precision cutoff (diff = 14, both contribute)", () => {
        bench("native +       ", () => do_not_optimize(nearCutoff.na + nearCutoff.nb));
        bench("ArbitraryNumber", () => do_not_optimize(nearCutoff.a.add(nearCutoff.b)));
    });

    group("add — beyond precision cutoff (diff = 20, short-circuits)", () => {
        bench("native +       ", () => do_not_optimize(beyondCutoff.na + beyondCutoff.nb));
        bench("ArbitraryNumber", () => do_not_optimize(beyondCutoff.a.add(beyondCutoff.b)));
    });
});

// ─── sub ──────────────────────────────────────────────────────────────────

summary(() => {
    group("sub — small", () => {
        bench("native -       ", () => do_not_optimize(medium.nb - medium.na));
        bench("ArbitraryNumber", () => do_not_optimize(medium.b.sub(medium.a)));
    });

    group("sub — large (beyond MAX_SAFE_INT)", () => {
        bench("native -       ", () => do_not_optimize(large.nb - large.na));
        bench("ArbitraryNumber", () => do_not_optimize(large.b.sub(large.a)));
    });
});

// ─── mul ──────────────────────────────────────────────────────────────────

summary(() => {
    group("mul — small", () => {
        bench("native *       ", () => do_not_optimize(small.na * small.nb));
        bench("ArbitraryNumber", () => do_not_optimize(small.a.mul(small.b)));
    });

    group("mul — medium", () => {
        bench("native *       ", () => do_not_optimize(medium.na * medium.nb));
        bench("ArbitraryNumber", () => do_not_optimize(medium.a.mul(medium.b)));
    });

    group("mul — large (beyond MAX_SAFE_INT)", () => {
        bench("native *       ", () => do_not_optimize(large.na * large.nb));
        bench("ArbitraryNumber", () => do_not_optimize(large.a.mul(large.b)));
    });
});

// ─── div ──────────────────────────────────────────────────────────────────

summary(() => {
    group("div — small", () => {
        bench("native /       ", () => do_not_optimize(small.nb / small.na));
        bench("ArbitraryNumber", () => do_not_optimize(small.b.div(small.a)));
    });

    group("div — medium", () => {
        bench("native /       ", () => do_not_optimize(medium.nb / medium.na));
        bench("ArbitraryNumber", () => do_not_optimize(medium.b.div(medium.a)));
    });

    group("div — large (beyond MAX_SAFE_INT)", () => {
        bench("native /       ", () => do_not_optimize(large.nb / large.na));
        bench("ArbitraryNumber", () => do_not_optimize(large.b.div(large.a)));
    });
});

// ─── compareTo ────────────────────────────────────────────────────────────

summary(() => {
    group("compareTo — same exponent", () => {
        bench("native ternary ", () => do_not_optimize(small.na < small.nb ? -1 : small.na > small.nb ? 1 : 0));
        bench("ArbitraryNumber", () => do_not_optimize(small.a.compareTo(small.b)));
    });

    group("compareTo — large exponents (beyond MAX_SAFE_INT)", () => {
        bench("native ternary ", () => do_not_optimize(large.na < large.nb ? -1 : large.na > large.nb ? 1 : 0));
        bench("ArbitraryNumber", () => do_not_optimize(large.a.compareTo(large.b)));
    });
});

// ─── Chained — idle-game tick ─────────────────────────────────────────────

summary(() => {
    const gold       = new ArbitraryNumber(1.0,   9);   // 1e9
    const goldPerSec = new ArbitraryNumber(1.5,   3);   // 1,500
    const multiplier = new ArbitraryNumber(2.0,   2);   // 200
    const dt         = new ArbitraryNumber(1.667, -2);  // ≈ 0.01667 (60fps Δt)

    const nGold       = 1e9;
    const nGoldPerSec = 1500;
    const nMultiplier = 200;
    const nDt         = 0.01667;

    group("chained — idle-game tick  (gold += gps × mult × dt)", () => {
        bench("native expressions ", () =>
            do_not_optimize(nGold + nGoldPerSec * nMultiplier * nDt));
        bench("ArbitraryNumber     ", () =>
            do_not_optimize(gold.add(goldPerSec.mul(multiplier).mul(dt))));
    });
});

// ─── Fused operations ─────────────────────────────────────────────────────

summary(() => {
    const base       = new ArbitraryNumber(1.5, 6);   // 1.5e6
    const multiplier = new ArbitraryNumber(2.0, 3);   // 2.0e3
    const addend     = new ArbitraryNumber(3.0, 8);   // 3.0e8

    group("fused mulAdd vs chained mul+add", () => {
        bench("chained  .mul().add()", () =>
            do_not_optimize(base.mul(multiplier).add(addend)));
        bench("fused    .mulAdd()    ", () =>
            do_not_optimize(base.mulAdd(multiplier, addend)));
    });

    group("fused addMul vs chained add+mul", () => {
        bench("chained  .add().mul()", () =>
            do_not_optimize(base.add(addend).mul(multiplier)));
        bench("fused    .addMul()   ", () =>
            do_not_optimize(base.addMul(addend, multiplier)));
    });
});

summary(() => {
    // 50-element income sources array — representative idle game pattern
    const sources50 = Array.from({ length: 50 }, (_, i) =>
        new ArbitraryNumber(1.0 + (i % 9) * 0.1, i % 8));

    group("sumArray(50) vs chained add(50)", () => {
        bench("chained  .reduce(.add)", () =>
            do_not_optimize(sources50.reduce((acc, v) => acc.add(v), ArbitraryNumber.Zero)));
        bench("sumArray([50])        ", () =>
            do_not_optimize(ArbitraryNumber.sumArray(sources50)));
    });
});

// ─── sqrt vs pow(0.5) ────────────────────────────────────────────────────

summary(() => {
    const sqrtBase = new ArbitraryNumber(1.5, 6);  // 1.5e6

    group("sqrt() vs pow(0.5)", () => {
        bench("chained  .pow(0.5)  ", () => do_not_optimize(sqrtBase.pow(0.5)));
        bench("fused    .sqrt()    ", () => do_not_optimize(sqrtBase.sqrt()));
    });
});

// ─── Tier 2 fused vs chained ─────────────────────────────────────────────

summary(() => {
    const base       = new ArbitraryNumber(1.5, 6);   // 1.5e6
    const multiplier = new ArbitraryNumber(2.0, 3);   // 2.0e3
    const operand    = new ArbitraryNumber(3.0, 8);   // 3.0e8

    group("fused mulSub vs chained mul+sub", () => {
        bench("chained  .mul().sub()", () =>
            do_not_optimize(base.mul(multiplier).sub(operand)));
        bench("fused    .mulSub()   ", () =>
            do_not_optimize(base.mulSub(multiplier, operand)));
    });

    group("fused subMul vs chained sub+mul", () => {
        bench("chained  .sub().mul()", () =>
            do_not_optimize(base.sub(operand).mul(multiplier)));
        bench("fused    .subMul()   ", () =>
            do_not_optimize(base.subMul(operand, multiplier)));
    });

    group("fused divAdd vs chained div+add", () => {
        bench("chained  .div().add()", () =>
            do_not_optimize(base.div(multiplier).add(operand)));
        bench("fused    .divAdd()   ", () =>
            do_not_optimize(base.divAdd(multiplier, operand)));
    });
});

// ─── AnChain builder vs direct method chaining ──────────────────────────

summary(() => {
    const base       = new ArbitraryNumber(1.5, 6);
    const multiplier = new ArbitraryNumber(2.0, 3);
    const bonus      = new ArbitraryNumber(3.0, 8);
    const penalty    = new ArbitraryNumber(1.0, 7);

    group("AnChain builder vs direct chaining (3-step formula)", () => {
        bench("direct   .mulAdd().sub()", () =>
            do_not_optimize(base.mulAdd(multiplier, bonus).sub(penalty)));
        bench("chain()  .mulAdd().sub().done()", () =>
            do_not_optimize(chain(base).mulAdd(multiplier, bonus).sub(penalty).done()));
    });
});

await run({ colors: true });
