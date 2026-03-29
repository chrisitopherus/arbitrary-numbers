# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
