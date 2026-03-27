# Competitor Benchmarks

Measured on 13th Gen Intel Core i5-13600KF @ ~4.75 GHz — Node 22.16.0 (x64-win32).

Libraries compared:
- **[break_infinity.js](https://github.com/Patashu/break_infinity.js)** `v2.2.0` — fast, fixed precision, game-focused
- **[decimal.js](https://github.com/MikeMcl/decimal.js)** `v10.6.0` — high precision, arbitrary decimal arithmetic

> ArbitraryNumber numbers are re-measured on each release. Competitor library numbers were last measured alongside v1.0.0.

---

## add — same magnitude (1.5e6 + 2.5e6)

| Library           | avg       | p75       |
|-------------------|-----------|-----------|
| **ArbitraryNumber** | **20.04 ns** | 19.41 ns |
| break_infinity    | 24.56 ns  | 23.63 ns  |
| decimal.js        | 90.29 ns  | 88.75 ns  |

**ArbitraryNumber is 1.22× faster than break_infinity, 4.5× faster than decimal.js**

---

## mul — same magnitude (1.5e6 × 3e3)

| Library           | avg        | p75       |
|-------------------|------------|-----------|
| break_infinity    | 10.34 ns   | 10.50 ns  |
| **ArbitraryNumber** | **10.55 ns** | 10.40 ns |
| decimal.js        | 145.12 ns  | 104.08 ns |

**Essentially on par with break_infinity (~1.02× slower), 13.8× faster than decimal.js**

---

## chained — idle tick (gold += gps × mult × dt)

| Library           | avg        | p75       |
|-------------------|------------|-----------|
| break_infinity    | 39.74 ns   | 40.04 ns  |
| **ArbitraryNumber** | **49.52 ns** | 48.41 ns |
| decimal.js        | 410.88 ns  | 580.62 ns |

**1.25× slower than break_infinity for chained ops (no fused op used here), 8.3× faster than decimal.js**

> Using ArbitraryNumber's fused ops (e.g. `mulAdd`) for this pattern narrows the gap with break_infinity significantly — see [`arithmetic.bench.ts`](arithmetic.bench.ts) for fused op timings.

---

## Summary

| Operation   | vs break_infinity | vs decimal.js |
|-------------|-------------------|---------------|
| add         | **1.22× faster**  | 4.5× faster   |
| mul         | ~1× (on par)      | 13.8× faster  |
| chained tick| 1.25× slower      | 8.3× faster   |

ArbitraryNumber is **broadly on par with break_infinity** — a library that trades precision for raw speed — while supporting arbitrary exponent range and pluggable formatting. It is **4–14× faster than decimal.js** on typical game arithmetic.
