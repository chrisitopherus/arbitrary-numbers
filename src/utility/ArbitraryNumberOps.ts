import { ArbitraryNumber } from "../core/ArbitraryNumber";
import type { ArbitraryNumberish, Nullable } from "../types/utility";

/**
 * Convenience helpers for mixed `number | ArbitraryNumber` inputs.
 *
 * Each method accepts either type and coerces plain `number` values via
 * {@link ArbitraryNumber.from} before delegating to the corresponding instance method.
 *
 * Prefer `ArbitraryNumber` instance methods directly on hot paths - this class is
 * intended for system boundaries (event handlers, serialisation, UI callbacks) where
 * the input type is unknown.
 *
 * @example
 * import { ArbitraryNumberOps as ops } from "arbitrary-numbers";
 * ops.add(1500, 2500)              // ArbitraryNumber (4000)
 * ops.mul(an(2, 0), 5)            // ArbitraryNumber (10)
 * ops.from(1_500_000)             // ArbitraryNumber { coefficient: 1.5, exponent: 6 }
 */
export class ArbitraryNumberOps {
    /**
     * Converts `value` to an `ArbitraryNumber`, returning it unchanged if it already is one.
     *
     * @param value - A plain `number` or an existing `ArbitraryNumber`.
     * @returns The corresponding `ArbitraryNumber`.
     * @throws `ArbitraryNumberInputError` when `value` is `NaN`, `Infinity`, or `-Infinity`.
     */
    public static from(value: ArbitraryNumberish): ArbitraryNumber {
        return value instanceof ArbitraryNumber ? value : ArbitraryNumber.from(value);
    }

    /**
     * Converts `value` to an `ArbitraryNumber`, returning `null` for non-finite inputs
     * instead of throwing.
     *
     * Use this at system boundaries (form inputs, external APIs) where you want to handle
     * bad input gracefully rather than catching an exception.
     *
     * @param value - A plain `number` or an existing `ArbitraryNumber`.
     * @returns The `ArbitraryNumber`, or `null` if the input is `NaN`, `Infinity`, or `-Infinity`.
     *
     * @example
     * ops.tryFrom(1500)      // ArbitraryNumber { coefficient: 1.5, exponent: 3 }
     * ops.tryFrom(Infinity)  // null
     * ops.tryFrom(NaN)       // null
     */
    public static tryFrom(value: ArbitraryNumberish): Nullable<ArbitraryNumber> {
        if (value instanceof ArbitraryNumber) return value;
        if (!isFinite(value)) return null;

        return ArbitraryNumber.from(value);
    }

    /**
     * Returns `left + right`, coercing both operands as needed.
     *
     * @param left - The augend.
     * @param right - The addend.
     * @example
     * ops.add(1500, 2500) // ArbitraryNumber (4000)
     */
    public static add(left: ArbitraryNumberish, right: ArbitraryNumberish): ArbitraryNumber {
        return ArbitraryNumberOps.from(left).add(ArbitraryNumberOps.from(right));
    }

    /**
     * Returns `left - right`, coercing both operands as needed.
     *
     * @param left - The minuend.
     * @param right - The subtrahend.
     * @example
     * ops.sub(5000, 1500) // ArbitraryNumber (3500)
     */
    public static sub(left: ArbitraryNumberish, right: ArbitraryNumberish): ArbitraryNumber {
        return ArbitraryNumberOps.from(left).sub(ArbitraryNumberOps.from(right));
    }

    /**
     * Returns `left * right`, coercing both operands as needed.
     *
     * @param left - The multiplicand.
     * @param right - The multiplier.
     * @example
     * ops.mul(an(1, 3), 5) // ArbitraryNumber (5000)
     */
    public static mul(left: ArbitraryNumberish, right: ArbitraryNumberish): ArbitraryNumber {
        return ArbitraryNumberOps.from(left).mul(ArbitraryNumberOps.from(right));
    }

    /**
     * Returns `left / right`, coercing both operands as needed.
     *
     * @param left - The dividend.
     * @param right - The divisor.
     * @throws `"Division by zero"` when `right` is zero.
     * @example
     * ops.div(an(1, 6), 1000) // ArbitraryNumber (1000)
     */
    public static div(left: ArbitraryNumberish, right: ArbitraryNumberish): ArbitraryNumber {
        return ArbitraryNumberOps.from(left).div(ArbitraryNumberOps.from(right));
    }

    /**
     * Compares `left` to `right`.
     *
     * @param left - The left operand.
     * @param right - The right operand.
     * @returns `1` if `left > right`, `-1` if `left < right`, `0` if equal.
     * @example
     * ops.compare(5000, 1500) // 1
     */
    public static compare(left: ArbitraryNumberish, right: ArbitraryNumberish): number {
        return ArbitraryNumberOps.from(left).compareTo(ArbitraryNumberOps.from(right));
    }

    /**
     * Clamps `value` to the inclusive range `[min, max]`, coercing all inputs as needed.
     *
     * @param value - The value to clamp.
     * @param min - The lower bound (inclusive).
     * @param max - The upper bound (inclusive).
     * @example
     * ops.clamp(500, 1000, 2000) // ArbitraryNumber (1000)  - below min, returns min
     */
    public static clamp(value: ArbitraryNumberish, min: ArbitraryNumberish, max: ArbitraryNumberish): ArbitraryNumber {
        return ArbitraryNumber.clamp(
            ArbitraryNumberOps.from(value),
            ArbitraryNumberOps.from(min),
            ArbitraryNumberOps.from(max),
        );
    }
}
