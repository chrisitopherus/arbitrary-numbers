<div align="center">
  <img src="https://raw.githubusercontent.com/chrisitopherus/arbitrary-numbers/main/media/logo.svg" alt="arbitrary-numbers" width="520" />

  <br/>
  <br/>

  [![npm version](https://img.shields.io/npm/v/arbitrary-numbers?color=6366f1&labelColor=0c0c0e)](https://www.npmjs.com/package/arbitrary-numbers)
  [![License: MIT](https://img.shields.io/badge/License-MIT-6366f1?labelColor=0c0c0e)](LICENSE)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.x-6366f1?labelColor=0c0c0e)](https://www.typescriptlang.org/)
  [![Zero dependencies](https://img.shields.io/badge/dependencies-zero-6366f1?labelColor=0c0c0e)](package.json)
</div>

`arbitrary-numbers` fills a specific gap: JavaScript's `Number` type silently loses precision above `Number.MAX_SAFE_INTEGER`, and `BigInt` can't represent decimals, so working with extremely large or small magnitudes often requires manual scaling into very large integers.

Numbers are stored as a normalized `coefficient × 10^exponent` pair. That makes arithmetic across wildly different scales fast and predictable — exactly what idle games and simulations need when values span from `1` to `10^300` in the same loop.

- **Immutable by default** — every operation returns a new instance, no surprise mutations
- **Fused operations** (`mulAdd`, `subMul`, `mulDiv`, ...) — reduce allocations in hot loops
- **Formula pipelines** — define an expression once, apply it to any number of values
- **Pluggable display** — swap between scientific, unit (K/M/B/T), and letter notation without touching game logic
- **Save / load built-in** — `toJSON()` / `fromJSON()` / `parse()` for idle-game persistence
- **Zero dependencies** — nothing to audit, nothing to break

## How it compares

| Library | Strengths | Limitations | Pick when |
|---|---|---|---|
| **arbitrary-numbers** | TypeScript-first, fused ops, `mulDiv`, pluggable notation, serialization, zero deps | Newer; coefficient is always float64 | You want types, ergonomics, and notation flexibility |
| `break_infinity.js` | Very fast, large incremental-game community, battle-tested | JS only, no types, plugin system is bolt-on | Max speed and community examples matter most |
| `break_eternity.js` | Handles super-exponent range up to `e(9e15)` | Heavier, more complex API | You genuinely need values beyond `10^(10^15)` |
| `decimal.js` | Arbitrary *precision* (not just range) | 4–14× slower for game math | Financial math, exact decimal arithmetic |

`arbitrary-numbers` stores coefficients as float64, giving ~15 significant digits of precision — the same as a plain JS `number`. If you need exact decimal arithmetic, use `decimal.js`. If you need exponents beyond ~10^(10^15), use `break_eternity`.

## Install

```sh
npm install arbitrary-numbers
```

Requires TypeScript `"strict": true`.

## Quick start

```typescript
import { an, chain, formula, unitNotation } from "arbitrary-numbers";

// JavaScript range limits
const jsHuge = Number("1e500");  // Infinity
const jsTiny = Number("1e-500"); // 0

// Arbitrary range in both directions
const huge = an(1, 500);
const tiny = an(1, -500);

// One-off pipeline with chain(): (6.2e15 - 8.5e13) * 0.75
const damage = chain(an(6.2, 15))
    .subMul(an(8.5, 13), an(7.5, -1))
    .floor()
    .done();

// Reusable per-tick formula: gold = (gold * 1.08) + 2_500_000
const tick = formula("tick").mulAdd(an(1.08), an(2.5, 6));

let gold = an(7.5, 12);
for (let i = 0; i < 3; i += 1) {
    gold = tick.apply(gold);
}

console.log("=== Range limits (JS vs arbitrary-numbers) ===");
console.log(`JS Number('1e500')  -> ${jsHuge}`);
console.log(`AN an(1, 500)       -> ${huge.toString()}`);
console.log(`JS Number('1e-500') -> ${jsTiny}`);
console.log(`AN an(1, -500)      -> ${tiny.toString()}`);

console.log("");
console.log("=== Game math helpers ===");
console.log(`Damage (chain + fused subMul)  -> ${damage.toString(unitNotation)}`);
console.log(`Gold after 3 ticks (formula)   -> ${gold.toString(unitNotation)}`);
```

Example output when running this in a repository checkout (for example with `npx tsx examples/quickstart.ts`):

```text
=== Range limits (JS vs arbitrary-numbers) ===
JS Number('1e500')  -> Infinity
AN an(1, 500)       -> 1.00e+500
JS Number('1e-500') -> 0
AN an(1, -500)      -> 1.00e-500

=== Game math helpers ===
Damage (chain + fused subMul)  -> 4.59 Qa
Gold after 3 ticks (formula)   -> 9.45 T
```

## Table of contents

- [How it compares](#how-it-compares)
- [Install](#install)
- [Quick start](#quick-start)
- [Table of contents](#table-of-contents)
- [Creating numbers](#creating-numbers)
- [Arithmetic](#arithmetic)
- [Negative numbers](#negative-numbers)
- [Fused operations](#fused-operations)
- [Fluent builder - `chain()`](#fluent-builder---chain)
- [Reusable formulas - `formula()`](#reusable-formulas---formula)
  - [chain() vs formula()](#chain-vs-formula)
- [Comparison and predicates](#comparison-and-predicates)
- [Rounding and math](#rounding-and-math)
- [Serialization and save-load](#serialization-and-save-load)
- [Display and formatting](#display-and-formatting)
  - [scientificNotation (default)](#scientificnotation-default)
  - [unitNotation - K, M, B, T...](#unitnotation---k-m-b-t)
  - [AlphabetNotation - a, b, c... aa, ab...](#alphabetnotation---a-b-c-aa-ab)
- [Precision control](#precision-control)
- [Errors](#errors)
- [Utilities](#utilities)
  - [ArbitraryNumberOps - mixed `number | ArbitraryNumber` input](#arbitrarynumberops---mixed-number--arbitrarynumber-input)
  - [ArbitraryNumberGuard - type guards](#arbitrarynumberguard---type-guards)
  - [ArbitraryNumberHelpers - game and simulation patterns](#arbitrarynumberhelpers---game-and-simulation-patterns)
- [Writing a custom plugin](#writing-a-custom-plugin)
- [Idle game example](#idle-game-example)
- [Performance](#performance)

## Creating numbers

```typescript
import { ArbitraryNumber, an } from "arbitrary-numbers";

// From a coefficient and exponent
new ArbitraryNumber(1.5, 3)   // 1,500       { coefficient: 1.5, exponent: 3 }
new ArbitraryNumber(15, 3)    // 15,000  ->  { coefficient: 1.5, exponent: 4 }  (normalised)
new ArbitraryNumber(0, 99)    // Zero    ->  { coefficient: 0,   exponent: 0 }

// From a plain JS number
ArbitraryNumber.from(1_500_000)  // { coefficient: 1.5, exponent: 6 }
ArbitraryNumber.from(0.003)      // { coefficient: 3,   exponent: -3 }

// Shorthand
an(1.5, 6)      // same as new ArbitraryNumber(1.5, 6)
an.from(1_500)  // same as ArbitraryNumber.from(1500)

// Static constants
ArbitraryNumber.Zero  // 0
ArbitraryNumber.One   // 1
ArbitraryNumber.Ten   // 10
```

Inputs must be finite. `NaN`, `Infinity`, and `-Infinity` throw `ArbitraryNumberInputError`:

```typescript
ArbitraryNumber.from(Infinity)     // throws ArbitraryNumberInputError  { value: Infinity }
new ArbitraryNumber(NaN, 0)        // throws ArbitraryNumberInputError  { value: NaN }
new ArbitraryNumber(1, Infinity)   // throws ArbitraryNumberInputError  { value: Infinity }
```

## Arithmetic

All methods return a new `ArbitraryNumber`. Instances are immutable.

```typescript
const a = an(3, 6);  // 3,000,000
const b = an(1, 3);  //     1,000

a.add(b)    // 3,001,000
a.sub(b)    // 2,999,000
a.mul(b)    // 3,000,000,000
a.div(b)    // 3,000
a.pow(2)    // 9 * 10^12
a.negate()  // -3,000,000
a.abs()     //  3,000,000
```

## Negative numbers

All operations support negative coefficients. The sign is carried in the coefficient — the exponent is always the magnitude.

```typescript
const debt   = an(-5, 6);   // -5,000,000
const income = an(2, 6);    //  2,000,000

debt.add(income)     // -3,000,000
debt.abs()           //  5,000,000
debt.negate()        //  5,000,000
debt.sign()          // -1
debt.isNegative()    // true

// Notation plugins preserve the sign
import { unitNotation, letterNotation, scientificNotation } from "arbitrary-numbers";

an(-1.5, 6).toString(scientificNotation) // "-1.50e+6"
an(-1.5, 6).toString(unitNotation)       // "-1.50 M"
an(-1.5, 6).toString(letterNotation)     // "-1.50b"
```

Negative numbers are less common in idle games (resources can't go below zero), but they are useful for delta-income tracking, balance sheets, and damage-over-time effects. All arithmetic, comparison, rounding, and formatting methods handle negatives correctly across the full exponent range.

## Fused operations

Fused methods compute a two-step expression in one normalisation pass, saving one intermediate allocation per call. Use them in per-tick update loops.

```typescript
// (gold * rate) + bonus  in one pass, ~1.5x faster than chained
gold = gold.mulAdd(prestigeRate, prestigeBonus);

// Other fused pairs
base.addMul(bonus, multiplier);          // (base + bonus) * multiplier
income.mulSub(rate, upkeep);             // (income * rate) - upkeep
raw.subMul(reduction, boost);            // (raw - reduction) * boost
damage.divAdd(speed, flat);              // (damage / speed) + flat
production.mulDiv(deltaTime, cost);      // (production * deltaTime) / cost

// Sum an array in one pass, ~9x faster than .reduce((a, b) => a.add(b))
const total = ArbitraryNumber.sumArray(incomeSources);

// Multiply all elements in one pass
const product = ArbitraryNumber.productArray(multipliers);
```

`mulDiv` is the idle-tick workhorse: `(production * deltaTime) / cost` without allocating an intermediate value for the product.

## Fluent builder - `chain()`

`chain()` wraps an `ArbitraryNumber` in a thin accumulator. Each method mutates the accumulated value and returns `this`. No expression tree, no deferred execution.

```typescript
import { chain } from "arbitrary-numbers";

const damage = chain(base)
    .subMul(armour, mitigation)  // (base - armour) * mitigation, fused
    .add(flat)
    .floor()
    .done();                     // returns the ArbitraryNumber result
```

All fused ops are available on the builder, so complex formulas do not sacrifice performance.

Available methods: `add`, `sub`, `mul`, `div`, `pow`, `mulAdd`, `addMul`, `mulSub`, `subMul`, `divAdd`, `abs`, `neg`, `sqrt`, `floor`, `ceil`, `round`, `done`.

## Reusable formulas - `formula()`

`formula()` builds a deferred pipeline. Unlike `chain()`, a formula stores its operations and runs them only when `apply()` is called, so the same formula can be applied to any number of values.

```typescript
import { formula, an } from "arbitrary-numbers";

const armorReduction = formula("Armor Reduction")
    .subMul(armor, an(7.5, -1))  // (base - armor) * 0.75
    .floor();

const physDamage = armorReduction.apply(physBase);
const magDamage  = armorReduction.apply(magBase);
```

Each step returns a new `AnFormula`, leaving the original unchanged. Branching is safe:

```typescript
const base      = formula().mul(an(2));
const withFloor = base.floor();  // new formula, base is unchanged
const withCeil  = base.ceil();   // another branch from the same base
```

Compose two formulas in sequence with `then()`:

```typescript
const critBonus = formula("Crit Bonus").mul(an(1.5)).ceil();
const full      = armorReduction.then(critBonus);
const result    = full.apply(baseDamage);
```

Available methods: `add`, `sub`, `mul`, `div`, `pow`, `mulAdd`, `addMul`, `mulSub`, `subMul`, `divAdd`, `abs`, `neg`, `sqrt`, `floor`, `ceil`, `round`, `then`, `named`, `apply`.

### chain() vs formula()

| | `chain(value)` | `formula(name?)` |
|---|---|---|
| Execution | Immediate | Deferred, runs on `apply()` |
| Input | Fixed at construction | Provided at `apply()` |
| Reusable | No, one-shot | Yes, any number of times |
| Composable | No | Yes, via `then()` |
| Builder style | Stateful accumulator | Immutable, each step returns a new instance |
| Terminal | `.done()` | `.apply(value)` |

## Comparison and predicates

```typescript
const a = an(1, 4);  // 10,000
const b = an(9, 3);  //  9,000

a.compareTo(b)           //  1  (compatible with Array.sort)
a.greaterThan(b)         // true
a.lessThan(b)            // false
a.greaterThanOrEqual(b)  // true
a.lessThanOrEqual(b)     // false
a.equals(b)              // false

a.isZero()               // false
a.isPositive()           // true
a.isNegative()           // false
a.isInteger()            // true
a.sign()                 //  1  (-1 | 0 | 1)

ArbitraryNumber.min(a, b)                      // b   (9,000)
ArbitraryNumber.max(a, b)                      // a   (10,000)
ArbitraryNumber.clamp(an(5, 5), a, an(1, 5))  // an(1, 5)  (clamped to max)
ArbitraryNumber.lerp(a, b, 0.5)               // 9,500
```

## Rounding and math

```typescript
const n = an(1.75, 0);  // 1.75

n.floor()   //  1  (toward -∞)
n.ceil()    //  2  (toward +∞)
n.round()   //  2  (half-up)
n.trunc()   //  1  (toward 0)

an(-1.75, 0).floor()  // -2  (toward -∞)
an(-1.75, 0).trunc()  // -1  (toward 0, unlike floor)

an(4, 0).sqrt()              // 2       (1.18x faster than .pow(0.5))
an(1, 4).sqrt()              // 100
an(-4, 0).sqrt()             // throws ArbitraryNumberDomainError

an(8, 0).cbrt()              // 2
an(1, 9).cbrt()              // 1e3  (= 1,000)
an(-27, 0).cbrt()            // -3   (cube root supports negatives)

an(1, 3).log10()             // 3
an(1.5, 3).log10()           // 3.176...
an(1024, 0).log(2)           // 10
an(Math.E, 0).ln()           // ≈ 1

ArbitraryNumber.exp10(6)     // 1e6  (inverse of log10)
ArbitraryNumber.exp10(3.5)   // ≈ 3162.3

ArbitraryNumber.Zero.log10() // throws ArbitraryNumberDomainError

an(1.5, 3).toNumber()        // 1500
an(1, 400).toNumber()        // Infinity  (exponent beyond float64 range)

// Batch operations
ArbitraryNumber.productArray([an(2), an(3), an(4)])    // 24
ArbitraryNumber.maxOfArray([an(1), an(3), an(2)])      // an(3)
ArbitraryNumber.minOfArray([an(3), an(1), an(2)])      // an(1)
```

## Serialization and save-load

Idle games need to persist numbers across sessions. `arbitrary-numbers` provides three serialization paths:

### JSON (recommended for save files)

```typescript
import { ArbitraryNumber, an } from "arbitrary-numbers";

const gold = an(1.5, 6);

// Serialize — produces { c: number, e: number }
const blob = gold.toJSON();           // { c: 1.5, e: 6 }
const json = JSON.stringify(gold);    // '{"c":1.5,"e":6}'

// Deserialize
const restored = ArbitraryNumber.fromJSON(JSON.parse(json));
restored.equals(gold);  // true
```

`toJSON()` uses short keys (`c`/`e`) to keep save blobs small. The shape is stable — renaming internal fields will never silently break your saves.

### Compact string (URL params, cookies)

```typescript
const raw = gold.toRaw();             // "1.5|6"
const restored = ArbitraryNumber.parse("1.5|6");
restored.equals(gold);  // true
```

### Parsing arbitrary strings

`ArbitraryNumber.parse()` accepts multiple formats:

```typescript
ArbitraryNumber.parse("1.5|6")      // pipe format  (exact round-trip)
ArbitraryNumber.parse("1.5e+6")     // scientific notation
ArbitraryNumber.parse("1500000")    // plain decimal
ArbitraryNumber.parse("-0.003")     // negative decimal
ArbitraryNumber.parse("1.5E6")      // uppercase E
```

Unrecognised or non-finite strings throw `ArbitraryNumberInputError`.

### Save-every-60s pattern

```typescript
// Save
function saveGame(state: GameState): string {
    return JSON.stringify({
        gold: state.gold.toJSON(),
        gps:  state.gps.toJSON(),
        tick: state.tick,
    });
}

// Load
function loadGame(json: string): GameState {
    const raw = JSON.parse(json);
    return {
        gold: ArbitraryNumber.fromJSON(raw.gold),
        gps:  ArbitraryNumber.fromJSON(raw.gps),
        tick: raw.tick,
    };
}

setInterval(() => localStorage.setItem("save", saveGame(state)), 60_000);
```

> **Precision note:** `toJSON()` / `fromJSON()` round-trip is exact. `toRaw()` / `parse()` with the pipe format is also exact. Parsing a number from a notation string (e.g. `"1.50 M"`) is not provided — it would be lossy because the suffix format discards precision beyond `decimals`.

## Display and formatting

`toString(plugin?, decimals?)` accepts any `NotationPlugin`. Three plugins are included.

### scientificNotation (default)

```typescript
import { scientificNotation } from "arbitrary-numbers";

an(1.5, 3).toString()                      // "1.50e+3"
an(1.5, 3).toString(scientificNotation, 4) // "1.5000e+3"
an(1.5, 0).toString()                      // "1.50"
```

### unitNotation - K, M, B, T...

```typescript
import { unitNotation, UnitNotation, COMPACT_UNITS, letterNotation } from "arbitrary-numbers";

an(1.5, 3).toString(unitNotation)  // "1.50 K"
an(3.2, 6).toString(unitNotation)  // "3.20 M"
an(1.0, 9).toString(unitNotation)  // "1.00 B"

// Custom unit list with a fallback for values beyond the list
const custom = new UnitNotation({ units: COMPACT_UNITS, fallback: letterNotation });
```

### AlphabetNotation - a, b, c... aa, ab...

```typescript
import { letterNotation, AlphabetNotation, alphabetSuffix } from "arbitrary-numbers";

an(1.5, 3).toString(letterNotation)   // "1.50a"
an(1.5, 6).toString(letterNotation)   // "1.50b"
an(1.5, 78).toString(letterNotation)  // "1.50z"
an(1.5, 81).toString(letterNotation)  // "1.50aa"
```

Suffixes never run out: `a-z`, then `aa-zz`, then `aaa`, and so on.

Pass a custom alphabet for any suffix sequence:

```typescript
const excelNotation = new AlphabetNotation({ alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZ" });

an(1.5, 3).toString(excelNotation)   // "1.50A"
an(1.5, 78).toString(excelNotation)  // "1.50Z"
an(1.5, 81).toString(excelNotation)  // "1.50AA"
```

`alphabetSuffix(tier, alphabet?)` exposes the suffix algorithm as a standalone function:

```typescript
import { alphabetSuffix } from "arbitrary-numbers";

alphabetSuffix(1)                                // "a"
alphabetSuffix(27)                               // "aa"
alphabetSuffix(27, "ABCDEFGHIJKLMNOPQRSTUVWXYZ") // "AA"
```

## Precision control

When two numbers differ in exponent by more than `PrecisionCutoff` (default `15`), the smaller operand is silently discarded because its contribution is below floating-point resolution:

```typescript
const huge = an(1, 20);  // 10^20
const tiny = an(1, 3);   // 1,000

huge.add(tiny)  // returns huge unchanged — tiny is negligible at 10^20 scale
```

Override globally or for a single scoped block:

```typescript
ArbitraryNumber.PrecisionCutoff = 50;  // global

// Scoped - PrecisionCutoff is restored after fn, even on throw
const result = ArbitraryNumber.withPrecision(50, () => a.add(b));
```

### When things drift — precision troubleshooting

**"Why doesn't `a.add(b).sub(b).equals(a)` return true when `b` is much larger than `a`?"**

```typescript
const a = an(1, 3);   // 1,000
const b = an(1, 20);  // 10^20

a.add(b)              // returns b — a is negligible, discarded
a.add(b).sub(b)       // returns b.sub(b) = 0, not a
a.add(b).sub(b).equals(a)  // false — a was lost when added to b
```

This is the fundamental float64 limitation: `1,000 + 10^20 = 10^20` in any number system with ~15 significant digits. `arbitrary-numbers` does not hide this — it is exact for the scale at which each value is stored.

**Game patterns and their typical precision needs:**

| Pattern | Exponent diff | Precision loss |
|---|---|---|
| Same-tier resources (gold + gold) | 0–3 | None |
| Upgrade costs vs balance | 0–8 | None |
| Prestige multipliers | 15–25 | < 0.0001% |
| Idle accumulation over time | 20–50 | ~0.1% (acceptable for display) |

If exact addition across large exponent gaps matters (e.g. financial ledger), raise `PrecisionCutoff` to `50` and use `withPrecision`.

> **Warning:** `PrecisionCutoff` is a global static. Changing it affects all arithmetic library-wide, including in async callbacks that run concurrently. Use `withPrecision` for scoped overrides.

## Errors

All errors thrown by the library extend `ArbitraryNumberError`, so you can distinguish them from your own errors.

```typescript
import {
    ArbitraryNumberError,
    ArbitraryNumberInputError,
    ArbitraryNumberDomainError,
} from "arbitrary-numbers";

try {
    an(1).div(an(0));
} catch (e) {
    if (e instanceof ArbitraryNumberDomainError) {
        console.log(e.context);  // { dividend: 1 }
    }
}
```

| Class | Thrown when | Extra property |
|---|---|---|
| `ArbitraryNumberInputError` | Non-finite input to a constructor or factory | `.value: number` |
| `ArbitraryNumberDomainError` | Mathematically undefined operation | `.context: Record<string, number>` |

## Utilities

### ArbitraryNumberOps - mixed `number | ArbitraryNumber` input

```typescript
import { ArbitraryNumberOps as ops } from "arbitrary-numbers";

ops.from(1_500_000)          // { coefficient: 1.5, exponent: 6 }
ops.add(1500, an(2, 3))      // 3,500
ops.mul(an(2, 0), 5)         // 10
ops.compare(5000, an(1, 4))  // -1  (5000 < 10,000)
ops.clamp(500, 1000, 2000)   // 1,000
```

### ArbitraryNumberGuard - type guards

```typescript
import { ArbitraryNumberGuard as guard } from "arbitrary-numbers";

guard.isArbitraryNumber(value)   // true when value instanceof ArbitraryNumber
guard.isNormalizedNumber(value)  // true when value has numeric coefficient and exponent
guard.isZero(value)              // true when value is ArbitraryNumber with coefficient 0
```

### ArbitraryNumberHelpers - game and simulation patterns

```typescript
import { ArbitraryNumberHelpers as helpers } from "arbitrary-numbers";

helpers.meetsOrExceeds(gold, upgradeCost)             // true when gold >= upgradeCost
helpers.wholeMultipleCount(gold, upgradeCost)          // how many upgrades can you afford?
helpers.subtractWithFloor(health, damage)              // max(health - damage, 0)
helpers.subtractWithFloor(health, damage, minHealth)   // max(health - damage, minHealth)
```

All helpers accept `number | ArbitraryNumber` as input.

## Writing a custom plugin

Any object with a `format(coefficient, exponent, decimals)` method is a valid `NotationPlugin`:

```typescript
import type { NotationPlugin } from "arbitrary-numbers";

const emojiNotation: NotationPlugin = {
    format(coefficient, exponent, decimals) {
        const tiers = ["", "K", "M", "B", "T", "Qa", "Qi"];
        const tier    = Math.floor(exponent / 3);
        const display = coefficient * 10 ** (exponent - tier * 3);
        return `${display.toFixed(decimals)}${tiers[tier] ?? `e+${tier * 3}`}`;
    },
};

an(1.5, 3).toString(emojiNotation)  // "1.50K"
an(1.5, 6).toString(emojiNotation)  // "1.50M"
```

For tier-based suffix patterns, extend `SuffixNotationBase`, which handles all coefficient and remainder math:

```typescript
import { SuffixNotationBase } from "arbitrary-numbers";

class TierNotation extends SuffixNotationBase {
    private static readonly TIERS = ["", "K", "M", "B", "T", "Qa", "Qi"];
    getSuffix(tier: number): string {
        return TierNotation.TIERS[tier] ?? `e+${tier * 3}`;
    }
}

an(3.2, 6).toString(new TierNotation({ separator: " " }))  // "3.20 M"
```

## Idle game example

A self-contained simulation showing hyper-growth, fused ops, helpers, and where plain JS `number` overflows while `ArbitraryNumber` keeps working.

```typescript
import {
    an, chain,
    UnitNotation,
    CLASSIC_UNITS,
    letterNotation,
    ArbitraryNumberHelpers as helpers,
} from "arbitrary-numbers";
import type { ArbitraryNumber } from "arbitrary-numbers";

let gold = an(5, 6);      // 5,000,000
let gps = an(2, 5);       // 200,000 per tick
let reactorCost = an(1, 9);
let reactors = 0;

const display = new UnitNotation({
    units: CLASSIC_UNITS,
    fallback: letterNotation,
});

function fmt(value: ArbitraryNumber, decimals = 2): string {
    return value.toString(display, decimals);
}

function snapshot(tick: number): void {
    console.log(
        `[t=${String(tick).padStart(4)}] SNAPSHOT  `
        + `gold=${fmt(gold, 2).padStart(12)}  gps=${fmt(gps, 2).padStart(12)}`,
    );
}

console.log("=== Hyper-growth idle loop (720 ticks) ===");
console.log(`start gold=${fmt(gold)}  gps=${fmt(gps)}  reactorCost=${fmt(reactorCost)}`);

for (let t = 1; t <= 720; t += 1) {
    // Core growth: gold = (gold * 1.12) + gps
    gold = gold.mulAdd(an(1.12), gps);

    if (t % 60 === 0 && helpers.meetsOrExceeds(gold, reactorCost)) {
        const before = gps;
        gold = gold.sub(reactorCost);
        gps = chain(gps).mul(an(1, 25)).floor().done();
        reactorCost = reactorCost.mul(an(8));
        reactors += 1;

        console.log(
            `[t=${String(t).padStart(4)}] REACTOR   #${String(reactors).padStart(2)}  `
            + `gps ${fmt(before)} -> ${fmt(gps)}  `
            + `nextCost=${fmt(reactorCost)}`,
        );
    }

    if (t === 240 || t === 480) {
        const before = gps;
        gps = chain(gps)
            .mul(an(1, 4))
            .add(an(7.5, 6))
            .floor()
            .done();
        console.log(`[t=${String(t).padStart(4)}] PRESTIGE  gps ${fmt(before)} -> ${fmt(gps)}`);
    }

    if (t % 120 === 0) {
        snapshot(t);
    }
}

console.log("\n=== Final scale check ===");
console.log(`reactors bought: ${reactors}`);
console.log(`final gold (unit+letter): ${fmt(gold)}`);
console.log(`final gps  (unit+letter): ${fmt(gps)}`);
console.log(`final gold as JS Number: ${gold.toNumber()}`);
console.log(`final gps as JS Number : ${gps.toNumber()}`);
console.log("If JS shows Infinity while unit+letter output stays finite, the library is doing its job.");
```

Output:

```text
=== Hyper-growth idle loop (720 ticks) ===
start gold=5.00 M  gps=200.00 K  reactorCost=1.00 B
[t=  60] REACTOR   # 1  gps 200.00 K -> 2.00 No  nextCost=8.00 B
[t= 120] REACTOR   # 2  gps 2.00 No -> 20.00 SpDc  nextCost=64.00 B
[t= 120] SNAPSHOT  gold=    14.94 Dc  gps=  20.00 SpDc
[t= 180] REACTOR   # 3  gps 20.00 SpDc -> 200.00 QiVg  nextCost=512.00 B
[t= 240] REACTOR   # 4  gps 200.00 QiVg -> 2.00 ai  nextCost=4.10 T
[t= 240] PRESTIGE  gps 2.00 ai -> 20.00 aj
[t= 240] SNAPSHOT  gold=   1.49 SpVg  gps=    20.00 aj
[t= 300] REACTOR   # 5  gps 20.00 aj -> 200.00 ar  nextCost=32.77 T
[t= 360] REACTOR   # 6  gps 200.00 ar -> 2.00 ba  nextCost=262.14 T
[t= 360] SNAPSHOT  gold=     1.49 at  gps=     2.00 ba
[t= 420] REACTOR   # 7  gps 2.00 ba -> 20.00 bi  nextCost=2.10 Qa
[t= 480] REACTOR   # 8  gps 20.00 bi -> 200.00 bq  nextCost=16.78 Qa
[t= 480] PRESTIGE  gps 200.00 bq -> 2.00 bs
[t= 480] SNAPSHOT  gold=   149.43 bj  gps=     2.00 bs
[t= 540] REACTOR   # 9  gps 2.00 bs -> 20.00 ca  nextCost=134.22 Qa
[t= 600] REACTOR   #10  gps 20.00 ca -> 200.00 ci  nextCost=1.07 Qi
[t= 600] SNAPSHOT  gold=   149.43 cb  gps=   200.00 ci
[t= 660] REACTOR   #11  gps 200.00 ci -> 2.00 cr  nextCost=8.59 Qi
[t= 720] REACTOR   #12  gps 2.00 cr -> 20.00 cz  nextCost=68.72 Qi
[t= 720] SNAPSHOT  gold=    14.94 cs  gps=    20.00 cz

=== Final scale check ===
reactors bought: 12
final gold (unit+letter): 14.94 cs
final gps  (unit+letter): 20.00 cz
final gold as JS Number: 1.494328222485101e+292
final gps as JS Number : Infinity
If JS shows Infinity while unit+letter output stays finite, the library is doing its job.
```

## Performance

Benchmarks are in [`benchmarks/`](benchmarks/). Competitor comparison: [`benchmarks/COMPETITOR_BENCHMARKS.md`](benchmarks/COMPETITOR_BENCHMARKS.md).

Quick reference (Node 22.16, Intel i5-13600KF):

| Operation | Time |
|---|---|
| `add` / `sub` (typical) | ~270-275 ns |
| `mul` / `div` | ~250-255 ns |
| Fused ops (`mulAdd`, `mulSub`, ...) | ~275 ns, ~1.9x faster than chained |
| `sumArray(50 items)` | ~435 ns, ~31x faster than `.reduce` |
| `compareTo` (same exponent) | ~3 ns |
| `sqrt()` | ~252 ns |
| `pow(0.5)` | ~20 ns |
