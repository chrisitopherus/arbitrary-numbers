import { ArbitraryNumber } from "../core/ArbitraryNumber";
import type { ArbitraryNumberish } from "../types/utility";
import { ArbitraryNumberInputError } from "../errors";

/**
 * Domain-level helpers for common game and simulation patterns.
 *
 * Accepts mixed input (`number | ArbitraryNumber`) via `ArbitraryNumber.from`.
 * For hot-path code, use `ArbitraryNumber` methods directly.
 */
export class ArbitraryNumberHelpers {
    private static coerce(value: ArbitraryNumberish): ArbitraryNumber {
        return value instanceof ArbitraryNumber ? value : ArbitraryNumber.from(value);
    }

    /**
     * Returns `true` when `value >= threshold`.
     *
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
     * @throws `"step must be greater than zero"` when `step <= 0`.
     * @example
     * const canBuy = ArbitraryNumberHelpers.wholeMultipleCount(gold, upgradeCost);
     */
    public static wholeMultipleCount(total: ArbitraryNumberish, step: ArbitraryNumberish): ArbitraryNumber {
        const numTotal = ArbitraryNumberHelpers.coerce(total);
        const numStep  = ArbitraryNumberHelpers.coerce(step);

        if (numStep.lessThanOrEqual(ArbitraryNumber.Zero)) {
            throw new ArbitraryNumberInputError("step must be greater than zero", numStep.toNumber());
        }

        if (numTotal.lessThanOrEqual(ArbitraryNumber.Zero)) {
            return ArbitraryNumber.Zero;
        }

        return numTotal.clone().div(numStep).floor();
    }

    /**
     * Returns `value - delta`, clamped to a minimum of `floor` (default `0`).
     *
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

        const result = numValue.clone().sub(numDelta);
        return result.lessThan(numFloor) ? numFloor : result;
    }
}
