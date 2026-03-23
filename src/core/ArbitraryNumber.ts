import { scientificNotation } from "../plugin/ScientificNotation";
import { NormalizedNumber } from "../types/core";
import { NotationPlugin } from "../types/plugin";
import { ArbitraryNumberArithmetic } from "../utility/ArbitraryNumberArithmetic";

/**
 * An immutable number with effectively unlimited range, stored as `coefficient × 10^exponent`
 * in normalised scientific notation.
 *
 * The coefficient is always in `[1, 10)` (or `0`). Addition short-circuits when the exponent
 * difference between operands exceeds {@link PrecisionCutoff} — the smaller value is below
 * the precision floor of the larger and is silently discarded.
 *
 * @example
 * const a = new ArbitraryNumber(1.5, 3);  // 1,500
 * const b = new ArbitraryNumber(2.5, 3);  // 2,500
 * a.add(b).toString(); // "4.00e+3"
 * a.mul(b).toString(); // "3.75e+6"
 */
export class ArbitraryNumber implements NormalizedNumber {
    /** The significand, always in `[1, 10)` or `0`. */
    public readonly coefficient: number;
    /** The power of 10 by which the coefficient is scaled. */
    public readonly exponent: number;

    /**
     * Maximum number of significant digits retained during addition.
     *
     * When the exponent difference between two operands exceeds this value,
     * the smaller operand is silently discarded.
     */
    public static readonly PrecisionCutoff = 15;

    /** The additive identity: `0`. */
    public static readonly Zero = new ArbitraryNumber(0, 0);
    /** The multiplicative identity: `1`. */
    public static readonly One = new ArbitraryNumber(1, 0);
    /** `10`. */
    public static readonly Ten = new ArbitraryNumber(1, 1);

    /**
     * Creates an `ArbitraryNumber` from a plain JavaScript `number`.
     *
     * Prefer this over `new ArbitraryNumber(value, 0)` when working with
     * ordinary numeric literals — it reads clearly at the call site and
     * validates the input.
     *
     * @example
     * ArbitraryNumber.from(1500);   // { coefficient: 1.5, exponent: 3 }
     * ArbitraryNumber.from(0.005);  // { coefficient: 5,   exponent: -3 }
     * ArbitraryNumber.from(0);      // ArbitraryNumber.Zero
     *
     * @param value - Any finite number.
     * @throws `"ArbitraryNumber.from: value must be finite"` for `NaN`, `Infinity`, or `-Infinity`.
     */
    public static from(value: number): ArbitraryNumber {
        if (!isFinite(value)) {
            throw new Error("ArbitraryNumber.from: value must be finite");
        }
        
        return new ArbitraryNumber(value, 0);
    }

    /**
     * Constructs a new `ArbitraryNumber` and immediately normalises it so that
     * `1 ≤ |coefficient| < 10` (or `coefficient === 0`).
     *
     * @example
     * new ArbitraryNumber(15, 3); // stored as { coefficient: 1.5, exponent: 4 }
     *
     * @param coefficient - The significand. Any finite number is accepted; it will be normalised.
     * @param exponent - The power of 10.
     */
    public constructor(coefficient: number, exponent: number) {
        const normalized = ArbitraryNumberArithmetic.normalize({ coefficient, exponent });
        this.coefficient = normalized.coefficient;
        this.exponent = normalized.exponent;
    }

    /**
     * Returns `this + other`.
     *
     * When the exponent difference exceeds {@link PrecisionCutoff}, the smaller
     * operand has no effect and the larger is returned as-is.
     *
     * @example
     * an(1.5, 3).add(an(2.5, 3)); // 4×10³
     */
    public add(other: ArbitraryNumber): ArbitraryNumber {
        if (this.coefficient === 0) {
            return other;
        }

        if (other.coefficient === 0) {
            return this;
        }

        const exponentDiff = this.exponent - other.exponent;

        if (exponentDiff > ArbitraryNumber.PrecisionCutoff) {
            return this;
        }

        if (exponentDiff < -ArbitraryNumber.PrecisionCutoff) {
            return other;
        }

        const summed = ArbitraryNumberArithmetic.alignedSum(this, other, exponentDiff);
        return new ArbitraryNumber(summed.coefficient, summed.exponent);
    }

