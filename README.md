<div align="center">
  <img src="https://raw.githubusercontent.com/chrisitopherus/arbitrary-numbers/main/media/logo.svg" alt="arbitrary-numbers" width="520" />

  <br/>
  <br/>

  [![npm version](https://img.shields.io/npm/v/arbitrary-numbers?color=6366f1&labelColor=0c0c0e)](https://www.npmjs.com/package/arbitrary-numbers)
  [![License: MIT](https://img.shields.io/badge/License-MIT-6366f1?labelColor=0c0c0e)](LICENSE)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.x-6366f1?labelColor=0c0c0e)](https://www.typescriptlang.org/)
  [![Zero dependencies](https://img.shields.io/badge/dependencies-zero-6366f1?labelColor=0c0c0e)](package.json)
</div>

**arbitrary-numbers** — the fast, ergonomic big-number library for idle games, incremental simulators, and anywhere JavaScript's `Number` runs out of precision. Mutable by default for speed, chainable by design, serialization and notation built in.

Numbers are stored as a normalized `coefficient × 10^exponent` pair. Arithmetic mutates and returns `this` — zero allocations on the steady-state path, exactly what tick-based game loops need when values span from `1` to `10^300` in the same frame.

- **Mutable by default** — `gold.add(income).sub(cost)` mutates `gold`, no allocations
- **Opt-in immutability** — `number.freeze()` returns a `FrozenArbitraryNumber` that throws on mutation
- **Fused operations** (`mulAdd`, `subMul`, `mulDiv`, ...) — one normalisation pass for two-step expressions
- **Formula pipelines** — define an expression once, `apply()` it to any number of values
- **Pluggable display** — swap between scientific, unit (K/M/B/T), and letter notation
- **Save / load built-in** — `toJSON()` / `fromJSON()` / `parse()` for idle-game persistence
- **Zero dependencies** — nothing to audit, nothing to break

## How it compares

| Library | Strengths | Limitations | Pick when |
|---|---|---|---|
| **arbitrary-numbers** | TypeScript-first, mutable-fast, fused ops, `sumArray`, formulas, notation plugins, serialization, zero deps | Coefficient is float64 (~15 sig figs) | You want types, speed, ergonomics, and notation flexibility |
| `break_infinity.js` | Widely used in incremental games, battle-tested | JS only, no types, plugin system is bolt-on | Max community examples and ecosystem matter most |
| `break_eternity.js` | Handles super-exponent range up to `e(9e15)` | Heavier, more complex API | You genuinely need values beyond `10^(10^15)` |
| `decimal.js` | Arbitrary *precision* (not just range) | 4–14× slower for game math | Financial math, exact decimal arithmetic |

Performance on Node 22, Intel i5-13600KF:

| Operation | arbitrary-numbers v2 | break_infinity.js |
|---|---|---|
| `mul` / `div` | ~15 ns | ~12 / ~53 ns |
| `add` / `sub` | ~30 ns | ~24 ns |
| `sqrt()` | **~8 ns** | ~11 ns |
| `compareTo` | **~3 ns** | ~4 ns |
| `sumArray(50)` | **~180 ns total** | no equivalent |

Full competitor comparison: [`benchmarks/COMPETITOR_BENCHMARKS.md`](benchmarks/COMPETITOR_BENCHMARKS.md).

## Install

```sh
npm install arbitrary-numbers
```

Requires TypeScript `"strict": true`.

## Quick start

```typescript
import { an, formula, unitNotation } from "arbitrary-numbers";

// JavaScript range limits
const jsHuge = Number("1e500");  // Infinity
const jsTiny = Number("1e-500"); // 0

// Arbitrary range in both directions
const huge = an(1, 500);
const tiny = an(1, -500);

// Mutable chaining — gold.add(income) mutates gold, returns gold
let gold = an(7.5, 12);
const income = an(2.5, 6);
const cost   = an(1.0, 9);
gold.add(income).sub(cost);   // gold is now 7.501_499_e12

// Reusable per-tick formula: result = (value * 1.08) + 2_500_000
const tick = formula((an) => {
    an.mulAdd(new (an.constructor as any)(1.08, 0), new (an.constructor as any)(2.5, 6));
});

// Use clone() when you need to preserve the original
const before = gold.clone();
tick.applyInPlace(gold);          // gold mutated in-place
const gained = gold.clone().sub(before);

console.log("=== Range limits (JS vs arbitrary-numbers) ===");
console.log(`JS Number('1e500')  -> ${jsHuge}`);
console.log(`AN an(1, 500)       -> ${huge.toString()}`);
console.log(`JS Number('1e-500') -> ${jsTiny}`);
console.log(`AN an(1, -500)      -> ${tiny.toString()}`);
console.log(`\ngold after tick -> ${gold.toString(unitNotation)}`);
```

## Table of contents

- [How it compares](#how-it-compares)
- [Install](#install)
- [Quick start](#quick-start)
- [Table of contents](#table-of-contents)
- [The mutable API — the most important thing to understand](#the-mutable-api--the-most-important-thing-to-understand)
- [Creating numbers](#creating-numbers)
- [Arithmetic](#arithmetic)
- [Negative numbers](#negative-numbers)
- [Fused operations](#fused-operations)
- [Reusable formulas - `formula()`](#reusable-formulas---formula)
- [Frozen (immutable) numbers](#frozen-immutable-numbers)
- [Static constants](#static-constants)
- [Comparison and predicates](#comparison-and-predicates)
- [Rounding and math](#rounding-and-math)
- [Serialization and save-load](#serialization-and-save-load)
- [Display and formatting](#display-and-formatting)
- [Precision control](#precision-control)
- [Errors](#errors)
- [Utilities](#utilities)
- [Writing a custom plugin](#writing-a-custom-plugin)
- [Idle game example](#idle-game-example)
- [Performance](#performance)
- [Migration from v1](#migration-from-v1)

## The mutable API — the most important thing to understand

**Every arithmetic method mutates `this` and returns `this`.** This is different from v1 and from most math libraries.

```typescript
const a = an(3, 6);  // 3,000,000
const b = an(1, 3);  //     1,000

a.add(b);   // a is now 3,001,000 — b is unchanged
```

This means you can chain naturally:

```typescript
gold.add(income).sub(cost).mul(multiplier);  // all three ops mutate gold
```

**Use `clone()` to preserve a value before mutating it:**

```typescript
const snapshot = gold.clone();
gold.add(income);
console.log(`gained ${gold.clone().sub(snapshot).toString()}`);
```

**Static methods allocate; instance methods mutate.** This is the one consistent rule:

```typescript
ArbitraryNumber.add(a, b)  // returns a NEW instance — a and b unchanged
a.add(b)                   // mutates a, returns a
```

The aliasing footgun to watch out for:

```typescript
const total = gold;    // alias — NOT a copy!
total.add(income);     // mutates gold too, because total === gold
// Fix:
const total = gold.clone();
total.add(income);     // gold unchanged
```

## Creating numbers

```typescript
import { ArbitraryNumber, an } from "arbitrary-numbers";

// From a coefficient and exponent (already normalised)
new ArbitraryNumber(1.5, 3)   // 1,500       { coefficient: 1.5, exponent: 3 }
new ArbitraryNumber(15, 3)    // 15,000  ->  { coefficient: 1.5, exponent: 4 }  (normalised)
new ArbitraryNumber(0, 99)    // Zero    ->  { coefficient: 0,   exponent: 0 }

// From a plain JS number
ArbitraryNumber.from(1_500_000)  // { coefficient: 1.5, exponent: 6 }
ArbitraryNumber.from(0.003)      // { coefficient: 3,   exponent: -3 }

// Shorthand
an(1.5, 6)      // same as new ArbitraryNumber(1.5, 6)
an.from(1_500)  // same as ArbitraryNumber.from(1500)

// Copy
an(1.5, 6).clone()  // fresh unfrozen copy — the safe way to branch
```

Inputs must be finite. `NaN`, `Infinity`, and `-Infinity` throw `ArbitraryNumberInputError`:

```typescript
ArbitraryNumber.from(Infinity)     // throws ArbitraryNumberInputError  { value: Infinity }
new ArbitraryNumber(NaN, 0)        // throws ArbitraryNumberInputError  { value: NaN }
new ArbitraryNumber(1, Infinity)   // throws ArbitraryNumberInputError  { value: Infinity }
```

## Arithmetic

All instance arithmetic **mutates `this`** and **returns `this`**. All static arithmetic returns a new instance.

```typescript
const a = an(3, 6);  // 3,000,000
const b = an(1, 3);  //     1,000

// Instance — mutates a, returns a
a.add(b)    // a = 3,001,000
a.sub(b)    // a = 3,000,000  (undoes the add if b is the same)
a.mul(b)    // a = 3,000,000,000
a.div(b)    // a = 3,000
a.pow(2)    // a = 9,000,000
a.negate()  // a = -9,000,000
a.abs()     //  a = 9,000,000

// Static — allocates a new instance
ArbitraryNumber.add(a, b)   // new instance, a and b unchanged
ArbitraryNumber.sub(a, b)   // new instance
ArbitraryNumber.mul(a, b)   // new instance
ArbitraryNumber.div(a, b)   // new instance
```

## Negative numbers

All operations support negative coefficients. The sign is carried in the coefficient — the exponent is always the magnitude.

```typescript
const debt   = an(-5, 6);   // -5,000,000
const income = an(2, 6);    //  2,000,000

debt.clone().add(income)  // -3,000,000  (clone so debt is unchanged)
debt.clone().abs()        //  5,000,000
debt.clone().negate()     //  5,000,000
debt.sign()               // -1
debt.isNegative()         // true

// Notation plugins preserve the sign
import { unitNotation, letterNotation, scientificNotation } from "arbitrary-numbers";

an(-1.5, 6).toString(scientificNotation) // "-1.50e+6"
an(-1.5, 6).toString(unitNotation)       // "-1.50 M"
an(-1.5, 6).toString(letterNotation)     // "-1.50b"
```

## Fused operations

Fused methods compute a two-step expression in one normalisation pass. Because v2 is already mutation-based, the primary win is fewer intermediate allocations and one less normalisation call.

```typescript
// (gold * rate) + bonus  — one normalisation pass
gold.mulAdd(prestigeRate, prestigeBonus);   // mutates gold

// Other fused pairs
base.addMul(bonus, multiplier);          // (base + bonus) * multiplier
income.mulSub(rate, upkeep);             // (income * rate) - upkeep
raw.subMul(reduction, boost);            // (raw - reduction) * boost
damage.divAdd(speed, flat);              // (damage / speed) + flat
production.mulDiv(deltaTime, cost);      // (production * deltaTime) / cost

// Batch sum — one pass, no intermediate instances
const total = ArbitraryNumber.sumArray(incomeSources);   // ~3.6 ns/element

// Batch product
const product = ArbitraryNumber.productArray(multipliers);
```

Note: operands passed to fused methods are only read, never mutated. Only `this` changes.

## Reusable formulas - `formula()`

`formula()` builds a reusable pipeline. `apply()` clones the input and runs the steps on the clone; `applyInPlace()` runs the steps directly on the passed instance.

```typescript
import { formula, an } from "arbitrary-numbers";

const armorReduction = formula((an) => {
    an.subMul(armor, an(0.75, 0));  // (base - armor) * 0.75
    an.floor();
});

// apply() — input is unchanged, returns a new instance
const physDamage = armorReduction.apply(physBase);
const magDamage  = armorReduction.apply(magBase);

// applyInPlace() — mutates the passed instance directly (hot path)
armorReduction.applyInPlace(enemyAtk);   // enemyAtk is now the reduced value
```

Compose two formulas with `then()`:

```typescript
const critBonus = formula((an) => { an.mul(an(1.5, 0)).ceil(); });
const full      = armorReduction.then(critBonus);
const result    = full.apply(baseDamage);
```

You can store a formula as a typed property:

```typescript
import type { AnFormula } from "arbitrary-numbers";

class DamageSystem {
    private readonly physFormula: AnFormula;
    constructor(armor: ArbitraryNumber) {
        this.physFormula = formula((an) => { an.subMul(armor, an(0.75, 0)).floor(); });
    }
    calculate(base: ArbitraryNumber): ArbitraryNumber {
        return this.physFormula.apply(base);
    }
}
```

## Frozen (immutable) numbers

Call `.freeze()` to get a `FrozenArbitraryNumber` — same API, but all mutating methods throw `ArbitraryNumberMutationError`.

```typescript
import { ArbitraryNumber, FrozenArbitraryNumber, ArbitraryNumberMutationError } from "arbitrary-numbers";

const base = an(1.5, 6).freeze();

base.add(an(1));  // throws ArbitraryNumberMutationError

// Unfreeze with clone()
const mutable = base.clone();
mutable.add(an(1));  // ok
```

The three static constants (`ArbitraryNumber.Zero`, `.One`, `.Ten`) are frozen — mutating them throws. Use `.clone()` or `an(0)` / `an(1)` / `an(10)` when you need a mutable starting point:

```typescript
// Wrong — Zero is frozen
ArbitraryNumber.Zero.add(income);  // throws!

// Right
const total = an(0);
total.add(income);  // ok
```

## Static constants

```typescript
ArbitraryNumber.Zero  // FrozenArbitraryNumber(0)  — read-only
ArbitraryNumber.One   // FrozenArbitraryNumber(1)  — read-only
ArbitraryNumber.Ten   // FrozenArbitraryNumber(10) — read-only
```

Use these for comparisons and reads. Never pass them as the receiver of a mutating call.

## Comparison and predicates

These methods are **read-only** — they never mutate.

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

ArbitraryNumber.min(a, b)              // b   (returns the input reference — no clone)
ArbitraryNumber.max(a, b)              // a
ArbitraryNumber.clamp(an(5, 5), a, b)  // b   (clamped to max)
ArbitraryNumber.lerp(a, b, 0.5)        // new instance — midpoint
ArbitraryNumber.lerp(a, b, 0)          // a   (exact reference — no computation)
ArbitraryNumber.lerp(a, b, 1)          // b   (exact reference — no computation)
```

`min`, `max`, `clamp` return one of the original references — they do not clone.

## Rounding and math

These mutate `this` and return `this`.

```typescript
const n = an(1.75, 0);  // 1.75

n.floor()   //  1  (toward -∞)
n.ceil()    //  2  (toward +∞)
n.round()   //  2  (half-up)
n.trunc()   //  1  (toward 0)

an(-1.75, 0).floor()  // -2  (toward -∞)
an(-1.75, 0).trunc()  // -1  (toward 0, unlike floor)

an(4, 0).sqrt()   // 2  (~8 ns — faster than .pow(0.5))
an(1, 4).sqrt()   // 100
an(-4, 0).sqrt()  // throws ArbitraryNumberDomainError

an(8, 0).cbrt()              // 2
an(1, 9).cbrt()              // 1e3
an(-27, 0).cbrt()            // -3   (cube root supports negatives)

an(1, 3).log10()             // 3
an(1.5, 3).log10()           // 3.176...
an(1024, 0).log(2)           // 10
an(Math.E, 0).ln()           // ≈ 1

ArbitraryNumber.exp10(6)     // 1e6  (new instance — inverse of log10)
ArbitraryNumber.exp10(3.5)   // ≈ 3162.3

an(1.5, 3).toNumber()        // 1500
an(1, 400).toNumber()        // Infinity  (exponent beyond float64 range)

// Batch
ArbitraryNumber.productArray([an(2), an(3), an(4)])   // 24   (new instance)
ArbitraryNumber.maxOfArray([an(1), an(3), an(2)])     // an(3) (input reference)
ArbitraryNumber.minOfArray([an(3), an(1), an(2)])     // an(1) (input reference)
```

## Serialization and save-load

Idle games need to persist numbers across sessions. `arbitrary-numbers` provides three serialization paths.

### JSON (recommended for save files)

```typescript
import { ArbitraryNumber, an } from "arbitrary-numbers";

const gold = an(1.5, 6);

// Serialize — produces { c: number, e: number }
const blob = gold.toJSON();           // { c: 1.5, e: 6 }
const json = JSON.stringify(gold);    // '{"c":1.5,"e":6}'

// Deserialize — always returns a fresh mutable instance
const restored = ArbitraryNumber.fromJSON(JSON.parse(json));
restored.equals(gold);  // true
```

`toJSON()` uses short keys (`c`/`e`) to keep save blobs small. The shape is stable across versions.

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

Pass a custom alphabet:

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

When two numbers differ in exponent by more than `defaults.scaleCutoff` (default `15`), the smaller operand is silently discarded because its contribution is below floating-point resolution:

```typescript
const huge = an(1, 20);  // 10^20
const tiny = an(1, 3);   // 1,000

huge.clone().add(tiny)  // returns huge value unchanged — tiny is negligible at 10^20 scale
```

Override globally or for a single scoped block:

```typescript
ArbitraryNumber.defaults.scaleCutoff = 50;  // global

// Scoped - scaleCutoff is restored after fn, even on throw
const result = ArbitraryNumber.withPrecision(50, () => a.clone().add(b));
```

### When things drift — precision troubleshooting

**"Why doesn't `a.clone().add(b).sub(b).equals(a)` return true when `b` is much larger than `a`?"**

```typescript
const a = an(1, 3);   // 1,000
const b = an(1, 20);  // 10^20

const r = a.clone().add(b);    // r = b's value — a was negligible, discarded
r.sub(b);                       // r = 0, not a
r.equals(a);                    // false — a was lost when added to b
```

This is the fundamental float64 limitation: `1,000 + 10^20 = 10^20` in any system with ~15 significant digits. If exact addition across large exponent gaps matters, raise `scaleCutoff`:

```typescript
ArbitraryNumber.defaults.scaleCutoff = 50;
```

> **Warning:** `defaults.scaleCutoff` is a global. Changing it affects all arithmetic library-wide. Use `withPrecision` for scoped overrides.

## Errors

All errors extend `ArbitraryNumberError`.

```typescript
import {
    ArbitraryNumberError,
    ArbitraryNumberInputError,
    ArbitraryNumberDomainError,
    ArbitraryNumberMutationError,
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
| `ArbitraryNumberDomainError` | Mathematically undefined operation (div-by-zero, sqrt of negative, ...) | `.context: Record<string, number>` |
| `ArbitraryNumberMutationError` | A mutating method is called on a frozen instance | — |

## Utilities

### ArbitraryNumberGuard - type guards

```typescript
import { ArbitraryNumberGuard as guard } from "arbitrary-numbers";

guard.isArbitraryNumber(value)   // true when value instanceof ArbitraryNumber
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

All helpers accept `number | ArbitraryNumber` as input and do not mutate their arguments.

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

For tier-based suffix patterns, extend `SuffixNotationBase`:

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
    an,
    UnitNotation, CLASSIC_UNITS, letterNotation,
    ArbitraryNumberHelpers as helpers,
} from "arbitrary-numbers";
import type { ArbitraryNumber } from "arbitrary-numbers";

let gold = an(5, 6);      // 5,000,000
let gps  = an(2, 5);      // 200,000 per tick
let reactorCost = an(1, 9);
let reactors = 0;

const display = new UnitNotation({ units: CLASSIC_UNITS, fallback: letterNotation });

function fmt(value: ArbitraryNumber, decimals = 2): string {
    return value.toString(display, decimals);
}

console.log("=== Hyper-growth idle loop (720 ticks) ===");
console.log(`start gold=${fmt(gold)}  gps=${fmt(gps)}  reactorCost=${fmt(reactorCost)}`);

for (let t = 1; t <= 720; t += 1) {
    // Core growth: gold = (gold * 1.12) + gps  — fused, zero allocation
    gold.mulAdd(an(1.12), gps);

    if (t % 60 === 0 && helpers.meetsOrExceeds(gold, reactorCost)) {
        const prevGps = gps.clone();
        gold.sub(reactorCost);
        gps.mul(an(1, 25)).floor();
        reactorCost.mul(an(8));
        reactors += 1;

        console.log(
            `[t=${String(t).padStart(4)}] REACTOR   #${String(reactors).padStart(2)}  `
            + `gps ${fmt(prevGps)} -> ${fmt(gps)}  `
            + `nextCost=${fmt(reactorCost)}`,
        );
    }

    if (t === 240 || t === 480) {
        const prevGps = gps.clone();
        gps.mul(an(1, 4)).add(an(7.5, 6)).floor();
        console.log(`[t=${String(t).padStart(4)}] PRESTIGE  gps ${fmt(prevGps)} -> ${fmt(gps)}`);
    }

    if (t % 120 === 0) {
        console.log(
            `[t=${String(t).padStart(4)}] SNAPSHOT  `
            + `gold=${fmt(gold, 2).padStart(12)}  gps=${fmt(gps, 2).padStart(12)}`,
        );
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

## Performance

Benchmarks are in [`benchmarks/`](benchmarks/). Competitor comparison: [`benchmarks/COMPETITOR_BENCHMARKS.md`](benchmarks/COMPETITOR_BENCHMARKS.md).

Quick reference (Node 22.16, Intel i5-13600KF):

| Operation | v2.0 per-op | v1.1 per-op |
|---|---|---|
| `new ArbitraryNumber(c, e)` | ~14 ns | ~13.5 ns |
| `clone()` | ~4.7 ns | ~13.5 ns |
| `add` / `sub` (pure op) | ~30 ns | ~270 ns |
| `mul` | ~15 ns | ~255 ns |
| `div` | ~15 ns | ~255 ns |
| `sqrt()` | ~8 ns | ~252 ns |
| `compareTo` | ~3 ns | ~3 ns |
| `sumArray(50 items)` | ~180 ns (~3.6 ns/elem) | N/A |
| idle tick (4-op chain) | ~42 ns | N/A |
| prestige loop `mulAdd` per-iter | ~33 ns | N/A |

## Migration from v1

| v1 | v2 | Notes |
|---|---|---|
| `a.add(b)` → new instance | `a.add(b)` → mutates `a`, returns `a` | **Breaking.** Use `a.clone().add(b)` to keep v1 semantics. |
| `chain(a).add(b).done()` | `a.add(b)` | Delete `chain`. Direct chaining is native now. |
| `formula(fn).apply(a)` | `formula(fn).apply(a)` | Unchanged. Input is cloned internally. |
| — | `formula(fn).applyInPlace(a)` | New. Mutates `a` directly — no clone. |
| `ArbitraryNumber.PrecisionCutoff = 15` | `ArbitraryNumber.defaults.scaleCutoff = 15` | Renamed + namespaced. |
| `ops.add(x, y)` | `ArbitraryNumber.add(x, y)` | Static on main class. `ops` class removed. |
| `ops.from(x)` / `ops.tryFrom(x)` | `ArbitraryNumber.from(x)` / `.tryFrom(x)` | Same. |
| `ArbitraryNumberOps` export | removed | — |
| `ArbitraryNumberArithmetic` export | removed | Internalized. |
| `NormalizedNumber` export | removed | Leaked internal shape. |
| `AnChain`, `chain()` export | removed | Redundant — direct chaining is native. |
| `a.freeze()` | new | Returns `FrozenArbitraryNumber`. |
| `ArbitraryNumber.Zero.add(...)` | throws `ArbitraryNumberMutationError` | Use `an(0).add(...)` instead. |
