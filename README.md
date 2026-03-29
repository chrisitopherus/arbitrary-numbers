<div align="center">
  <img src="https://raw.githubusercontent.com/chrisitopherus/arbitrary-numbers/main/media/logo.svg" alt="arbitrary-numbers" width="520" />

  <br/>
  <br/>

  [![npm version](https://img.shields.io/npm/v/arbitrary-numbers?color=6366f1&labelColor=0c0c0e)](https://www.npmjs.com/package/arbitrary-numbers)
  [![License: MIT](https://img.shields.io/badge/License-MIT-6366f1?labelColor=0c0c0e)](LICENSE)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.x-6366f1?labelColor=0c0c0e)](https://www.typescriptlang.org/)
  [![Zero dependencies](https://img.shields.io/badge/dependencies-zero-6366f1?labelColor=0c0c0e)](package.json)
</div>

`arbitrary-numbers` fills a specific gap: JavaScript's `Number` type silently loses precision above `Number.MAX_SAFE_INTEGER`, and `BigInt` doesn't support decimals or fast arithmetic over huge exponents.

Numbers are stored as a normalized `coefficient × 10^exponent` pair. That makes arithmetic across wildly different scales fast and predictable — exactly what idle games and simulations need when values span from `1` to `10^300` in the same loop.

- **Immutable by default** — every operation returns a new instance, no surprise mutations
- **Fused operations** (`mulAdd`, `subMul`, ...) — reduce allocations in hot loops
- **Formula pipelines** — define an expression once, apply it to any number of values
- **Pluggable display** — swap between scientific, unit (K/M/B/T), and letter notation without touching game logic
- **Zero dependencies** — nothing to audit, nothing to break

## Install

```sh
npm install arbitrary-numbers
```

Requires TypeScript `"strict": true`.

## Quick start

```typescript
import { an, chain, formula, unitNotation } from "arbitrary-numbers";

// Exact at any scale, no overflow or silent precision loss
const base  = an(1, 9);  // 1,000,000,000
const armor = an(2, 6);  //     2,000,000
let   gold  = an(5, 6);  //     5,000,000

// Damage formula: (base - armor) * 0.75
const damage = chain(base)
    .subMul(armor, an(7.5, -1))
    .floor()
    .done();

damage.toString(unitNotation)  // "748.50 M"

// Per-tick update: fused op, one allocation instead of two
gold = gold.mulAdd(an(1.05), an(1, 4));  // (gold * 1.05) + 10,000

// Reusable formula pipeline applied to multiple values
const applyArmor = formula("Armor").subMul(armor, an(7.5, -1)).floor();
const physDamage = applyArmor.apply(base);
const magDamage  = applyArmor.apply(an(8, 8));

// Formatting adapts at every scale automatically
an(1.5, 3).toString(unitNotation)  // "1.50 K"
an(1.5, 6).toString(unitNotation)  // "1.50 M"
an(1.5, 9).toString(unitNotation)  // "1.50 B"
```

## Table of contents

- [Install](#install)
- [Quick start](#quick-start)
- [Table of contents](#table-of-contents)
- [Creating numbers](#creating-numbers)
- [Arithmetic](#arithmetic)
- [Fused operations](#fused-operations)
- [Fluent builder - `chain()`](#fluent-builder---chain)
- [Reusable formulas - `formula()`](#reusable-formulas---formula)
  - [chain() vs formula()](#chain-vs-formula)
- [Comparison and predicates](#comparison-and-predicates)
- [Rounding and math](#rounding-and-math)
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

## Fused operations

Fused methods compute a two-step expression in one normalisation pass, saving one intermediate allocation per call. Use them in per-tick update loops.

```typescript
// (gold * rate) + bonus  in one pass, ~1.5x faster than chained
gold = gold.mulAdd(prestigeRate, prestigeBonus);

// Other fused pairs
base.addMul(bonus, multiplier);   // (base + bonus) * multiplier
income.mulSub(rate, upkeep);      // (income * rate) - upkeep
raw.subMul(reduction, boost);     // (raw - reduction) * boost
damage.divAdd(speed, flat);       // (damage / speed) + flat

// Sum an array in one pass, ~9x faster than .reduce((a, b) => a.add(b))
const total = ArbitraryNumber.sumArray(incomeSources);
```

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

n.floor()   // 1
n.ceil()    // 2
n.round()   // 2

an(4, 0).sqrt()              // 2       (1.18x faster than .pow(0.5))
an(1, 4).sqrt()              // 100
an(-4, 0).sqrt()             // throws ArbitraryNumberDomainError

an(1, 3).log10()             // 3
an(1.5, 3).log10()           // 3.176...
ArbitraryNumber.Zero.log10() // throws ArbitraryNumberDomainError

an(1.5, 3).toNumber()        // 1500
an(1, 400).toNumber()        // Infinity  (exponent beyond float64 range)
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

huge.add(tiny)  // returns huge unchanged
```

Override globally or for a single scoped block:

```typescript
ArbitraryNumber.PrecisionCutoff = 50;  // global

// Scoped - PrecisionCutoff is restored after fn, even on throw
const result = ArbitraryNumber.withPrecision(50, () => a.add(b));
```

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

A self-contained simulation showing `an()`, fused ops, `chain()`, helpers, and `unitNotation` working together.

```typescript
import {
    ArbitraryNumber, an, chain,
    unitNotation, ArbitraryNumberHelpers as helpers,
} from "arbitrary-numbers";

let gold       = ArbitraryNumber.Zero;
let goldPerSec = an(1);

const UPGRADES = [
    { label: "Copper Pick  ", cost: an(50),    mult: an(5)    },
    { label: "Iron Mine    ", cost: an(1, 3),  mult: an(20)   },
    { label: "Gold Refinery", cost: an(5, 6),  mult: an(1, 4) },
] as const;

function tick(): void {
    gold = gold.add(goldPerSec);
}

function tryBuyAll(): void {
    for (const u of UPGRADES) {
        if (!helpers.meetsOrExceeds(gold, u.cost)) continue;
        gold       = gold.sub(u.cost);
        goldPerSec = goldPerSec.mul(u.mult);
        console.log(`  bought ${u.label}  GPS: ${goldPerSec.toString(unitNotation)}`);
    }
}

function prestige(multiplier: ArbitraryNumber): void {
    goldPerSec = chain(goldPerSec)
        .mulAdd(multiplier, an(1))  // (gps * mult) + 1, fused
        .floor()
        .done();
    console.log(`  prestige!  new GPS: ${goldPerSec.toString(unitNotation)}`);
}

for (let t = 1; t <= 1_000_000; t++) {
    tick();
    if (t % 10 === 0)      tryBuyAll();
    if (t === 51_000)      prestige(an(1.5));
    if (t % 250_000 === 0) {
        const g   = gold.toString(unitNotation, 3);
        const gps = goldPerSec.toString(unitNotation, 3);
        console.log(`[t=${String(t).padStart(9)}]  gold: ${g.padStart(12)}  gps: ${gps}`);
    }
}
```

Output:

```
  bought Copper Pick    GPS: 5.00
  bought Iron Mine      GPS: 100.00
  bought Gold Refinery  GPS: 1.00 M
  prestige!  new GPS: 1.50 M
[t=  250000]  gold:  199.750 B  gps: 1.500 M
[t=  500000]  gold:  574.750 B  gps: 1.500 M
[t=  750000]  gold:  949.750 B  gps: 1.500 M
[t= 1000000]  gold:    1.325 T  gps: 1.500 M
```

## Performance

Benchmarks are in [`benchmarks/`](benchmarks/). Competitor comparison: [`benchmarks/COMPETITOR_BENCHMARKS.md`](benchmarks/COMPETITOR_BENCHMARKS.md).

Quick reference (Node 22.16, Intel i5-13600KF):

| Operation | Time |
|---|---|
| `add` / `sub` (typical) | ~20-28 ns |
| `mul` / `div` | ~10-11 ns |
| Fused ops (`mulAdd`, `mulSub`, ...) | ~27-29 ns, 1.5-1.6x faster than chained |
| `sumArray(50 items)` | ~200 ns, 8.4-8.7x faster than `.reduce` |
| `compareTo` (same exponent) | ~0.6 ns |
| `sqrt()` | ~10 ns |
| `pow(0.5)` | ~7 ns |
