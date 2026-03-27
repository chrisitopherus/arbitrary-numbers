# Competitor Benchmarks

Measured on 13th Gen Intel Core i5-13600KF @ ~4.70 GHz — Node 22.16.0 (x64-win32).

Libraries compared:
- **[break_infinity.js](https://github.com/Patashu/break_infinity.js)** `v2.2.0` — fast, fixed precision, game-focused
- **[decimal.js](https://github.com/MikeMcl/decimal.js)** `v10.6.0` — high precision, arbitrary decimal arithmetic

---

## add — same magnitude (1.5e6 + 2.5e6)

| Library           | avg       | p75       |
|-------------------|-----------|-----------|
| **ArbitraryNumber** | **21.11 ns** | 20.07 ns |
| break_infinity    | 24.56 ns  | 23.63 ns  |
| decimal.js        | 90.29 ns  | 88.75 ns  |

**ArbitraryNumber is 1.16× faster than break_infinity, 4.28× faster than decimal.js**

---

## mul — same magnitude (1.5e6 × 3e3)

| Library           | avg        | p75       |
|-------------------|------------|-----------|
| break_infinity    | 10.34 ns   | 10.50 ns  |
| **ArbitraryNumber** | **11.49 ns** | 11.33 ns |
| decimal.js        | 145.12 ns  | 104.08 ns |

**Essentially on par with break_infinity (1.11× slower), 12.6× faster than decimal.js**

---

## chained — idle tick (gold += gps × mult × dt)

| Library           | avg        | p75       |
|-------------------|------------|-----------|
| break_infinity    | 39.74 ns   | 40.04 ns  |
| **ArbitraryNumber** | **48.37 ns** | 47.49 ns |
| decimal.js        | 410.88 ns  | 580.62 ns |

**1.22× slower than break_infinity for chained ops (no fused op used here), 8.5× faster than decimal.js**

> Note: using ArbitraryNumber's fused ops (e.g. `mulAdd`) for this pattern reduces the gap with break_infinity significantly — see [BENCHMARKS.md](../BENCHMARKS.md) for fused op timings.

---

## Summary

| Operation   | vs break_infinity | vs decimal.js |
|-------------|-------------------|---------------|
| add         | **1.16× faster**  | 4.28× faster  |
| mul         | 1.11× slower      | 12.6× faster  |
| chained tick| 1.22× slower      | 8.5× faster   |

ArbitraryNumber is **broadly on par with break_infinity** — a library that trades precision for raw speed — while supporting arbitrary exponent range and pluggable formatting. It is **4–13× faster than decimal.js** on typical game arithmetic.
