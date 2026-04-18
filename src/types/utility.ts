import type { ArbitraryNumber } from "../core/ArbitraryNumber";

/**
 * A value that can be either a plain `number` or an `ArbitraryNumber`.
 */
export type ArbitraryNumberish = ArbitraryNumber | number;

/**
 * A value that is either `T` or `undefined`.
 *
 * Use for genuinely optional values where the absence is meaningful
 * (e.g. optional names, optional fallback plugins).
 *
 * @example
 * let label: Maybe<string>;   // string | undefined
 */
export type Maybe<T> = T | undefined;

/**
 * A value that is either `T` or `null`.
 *
 * Use for explicit "no result" returns from functions that would otherwise throw
 * (e.g. `tryFrom` at system boundaries where bad input should be handled gracefully).
 *
 * @example
 * function parse(s: string): Nullable<ArbitraryNumber> { ... }
 */
export type Nullable<T> = T | null;

/**
 * A stable, compact JSON representation of an {@link ArbitraryNumber}.
 *
 * Keys are intentionally short (`c`/`e`) to keep save-game blobs small.
 * Produced by {@link ArbitraryNumber.toJSON} and consumed by {@link ArbitraryNumber.fromJSON}.
 *
 * @example
 * const saved: ArbitraryNumberJson = an(1500).toJSON(); // { c: 1.5, e: 3 }
 */
export type ArbitraryNumberJson = { c: number; e: number };
