import { ArbitraryNumber } from "../core/ArbitraryNumber";

export type ArbitraryNumberish = ArbitraryNumber | number;

/**
 * Convenience helpers for mixed `number | ArbitraryNumber` inputs.
 *
 * Each method accepts either type and coerces plain `number` values via
 * {@link ArbitraryNumber.from} before delegating to the corresponding instance method.
 *
 * Prefer `ArbitraryNumber` instance methods directly on hot paths — this class is
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
     */
    public static from(value: ArbitraryNumberish): ArbitraryNumber {
        return value instanceof ArbitraryNumber ? value : ArbitraryNumber.from(value);
    }

    /**
     * Returns `left + right`, coercing both operands as needed.
     *
     * @example
     * ops.add(1500, 2500) // ArbitraryNumber (4000)
     */
    public static add(left: ArbitraryNumberish, right: ArbitraryNumberish): ArbitraryNumber {
        return ArbitraryNumberOps.from(left).add(ArbitraryNumberOps.from(right));
    }

    /**
     * Returns `left - right`, coercing both operands as needed.
     *
     * @example
     * ops.sub(5000, 1500) // ArbitraryNumber (3500)
     */
    public static sub(left: ArbitraryNumberish, right: ArbitraryNumberish): ArbitraryNumber {
        return ArbitraryNumberOps.from(left).sub(ArbitraryNumberOps.from(right));
    }

    /**
     * Returns `left × right`, coercing both operands as needed.
     *
     * @example
     * ops.mul(an(1, 3), 5) // ArbitraryNumber (5000)
     */
    public static mul(left: ArbitraryNumberish, right: ArbitraryNumberish): ArbitraryNumber {
        return ArbitraryNumberOps.from(left).mul(ArbitraryNumberOps.from(right));
    }

    /**
     * Returns `left ÷ right`, coercing both operands as needed.
     *
     * @throws `"Division by zero"` when `right` is zero.
     *
     * @example
     * ops.div(an(1, 6), 1000) // ArbitraryNumber (1000)
     */
    public static div(left: ArbitraryNumberish, right: ArbitraryNumberish): ArbitraryNumber {
        return ArbitraryNumberOps.from(left).div(ArbitraryNumberOps.from(right));
    }

    /**
     * Compares `left` to `right`.
     *
     * @returns `1` if `left > right`, `-1` if `left < right`, `0` if equal.
     *
     * @example
     * ops.compare(5000, 1500) // 1
     */
    public static compare(left: ArbitraryNumberish, right: ArbitraryNumberish): number {
        return ArbitraryNumberOps.from(left).compareTo(ArbitraryNumberOps.from(right));
    }

    /**
     * Clamps `value` to the inclusive range `[min, max]`, coercing all inputs as needed.
     *
     * @example
     * ops.clamp(500, 1000, 2000) // ArbitraryNumber (1000)  — below min, returns min
     */
    public static clamp(value: ArbitraryNumberish, min: ArbitraryNumberish, max: ArbitraryNumberish): ArbitraryNumber {
        return ArbitraryNumber.clamp(
            ArbitraryNumberOps.from(value),
            ArbitraryNumberOps.from(min),
            ArbitraryNumberOps.from(max),
        );
    }
}
