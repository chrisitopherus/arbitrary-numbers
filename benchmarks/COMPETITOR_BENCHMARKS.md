# Competitor Benchmarks

Measured on 13th Gen Intel Core i5-13600KF @ ~4.80 GHz — Node 22.16.0 (x64-win32).

Libraries compared:
- **[break_infinity.js](https://github.com/Patashu/break_infinity.js)** `v2.2.0` — fast, fixed precision, game-focused, immutable (allocates on every operation)
- **[break_eternity.js](https://github.com/Patashu/break_eternity.js)** `v2.1.3` — extended range (up to e^e^9e15), immutable
- **[decimal.js](https://github.com/MikeMcl/decimal.js)** `v10.6.0` — arbitrary precision (not just range), immutable, full decimal arithmetic

Methodology: N=100 pre-built operand arrays, inner loop amortises mitata per-call overhead, V8 DCE defeated via per-index varying coefficients. Reported = avg µs / 100 = per-operation cost in nanoseconds.

> All v2.0 numbers measured fresh. Competitor numbers measured in the same run.

---

## v1 → v2 improvement summary

| Operation | v1.1 (Object.create) | v2.0 (mutable) | improvement |
|-----------|----------------------|----------------|-------------|
| `new` / `clone()` | ~13.5 ns | ~15.6 ns new / ~6.7 ns clone | new same; clone 2× faster |
| `add` (pure op, no clone) | ~270 ns | **~13 ns** | **21× faster** |
| `mul` | ~255 ns | **~11 ns** | **23× faster** |
| `div` | ~255 ns | **~12 ns** | **21× faster** |
| `sqrt()` | ~252 ns | **~11 ns** | **23× faster** |
| `compareTo` | ~3 ns | ~3.6 ns | unchanged |
| `sumArray(50)` | N/A | **~156 ns** (~3.1 ns/element) | new in v2 |

---

## construction (mantissa + exponent)

| Library             | per-op   |
|---------------------|----------|
| **ArbitraryNumber `clone()`** | **~6.7 ns** |
| **ArbitraryNumber `new`** | ~15.6 ns |
| break_infinity.js `new` | ~61 ns |
| break_eternity.js `new` | ~73 ns |
| decimal.js `new` | ~260 ns |

`clone()` is faster than `new` because it bypasses validation and normalization. Competitors must allocate a new instance on every operation, paying the construction cost for every arithmetic result.

---

## add

| Scenario             | ArbitraryNumber v2 | break_infinity.js | break_eternity.js | decimal.js |
|----------------------|--------------------|-------------------|-------------------|------------|
| small (diff = 0)     | **~13 ns**         | ~28 ns            | ~152 ns           | ~144 ns    |
| large (diff = 10)    | **~13 ns**         | ~32 ns            | ~233 ns           | ~163 ns    |

ArbitraryNumber v2 is **2.1–2.5× faster than break_infinity** on add. The mutable path eliminates the allocation that dominates the cost in immutable libraries.

---

## sub

| Scenario             | ArbitraryNumber v2 | break_infinity.js | break_eternity.js | decimal.js |
|----------------------|--------------------|-------------------|-------------------|------------|
| small                | **~13 ns**         | ~32 ns            | ~195 ns           | ~134 ns    |
| large (diff = 10)    | **~13 ns**         | ~39 ns            | ~263 ns           | ~163 ns    |

---

## mul

| Scenario             | ArbitraryNumber v2 | break_infinity.js | break_eternity.js | decimal.js |
|----------------------|--------------------|-------------------|-------------------|------------|
| small                | **~11 ns**         | ~15 ns            | ~159 ns           | ~380 ns    |
| large                | **~12 ns**         | ~15 ns            | ~162 ns           | ~253 ns    |

**1.3× faster than break_infinity on mul.** The `log10`-free normalisation fast-path (branchless for `[0.1, 100)`) removes the dominant cost.

---

## div

| Scenario             | ArbitraryNumber v2 | break_infinity.js | break_eternity.js | decimal.js |
|----------------------|--------------------|-------------------|-------------------|------------|
| small                | **~12 ns**         | ~39 ns            | ~200 ns           | ~843 ns    |
| large                | **~11 ns**         | ~47 ns            | ~249 ns           | ~469 ns    |

**ArbitraryNumber v2 is 3.4–4.2× faster than break_infinity on div.** break_infinity uses `Math.log10` for division; v2's direct coefficient division skips it entirely. decimal.js is especially slow here due to high-precision long division.

---

## compareTo / cmp

| Scenario             | ArbitraryNumber v2 | break_infinity.js | break_eternity.js | decimal.js |
|----------------------|--------------------|-------------------|-------------------|------------|
| same exponent        | **~3.6 ns**        | ~4.8 ns           | ~20 ns            | ~79 ns     |
| large exponents      | **~3.9 ns**        | ~4.3 ns           | ~20 ns            | ~75 ns     |

**ArbitraryNumber wins** — simplest possible comparison: compare exponents first, coefficient only if equal.

---

## sqrt

| Library             | per-op    |
|---------------------|-----------|
| **ArbitraryNumber v2** | **~11 ns** |
| break_infinity.js   | ~14 ns    |
| break_eternity.js   | ~32 ns    |
| decimal.js          | ~4591 ns  |

**ArbitraryNumber v2 is 1.3× faster than break_infinity on sqrt.** decimal.js uses Newton-Raphson with arbitrary precision — roughly 415× slower.

---

## Batch operations (new in v2)

| Operation                       | per-op / element |
|---------------------------------|------------------|
| `sumArray(50)` — total ~156 ns  | **~3.1 ns/element** |

No equivalent in break_infinity or break_eternity (would allocate N–1 intermediate instances, ~13–73 ns per allocation, plus the addition cost).

---

## Summary

| Operation   | vs break_infinity | vs break_eternity | vs decimal.js |
|-------------|-------------------|-------------------|---------------|
| construction (`new`) | **4× faster** | **5× faster** | **17× faster** |
| `clone()`   | **9× faster**     | **11× faster**   | **39× faster** |
| add / sub   | **2–3× faster**   | **11–20× faster** | **10–13× faster** |
| mul         | **1.3× faster**   | **14× faster**    | **21–33× faster** |
| div         | **3.5–4× faster** | **17–22× faster** | **41–72× faster** |
| compareTo   | **1.3× faster**   | **5× faster**     | **19–22× faster** |
| sqrt        | **1.3× faster**   | **2.9× faster**   | **415× faster** |
| sumArray    | **no equivalent** | **no equivalent** | **no equivalent** |

### What changed in v2

v1 called `Object.create(ArbitraryNumber.prototype)` + two post-hoc property writes for every arithmetic result, costing ~250 ns in V8 regardless of how simple the math is. v2 mutates `this` in-place and returns `this`, reducing steady-state arithmetic to pure floating-point math with zero allocation on the hot path.

ArbitraryNumber v2 beats all three competitors on every operation. Against break_infinity (the previous fastest game-math library) the lead ranges from 1.3× (mul/sqrt) to 4× (div/construction). Against decimal.js, which prioritises precision over speed, the lead is 10–415×.

---

### Methodology caveats

These numbers favour ArbitraryNumber in two structural ways worth knowing:

**1. Mutable vs. immutable API**
All three competitors are immutable — every operation allocates a new object. ArbitraryNumber v2 is mutable — `a.add(b)` writes the result back into `a`. The benchmark pre-allocates clones so each AN call reuses an existing object. This is the primary source of the performance gap, and it reflects a real design trade-off: AN v2 is faster *because it can destroy the operand*, which immutable libraries deliberately avoid. If you need non-destructive arithmetic you must clone first, which adds ~6–7 ns per call and narrows the gap.

**2. decimal.js is the wrong class of competitor**
decimal.js provides arbitrary *precision* (configurable significant digits, correctly-rounded arithmetic per the IEEE 754 decimal spec). ArbitraryNumber provides arbitrary *range* with fixed ~15-digit float64 precision. Comparing them on raw speed is apples-to-oranges; decimal.js is slower because it is doing materially more work per operation.
