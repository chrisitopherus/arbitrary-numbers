import { an, formula, unitNotation, scientificNotation, letterNotation } from "../src/index.ts";

// ── Range limits ─────────────────────────────────────────────────────────────

const jsHuge = Number("1e500");
const jsTiny = Number("1e-500");

const huge = an(1, 500);
const tiny = an(1, -500);

console.log("=== Range limits: JS number vs arbitrary-numbers ===");
console.log(`JS  1e500  -> ${jsHuge}           (overflow)`);
console.log(`AN  an(1, 500) -> ${huge.toString()}   (no overflow)`);
console.log(`JS  1e-500 -> ${jsTiny}           (underflow)`);
console.log(`AN  an(1, -500) -> ${tiny.toString()}  (no underflow)`);

// ── Mutable chaining ─────────────────────────────────────────────────────────

console.log("\n=== Mutable chaining ===");

const gold   = an(7.5, 12);   // 7,500,000,000,000
const income = an(2.5, 9);    //     2,500,000,000
const cost   = an(1.0, 9);    //     1,000,000,000

console.log(`Before: ${gold.toString(unitNotation)}`);
gold.add(income).sub(cost);
console.log(`After add(${income.toString(unitNotation)}).sub(${cost.toString(unitNotation)}): ${gold.toString(unitNotation)}`);

// clone() when you need to keep the original
const snapshot = gold.clone();
gold.mul(an(1.1, 0));
console.log(`After mul(1.1): ${gold.toString(unitNotation)}  (snapshot still: ${snapshot.toString(unitNotation)})`);

// ── Fused ops ────────────────────────────────────────────────────────────────

console.log("\n=== Fused operations (one normalisation pass) ===");

const base     = an(5, 9);
const rate     = an(1.08, 0);
const bonus    = an(2.5, 6);

// (base * rate) + bonus in one step — no intermediate allocation
base.mulAdd(rate, bonus);
console.log(`base.mulAdd(1.08, 2.5M) -> ${base.toString(unitNotation)}`);

// ── Notation plugins ─────────────────────────────────────────────────────────

console.log("\n=== Notation plugins ===");

const value = an(3.2, 15);  // 3,200,000,000,000,000
console.log(`Scientific : ${value.toString(scientificNotation)}`);
console.log(`Unit (K/M/B): ${value.toString(unitNotation)}`);
console.log(`Letter (a/b/c): ${value.toString(letterNotation)}`);

// ── Reusable formula ─────────────────────────────────────────────────────────

console.log("\n=== Reusable formula ===");

// Define once, apply to any number of values
const prestigeTick = formula()
    .mulAdd(an(1.08, 0), an(2.5, 6));  // (value * 1.08) + 2,500,000

let gps = an(1, 9);  // 1,000,000,000 GPS
console.log(`GPS before 5 prestige ticks: ${gps.toString(unitNotation)}`);
for (let i = 0; i < 5; i++) {
    prestigeTick.applyInPlace(gps);   // hot path — mutates in-place, no clone
}
console.log(`GPS after 5 prestige ticks:  ${gps.toString(unitNotation)}`);
