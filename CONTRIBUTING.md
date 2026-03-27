# Contributing

## Code

- TypeScript strict mode is on — no `any`, no unsafe casts.
- All public API surface must have a JSDoc comment (see [Documentation style](#documentation-style) below).
- Run `npm test` and `npm run typecheck` before pushing. Both must pass clean.
- Hot-path code goes in `src/core/` and `src/utility/ArbitraryNumberArithmetic.ts`. Profile with `npm run bench` before and after.

## Tests

Test files live in `tests/`. Match existing file structure: `core/`, `utility/`, `plugin/`.

Every new public method needs at least:
- A happy-path test
- An edge-case test (zero, negative, boundary exponent)
- A test for each documented `@throws`

---

## Documentation style

This project follows a **code-first** documentation style. Readers should be able to understand an API from its `@example` block alone — the prose description supplements, it does not replace the example.

### Summary line

One sentence, starting with a verb. Describe what the method **does**, not what it **is**.

```ts
// ✓
/** Returns `this + other`. */
public add(other: ArbitraryNumber): ArbitraryNumber

// ✗  (describes the type, not the behaviour)
/** The addition method. */
public add(other: ArbitraryNumber): ArbitraryNumber
```

### `@example`

Every non-trivial public method has an `@example`. Show real input and real output in a comment on the same line with `//`:

```ts
/**
 * Returns √this.
 *
 * @example
 * new ArbitraryNumber(4, 0).sqrt()   // ArbitraryNumber { coefficient: 2, exponent: 0 }
 * an(1, 4).sqrt().toString()         // "1.00e+2"
 */
```

Use `// "..."` for string output and `// number` for numeric output. Do **not** write `// returns "..."` or `// => "..."`.

### `@throws`

Document every `throw` with the exact error message string:

```ts
/**
 * @throws `"Division by zero"` when `other` is zero.
 */
public div(other: ArbitraryNumber): ArbitraryNumber
```

### `@param`

Omit `@param` for parameters whose name and type make the contract obvious (`other: ArbitraryNumber` on `add`, for example). Include it when:

- The valid range is restricted (`t` must be `∈ [0, 1]` for `lerp`)
- The parameter has a default that changes behaviour
- The name alone is ambiguous

```ts
// ✓ — non-obvious constraint
/** @param t - Interpolation factor, `0` returns `a`, `1` returns `b`. */

// ✗ — obvious from name + type
/** @param other - The other ArbitraryNumber. */
```

### `@returns`

Omit when the return value is obvious from the method name and type. Include when:

- The return is a plain primitive (`number`, `boolean`, `-1 | 0 | 1`)
- There is a non-obvious special case (e.g. `toNumber()` returns `Infinity` for out-of-range values)

### `@deprecated`

Always include the migration path:

```ts
/** @deprecated Use {@link ArbitraryNumberHelpers} instead. */
export { ArbitraryNumberUtility } from "./ArbitraryNumberUtility";
```

### `@internal`

Mark implementation helpers that are not part of the public API:

```ts
/** @internal Fast-path factory for already-normalised values. */
private static createNormalized(...)
```

### `@remarks`

Use sparingly for implementation notes that users of the API do not need to know but maintainers do:

```ts
/**
 * @remarks
 * Uses `Object.create` to bypass the constructor (zero normalisation cost).
 * Only valid when |coefficient| is already in [1, 10).
 */
```

### Class-level JSDoc

Describe **what the class represents** (not what it extends or implements), include one short `@example` showing the most common construction pattern, and list notable constraints as bullet points or a short sentence:

```ts
/**
 * An immutable number with effectively unlimited range, stored as `coefficient × 10^exponent`.
 *
 * The coefficient is always in `[1, 10)` (or `0`).
 *
 * @example
 * const a = new ArbitraryNumber(1.5, 3);  // 1,500
 * a.add(new ArbitraryNumber(2.5, 3)).toString(); // "4.00e+3"
 */
```

### Deprecation notice in README

When a public export is deprecated, update the README API table to strike through the old name and add a migration note:

```md
| ~~`ArbitraryNumberUtility`~~ | Renamed → `ArbitraryNumberHelpers` |
```

---

## README style

- Sections are ordered: **install → quick start → concepts → full API → examples**.
- Each API section starts with a one-line description, then a code block showing output as inline comments.
- No performance tables in the README — those belong in `benchmarks/`.
- Examples must be runnable without modification (import from `"arbitrary-numbers"`, no missing variables).
- Show output using `// "..."` for strings, `// number` for numbers, `// true` / `// false` for booleans — on the same line as the expression.

```ts
an(1.5, 3).toString(unitNotation)   // "1.50 K"
an(1.5, 3).greaterThan(an(1, 3))    // true
an(1.5, 3).log10()                  // 3.176
```
