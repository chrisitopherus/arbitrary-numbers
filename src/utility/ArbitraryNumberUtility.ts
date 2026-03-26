import { ArbitraryNumber } from "../core/ArbitraryNumber";
import { ArbitraryNumberOps, ArbitraryNumberish } from "./ArbitraryNumberOps";

/**
 * High-level helpers built on top of core `ArbitraryNumber` operations.
 *
 * @deprecated These methods will move to `ArbitraryNumber` as static methods in a future version.
 * Use `ArbitraryNumber.meetsOrExceeds`, `ArbitraryNumber.wholeMultipleCount`, and
 * `ArbitraryNumber.subtractWithFloor` instead (when available). This class remains functional
 * for backwards compatibility.
 */
export class ArbitraryNumberUtility {
    /** Converts mixed numeric input into an `ArbitraryNumber`. */
    public static toNumber(value: ArbitraryNumberish): ArbitraryNumber {
        return ArbitraryNumberOps.from(value);
    }

    /**
     * Returns `true` when `value >= threshold`.
     */
    public static meetsOrExceeds(value: ArbitraryNumberish, threshold: ArbitraryNumberish): boolean {
        const numberValue = ArbitraryNumberUtility.toNumber(value);
        const numberThreshold = ArbitraryNumberUtility.toNumber(threshold);
        return numberValue.greaterThanOrEqual(numberThreshold);
    }

    /**
     * Returns the largest whole multiple count of `step` that fits into `total`.
     */
    public static wholeMultipleCount(total: ArbitraryNumberish, step: ArbitraryNumberish): ArbitraryNumber {
        const numberTotal = ArbitraryNumberUtility.toNumber(total);
        const numberStep = ArbitraryNumberUtility.toNumber(step);

        if (numberStep.lessThanOrEqual(ArbitraryNumber.Zero)) {
            throw new Error("step must be greater than zero");
        }

        if (numberTotal.lessThanOrEqual(ArbitraryNumber.Zero)) {
            return ArbitraryNumber.Zero;
        }

        return numberTotal.div(numberStep).floor();
    }

    /**
     * Returns `value - delta` but never lower than `floor`.
     */
    public static subtractWithFloor(
        value: ArbitraryNumberish,
        delta: ArbitraryNumberish,
        floor: ArbitraryNumberish = ArbitraryNumber.Zero,
    ): ArbitraryNumber {
        const numberValue = ArbitraryNumberUtility.toNumber(value);
        const numberDelta = ArbitraryNumberUtility.toNumber(delta);
        const numberFloor = ArbitraryNumberUtility.toNumber(floor);

        return ArbitraryNumber.clamp(numberValue.sub(numberDelta), numberFloor, numberValue);
    }
}
