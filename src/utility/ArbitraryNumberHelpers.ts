import { ArbitraryNumber } from "../core/ArbitraryNumber";
import { ArbitraryNumberOps, type ArbitraryNumberish } from "./ArbitraryNumberOps";

/**
 * Domain-level helpers for common game and simulation patterns.
 *
 * These sit above the core arithmetic layer — each method accepts
 * mixed input (`number | ArbitraryNumber`) via
 * {@link ArbitraryNumberOps.from} so they work at system boundaries
 * where you may receive raw numbers.
 *
 * For hot-path code, use `ArbitraryNumber` methods directly.
 */
export class ArbitraryNumberHelpers {
    private static coerce(value: ArbitraryNumberish): ArbitraryNumber {
        return ArbitraryNumberOps.from(value);
    }

    /**
     * Returns `true` when `value >= threshold`.
     *
     * @param value - The value to test.
     * @param threshold - The minimum required value.
     * @returns `true` when `value >= threshold`.
     * @example
     * ArbitraryNumberHelpers.meetsOrExceeds(gold, upgradeCost)
     */
    public static meetsOrExceeds(value: ArbitraryNumberish, threshold: ArbitraryNumberish): boolean {
        return ArbitraryNumberHelpers.coerce(value)
            .greaterThanOrEqual(ArbitraryNumberHelpers.coerce(threshold));
    }

    /**
     * Returns the largest whole multiple count of `step` that fits into `total`.
     *
     * Equivalent to `floor(total / step)`.
     *
     * @param total - The total available amount.
     * @param step - The cost or size of one unit. Must be greater than zero.
     * @returns The number of whole units that fit, as an `ArbitraryNumber`.
     * @throws `"step must be greater than zero"` when `step <= 0`.
     * @example
     * const canBuy = ArbitraryNumberHelpers.wholeMultipleCount(gold, upgradeCost);
     */
    public static wholeMultipleCount(total: ArbitraryNumberish, step: ArbitraryNumberish): ArbitraryNumber {
        const numTotal = ArbitraryNumberHelpers.coerce(total);
        const numStep  = ArbitraryNumberHelpers.coerce(step);

        if (numStep.lessThanOrEqual(ArbitraryNumber.Zero)) {
            throw new Error("step must be greater than zero");
        }

        if (numTotal.lessThanOrEqual(ArbitraryNumber.Zero)) {
            return ArbitraryNumber.Zero;
        }

        return numTotal.div(numStep).floor();
    }

    /**
     * Returns `value - delta`, clamped to a minimum of `floor` (default `0`).
     *
     * @param value - The starting value.
     * @param delta - The amount to subtract.
     * @param floor - The minimum result. Defaults to `ArbitraryNumber.Zero`.
     * @returns `max(value - delta, floor)`.
     * @example
     * health = ArbitraryNumberHelpers.subtractWithFloor(health, damage);
     */
    public static subtractWithFloor(
        value: ArbitraryNumberish,
        delta: ArbitraryNumberish,
        floor: ArbitraryNumberish = ArbitraryNumber.Zero,
    ): ArbitraryNumber {
        const numValue = ArbitraryNumberHelpers.coerce(value);
        const numDelta = ArbitraryNumberHelpers.coerce(delta);
        const numFloor = ArbitraryNumberHelpers.coerce(floor);

        return ArbitraryNumber.clamp(numValue.sub(numDelta), numFloor, numValue);
    }
}
