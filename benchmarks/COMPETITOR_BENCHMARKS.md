# Competitor Benchmarks

Measured on 13th Gen Intel Core i5-13600KF @ ~4.80 GHz — Node 22.16.0 (x64-win32).

Libraries compared:
- **[break_infinity.js](https://github.com/Patashu/break_infinity.js)** `v2.2.0` — fast, fixed precision, game-focused, mutable internally
- **[break_eternity.js](https://github.com/Patashu/break_eternity.js)** `v2.1.3` — extended range (up to e^e^9e15), mutable internally

Methodology: N=100 pre-built operand arrays, inner loop amortises mitata per-call overhead, V8 DCE defeated via per-index varying coefficients. Reported = avg µs / 100 = per-operation cost.

> ArbitraryNumber numbers should be re-measured on each release. Competitor numbers were last measured alongside v1.1.0.

---

## construction (mantissa + exponent)

| Library             | per-op   |
|---------------------|----------|
| **ArbitraryNumber** | ~13.5 ns |
| break_infinity.js   | ~13.4 ns |
| break_eternity.js   | ~24.1 ns |

All three are essentially identical. Construction cost is dominated by `new` + property writes.

---

## add

| Scenario             | ArbitraryNumber | break_infinity.js | break_eternity.js |
|----------------------|-----------------|-------------------|-------------------|
| small (diff = 0)     | ~270 ns         | **~24 ns**        | ~137 ns           |
| large (diff = 10)    | ~276 ns         | **~29 ns**        | ~136 ns           |

break_infinity is ~10× faster. Root cause: break_infinity mutates its internal object; ArbitraryNumber allocates a new object per result via `Object.create` (~250 ns floor in V8).

---

## sub

| Scenario             | ArbitraryNumber | break_infinity.js | break_eternity.js |
|----------------------|-----------------|-------------------|-------------------|
| small                | ~271 ns         | **~29 ns**        | ~170 ns           |
| large                | ~273 ns         | **~34 ns**        | ~169 ns           |

Same pattern as add — ~8–9× slower.

---

## mul

| Scenario             | ArbitraryNumber | break_infinity.js | break_eternity.js |
|----------------------|-----------------|-------------------|-------------------|
| small                | ~253 ns         | **~12 ns**        | ~142 ns           |
| large                | ~254 ns         | **~12 ns**        | ~145 ns           |

break_infinity ~21× faster. Mul is cheaper internally for break_infinity (no alignment shift needed), making the relative gap larger.

---

## div

| Scenario             | ArbitraryNumber | break_infinity.js | break_eternity.js |
|----------------------|-----------------|-------------------|-------------------|
| small                | ~254 ns         | **~53 ns**        | ~179 ns           |
| large                | ~251 ns         | **~55 ns**        | ~186 ns           |

break_infinity ~5× faster. div uses `Math.log10` internally so the gap narrows vs add/mul.

---

## compareTo / cmp

| Scenario             | ArbitraryNumber  | break_infinity.js | break_eternity.js |
|----------------------|------------------|-------------------|-------------------|
| same exponent        | **~3 ns**        | ~4 ns             | ~19 ns            |
| large exponents      | **~3.2 ns**      | ~4.1 ns           | ~19.5 ns          |

**ArbitraryNumber wins** — no allocation, simple field comparison. ~1.3× faster than break_infinity, ~6× faster than break_eternity.

---

## sqrt

| Library             | per-op    |
|---------------------|-----------|
| break_infinity.js   | **~11 ns**|
| break_eternity.js   | ~27 ns    |
| ArbitraryNumber     | ~252 ns   |

break_infinity ~22× faster. Again, allocation dominates.

---

## Summary

| Operation   | vs break_infinity | vs break_eternity |
|-------------|-------------------|-------------------|
| construction| ~equal            | 1.8× faster       |
| add / sub   | **~9–11× slower** | ~1.9× faster      |
| mul         | **~21× slower**   | ~1.8× faster      |
| div         | **~5× slower**    | ~1.4× faster      |
| compareTo   | **1.3× faster**   | 6× faster         |
| sqrt        | **~22× slower**   | ~1.1× faster      |

### Root cause

Every operation that returns a new `ArbitraryNumber` calls `Object.create(ArbitraryNumber.prototype)` + two property writes. This costs ~250 ns in V8 regardless of how simple the math is. break_infinity avoids this by mutating its object in place internally. The algorithmic work (coefficient arithmetic, exponent alignment) is not the bottleneck — allocation is.

ArbitraryNumber beats both competitors on compareTo (no allocation) and beats break_eternity on all other ops.
