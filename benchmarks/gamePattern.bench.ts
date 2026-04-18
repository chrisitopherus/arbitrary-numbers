/**
 * Game-pattern benchmarks — mitata
 *
 * Simulates real idle/incremental game workloads to show where fused operations
 * provide meaningful wins over the naive chained approach.
 *
 * Because ArbitraryNumber v2 mutates in-place, shared operands (multiplier,
 * boost, etc.) are never passed as `other` to a mutating method that would
 * corrupt them. Each bench uses fresh `value` instances per call and passes
 * stable read-only seed values as the argument (which are only read, not
 * mutated, by the called method).
 *
 * Patterns
 * ────────
 * income_aggregation   sumArray(50 sources) vs chained .add() reduce
 * prestige_loop        mulAdd repeated 100× vs chained mul+add 100×
 * upgrade_calculation  addMul repeated 100× vs chained add+mul 100×
 * idle_tick            full game tick — gold += gps × mult × dt
 */

import { bench, do_not_optimize, group, run, summary } from "mitata";
import { ArbitraryNumber } from "../src/core/ArbitraryNumber";

// ─── Income aggregation ────────────────────────────────────────────────────
// A typical idle game sums many income sources every tick.
// sumArray reads operands without mutating them, so we can reuse the seed.

const seedSources50 = Array.from({ length: 50 }, (_, i) =>
    new ArbitraryNumber(1.0 + (i % 9) * 0.1, i % 8));

summary(() => {
    group("income aggregation — 50 sources per tick", () => {
        bench("chained  .reduce(.add)", () => {
            const sources = seedSources50.map(n => n.clone());
            do_not_optimize(
                sources.reduce((acc, v) => acc.add(v), new ArbitraryNumber(0, 0))
            );
        });
        bench("sumArray([50])        ", () =>
            do_not_optimize(ArbitraryNumber.sumArray(seedSources50)));
    });
});

// ─── Prestige loop ─────────────────────────────────────────────────────────
// Prestige: value = value × multiplier + boost, repeated many times.
// multiplier and boost are passed as `other` — mul/add only read them.

summary(() => {
    const prestigeMultiplier = new ArbitraryNumber(1.1, 0); // 1.1×
    const prestigeBoost      = new ArbitraryNumber(1.0, 6); // +1e6

    group("prestige loop — 100 iterations  (value = value × mult + boost)", () => {
        bench("chained  .mul().add() × 100", () => {
            let value = new ArbitraryNumber(1.0, 9);
            for (let i = 0; i < 100; i++) {
                value.mul(prestigeMultiplier).add(prestigeBoost);
            }
            do_not_optimize(value);
        });
        bench("fused    .mulAdd()    × 100", () => {
            let value = new ArbitraryNumber(1.0, 9);
            for (let i = 0; i < 100; i++) {
                value.mulAdd(prestigeMultiplier, prestigeBoost);
            }
            do_not_optimize(value);
        });
    });
});

// ─── Upgrade calculation ───────────────────────────────────────────────────
// Upgrade: newValue = (base + bonus) × multiplier, repeated many times.

summary(() => {
    const upgradeBonus      = new ArbitraryNumber(5.0, 4); // +5e4
    const upgradeMultiplier = new ArbitraryNumber(1.2, 0); // 1.2×

    group("upgrade calculation — 100 iterations  (value = (value + bonus) × mult)", () => {
        bench("chained  .add().mul() × 100", () => {
            let value = new ArbitraryNumber(1.0, 6);
            for (let i = 0; i < 100; i++) {
                value.add(upgradeBonus).mul(upgradeMultiplier);
            }
            do_not_optimize(value);
        });
        bench("fused    .addMul()    × 100", () => {
            let value = new ArbitraryNumber(1.0, 6);
            for (let i = 0; i < 100; i++) {
                value.addMul(upgradeBonus, upgradeMultiplier);
            }
            do_not_optimize(value);
        });
    });
});

// ─── Full game tick simulation ─────────────────────────────────────────────
// gold += gps × mult × dt  (mutable in-place chaining)
// Fused form: gps.clone().mul(mult).mulAdd(dt, gold) = gold + gps×mult×dt

summary(() => {
    const seedGold     = new ArbitraryNumber(1.0,   9);  // 1e9
    const goldPerSec   = new ArbitraryNumber(1.5,   3);  // 1,500
    const multiplier   = new ArbitraryNumber(2.0,   2);  // 200
    const dt           = new ArbitraryNumber(1.667, -2); // ≈ 0.01667 (60fps Δt)

    group("idle tick — gold += gps × mult × dt", () => {
        bench("chained  gold.add(gps.clone().mul(mult).mul(dt))", () => {
            const gold = seedGold.clone();
            do_not_optimize(gold.add(goldPerSec.clone().mul(multiplier).mul(dt)));
        });
        bench("fused    gps.clone().mul(mult).mulAdd(dt, gold)  ", () => {
            const gold = seedGold.clone();
            do_not_optimize(goldPerSec.clone().mul(multiplier).mulAdd(dt, gold));
        });
    });
});

await run({ colors: true });
