<div align="center">
  <img src="https://raw.githubusercontent.com/chrisitopherus/arbitrary-numbers/main/media/logo.svg" alt="arbitrary-numbers" width="520" />

  <br/>
  <br/>

  [![npm version](https://img.shields.io/npm/v/arbitrary-numbers?color=6366f1&labelColor=0c0c0e)](https://www.npmjs.com/package/arbitrary-numbers)
  [![License: MIT](https://img.shields.io/badge/License-MIT-6366f1?labelColor=0c0c0e)](LICENSE)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.x-6366f1?labelColor=0c0c0e)](https://www.typescriptlang.org/)
  [![Zero dependencies](https://img.shields.io/badge/dependencies-zero-6366f1?labelColor=0c0c0e)](package.json)
</div>

**arbitrary-numbers** is a fast, TypeScript-first big-number library for idle games and incremental simulators. It stores numbers as `coefficient × 10^exponent`, mutates in-place for zero allocation on the hot path, and ships with notation plugins and serialization built in.

```
gold.add(income).sub(cost).mul(multiplier)   // mutates gold, returns gold — zero allocations
```

- **Mutable by default** — no allocations on the steady-state path
- **Opt-in immutability** — `.freeze()` returns a `FrozenArbitraryNumber` that throws on any mutation
- **Fused operations** — `mulAdd`, `subMul`, `mulDiv`, … compute two steps in one normalisation pass
- **Reusable formulas** — define a pipeline once, `apply()` to any value
- **Notation plugins** — scientific, unit (K/M/B/T), letter (a/b/c), or write your own in 5 lines
- **Save/load built-in** — `toJSON()` / `fromJSON()` for idle-game persistence
- **Zero dependencies**

---

## Table of contents

- [How it compares](#how-it-compares)
- [Install](#install)
- [Quick start](#quick-start)
- [The mutable API](#the-mutable-api)
- [Creating numbers](#creating-numbers)
- [Arithmetic](#arithmetic)
- [Fused operations](#fused-operations)
- [Reusable formulas](#reusable-formulas)
- [Frozen numbers](#frozen-numbers)
- [Comparison and predicates](#comparison-and-predicates)
- [Rounding and math](#rounding-and-math)
- [Display and notation](#display-and-notation)
- [Custom notation plugins](#custom-notation-plugins)
- [Serialization](#serialization)
- [Precision control](#precision-control)
- [Utilities](#utilities)
- [Errors](#errors)
- [Idle game example](#idle-game-example)
- [Performance](#performance)
- [Migration from v1](#migration-from-v1)

---

## How it compares

| Library | Pick when |
|---|---|
| **arbitrary-numbers** | You want TypeScript types, mutable-fast arithmetic, fused ops, notation plugins, and serialization |
| `break_infinity.js` | Community ecosystem matters most — widely used, battle-tested, but JS-only and immutable |
| `break_eternity.js` | You genuinely need values beyond `10^(10^15)` |
| `decimal.js` | You need arbitrary *precision* (financial math, exact decimals) — not just range |

Performance on Node 22.16, Intel i5-13600KF:

| Operation | arbitrary-numbers v2 | break_infinity.js | break_eternity.js | decimal.js |
|---|---|---|---|---|
| `add` / `sub` | **~13 ns** | ~28–32 ns | ~150–195 ns | ~134–163 ns |
| `mul` | **~11 ns** | ~15 ns | ~159 ns | ~380 ns |
| `div` | **~12 ns** | ~39–47 ns | ~200–249 ns | ~469–843 ns |
| `sqrt()` | **~11 ns** | ~14 ns | ~32 ns | ~4591 ns |
| `compareTo` | **~3.6 ns** | ~4.8 ns | ~20 ns | ~79 ns |
| `clone()` | **~6.7 ns** | ~61 ns | ~73 ns | ~260 ns |
| `sumArray(50)` | **~156 ns total** | no equivalent | no equivalent | no equivalent |

Full breakdown: [`benchmarks/COMPETITOR_BENCHMARKS.md`](benchmarks/COMPETITOR_BENCHMARKS.md).

---

## Install

```sh
npm install arbitrary-numbers
```

Requires TypeScript `"strict": true`.

---

## Quick start

```typescript
import { an, formula, unitNotation, letterNotation, scientificNotation } from "arbitrary-numbers";

// JS overflows — arbitrary-numbers doesn't
Number("1e500")    // Infinity
an(1, 500)         // 1.00e+500  — tracked exactly

// Mutable chaining — all three ops mutate gold, no allocations
const gold   = an(7.5, 12);   // 7,500,000,000,000
const income = an(2.5, 9);
const cost   = an(1.0, 9);
gold.add(income).sub(cost);

// clone() when you need to keep the original
const before = gold.clone();
gold.mul(an(1.1, 0));
// before is unchanged

// Notation plugins — swap at any call site
an(3.2, 15).toString(scientificNotation)  // "3.20e+15"
an(3.2, 15).toString(unitNotation)        // "3.20 Qa"
an(3.2, 15).toString(letterNotation)      // "3.20e"

// Reusable formula — define once, apply to many values
const tick = formula().mulAdd(an(1.08, 0), an(2.5, 6));
tick.applyInPlace(gold);   // hot path — mutates gold in-place
const result = tick.apply(gold);  // apply() clones first, gold unchanged
```

---

## The mutable API

**Every arithmetic method mutates `this` and returns `this`.** This is the single most important thing to understand.

```typescript
const a = an(3, 6);  // 3,000,000
const b = an(1, 3);  //     1,000

a.add(b);   // a is now 3,001,000 — b is unchanged
```

Chain operations naturally:

```typescript
gold.add(income).sub(cost).mul(multiplier);  // all ops mutate gold
```

Use `clone()` to branch:

```typescript
const snapshot = gold.clone();
gold.add(income);
// snapshot is still the old value
```

**Static methods allocate, instance methods mutate:**

```typescript
ArbitraryNumber.add(a, b)  // returns a NEW instance — a and b are unchanged
a.add(b)                   // mutates a, returns a
```

Watch out for aliasing:

```typescript
const total = gold;        // alias — NOT a copy
total.add(income);         // mutates gold too!

const total = gold.clone(); // correct — independent copy
total.add(income);          // gold is unchanged
```

---

## Creating numbers

```typescript
import { ArbitraryNumber, an } from "arbitrary-numbers";

new ArbitraryNumber(1.5, 3)    // 1,500        { coefficient: 1.5, exponent: 3 }
new ArbitraryNumber(15, 3)     // normalised → { coefficient: 1.5, exponent: 4 }
new ArbitraryNumber(0, 99)     // zero     →  { coefficient: 0,   exponent: 0 }

ArbitraryNumber.from(1_500_000)  // { coefficient: 1.5, exponent: 6 }
ArbitraryNumber.from(0.003)      // { coefficient: 3,   exponent: -3 }

an(1.5, 6)       // shorthand for new ArbitraryNumber(1.5, 6)
an.from(1_500)   // shorthand for ArbitraryNumber.from(1500)

an(1.5, 6).clone()  // fresh mutable copy
```

Non-finite inputs throw `ArbitraryNumberInputError`:

```typescript
ArbitraryNumber.from(Infinity)   // throws
new ArbitraryNumber(NaN, 0)      // throws
```

---

## Arithmetic

All instance methods mutate `this` and return `this`. Static methods return a new instance.

```typescript
const a = an(3, 6);
const b = an(1, 3);

// instance — mutates a
a.add(b)    a.sub(b)    a.mul(b)    a.div(b)
a.pow(2)    a.negate()  a.abs()

// static — new instance, a and b unchanged
ArbitraryNumber.add(a, b)
ArbitraryNumber.sub(a, b)
ArbitraryNumber.mul(a, b)
ArbitraryNumber.div(a, b)
```

Negative numbers are fully supported — the sign lives in the coefficient:

```typescript
const debt = an(-5, 6);   // -5,000,000
debt.clone().abs()         //  5,000,000
debt.clone().negate()      //  5,000,000
debt.sign()                // -1
debt.isNegative()          // true
```

---

## Fused operations

Fused methods compute a two-step expression in one normalisation pass — fewer intermediate steps, one less allocation compared to chaining two separate ops.

```typescript
gold.mulAdd(rate, bonus)          // (gold × rate) + bonus
base.addMul(bonus, multiplier)    // (base + bonus) × multiplier
income.mulSub(rate, upkeep)       // (income × rate) − upkeep
raw.subMul(reduction, boost)      // (raw − reduction) × boost
damage.divAdd(speed, flat)        // (damage / speed) + flat
production.mulDiv(dt, cost)       // (production × dt) / cost
```

Operands are only read, never mutated. Only `this` changes.

Batch operations that avoid intermediate instances entirely:

```typescript
ArbitraryNumber.sumArray(sources)        // sum of an array — ~3.1 ns/element
ArbitraryNumber.productArray(multipliers)  // product of an array
```

---

## Reusable formulas

`formula()` builds a chainable pipeline. Steps are stored as closures and replayed on each application.

```typescript
import { formula, an } from "arbitrary-numbers";

// Build once
const armorReduction = formula()
    .subMul(armor, an(0.75, 0))  // (base − armor) × 0.75
    .floor();

// apply() — clones the input, returns a new instance
const physDamage = armorReduction.apply(physBase);
const magDamage  = armorReduction.apply(magBase);

// applyInPlace() — mutates the passed instance directly (hot path, no clone)
armorReduction.applyInPlace(enemyAtk);
```

Compose with `then()`:

```typescript
const withCrit = armorReduction.then(formula().mul(critMult).ceil());
const result   = withCrit.apply(baseDamage);
```

Type a formula as a property:

```typescript
import type { AnFormula } from "arbitrary-numbers";

class DamageSystem {
    private readonly formula: AnFormula;
    constructor(armor: ArbitraryNumber) {
        this.formula = formula().subMul(armor, an(0.75, 0)).floor();
    }
    calculate(base: ArbitraryNumber): ArbitraryNumber {
        return this.formula.apply(base);
    }
}
```

---

## Frozen numbers

`.freeze()` returns a `FrozenArbitraryNumber` — identical API, but every mutating method throws `ArbitraryNumberMutationError`.

```typescript
import { ArbitraryNumber, FrozenArbitraryNumber } from "arbitrary-numbers";

const base = an(1.5, 6).freeze();
base.add(an(1));  // throws ArbitraryNumberMutationError: "add"

// Escape with clone()
const mutable = base.clone();  // plain ArbitraryNumber, fully mutable
mutable.add(an(1));  // ok
```

The three static constants are frozen — use `an(0)` / `an(1)` / `an(10)` when you need a mutable starting point:

```typescript
ArbitraryNumber.Zero  // FrozenArbitraryNumber — read only
ArbitraryNumber.One   // FrozenArbitraryNumber — read only
ArbitraryNumber.Ten   // FrozenArbitraryNumber — read only

ArbitraryNumber.Zero.add(income)  // throws!
an(0).add(income)                 // ok
```

---

## Comparison and predicates

These never mutate.

```typescript
const a = an(1, 4);  // 10,000
const b = an(9, 3);  //  9,000

a.compareTo(b)           //  1   (compatible with Array.sort)
a.greaterThan(b)         // true
a.lessThan(b)            // false
a.greaterThanOrEqual(b)  // true
a.equals(b)              // false

a.isZero()      // false
a.isPositive()  // true
a.isNegative()  // false
a.isInteger()   // true
a.sign()        //  1   (-1 | 0 | 1)

ArbitraryNumber.min(a, b)              // b  (returns the input reference — no clone)
ArbitraryNumber.max(a, b)             // a
ArbitraryNumber.clamp(an(5, 5), a, b)  // b  (clamped to max)
ArbitraryNumber.lerp(a, b, 0.5)        // new instance — midpoint
```

`min`, `max`, `clamp` return one of the original references — they do not clone.

---

## Rounding and math

These mutate `this` and return `this`.

```typescript
an(1.75, 0).clone().floor()   //  1
an(1.75, 0).clone().ceil()    //  2
an(1.75, 0).clone().round()   //  2
an(1.75, 0).clone().trunc()   //  1
an(-1.75, 0).clone().floor()  // -2  (toward −∞)
an(-1.75, 0).clone().trunc()  // -1  (toward 0)

an(4, 0).clone().sqrt()   // 2
an(8, 0).clone().cbrt()   // 2
an(-27, 0).clone().cbrt() // -3   (cube root supports negatives)

an(1, 3).log10()           //  3
an(1024, 0).log(2)         // 10
an(Math.E, 0).ln()         //  ≈ 1
ArbitraryNumber.exp10(6)   // 1e6  (new instance)

an(1, 400).toNumber()      // Infinity  (beyond float64)
```

---

## Display and notation

`toString(plugin?, decimals?)` accepts any `NotationPlugin`. Three are included:

```typescript
import {
    scientificNotation,   // default
    unitNotation,         // K / M / B / T / Qa …
    letterNotation,       // a / b / c … aa / ab …
} from "arbitrary-numbers";

const n = an(3.2, 15);  // 3,200,000,000,000,000

n.toString()                         // "3.20e+15"   (scientificNotation)
n.toString(scientificNotation, 4)    // "3.2000e+15"
n.toString(unitNotation)             // "3.20 Qa"
n.toString(letterNotation)           // "3.20e"
```

**Unit notation** comes with two built-in unit lists:

```typescript
import { UnitNotation, CLASSIC_UNITS, COMPACT_UNITS, letterNotation } from "arbitrary-numbers";

// CLASSIC_UNITS: K, M, B, T, Qa, Qi … Ct (centillion)
// COMPACT_UNITS: k, M, B, T, Qa, Qi … No
// fallback kicks in for values beyond the list

const display = new UnitNotation({ units: CLASSIC_UNITS, fallback: letterNotation });
an(3.2, 6).toString(display)    // "3.20 M"
an(3.2, 303).toString(display)  // "3.20 Ct"
an(3.2, 400).toString(display)  // "3.20e" (falls back to letterNotation)
```

**Letter notation** — suffixes never run out (`a`–`z`, then `aa`–`zz`, then `aaa`, …):

```typescript
an(1.5, 3).toString(letterNotation)   // "1.50a"
an(1.5, 6).toString(letterNotation)   // "1.50b"
an(1.5, 78).toString(letterNotation)  // "1.50z"
an(1.5, 81).toString(letterNotation)  // "1.50aa"
```

---

## Custom notation plugins

Any object with `format(coefficient, exponent, decimals)` is a valid plugin — you have complete control over how numbers render:

```typescript
import type { NotationPlugin } from "arbitrary-numbers";

// Simple inline plugin — no class needed
const romanTiers: NotationPlugin = {
    format(coefficient, exponent, decimals) {
        const tiers = ["", "K", "M", "B", "T", "Qa", "Qi"];
        const tier  = Math.floor(exponent / 3);
        const value = coefficient * 10 ** (exponent - tier * 3);
        return `${value.toFixed(decimals)}${tiers[tier] ?? `e+${tier * 3}`}`;
    },
};

an(1.5, 3).toString(romanTiers)   // "1.50K"
an(1.5, 6).toString(romanTiers)   // "1.50M"
an(1.5, 21).toString(romanTiers)  // "1.50e+21"
```

For tier-based suffix patterns, extend `SuffixNotationBase` — it handles the `coefficient × 10^(exponent mod 3)` scaling for you and lets you focus on just the suffix:

```typescript
import { SuffixNotationBase } from "arbitrary-numbers";

class GameNotation extends SuffixNotationBase {
    // Any suffix scheme you want — Japanese units, emoji, roman numerals, …
    private static readonly TIERS = ["", "万", "億", "兆", "京", "垓"];
    getSuffix(tier: number): string {
        return GameNotation.TIERS[tier] ?? `e+${tier * 3}`;
    }
}

const jp = new GameNotation({ separator: "" });
an(1.5, 3).toString(jp)   // "1.50万"
an(3.2, 6).toString(jp)   // "3.20億"
```

The `AlphabetNotation` class (backing `letterNotation`) is also customisable:

```typescript
import { AlphabetNotation, alphabetSuffix } from "arbitrary-numbers";

const excelColumns = new AlphabetNotation({ alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZ" });
an(1.5, 3).toString(excelColumns)   // "1.50A"
an(1.5, 78).toString(excelColumns)  // "1.50Z"
an(1.5, 81).toString(excelColumns)  // "1.50AA"

// The suffix algorithm is also available standalone
alphabetSuffix(1)   // "a"
alphabetSuffix(27)  // "aa"
```

---

## Serialization

Three paths for idle-game save files:

```typescript
const gold = an(1.5, 6);

// JSON — recommended, compact keys (c/e), stable across versions
gold.toJSON()                      // { c: 1.5, e: 6 }
JSON.stringify(gold)               // '{"c":1.5,"e":6}'
ArbitraryNumber.fromJSON({ c: 1.5, e: 6 })  // restores

// Pipe string — for URL params, cookies
gold.toRawString()                 // "1.5|6"
ArbitraryNumber.parse("1.5|6")    // restores

// parse() accepts multiple input formats
ArbitraryNumber.parse("1.5e+6")   // scientific
ArbitraryNumber.parse("1500000")  // plain decimal
ArbitraryNumber.parse("-0.003")   // negative
```

Save-every-60s pattern:

```typescript
// Save
function save(state: GameState): string {
    return JSON.stringify({
        gold: state.gold.toJSON(),
        gps:  state.gps.toJSON(),
    });
}

// Load
function load(json: string): GameState {
    const raw = JSON.parse(json);
    return {
        gold: ArbitraryNumber.fromJSON(raw.gold),
        gps:  ArbitraryNumber.fromJSON(raw.gps),
    };
}

setInterval(() => localStorage.setItem("save", save(state)), 60_000);
```

---

## Precision control

When two numbers differ in exponent by more than `defaults.scaleCutoff` (default `15`), the smaller operand is discarded — its contribution is below float64 resolution:

```typescript
const huge = an(1, 20);  // 10^20
const tiny = an(1, 3);   //  1,000

huge.clone().add(tiny)  // unchanged — tiny is negligible at this scale
```

Override globally or in a scoped block:

```typescript
ArbitraryNumber.defaults.scaleCutoff = 50;  // global

// Scoped — restored after fn, even on throw
const result = ArbitraryNumber.withPrecision(50, () => a.clone().add(b));
```

---

## Utilities

### ArbitraryNumberGuard — type guards

```typescript
import { ArbitraryNumberGuard as guard } from "arbitrary-numbers";

guard.isArbitraryNumber(value)    // true when value instanceof ArbitraryNumber
guard.isNormalizedNumber(value)   // true when value has numeric coefficient + exponent
guard.isZero(value)               // true when value is an ArbitraryNumber with coefficient 0
```

### ArbitraryNumberHelpers — game patterns

```typescript
import { ArbitraryNumberHelpers as helpers } from "arbitrary-numbers";

helpers.meetsOrExceeds(gold, cost)              // gold >= cost
helpers.wholeMultipleCount(gold, cost)          // how many can you afford?
helpers.subtractWithFloor(health, damage)       // max(health − damage, 0)
helpers.subtractWithFloor(health, damage, min)  // max(health − damage, min)
```

All helpers accept `number | ArbitraryNumber` and never mutate their arguments.

---

## Errors

All errors extend `ArbitraryNumberError`.

| Class | Thrown when |
|---|---|
| `ArbitraryNumberInputError` | Non-finite input (NaN, Infinity) to constructor or factory. `.value: number` |
| `ArbitraryNumberDomainError` | Mathematically undefined operation (div by zero, sqrt of negative). `.context: Record<string, number>` |
| `ArbitraryNumberMutationError` | Mutating method called on a frozen instance |

```typescript
import { ArbitraryNumberDomainError } from "arbitrary-numbers";

try {
    an(1).div(an(0));
} catch (e) {
    if (e instanceof ArbitraryNumberDomainError) {
        console.log(e.context);  // { dividend: 1 }
    }
}
```

---

## Idle game example

Full source: [`examples/idle-game.ts`](examples/idle-game.ts)

```typescript
import {
    an,
    UnitNotation, CLASSIC_UNITS, letterNotation, scientificNotation,
    ArbitraryNumberHelpers as helpers,
} from "arbitrary-numbers";

const display = new UnitNotation({ units: CLASSIC_UNITS, fallback: letterNotation });
const fmt = (v) => v.exponent > 300
    ? v.toString(scientificNotation)
    : v.toString(display);

let gold        = an(1, 0);
let gps         = an(1, 0);
let upgradeCost = an(1, 2);
let upgrades    = 0;

for (let t = 1; t <= 350; t++) {
    gold.mulAdd(an(1, 1), gps);  // gold = (gold × 10) + gps — fused, zero alloc

    if (upgrades < 25 && helpers.meetsOrExceeds(gold, upgradeCost)) {
        gold.sub(upgradeCost);
        gps.mul(an(1, 3));
        upgradeCost.mul(an(1, 6));
        upgrades++;
    }
}
```

Output (selected lines):

```
=== Idle game simulation (350 ticks) ===
start  gold=1.00  gps=1.00  upgradeCost=100.00

[t=  2] UPGRADE # 1  gps       1.00 →     1.00 K   next cost: 1.00e+8
[t=  8] UPGRADE # 2  gps     1.00 K →     1.00 M   next cost: 1.00e+14
[t= 15] UPGRADE # 3  gps     1.00 M →     1.00 B   next cost: 1.00e+20
...
[t= 67] UPGRADE #11  gps    1.00 No →    1.00 Dc   next cost: 1.00e+68
[t= 70] snapshot  AN:        112.22 Vg   JS: 1.12e+65
[t= 80] UPGRADE #13  gps   1.00 UDc →   1.00 DDc   next cost: 1.00e+80
...
[t=140] snapshot  AN:             1.21   JS: 1.21e+129
[t=280] snapshot  AN:             1.22   JS: 1.22e+267
[t=350] snapshot  AN:        1.22e+337   JS: Infinity  ← beyond float64 max!

=== Final state ===
Upgrades bought : 25
Final gold (AN) : 1.22e+337
Gold as JS num  : Infinity
```

JS overflows at `~1e308`. ArbitraryNumber keeps tracking the exact value.

> **Note on `UnitNotation` display:** `CLASSIC_UNITS` only defines specific named illion tiers (K, M, B, T … Ct). Values at exponents between named tiers will show as a plain decimal. For fully continuous display across all exponents, use `letterNotation` or `scientificNotation` as the primary formatter.

---

## Performance

Benchmarks: [`benchmarks/`](benchmarks/). Competitor comparison: [`benchmarks/COMPETITOR_BENCHMARKS.md`](benchmarks/COMPETITOR_BENCHMARKS.md).

Node 22.16, Intel i5-13600KF:

| Operation | v2.0 | v1.1 |
|---|---|---|
| `new ArbitraryNumber(c, e)` | ~15.6 ns | ~13.5 ns |
| `clone()` | **~6.7 ns** | ~13.5 ns |
| `add` / `sub` | **~13 ns** | ~270 ns |
| `mul` / `div` | **~11–12 ns** | ~255 ns |
| `sqrt()` | **~11 ns** | ~252 ns |
| `compareTo` | ~3.6 ns | ~3 ns |
| `sumArray(50)` | **~156 ns** (~3.1 ns/elem) | N/A |

v2 arithmetic is **20× faster than v1** — the v1 `Object.create` path cost ~250 ns per result regardless of the math. v2 mutates in-place: steady-state ops are pure float arithmetic with zero allocation.

---

## Migration from v1

| v1 | v2 | Notes |
|---|---|---|
| `a.add(b)` → new instance | `a.add(b)` → mutates `a` | **Breaking.** Use `a.clone().add(b)` to keep old semantics. |
| `chain(a).add(b).done()` | `a.add(b)` | `chain` removed — direct chaining is native. |
| `formula(fn).apply(a)` | `formula().step1().step2().apply(a)` | Builder pattern replaces the callback. |
| `ArbitraryNumber.PrecisionCutoff` | `ArbitraryNumber.defaults.scaleCutoff` | Renamed + namespaced. |
| `ops.add(x, y)` | `ArbitraryNumber.add(x, y)` | Static on main class. |
| `ArbitraryNumberOps` export | removed | — |
| `ArbitraryNumberArithmetic` export | removed | — |
| `NormalizedNumber` export | removed | — |
| `AnChain`, `chain()` export | removed | — |
| `a.toRaw()` | `a.toRawString()` | Renamed for clarity. |
| `a.freeze()` | new | Returns `FrozenArbitraryNumber`. |
| `ArbitraryNumber.Zero.add(...)` | throws `ArbitraryNumberMutationError` | Use `an(0).add(...)`. |