    /**
     * Returns `this - other`.
     *
     * @example
     * an(3.5, 3).sub(an(1.5, 3)); // 2×10³
     */
    public sub(other: ArbitraryNumber): ArbitraryNumber {
        return this.add(new ArbitraryNumber(-other.coefficient, other.exponent));
    }

    /**
     * Returns `this × other`.
     *
     * @example
     * an(2, 3).mul(an(3, 4)); // 6×10⁷
     */
    public mul(other: ArbitraryNumber): ArbitraryNumber {
        if (this.coefficient === 0 || other.coefficient === 0) {
            return ArbitraryNumber.Zero;
        }

        return new ArbitraryNumber(
            this.coefficient * other.coefficient,
            this.exponent + other.exponent,
        );
    }

    /**
     * Returns `this ÷ other`.
     *
     * @example
     * an(6, 7).div(an(3, 4)); // 2×10³
     *
     * @throws `"Division by zero"` when `other` is zero.
     */
    public div(other: ArbitraryNumber): ArbitraryNumber {
        if (other.coefficient === 0) {
            throw new Error("Division by zero");
        }

        return new ArbitraryNumber(
            this.coefficient / other.coefficient,
            this.exponent - other.exponent,
        );
    }

    /**
     * Returns the arithmetic negation of this number (`-this`).
     *
     * @example
     * an(1.5, 3).negate(); // −1.5×10³
     */
    public negate(): ArbitraryNumber {
        if (this.coefficient === 0) {
            return ArbitraryNumber.Zero;
        }
        return new ArbitraryNumber(-this.coefficient, this.exponent);
    }

    /**
     * Returns the absolute value of this number (`|this|`).
     *
     * Returns `this` unchanged when the number is already non-negative.
     *
     * @example
     * an(-1.5, 3).abs(); // 1.5×10³
     */
    public abs(): ArbitraryNumber {
        if (this.coefficient >= 0) {
            return this;
        }
        return new ArbitraryNumber(-this.coefficient, this.exponent);
    }

    /**
     * Returns `this^n`.
     *
     * Supports integer, fractional, and negative exponents.
     * `x^0` always returns {@link One}, including `0^0` (by convention).
     *
     * @example
     * an(2, 3).pow(2);  // 4×10⁶
     * an(2, 0).pow(-1); // 5×10⁻¹  (= 0.5)
     *
     * @param n - The exponent to raise this number to.
     * @throws `"Zero cannot be raised to a negative power"` when this is zero and `n < 0`.
     */
    public pow(n: number): ArbitraryNumber {
        if (n === 0) {
            return ArbitraryNumber.One;
        }

        if (this.coefficient === 0) {
            if (n < 0) {
                throw new Error("Zero cannot be raised to a negative power");
            }
            return ArbitraryNumber.Zero;
        }

        return new ArbitraryNumber(
            Math.pow(this.coefficient, n),
            this.exponent * n,
        );
    }

    /**
     * Compares this number to `other`.
     *
     * @returns `1` if `this > other`, `-1` if `this < other`, `0` if equal.
     *
     * @example
     * an(1, 4).compareTo(an(9, 3)); // 1  (10000 > 9000)
     * an(-1, 4).compareTo(an(1, 3)); // -1 (−10000 < 1000)
     */
    public compareTo(other: ArbitraryNumber): number {
        const thisNegative = this.coefficient < 0;
        const otherNegative = other.coefficient < 0;

        // one is negative and the other is not
        if (thisNegative !== otherNegative) {
            return thisNegative ? -1 : 1;
        }

        if (this.exponent !== other.exponent) {
            const thisExponentIsHigher = this.exponent > other.exponent;
            // For negatives, a larger exponent means a more negative (smaller) value
            return thisNegative
                ? (thisExponentIsHigher ? -1 : 1)
                : (thisExponentIsHigher ? 1 : -1);
        }

        // exponents are equal, compare coefficients
        if (this.coefficient !== other.coefficient) {
            return this.coefficient > other.coefficient ? 1 : -1;
        }

        // they are equal
        return 0;
    }

    /** Returns `true` if `this > other`. */
    public greaterThan(other: ArbitraryNumber): boolean {
        return this.compareTo(other) > 0;
    }

    /** Returns `true` if `this < other`. */
    public lessThan(other: ArbitraryNumber): boolean {
        return this.compareTo(other) < 0;
    }

