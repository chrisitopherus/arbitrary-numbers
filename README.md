<div align="center">
  <img src="media/logo.svg" alt="arbitrary-numbers" width="520" />

  <br/>
  <br/>

  [![npm version](https://img.shields.io/npm/v/arbitrary-numbers?color=6366f1&labelColor=0c0c0e)](https://www.npmjs.com/package/arbitrary-numbers)
  [![License: MIT](https://img.shields.io/badge/License-MIT-6366f1?labelColor=0c0c0e)](LICENSE)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.x-6366f1?labelColor=0c0c0e)](https://www.typescriptlang.org/)
  [![Zero dependencies](https://img.shields.io/badge/dependencies-zero-6366f1?labelColor=0c0c0e)](package.json)
</div>

---

## Why?

JavaScript's `number` type maxes out at `Number.MAX_SAFE_INTEGER` — roughly 9×10¹⁵. In an idle game, a simulation, or anything that compounds values over time, that ceiling is hit in minutes.

`arbitrary-numbers` represents values as **coefficient × 10^exponent**, where the exponent is a plain `number` and can be as large as `Number.MAX_VALUE` (~1.8×10³⁰⁸). Arithmetic is performed symbolically, so `1×10³⁰⁰ + 1×10¹` is handled just as naturally as `100 + 10`.

```
1.500e+300  ✓      1.500e+308  ✓      1.500e+1000000  ✓
```

---

## Features

- **Immutable & always normalized** — every instance stores `coefficient ∈ [1, 10)` (or zero). No surprises.
- **Full arithmetic** — `add`, `sub`, `mul`, `div`, `pow`
- **Precision-aware addition** — values more than 15 orders of magnitude apart are merged without floating-point noise polluting the result
- **Comparison suite** — `compareTo`, `greaterThan`, `lessThan`, `equals`, `clamp`
- **Rounding** — `floor`, `ceil`, `log10`
- **Pluggable display** — swap notation at call-site; `ScientificNotation` ships out of the box, custom plugins are a single method
- **Zero runtime dependencies**
- **Full TypeScript** — ships `.d.ts` files, no `@types/` package needed

---

## Installation

```sh
npm install arbitrary-numbers
```

---

## Quick Start

```typescript
import { ArbitraryNumber, scientificNotation } from 'arbitrary-numbers';

const a = new ArbitraryNumber(1.5, 3);  // 1,500
const b = new ArbitraryNumber(2.5, 6);  // 2,500,000

a.add(b).toString()   // "2.501500000000000e+6"
a.mul(b).toString()   // "3.750000000000000e+9"
a.div(b).toString()   // "6.000000000000001e-4"

// compare
a.lessThan(b)   // true
b.greaterThan(a) // true
a.equals(a)      // true
```

---

## Idle Game Example

The library was designed with incremental / idle games in mind — here is a self-contained example that covers the typical patterns.

```typescript
import { ArbitraryNumber, scientificNotation } from 'arbitrary-numbers';

// ── Resources ────────────────────────────────────────────────────────────────

let gold        = ArbitraryNumber.Zero;
let goldPerSec  = ArbitraryNumber.One;      // base: 1 gold / sec
let multiplier  = ArbitraryNumber.One;

// ── Upgrades ─────────────────────────────────────────────────────────────────

const UPGRADES = [
  { label: 'Copper Pick',    cost: new ArbitraryNumber(1, 1),   mult: new ArbitraryNumber(2,   0) },
  { label: 'Iron Mine',      cost: new ArbitraryNumber(1, 3),   mult: new ArbitraryNumber(1,   1) },
  { label: 'Gold Refinery',  cost: new ArbitraryNumber(1, 6),   mult: new ArbitraryNumber(1,   2) },
  { label: 'Quantum Forge',  cost: new ArbitraryNumber(1, 12),  mult: new ArbitraryNumber(1,   6) },
  { label: 'Singularity',    cost: new ArbitraryNumber(1, 24),  mult: new ArbitraryNumber(1,  12) },
];

// ── Game loop ─────────────────────────────────────────────────────────────────

function tick(deltaSeconds: number): void {
  const earned = goldPerSec.mul(multiplier).mul(new ArbitraryNumber(deltaSeconds, 0));
  gold = gold.add(earned);
}

// ── Upgrades ──────────────────────────────────────────────────────────────────

function canAfford(cost: ArbitraryNumber): boolean {
  return gold.greaterThan(cost) || gold.equals(cost);
}

function buyUpgrade(index: number): boolean {
  const upgrade = UPGRADES[index];
  if (!upgrade || !canAfford(upgrade.cost)) return false;

  gold       = gold.sub(upgrade.cost);
  multiplier = multiplier.mul(upgrade.mult);
  return true;
}

// ── Prestige ──────────────────────────────────────────────────────────────────

const PRESTIGE_THRESHOLD = new ArbitraryNumber(1, 30);  // 10^30 gold

function canPrestige(): boolean {
  return gold.greaterThan(PRESTIGE_THRESHOLD);
}

function prestige(): ArbitraryNumber {
  // prestige bonus scales with log10 of total gold earned
  const bonus = new ArbitraryNumber(gold.log10(), 0);
  gold       = ArbitraryNumber.Zero;
  multiplier = ArbitraryNumber.One;
  return bonus;
}

// ── Display ───────────────────────────────────────────────────────────────────

function render(): void {
  console.log(`Gold:       ${gold.toString(scientificNotation)}`);
  console.log(`Per second: ${goldPerSec.mul(multiplier).toString(scientificNotation)}`);
  console.log(`Multiplier: ${multiplier.toString(scientificNotation)}`);
  console.log();

  for (const [i, upgrade] of UPGRADES.entries()) {
    const affordable = canAfford(upgrade.cost) ? '✓' : '✗';
    console.log(
      `  [${affordable}] ${upgrade.label.padEnd(16)} ` +
      `cost: ${upgrade.cost.toString(scientificNotation).padEnd(24)} ` +
      `→ ×${upgrade.mult.toString(scientificNotation)}`
    );
  }

  if (canPrestige()) {
    console.log('\n  ★ PRESTIGE AVAILABLE');
  }
}
```

Sample output after a few in-game hours:

```
Gold:       2.847e+18
Per second: 1.000e+12
Multiplier: 1.000e+12

  [✗] Copper Pick      cost: 1.000e+1             → ×2.000e+0
  [✗] Iron Mine        cost: 1.000e+3             → ×1.000e+1
  [✗] Gold Refinery    cost: 1.000e+6             → ×1.000e+2
  [✓] Quantum Forge    cost: 1.000e+12            → ×1.000e+6
  [✓] Singularity      cost: 1.000e+24            → ×1.000e+12
```

---

## Core Concepts

### Normalized representation

Every `ArbitraryNumber` is stored as:

```
value = coefficient × 10^exponent
```

where `coefficient` is always in **[1, 10)** (or exactly `0` for zero). The constructor normalizes automatically:

```typescript
new ArbitraryNumber(15000, 0)  // stored as { coefficient: 1.5,  exponent: 4 }
new ArbitraryNumber(0.003, 0)  // stored as { coefficient: 3,    exponent: -3 }
new ArbitraryNumber(0, 999)    // stored as { coefficient: 0,    exponent: 0 }
```

Because every instance is canonical, **comparison is O(1)**: compare exponents first, fall through to coefficients only when equal.

### Precision cutoff

When adding two numbers whose exponents differ by more than `PrecisionCutoff` (default `15`), the smaller operand is below the precision floor of the larger one and is discarded:

```typescript
const huge  = new ArbitraryNumber(1, 20);  // 10^20
const tiny  = new ArbitraryNumber(1, 3);   //  1,000

huge.add(tiny)  // returns huge — the 1,000 is invisible at this scale
```

This matches physical intuition and prevents meaningless precision noise.

---

## Notation Plugins

`toString()` accepts any object that satisfies the `NotationPlugin` interface:

```typescript
interface NotationPlugin {
  format(coefficient: number, exponent: number, decimals: number): string;
}
```

The plugin receives a **normalized** coefficient (always in [1, 10)), so all display logic lives in one place with no conversion math required.

### ScientificNotation (built-in)

```typescript
import { scientificNotation, ScientificNotation } from 'arbitrary-numbers';

const n = new ArbitraryNumber(1.5, 12);

n.toString()                      // "1.500000000000000e+12"  (default)
n.toString(scientificNotation)    // same — scientificNotation is the default
```

### Custom notation

```typescript
import { NotationPlugin } from 'arbitrary-numbers';

// Short suffix notation — K / M / B / T, then scientific
const shortNotation: NotationPlugin = {
  format(coefficient, exponent, _decimals) {
    if (exponent < 3)  return (coefficient * 10 ** exponent).toFixed(0);

    const tiers = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi'];
    const tier  = Math.floor(exponent / 3);
    const label = tiers[tier];

    if (label !== undefined) {
      const display = coefficient * 10 ** (exponent % 3);
      return `${display.toFixed(2)}${label}`;
    }

    return `${coefficient.toFixed(2)}e+${exponent}`;
  }
};

new ArbitraryNumber(1.5,  3).toString(shortNotation)   // "1.50K"
new ArbitraryNumber(3.5,  6).toString(shortNotation)   // "3.50M"
new ArbitraryNumber(1.23, 9).toString(shortNotation)   // "1.23B"
new ArbitraryNumber(1,   18).toString(shortNotation)   // "1.00e+18"
```

### SuffixNotationBase (extend for suffix-based notations)

Implement only `getSuffix(exponent)` — all the tier/remainder math is handled for you:

```typescript
import { SuffixNotationBase } from 'arbitrary-numbers';

class EmojiNotation extends SuffixNotationBase {
  private static readonly TIERS = ['', '🔥', '💥', '🌟', '🚀', '🌌'];

  getSuffix(exponent: number): string {
    const tier = Math.floor(exponent / 3);
    return EmojiNotation.TIERS[tier] ?? `e+${exponent}`;
  }
}

const emoji = new EmojiNotation();

new ArbitraryNumber(1.5, 3).toString(emoji)   // "1.50🔥"
new ArbitraryNumber(1.5, 6).toString(emoji)   // "1.50💥"
new ArbitraryNumber(1.5, 9).toString(emoji)   // "1.50🌟"
```

---

## API Reference

### `new ArbitraryNumber(coefficient, exponent)`

Constructs and **normalizes** a new instance. `coefficient` and `exponent` can be any finite numbers; the constructor will adjust them so that `Math.abs(coefficient) ∈ [1, 10)`.

```typescript
const n = new ArbitraryNumber(1.5, 3);
n.coefficient  // 1.5
n.exponent     // 3
```

### Static constants

| Constant | Value | Description |
|---|---|---|
| `ArbitraryNumber.Zero` | `0 × 10⁰` | Additive identity |
| `ArbitraryNumber.One` | `1 × 10⁰` | Multiplicative identity |
| `ArbitraryNumber.Ten` | `1 × 10¹` | Ten |
| `ArbitraryNumber.PrecisionCutoff` | `15` | Max exponent gap before addition short-circuits |

---

### Arithmetic

#### `.add(other)` → `ArbitraryNumber`

Returns `this + other`. When `|this.exponent - other.exponent| > PrecisionCutoff`, the larger operand is returned unchanged (smaller is below precision floor).

#### `.sub(other)` → `ArbitraryNumber`

Returns `this - other`.

#### `.mul(other)` → `ArbitraryNumber`

Returns `this × other`. Either operand being zero short-circuits to `ArbitraryNumber.Zero`.

#### `.div(other)` → `ArbitraryNumber`

Returns `this ÷ other`. Throws `"Division by zero"` when `other` is zero.

#### `.pow(n)` → `ArbitraryNumber`

Returns `this^n` where `n` is a plain `number`. `n === 0` always returns `One`; `Zero.pow(n)` always returns `Zero`.

---

### Comparison

#### `.compareTo(other)` → `-1 | 0 | 1`

Standard comparator. Compares exponents first, then coefficients. Suitable for use with `Array.prototype.sort`.

#### `.greaterThan(other)` → `boolean`

#### `.lessThan(other)` → `boolean`

#### `.equals(other)` → `boolean`

#### `ArbitraryNumber.clamp(value, min, max)` → `ArbitraryNumber`

Returns `value` clamped to `[min, max]`.

---

### Rounding

#### `.floor()` → `ArbitraryNumber`

Returns the largest integer `≤ this`. Returns `this` unchanged when `exponent ≥ PrecisionCutoff` (value is already an integer at that scale).

#### `.ceil()` → `ArbitraryNumber`

Returns the smallest integer `≥ this`. Returns `this` unchanged when `exponent ≥ PrecisionCutoff`.

---

### Other

#### `.log10()` → `number`

Returns `log₁₀(this)`. Throws `"Logarithm of zero is undefined"` for zero. Because the value is normalized, this is simply `Math.log10(coefficient) + exponent`.

#### `.toString(notation?)` → `string`

Formats the number using the given `NotationPlugin`. Defaults to `scientificNotation`. The `decimals` argument passed to the plugin is `ArbitraryNumber.PrecisionCutoff`.

---

## License

MIT © Chris
