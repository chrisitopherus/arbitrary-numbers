import type { ArbitraryNumber } from "../core/ArbitraryNumber";

/**
 * A value that can be either a plain `number` or an `ArbitraryNumber`.
 */
export type ArbitraryNumberish = ArbitraryNumber | number;
