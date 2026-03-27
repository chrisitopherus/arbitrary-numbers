# arbitrary-numbers: Next Iteration

**Status:** Complete
**Priority:** —

---

## Completed

- [x] Tier 1 fused ops: `mulAdd`, `addMul`, `sumArray`, `PrecisionCutoff`
- [x] Tier 2 fused ops: `mulSub`, `subMul`, `divAdd`
- [x] Core methods: `sqrt`, `round`, `sign`, `toNumber`, `isZero`, `isPositive`, `isNegative`, `isInteger`
- [x] Static helpers: `min`, `max`, `lerp`, `withPrecision`
- [x] Short aliases: `ops`, `guard` in `src/index.ts`
- [x] Tests: `ArbitraryNumberMethods.test.ts`, `ArbitraryNumberFusions.test.ts` (mulSub/subMul/divAdd)
- [x] `OPERATION_CHAINING_DESIGN.md` compressed to decision record
- [x] `AnChain` builder — `src/core/AnChain.ts`, exported as `chain` and `AnChain`
- [x] `AnChain` tests — `src/tests/core/AnChain.test.ts` (26 tests)
- [x] `ArbitraryNumberHelpers` — renamed from `ArbitraryNumberUtility`, old name kept as deprecated re-export
- [x] Benchmarks: `sqrt` vs `pow(0.5)`, Tier 2 fused vs chained, `chain()` vs direct
- [x] `BENCHMARKS.md` updated with v4 numbers
- [x] README rewritten (fused ops, builder, competitor comparison, full API reference)
- [x] All 388 tests passing, typecheck clean
- [x] Fix `compareTo` zero-vs-fraction correctness bug (zero guard inside exponent-differs branch — zero overhead on same-exponent hot path; different-exponent improved 2.19 ns → 1.10 ns)
- [x] Replace `Math.pow`/`**` with `pow10` table in `floor`, `ceil`, `round`, `isInteger`
- [x] Simplify `isInteger` negative-exponent guard: `< -15` → `< 0` (provably correct for normalised values)
- [x] Regression tests: zero-vs-fraction comparisons, `round` edge cases (`exponent=-1`, `<=-2`), `isInteger` in `(-15, 0)` range
- [x] 397 tests passing, typecheck clean, no performance regressions confirmed
