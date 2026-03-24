<div align="center">
  <img src="https://raw.githubusercontent.com/YOUR_USERNAME/arbitrary-numbers/main/media/logo.svg" alt="arbitrary-numbers" width="520" />

  <br/>
  <br/>

  [![npm version](https://img.shields.io/npm/v/arbitrary-numbers?color=6366f1&labelColor=0c0c0e)](https://www.npmjs.com/package/arbitrary-numbers)
  [![License: MIT](https://img.shields.io/badge/License-MIT-6366f1?labelColor=0c0c0e)](LICENSE)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.x-6366f1?labelColor=0c0c0e)](https://www.typescriptlang.org/)
  [![Zero dependencies](https://img.shields.io/badge/dependencies-zero-6366f1?labelColor=0c0c0e)](package.json)
</div>

---

Numbers that don't stop at `Number.MAX_SAFE_INTEGER`.

`arbitrary-numbers` stores values as **coefficient × 10^exponent** where the exponent is a plain JavaScript `number`, giving a range up to 10^(1.8×10³⁰⁸). Immutable, zero-dependency, and built for idle games, simulations, and anything that compounds values over time.

---

## Install

```sh
npm install arbitrary-numbers
```

---

## Quick start

```typescript
import { ArbitraryNumber, unitNotation } from 'arbitrary-numbers';

const a = ArbitraryNumber.from(1_500_000);   // 1.5×10⁶
const b = ArbitraryNumber.from(2_500);       // 2.5×10³

a.add(b).toString()                // "1.50e+6"
a.mul(b).toString()                // "3.75e+9"
a.div(b).toString()                // "6.00e+2"

a.greaterThan(b)                   // true
a.toString(unitNotation)           // "1.50 M"
a.toString(unitNotation, 4)        // "1.5000 M"
```

---

## Core concepts

### Normalized storage

Every `ArbitraryNumber` stores `coefficient ∈ [1, 10)` (or `0`). The constructor normalizes automatically:

```typescript
new ArbitraryNumber(15000, 0)  // { coefficient: 1.5, exponent: 4 }
new ArbitraryNumber(0.003, 0)  // { coefficient: 3,   exponent: -3 }
```

Comparison is O(1): exponent first, coefficient only when equal.

### Precision cutoff

When adding two numbers whose exponents differ by more than `PrecisionCutoff` (15), the smaller operand is below the precision floor of the larger and is silently discarded:

```typescript
const huge = new ArbitraryNumber(1, 20);  // 10^20
const tiny = new ArbitraryNumber(1, 3);   // 1,000

huge.add(tiny)  // returns huge — 1,000 is invisible at this scale
```

---

## API

### Constructors

```typescript
new ArbitraryNumber(coefficient, exponent)  // normalizes on construction
ArbitraryNumber.from(1500)                  // shorthand for plain JS numbers
```

### Static constants

| Constant | Value |
|---|---|
| `ArbitraryNumber.Zero` | `0` — additive identity |
| `ArbitraryNumber.One` | `1` — multiplicative identity |
| `ArbitraryNumber.Ten` | `10` |
| `ArbitraryNumber.PrecisionCutoff` | `15` — max exponent gap before add short-circuits |

### Arithmetic

```typescript
a.add(b)   // a + b
a.sub(b)   // a - b
a.mul(b)   // a × b
a.div(b)   // a ÷ b  (throws "Division by zero")
a.pow(n)   // aⁿ  (n can be fractional or negative)
a.negate() // -a
a.abs()    // |a|
```

### Comparison

```typescript
a.compareTo(b)                          // -1 | 0 | 1  (compatible with Array.sort)
a.greaterThan(b)                        // boolean
a.lessThan(b)                           // boolean
a.greaterThanOrEqual(b)                 // boolean
a.lessThanOrEqual(b)                    // boolean
a.equals(b)                             // boolean
ArbitraryNumber.clamp(value, min, max)  // ArbitraryNumber
```

### Rounding & math

```typescript
a.floor()   // largest integer ≤ a
a.ceil()    // smallest integer ≥ a
a.log10()   // log₁₀(a) as a plain number (throws for zero/negative)
```

### Display

```typescript
a.toString()                     // "1.50e+6"  (scientificNotation, 2 decimals)
a.toString(unitNotation)         // "1.50 M"
a.toString(unitNotation, 4)      // "1.5000 M"
a.toString(letterNotation)       // "1.50b"
a.toString(myPlugin, 3)          // custom plugin, 3 decimal places
```

---

## Notation plugins

`toString(plugin, decimals?)` accepts any object with a `format` method.
Three plugins are included out of the box.

### `scientificNotation` (default)

```typescript
import { scientificNotation } from 'arbitrary-numbers';

new ArbitraryNumber(1.5, 3).toString()                      // "1.50e+3"
new ArbitraryNumber(1.5, 3).toString(scientificNotation, 6) // "1.500000e+3"
new ArbitraryNumber(1.5, 0).toString()                      // "1.50"  (no e when exponent = 0)
```

### `unitNotation` — K, M, B, T…

```typescript
import { unitNotation, UnitNotation, CLASSIC_UNITS, COMPACT_UNITS } from 'arbitrary-numbers';

new ArbitraryNumber(1.5, 3).toString(unitNotation)   // "1.50 K"
new ArbitraryNumber(3.2, 6).toString(unitNotation)   // "3.20 M"
new ArbitraryNumber(1.0, 9).toString(unitNotation)   // "1.00 B"

// Custom unit list with letterNotation as fallback:
const compact = new UnitNotation({ units: COMPACT_UNITS, fallback: letterNotation });
```

Numbers beyond the unit list fall back to `letterNotation` for the pre-built `unitNotation`. When building your own instance, the fallback is optional — unmatched tiers render as a plain number when none is set.

### `letterNotation` — a, b, c… aa, ab…

```typescript
import { letterNotation } from 'arbitrary-numbers';

new ArbitraryNumber(1.5, 3).toString(letterNotation)   // "1.50a"   (tier 1)
new ArbitraryNumber(1.5, 6).toString(letterNotation)   // "1.50b"   (tier 2)
new ArbitraryNumber(1.5, 78).toString(letterNotation)  // "1.50z"   (tier 26, last single-letter)
new ArbitraryNumber(1.5, 81).toString(letterNotation)  // "1.50aa"  (tier 27, first two-letter)
```

Sequences never run out — single letters `a–z`, then `aa–zz`, then `aaa`, etc.

---

## Writing a custom plugin

### Simple object

```typescript
import { NotationPlugin } from 'arbitrary-numbers';

const emojiNotation: NotationPlugin = {
  format(coefficient, exponent, decimals) {
    const suffixes = ['', '🔥', '💥', '🌟', '🚀', '🌌'];
    if (exponent < 3) return (coefficient * 10 ** exponent).toFixed(decimals);

    const tier = Math.floor(exponent / 3);
    const display = coefficient * 10 ** (exponent % 3);
    return `${display.toFixed(decimals)}${suffixes[tier] ?? '∞'}`;
  },
};

new ArbitraryNumber(1.5, 3).toString(emojiNotation)  // "1.50🔥"
new ArbitraryNumber(1.5, 9).toString(emojiNotation)  // "1.50🌟"
```

### Extending `SuffixNotationBase`

If your notation is suffix-based (number + label), extend `SuffixNotationBase` — it handles all the tier/remainder math for you. Just implement `getSuffix(tier)`:

```typescript
import { SuffixNotationBase } from 'arbitrary-numbers';

class RomanNotation extends SuffixNotationBase {
  private static readonly TIERS = ['', 'M', 'MM', 'B', 'MB', 'Q'];

  getSuffix(tier: number): string {
    return RomanNotation.TIERS[tier] ?? `e+${tier * 3}`;
  }
}

const roman = new RomanNotation({ separator: " " });

new ArbitraryNumber(1.5, 3).toString(roman)   // "1.50 M"
new ArbitraryNumber(1.5, 6).toString(roman)   // "1.50 MM"
```

---

## Idle game example

```typescript
import { ArbitraryNumber, unitNotation } from 'arbitrary-numbers';

let gold       = ArbitraryNumber.Zero;
let goldPerSec = ArbitraryNumber.One;
let multiplier = ArbitraryNumber.One;

const UPGRADES = [
  { label: 'Copper Pick',   cost: new ArbitraryNumber(1, 1),  mult: new ArbitraryNumber(2,  0) },
  { label: 'Iron Mine',     cost: new ArbitraryNumber(1, 3),  mult: new ArbitraryNumber(1,  1) },
  { label: 'Gold Refinery', cost: new ArbitraryNumber(1, 6),  mult: new ArbitraryNumber(1,  2) },
  { label: 'Quantum Forge', cost: new ArbitraryNumber(1, 12), mult: new ArbitraryNumber(1,  6) },
];

function tick(dt: number): void {
  gold = gold.add(goldPerSec.mul(multiplier).mul(ArbitraryNumber.from(dt)));
}

function buyUpgrade(i: number): boolean {
  const u = UPGRADES[i];
  if (!u || gold.lessThan(u.cost)) return false;
  gold       = gold.sub(u.cost);
  multiplier = multiplier.mul(u.mult);
  return true;
}

function render(): void {
  console.log(`Gold: ${gold.toString(unitNotation)}`);
  console.log(`/sec: ${goldPerSec.mul(multiplier).toString(unitNotation)}`);
}
```

---

## License

MIT © Chris
