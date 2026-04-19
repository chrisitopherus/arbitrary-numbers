/**
 * Idle game simulation — 350-tick growth loop.
 *
 * Demonstrates:
 *  - Fused mulAdd for zero-allocation tick math
 *  - ArbitraryNumberHelpers for afford-check
 *  - UnitNotation (K/M/B/T...) with letterNotation fallback past centillion
 *  - Values growing beyond float64's max (~1e308) — JS sees Infinity, ArbitraryNumber keeps going
 */

import {
    an,
    UnitNotation, CLASSIC_UNITS, letterNotation, scientificNotation,
    ArbitraryNumberHelpers as helpers,
} from "../src/index.ts";
import type { ArbitraryNumber } from "../src/index.ts";

// UnitNotation covers K/M/B/T … centillion; anything beyond falls back to
// letter notation (1.23a, 1.23b, …)
// Note: CLASSIC_UNITS has gaps (undefined tiers) between named illion names —
// for exponents in those gaps, UnitNotation falls through to a plain number.
// We switch to scientificNotation when the exponent exceeds the last CLASSIC_UNITS
// entry (centillion = exponent 303) to always show a readable label.
const unitDisplay = new UnitNotation({ units: CLASSIC_UNITS, fallback: letterNotation });

const fmt = (v: ArbitraryNumber, d = 2) =>
    v.exponent > 303 ? v.toString(scientificNotation, d) : v.toString(unitDisplay, d);

// ── Initial game state ─────────────────────────────────────────────────────────

let gold        = an(1, 0);   //        1
let gps         = an(1, 0);   //        1 gold/tick
let upgradeCost = an(1, 2);   //      100 (first upgrade)
let upgrades    = 0;

console.log("=== Idle game simulation (350 ticks) ===");
console.log(`start  gold=${fmt(gold)}  gps=${fmt(gps)}  upgradeCost=${fmt(upgradeCost)}\n`);

// ── Main loop ──────────────────────────────────────────────────────────────────

for (let t = 1; t <= 350; t++) {
    // Core tick: gold = (gold × 10) + gps  — fused op, zero allocation
    gold.mulAdd(an(1, 1), gps);

    // Buy up to 25 upgrades: each multiplies gps by 1,000 and raises next cost by 1,000,000
    if (upgrades < 25 && helpers.meetsOrExceeds(gold, upgradeCost)) {
        const prevGps = gps.clone();
        gold.sub(upgradeCost);
        gps.mul(an(1, 3));
        upgradeCost.mul(an(1, 6));
        upgrades++;
        console.log(
            `[t=${String(t).padStart(3)}] UPGRADE #${String(upgrades).padStart(2)}  `
            + `gps ${fmt(prevGps).padStart(10)} → ${fmt(gps).padStart(10)}   next cost: ${upgradeCost.toString(scientificNotation)}`,
        );
    }

    if (t % 70 === 0) {
        const jsVal = gold.toNumber();
        const jsStr = isFinite(jsVal) ? jsVal.toExponential(2) : "Infinity  ← beyond float64 max!";
        console.log(
            `[t=${String(t).padStart(3)}] snapshot  AN: ${fmt(gold).padStart(16)}   JS: ${jsStr}`,
        );
    }
}

// ── Final state ────────────────────────────────────────────────────────────────

console.log("");
console.log("=== Final state ===");
console.log(`Upgrades bought : ${upgrades}`);
console.log(`Final gold (AN) : ${fmt(gold)}`);
console.log(`Final gps  (AN) : ${fmt(gps)}`);
console.log(`Gold as JS num  : ${gold.toNumber()}`);
console.log(`GPS  as JS num  : ${gps.toNumber()}`);
console.log("");
console.log("JS shows Infinity past ~1e308. ArbitraryNumber is still tracking the exact value.");