    /** Returns `true` if `this >= other`. */
    public greaterThanOrEqual(other: ArbitraryNumber): boolean {
        return this.compareTo(other) >= 0;
    }

    /** Returns `true` if `this <= other`. */
    public lessThanOrEqual(other: ArbitraryNumber): boolean {
        return this.compareTo(other) <= 0;
    }

    /** Returns `true` if `this === other` in value. */
    public equals(other: ArbitraryNumber): boolean {
        return this.compareTo(other) === 0;
    }

    /**
     * Returns the largest integer less than or equal to this number (floor toward −∞).
     *
     * Numbers with `exponent ≥ PrecisionCutoff` are already integers at that scale
     * and are returned unchanged.
     *
     * @example
     * an(1.7, 0).floor();  // 1
     * an(-1.7, 0).floor(); // −2
     */
    public floor(): ArbitraryNumber {
        if (this.coefficient === 0) {
            return ArbitraryNumber.Zero;
        }

        if (this.exponent >= ArbitraryNumber.PrecisionCutoff) {
            return this;
        }

        if (this.exponent < 0) {
            return this.coefficient >= 0 ? ArbitraryNumber.Zero : new ArbitraryNumber(-1, 0);
        }

        return new ArbitraryNumber(Math.floor(this.coefficient * (10 ** this.exponent)), 0);
    }

    /**
     * Returns the smallest integer greater than or equal to this number (ceil toward +∞).
     *
     * Numbers with `exponent ≥ PrecisionCutoff` are already integers at that scale
     * and are returned unchanged.
     *
     * @example
     * an(1.2, 0).ceil();  // 2
     * an(-1.7, 0).ceil(); // −1
     */
    public ceil(): ArbitraryNumber {
        if (this.coefficient === 0) {
            return ArbitraryNumber.Zero;
        }

        if (this.exponent >= ArbitraryNumber.PrecisionCutoff) {
            return this;
        }

        if (this.exponent < 0) {
            return this.coefficient > 0 ? ArbitraryNumber.One : ArbitraryNumber.Zero;
        }

        return new ArbitraryNumber(Math.ceil(this.coefficient * (10 ** this.exponent)), 0);
    }

    /**
     * Clamps `value` to the inclusive range `[min, max]`.
     *
     * @example
     * ArbitraryNumber.clamp(an(5, 2), an(1, 3), an(2, 3)); // 1×10³  (500 clamped to [1000, 2000])
     *
     * @param value - The value to clamp.
     * @param min - Lower bound (inclusive).
     * @param max - Upper bound (inclusive).
     */
    public static clamp(value: ArbitraryNumber, min: ArbitraryNumber, max: ArbitraryNumber): ArbitraryNumber {
        if (value.lessThan(min)) return min;
        if (value.greaterThan(max)) return max;

        return value;
    }

    /**
     * Returns `log₁₀(this)` as a plain JavaScript `number`.
     *
     * Because the number is stored as `c × 10^e`, this is computed exactly as
     * `log10(c) + e` — no precision loss from the exponent.
     *
     * @example
     * an(1, 6).log10();    // 6
     * an(1.5, 3).log10();  // log10(1.5) + 3  ≈ 3.176
     *
     * @throws `"Logarithm of zero is undefined"` when this is zero.
     * @throws `"Logarithm of a negative number is undefined"` when this is negative.
     */
    public log10(): number {
        if (this.coefficient === 0) {
            throw new Error("Logarithm of zero is undefined");
        }

        if (this.coefficient < 0) {
            throw new Error("Logarithm of a negative number is undefined");
        }

        return Math.log10(this.coefficient) + this.exponent;
    }

    /**
     * Formats this number as a string using the given notation plugin.
     *
     * Defaults to {@link scientificNotation} when no plugin is provided.
     * `decimals` controls the number of decimal places passed to the plugin and defaults to `2`.
     *
     * @example
     * an(1.5, 3).toString();                  // "1.50e+3"
     * an(1.5, 3).toString(unitNotation);       // "1.50 K"
     * an(1.5, 3).toString(unitNotation, 4);    // "1.5000 K"
     *
     * @param notation - The formatting plugin to use.
     * @param decimals - Number of decimal places to render. Defaults to `2`.
     */
    public toString(notation: NotationPlugin = scientificNotation, decimals = 2): string {
        return notation.format(this.coefficient, this.exponent, decimals);
    }
}
