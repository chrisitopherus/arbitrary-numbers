# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-04-18

### Added

- **Serialization** — `toJSON()` returns `{ c, e }` blobs; `fromJSON(obj)` validates and reconstructs; `toRaw()` / `parse(s)` for pipe-format strings (`"1.5|3"`); `parse` also accepts plain decimal and scientific notation strings
- **`mulDiv` fused op** — `(this * multiplier) / divisor` in one step, avoiding an intermediate allocation; zero-check before multiply; ~30–40% faster than chained `.mul().div()`
- **`mulSub` / `subMul`** fused ops — `(this * mult) - sub` and `(this - sub) * mult`
- **New math methods** — `cbrt()`, `log(base)`, `ln()`, `exp10(n)`, `trunc()`
- **Batch operations** — `ArbitraryNumber.productArray(nums)`, `ArbitraryNumber.maxOfArray(nums)`, `ArbitraryNumber.minOfArray(nums)`
- **`Symbol.toPrimitive`** — `+an(1500)` returns `1500`; template literals call `toString()`
- **`nodejs.util.inspect.custom`** — `console.log(an(1500))` renders `"1.50e+3"` instead of the raw object
- **`ArbitraryNumberOps.tryFrom`** — returns `null` for non-finite inputs instead of throwing; safe for use at system boundaries
- **`UnitNotation` fallback offset** — new `offsetFallback` option (default `true`) shifts the fallback plugin's tier by `lastDefinedTier`, keeping suffixes visually distinct from low-tier ones
- **`pow10Int(n)`** — branch-free table-only lookup for hot paths where `n ∈ [0, 15]` is guaranteed
- **Property-based tests** via `fast-check` — commutativity, associativity, distributivity, sqrt/pow round-trip, `toNumber`/`from` round-trip, `fromJSON`/`toJSON` round-trip, all fused-op equivalences, `sumArray` equivalence
- **Utility types** — `Maybe<T>`, `Nullable<T>`, `ArbitraryNumberJson` exported from the public API
- **Keywords** — added `bignumber`, `idle-games`, `incremental`, `clicker`, `prestige`, `notation`, `decimal` for discoverability

### Changed

- **`UnitNotation` fallback default** — `offsetFallback` defaults to `true`; set `offsetFallback: false` to restore pre-1.1 behaviour where the raw tier was passed to the fallback
- **`SuffixNotationBase` negative exponent path** — now uses `coefficient / pow10(-exponent)` (table lookup) instead of `Math.pow(10, exponent)`, saving ~1–2 ns per format call
- **`PrecisionCutoff` reads hoisted** — all hot-path arithmetic methods (`add`, `sub`, `mulAdd`, `addMul`, `mulSub`, `subMul`, `divAdd`, `sumArray`) now read the static field once into a local `const cutoff`, letting V8 treat it as a register-resident value
- **`pow10Int` in arithmetic hot paths** — replaced `pow10(diff)` with `pow10Int(diff)` at all sites where `diff` is bounded by `PrecisionCutoff` (≤ 15)
- **`alphabetSuffix` single-char guard** — single-character alphabets now return `alphabet.repeat(tier)` in O(1) instead of the previous O(N) loop that would hang for large tiers
- **README** — added competitive comparison table, negative-numbers section, serialization/save-load section (with 60 s save-game pattern), and precision troubleshooting sub-section

### Fixed

- **`ScientificNotation` rounding** — `format(9.5, 3, 0)` now correctly emits `"1e+4"` instead of the non-normalised `"10e+3"`
- **`subtractWithFloor` upper-bound bug** — result was incorrectly clamped to `value` when subtracting a negative delta; now only the floor is enforced
- **`createNormalized` dev assertion** — warns in non-production builds if a zero coefficient is passed with a non-zero exponent (invariant violation)

### Performance

- `mulDiv`: ~30–40% faster than `.mul().div()` (one fewer allocation, one step normalisation)
- `pow10Int`: ~0.5 ns saved per arithmetic op in hot paths
- `PrecisionCutoff` hoisting: eliminates repeated static-property lookups in all 7 arithmetic methods
- `sumArray`: unchanged algorithmic complexity, but now skips the static read N times

## [1.0.2] - 2026-03-29

### Fixed

- README/example drift: corrected mismatches where README snippets and output no longer matched the scripts in `examples/`
- Documentation clarity: reformatted example console output with labeled sections/events so the library benefits are immediately visible

## [1.0.1] - 2026-03-29

### Changed

- README: rewrote the intro to be specific about the library's scope - idle games and simulations, not general scientific computing

## [1.0.0] - 2026-03-28

### Added

- `ArbitraryNumber` - immutable arbitrary-magnitude number stored as `coefficient × 10^exponent`
- Full arithmetic: `add`, `sub`, `mul`, `div`, `pow`, `abs`, `neg`, `floor`, `ceil`, `round`, `min`, `max`, `clamp`, `log10`, `sqrt`
- Fused operations for performance: `mulAdd`, `addMul`, `divAdd`, `sumArray`
- Comparison: `eq`, `neq`, `lt`, `lte`, `gt`, `gte`, `isZero`, `isNegative`, `isInteger`
- Factory methods: `ArbitraryNumber.from`, `ArbitraryNumber.zero`, `ArbitraryNumber.one`; shorthand `an()`
- `ArbitraryNumberArithmetic` - static arithmetic helpers
- `ArbitraryNumberGuard` - type guards and validation utilities
- `AnChain` - fluent chaining API via `chain()`
- `AnFormula` - reusable formula pipelines via `formula()`
- Notation plugins: `ScientificNotation`, `EngineeringNotation`, `AlphabetNotation`, `UnitNotation`
- `SuffixNotationBase` - base class for custom suffix-based notations
- `alphabetSuffix()` - standalone Excel-style column suffix generator
- Custom error classes: `ArbitraryNumberError`, `ArbitraryNumberInputError`, `ArbitraryNumberDomainError`
- Mutable `ArbitraryNumber.PrecisionCutoff` static for tunable precision
- Full TypeScript declarations with source maps

### Performance

- `sumArray(50)`: 182 ns (9.4× faster than manual loop with `add`)
- `mulAdd`: 25.8 ns (1.54× faster than `mul` + `add`)
- `addMul`: 26.9 ns (1.65× faster than `add` + `mul`)
- `add` vs break_infinity.js: 1.3× faster
- `add` vs decimal.js: 4.5× faster
- `mul` vs decimal.js: 13× faster
