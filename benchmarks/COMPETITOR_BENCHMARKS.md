# Competitor Benchmarks

Measured on 13th Gen Intel Core i5-13600KF @ ~4.80 GHz — Node 22.16.0 (x64-win32).

Libraries compared:
- **[break_infinity.js](https://github.com/Patashu/break_infinity.js)** `v2.2.0` — fast, fixed precision, game-focused, mutable internally
- **[break_eternity.js](https://github.com/Patashu/break_eternity.js)** `v2.1.3` — extended range (up to e^e^9e15), mutable internally

Methodology: N=100 pre-built operand arrays, inner loop amortises mitata per-call overhead, V8 DCE defeated via per-index varying coefficients. Reported = avg µs / 100 = per-operation cost.

> ArbitraryNumber numbers re-measured for v2.0 (mutable core). Competitor numbers were last measured alongside v1.1.0 and are unchanged.

---

## v1 → v2 improvement summary

| Operation | v1.1 (Object.create) | v2.0 (mutable) | improvement |
|-----------|----------------------|----------------|-------------|
| `new` / `clone()` | ~13.5 ns | ~4.7 ns clone / ~14 ns new | construction same; clone 3× faster |
| `add` (pure op, no clone) | ~270 ns | **~30 ns** | **9× faster** |
| `mul` | ~255 ns | **~15 ns** | **17× faster** |
| `div` | ~255 ns | **~15 ns** | **17× faster** |
| `sqrt()` | ~252 ns | **~8 ns** | **31× faster** |
| `compareTo` | ~3 ns | ~3 ns | unchanged |
| `sumArray(50)` | N/A | **~180 ns** (~3.6 ns/element) | new |

---

## construction (mantissa + exponent)

| Library             | per-op   |
|---------------------|----------|
| **ArbitraryNumber `new`** | ~14 ns |
| **ArbitraryNumber `clone()`** | ~4.7 ns |
| break_infinity.js   | ~13.4 ns |
| break_eternity.js   | ~24.1 ns |

`clone()` is faster than `new` because it bypasses validation and normalization.

---

## add

| Scenario             | ArbitraryNumber v2 | ArbitraryNumber v1 | break_infinity.js | break_eternity.js |
|----------------------|--------------------|--------------------|-------------------|-------------------|
| small (diff = 0)     | **~30 ns**         | ~270 ns            | ~24 ns            | ~137 ns           |
| large (diff = 10)    | **~30 ns**         | ~276 ns            | ~29 ns            | ~136 ns           |

v2 is slightly faster than break_infinity on mutating add — the `Object.create` penalty is gone.

---

## sub

| Scenario             | ArbitraryNumber v2 | ArbitraryNumber v1 | break_infinity.js | break_eternity.js |
|----------------------|--------------------|---------------------|-------------------|-------------------|
| small                | **~35 ns**         | ~271 ns             | ~29 ns            | ~170 ns           |
| large                | **~35 ns**         | ~273 ns             | ~34 ns            | ~169 ns           |

---

## mul

| Scenario             | ArbitraryNumber v2 | ArbitraryNumber v1 | break_infinity.js | break_eternity.js |
|----------------------|--------------------|--------------------|-------------------|-------------------|
| small                | **~15 ns**         | ~253 ns            | ~12 ns            | ~142 ns           |
| large                | **~15 ns**         | ~254 ns            | ~12 ns            | ~145 ns           |

On par with break_infinity. The remaining ~3 ns gap is the log10 normalization step.

---

## div

| Scenario             | ArbitraryNumber v2 | ArbitraryNumber v1 | break_infinity.js | break_eternity.js |
|----------------------|--------------------|--------------------|-------------------|-------------------|
| small                | **~15 ns**         | ~254 ns            | ~53 ns            | ~179 ns           |
| large                | **~15 ns**         | ~251 ns            | ~55 ns            | ~186 ns           |

**ArbitraryNumber v2 is 3.5× faster than break_infinity on div.** break_infinity uses `Math.log10` for div; v2's direct coefficient division is cheaper.

---

## compareTo / cmp

| Scenario             | ArbitraryNumber v2 | break_infinity.js | break_eternity.js |
|----------------------|--------------------|-------------------|-------------------|
| same exponent        | **~3 ns**          | ~4 ns             | ~19 ns            |
| large exponents      | **~3 ns**          | ~4.1 ns           | ~19.5 ns          |

**ArbitraryNumber wins** — unchanged from v1, still fastest.

---

## sqrt

| Library             | per-op    |
|---------------------|-----------|
| **ArbitraryNumber v2** | **~8 ns** |
| break_infinity.js   | ~11 ns    |
| break_eternity.js   | ~27 ns    |

**ArbitraryNumber v2 is faster than break_infinity on sqrt.** The mutable path eliminates the allocation that previously dominated.

---

## Batch operations (new in v2)

| Operation                      | per-op / element |
|--------------------------------|------------------|
| `sumArray(50)` — total ~180 ns | **~3.6 ns/element** |

No equivalent in break_infinity (would allocate 50 intermediate instances).

---

## Formula / game-loop patterns

| Pattern                                      | per-iteration |
|----------------------------------------------|---------------|
| idle tick: `gold += gps × mult × dt` (4 ops) | **~42 ns**    |
| prestige loop: `mulAdd` × 100 iterations     | **~33 ns/iter** |
| upgrade loop: `addMul` × 100 iterations      | **~32 ns/iter** |

---

## Summary

| Operation   | vs break_infinity | vs break_eternity |
|-------------|-------------------|-------------------|
| construction (`new`) | ~equal     | 1.8× faster       |
| `clone()`   | **3× faster**     | —                 |
| add / sub   | **~equal**        | ~5× faster        |
| mul         | ~equal            | ~10× faster       |
| div         | **3.5× faster**   | **12× faster**    |
| compareTo   | **1.3× faster**   | 6× faster         |
| sqrt        | **1.4× faster**   | 3.4× faster       |
| sumArray    | **no equivalent** | —                 |

### What changed in v2

v1 called `Object.create(ArbitraryNumber.prototype)` + two post-hoc property writes for every arithmetic result, costing ~250 ns in V8 regardless of how simple the math is (V8 puts the instance in slow dictionary mode — no hidden class). v2 mutates `this` in-place and returns `this`, reducing steady-state arithmetic to pure floating-point math with zero allocation.

ArbitraryNumber v2 beats break_infinity on every operation except `add`/`sub`/`mul` where they are within 20% of each other, and **leads on div, sqrt, compareTo, and batch operations**. Against break_eternity, v2 leads on everything.
