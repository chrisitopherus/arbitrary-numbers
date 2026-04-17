import { scientificNotation } from "../plugin/ScientificNotation";
import { type NormalizedNumber, type Signum } from "../types/core";
import { type NotationPlugin } from "../types/plugin";
import { pow10, pow10Int } from "../constants/pow10";
import { ArbitraryNumberInputError, ArbitraryNumberDomainError } from "../errors";

/**
 * An immutable number with effectively unlimited range, stored as `coefficient * 10^exponent`
 * in normalised scientific notation.
 *
 * The coefficient is always in `[1, 10)` (or `0`). Addition short-circuits when the exponent
 * difference between operands exceeds {@link PrecisionCutoff} - the smaller value is below
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
     * Precision cutoff: exponent-difference threshold below which the smaller operand
     * is negligible and silently skipped during addition/subtraction.
     *
     * When |exponent_diff| > PrecisionCutoff, the smaller operand contributes less than
     * 10^-PrecisionCutoff of the result - below float64 coefficient precision for the default of 15.
     *
     * Default: 15 (matches float64 coefficient precision of ~15.95 significant digits).
     * Game patterns: diffs 0-8 (exact), prestige 15-25 (loss <0.0001%), idle 20-50 (~0.1% loss).
     *
     * Override globally via assignment, or use {@link withPrecision} for a scoped block.
     */
    public static PrecisionCutoff: number = 15;

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
     * ordinary numeric literals - it reads clearly at the call site and
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
            throw new ArbitraryNumberInputError("ArbitraryNumber.from: value must be finite", value);
        }

        return new ArbitraryNumber(value, 0);
    }

    /**
     * Constructs a new `ArbitraryNumber` and immediately normalises it so that
     * `1 <= |coefficient| < 10` (or `coefficient === 0`).
     *
     * @example
     * new ArbitraryNumber(15, 3); // stored as { coefficient: 1.5, exponent: 4 }
     *
     * @param coefficient - The significand. Must be a finite number; will be normalised.
     * @param exponent - The power of 10. Must be a finite number.
     * @throws `"ArbitraryNumber: coefficient must be finite"` for `NaN`, `Infinity`, or `-Infinity`.
     * @throws `"ArbitraryNumber: exponent must be finite"` for non-finite exponents.
     */
    public constructor(coefficient: number, exponent: number) {
        if (coefficient === 0) {
            this.coefficient = 0;
            this.exponent = 0;
            return;
        }
        if (!isFinite(coefficient)) {
            throw new ArbitraryNumberInputError("ArbitraryNumber: coefficient must be finite", coefficient);
        }
        if (!isFinite(exponent)) {
            throw new ArbitraryNumberInputError("ArbitraryNumber: exponent must be finite", exponent);
        }

        const abs = Math.abs(coefficient);
        const shift = Math.floor(Math.log10(abs));
        // Table lookup for shifts 0-15; fall back to Math.pow for out-of-range.
        const scale = pow10(shift);
        if (scale === 0) {
            // Subnormal float - indistinguishable from zero at any practical precision.
            this.coefficient = 0;
            this.exponent = 0;
            return;
        }

        this.coefficient = coefficient / scale;
        this.exponent = exponent + shift;
    }

    /**
     * @internal Fast-path factory for already-normalised values.
     *
     * Uses Object.create() to bypass the constructor (zero normalisation cost).
     * Only valid when |coefficient| is already in [1, 10) and exponent is correct.
     * Do NOT use for unnormalised inputs - call new ArbitraryNumber(c, e) instead.
     */
    private static createNormalized(coefficient: number, exponent: number): ArbitraryNumber {
        // Object.create skips the constructor; coefficient/exponent are set here for the
        // first (and only) time, so readonly semantics are not violated.
        const n = Object.create(ArbitraryNumber.prototype);
        n.coefficient = coefficient;
        n.exponent = exponent;
        return n as ArbitraryNumber;
    }

    /**
     * Normalises raw (coefficient, exponent) into a new ArbitraryNumber.
     *
     * INVARIANT: all ArbitraryNumber values must have coefficient in [1, 10).
     * Algorithm: shift = floor(log10(|c|)); scale c by 10^-shift; adjust exponent.
     * Cost: one Math.log10 call (~3-4 ns). This is the fundamental cost floor - logarithm
     * is the only way to compute magnitude in JavaScript.
     */
    private static normalizeFrom(c: number, e: number): ArbitraryNumber {
        if (c === 0) return ArbitraryNumber.Zero;

        const abs = Math.abs(c);
        const shift = Math.floor(Math.log10(abs));
        const scale = pow10(shift);
        if (scale === 0) return ArbitraryNumber.Zero;

        return ArbitraryNumber.createNormalized(c / scale, e + shift);
    }

    /**
     * Returns `this + other`.
     *
     * When the exponent difference exceeds {@link PrecisionCutoff}, the smaller
     * operand has no effect and the larger is returned as-is.
     *
     * @example
     * new ArbitraryNumber(1.5, 3).add(new ArbitraryNumber(2.5, 3)); // 4*10^3
     */
    public add(other: ArbitraryNumber): ArbitraryNumber {
        if (this.coefficient === 0) return other;
        if (other.coefficient === 0) return this;

        const diff = this.exponent - other.exponent;
        // Fast-path: when |exponent diff| > PrecisionCutoff, the smaller operand contributes
        // less than 10^-PrecisionCutoff of the result - below float64 coefficient precision.
        // Game math accepts this loss; returning the larger operand directly is both correct and faster.
        if (diff > ArbitraryNumber.PrecisionCutoff) return this;
        if (diff < -ArbitraryNumber.PrecisionCutoff) return other;

        // Aligned sum - inlined to avoid intermediate NormalizedNumber object allocations.
        // diff is in (-PrecisionCutoff, PrecisionCutoff] here — use pow10Int for the table fast path.
        let c: number;
        let e: number;
        if (diff >= 0) {
            c = this.coefficient + other.coefficient / pow10Int(diff);
            e = this.exponent;
        } else {
            c = other.coefficient + this.coefficient / pow10Int(-diff);
            e = other.exponent;
        }

        return ArbitraryNumber.normalizeFrom(c, e);
    }

    /**
     * Returns `this - other`.
     *
     * @example
     * new ArbitraryNumber(3.5, 3).sub(new ArbitraryNumber(1.5, 3)); // 2*10^3
     */
    public sub(other: ArbitraryNumber): ArbitraryNumber {
        if (other.coefficient === 0) return this;

        const negC = -other.coefficient;
        if (this.coefficient === 0) return ArbitraryNumber.createNormalized(negC, other.exponent);

        const diff = this.exponent - other.exponent;
        if (diff > ArbitraryNumber.PrecisionCutoff) return this;
        if (diff < -ArbitraryNumber.PrecisionCutoff) return ArbitraryNumber.createNormalized(negC, other.exponent);

        let c: number;
        let e: number;
        if (diff >= 0) {
            c = this.coefficient + negC / pow10Int(diff);
            e = this.exponent;
        } else {
            c = negC + this.coefficient / pow10Int(-diff);
            e = other.exponent;
        }

        return ArbitraryNumber.normalizeFrom(c, e);
    }

    /**
     * Returns `this * other`.
     *
     * @example
     * new ArbitraryNumber(2, 3).mul(new ArbitraryNumber(3, 4)); // 6*10^7
     */
    public mul(other: ArbitraryNumber): ArbitraryNumber {
        if (this.coefficient === 0 || other.coefficient === 0) return ArbitraryNumber.Zero;

        const c = this.coefficient * other.coefficient;
        const e = this.exponent + other.exponent;
        // Both inputs are in [1,10) (or (-10,-1]), so |c| in [1,100) - at most one step up.
        const absC = c < 0 ? -c : c;
        if (absC >= 10) return ArbitraryNumber.createNormalized(c / 10, e + 1);

        return ArbitraryNumber.createNormalized(c, e);
    }

    /**
     * Returns `this / other`.
     *
     * @example
     * new ArbitraryNumber(6, 7).div(new ArbitraryNumber(3, 4)); // 2*10^3
     *
     * @throws `"Division by zero"` when `other` is zero.
     */
    public div(other: ArbitraryNumber): ArbitraryNumber {
        if (other.coefficient === 0) throw new ArbitraryNumberDomainError("Division by zero", { dividend: this.toNumber(), divisor: 0 });

        const c = this.coefficient / other.coefficient;
        const e = this.exponent - other.exponent;
        if (c === 0) return ArbitraryNumber.Zero;

        // Both inputs are in [1,10) (or (-10,-1]), so |c| in (0.1,10) - at most one step down.
        const absC = c < 0 ? -c : c;
        if (absC < 1) return ArbitraryNumber.createNormalized(c * 10, e - 1);

        return ArbitraryNumber.createNormalized(c, e);
    }

    /**
     * Returns the arithmetic negation of this number (`-this`).
     *
     * @example
     * new ArbitraryNumber(1.5, 3).negate(); // -1.5*10^3
     */
    public negate(): ArbitraryNumber {
        if (this.coefficient === 0) return ArbitraryNumber.Zero;

        return ArbitraryNumber.createNormalized(-this.coefficient, this.exponent);
    }

    /**
     * Returns the absolute value of this number (`|this|`).
     *
     * Returns `this` unchanged when the number is already non-negative.
     *
     * @example
     * new ArbitraryNumber(-1.5, 3).abs(); // 1.5*10^3
     */
    public abs(): ArbitraryNumber {
        if (this.coefficient >= 0) return this;

        return ArbitraryNumber.createNormalized(-this.coefficient, this.exponent);
    }

    /**
     * Returns `this^n`.
     *
     * Supports integer, fractional, and negative exponents.
     * `x^0` always returns {@link One}, including `0^0` (by convention).
     *
     * @example
     * new ArbitraryNumber(2, 3).pow(2);  // 4*10^6
     * new ArbitraryNumber(2, 0).pow(-1); // 5*10^-1  (= 0.5)
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
                throw new ArbitraryNumberDomainError("Zero cannot be raised to a negative power", { exponent: n });
            }

            return ArbitraryNumber.Zero;
        }

        if (this.coefficient < 0 && !Number.isInteger(n)) {
            throw new ArbitraryNumberDomainError("ArbitraryNumber.pow: fractional exponent of a negative base is not supported", { base: this.toNumber(), exponent: n });
        }

        // Fold any fractional part of (exponent * n) into the coefficient so the
        // stored exponent stays integral. Suffix formatters require exponent % 3 in {0,1,2}.
        const rawExp = this.exponent * n;
        const intExp = Math.floor(rawExp);
        const fracExp = rawExp - intExp;
        return new ArbitraryNumber(
            Math.pow(this.coefficient, n) * pow10(fracExp),
            intExp,
        );
    }

    /**
     * Fused multiply-add: `(this * multiplier) + addend`.
     *
     * Faster than `.mul(multiplier).add(addend)` because it avoids allocating an
     * intermediate ArbitraryNumber for the product. One normalisation pass total.
     *
     * Common pattern - prestige loop: `value = value.mulAdd(prestigeMultiplier, prestigeBoost)`
     *
     * @example
     * // Equivalent to value.mul(mult).add(boost) but ~35-50% faster
     * const prestiged = currentValue.mulAdd(multiplier, boost);
     */
    public mulAdd(multiplier: ArbitraryNumber, addend: ArbitraryNumber): ArbitraryNumber {
        // Step 1: Multiply (this * multiplier).
        // Both coefficients in [1, 10) so the product in [1, 100) - at most one normalisation step.
        if (this.coefficient === 0 || multiplier.coefficient === 0) return addend;

        let cp = this.coefficient * multiplier.coefficient;  // product coefficient
        let ep = this.exponent + multiplier.exponent;         // product exponent

        // Normalise product: one comparison instead of Math.log10 (product always in [1, 100))
        const absCp = cp < 0 ? -cp : cp;
        if (absCp >= 10) { cp /= 10; ep += 1; }

        // Step 2: Add addend to the product - single normalisation pass for the whole operation.
        if (addend.coefficient === 0) return ArbitraryNumber.createNormalized(cp, ep);

        const diff = ep - addend.exponent;
        // Fast-path: addend is negligible relative to the product
        if (diff > ArbitraryNumber.PrecisionCutoff) return ArbitraryNumber.createNormalized(cp, ep);
        if (diff < -ArbitraryNumber.PrecisionCutoff) return addend;

        let c: number, e: number;
        if (diff >= 0) {
            c = cp + addend.coefficient / pow10Int(diff);
            e = ep;
        } else {
            c = addend.coefficient + cp / pow10Int(-diff);
            e = addend.exponent;
        }

        return ArbitraryNumber.normalizeFrom(c, e);
    }

    /**
     * Fused add-multiply: `(this + addend) * multiplier`.
     *
     * Faster than `.add(addend).mul(multiplier)` because it avoids allocating an
     * intermediate ArbitraryNumber for the sum. One normalisation pass total.
     *
     * Common pattern - upgrade calculation: `newValue = baseValue.addMul(bonus, multiplier)`
     *
     * @example
     * // Equivalent to base.add(bonus).mul(multiplier) but ~20-25% faster
     * const upgraded = baseValue.addMul(bonus, multiplier);
     */
    public addMul(addend: ArbitraryNumber, multiplier: ArbitraryNumber): ArbitraryNumber {
        if (multiplier.coefficient === 0) return ArbitraryNumber.Zero;

        // Step 1: Sum (this + addend) - same logic as add() but we keep raw (c, e) to avoid allocation.
        let cs: number, es: number;  // sum coefficient and exponent

        if (this.coefficient === 0 && addend.coefficient === 0) return ArbitraryNumber.Zero;
        if (this.coefficient === 0) { cs = addend.coefficient; es = addend.exponent; }
        else if (addend.coefficient === 0) { cs = this.coefficient; es = this.exponent; }
        else {
            const diff = this.exponent - addend.exponent;
            if (diff > ArbitraryNumber.PrecisionCutoff) { cs = this.coefficient; es = this.exponent; }
            else if (diff < -ArbitraryNumber.PrecisionCutoff) { cs = addend.coefficient; es = addend.exponent; }
            else {
                if (diff >= 0) { cs = this.coefficient + addend.coefficient / pow10Int(diff); es = this.exponent; }
                else { cs = addend.coefficient + this.coefficient / pow10Int(-diff); es = addend.exponent; }

                // Normalise the sum so the subsequent multiply has a [1, 10) coefficient.
                if (cs === 0) return ArbitraryNumber.Zero;

                const abs = Math.abs(cs);
                const shift = Math.floor(Math.log10(abs));
                const scale = pow10(shift);
                if (scale === 0) return ArbitraryNumber.Zero;

                cs /= scale;
                es += shift;
            }
        }

        // Step 2: Multiply the sum by multiplier.
        // cs is now normalised in [1, 10), so product in [1, 100) - one comparison suffices.
        let cp = cs * multiplier.coefficient;
        const ep = es + multiplier.exponent;
        const absCp = cp < 0 ? -cp : cp;
        if (absCp >= 10) { cp /= 10; return ArbitraryNumber.createNormalized(cp, ep + 1); }

        return ArbitraryNumber.createNormalized(cp, ep);
    }

    /**
     * Fused multiply-subtract: `(this * multiplier) - subtrahend`.
     *
     * Avoids one intermediate allocation vs `.mul(multiplier).sub(subtrahend)`.
     *
     * Common pattern - resource drain: `income.mulSub(rate, upkeepCost)`
     */
    public mulSub(multiplier: ArbitraryNumber, subtrahend: ArbitraryNumber): ArbitraryNumber {
        if (this.coefficient === 0 || multiplier.coefficient === 0) {
            // (0 * mult) - sub = -sub
            if (subtrahend.coefficient === 0) return ArbitraryNumber.Zero;

            return ArbitraryNumber.createNormalized(-subtrahend.coefficient, subtrahend.exponent);
        }

        let cp = this.coefficient * multiplier.coefficient;
        let ep = this.exponent + multiplier.exponent;
        const absCp = cp < 0 ? -cp : cp;
        if (absCp >= 10) { cp /= 10; ep += 1; }

        if (subtrahend.coefficient === 0) return ArbitraryNumber.createNormalized(cp, ep);

        const diff = ep - subtrahend.exponent;
        if (diff > ArbitraryNumber.PrecisionCutoff) return ArbitraryNumber.createNormalized(cp, ep);
        if (diff < -ArbitraryNumber.PrecisionCutoff) {
            return ArbitraryNumber.createNormalized(-subtrahend.coefficient, subtrahend.exponent);
        }

        let c: number, e: number;
        if (diff >= 0) {
            c = cp - subtrahend.coefficient / pow10Int(diff);
            e = ep;
        } else {
            c = -subtrahend.coefficient + cp / pow10Int(-diff);
            e = subtrahend.exponent;
        }

        return ArbitraryNumber.normalizeFrom(c, e);
    }

    /**
     * Fused subtract-multiply: `(this - subtrahend) * multiplier`.
     *
     * Avoids one intermediate allocation vs `.sub(subtrahend).mul(multiplier)`.
     *
     * Common pattern - upgrade after penalty: `health.subMul(damage, multiplier)`
     */
    public subMul(subtrahend: ArbitraryNumber, multiplier: ArbitraryNumber): ArbitraryNumber {
        if (multiplier.coefficient === 0) return ArbitraryNumber.Zero;

        let cs: number, es: number;

        if (this.coefficient === 0 && subtrahend.coefficient === 0) return ArbitraryNumber.Zero;
        if (this.coefficient === 0) {
            // (0 - sub) * mult = -sub * mult
            cs = -subtrahend.coefficient; es = subtrahend.exponent;
        } else if (subtrahend.coefficient === 0) {
            cs = this.coefficient; es = this.exponent;
        } else {
            const diff = this.exponent - subtrahend.exponent;
            if (diff > ArbitraryNumber.PrecisionCutoff) { cs = this.coefficient; es = this.exponent; }
            else if (diff < -ArbitraryNumber.PrecisionCutoff) {
                cs = -subtrahend.coefficient; es = subtrahend.exponent;
            } else {
                if (diff >= 0) {
                    cs = this.coefficient - subtrahend.coefficient / pow10Int(diff); es = this.exponent;
                } else {
                    cs = -subtrahend.coefficient + this.coefficient / pow10Int(-diff); es = subtrahend.exponent;
                }
                if (cs === 0) return ArbitraryNumber.Zero;

                const abs = Math.abs(cs);
                const shift = Math.floor(Math.log10(abs));
                const scale = pow10(shift);
                if (scale === 0) return ArbitraryNumber.Zero;

                cs /= scale; es += shift;
            }
        }

        let cp = cs * multiplier.coefficient;
        const ep = es + multiplier.exponent;
        const absCp = cp < 0 ? -cp : cp;
        if (absCp >= 10) { cp /= 10; return ArbitraryNumber.createNormalized(cp, ep + 1); }

        return ArbitraryNumber.createNormalized(cp, ep);
    }

    /**
     * Fused divide-add: `(this / divisor) + addend`.
     *
     * Avoids one intermediate allocation vs `.div(divisor).add(addend)`.
     *
     * Common pattern - efficiency bonus: `damage.divAdd(armor, flat)`
     *
     * @throws `"Division by zero"` when divisor is zero.
     */
    public divAdd(divisor: ArbitraryNumber, addend: ArbitraryNumber): ArbitraryNumber {
        if (divisor.coefficient === 0) throw new ArbitraryNumberDomainError("Division by zero", { dividend: this.toNumber(), divisor: 0 });

        // Step 1: Divide (mirrors div() without creating an ArbitraryNumber)
        if (this.coefficient === 0) return addend;

        let cd = this.coefficient / divisor.coefficient;
        let ed = this.exponent - divisor.exponent;
        const absC = cd < 0 ? -cd : cd;
        if (absC < 1) { cd *= 10; ed -= 1; }

        // Step 2: Add addend (same logic as mulAdd step 2)
        if (addend.coefficient === 0) return ArbitraryNumber.createNormalized(cd, ed);

        const diff = ed - addend.exponent;
        if (diff > ArbitraryNumber.PrecisionCutoff) return ArbitraryNumber.createNormalized(cd, ed);
        if (diff < -ArbitraryNumber.PrecisionCutoff) return addend;

        let c: number, e: number;
        if (diff >= 0) { c = cd + addend.coefficient / pow10Int(diff); e = ed; }
        else { c = addend.coefficient + cd / pow10Int(-diff); e = addend.exponent; }

        return ArbitraryNumber.normalizeFrom(c, e);
    }

    /**
     * Fused multiply-divide: `(this * multiplier) / divisor`.
     *
     * Avoids one intermediate allocation vs `.mul(multiplier).div(divisor)`.
     * The divisor zero-check is performed before the multiply to avoid unnecessary work.
     *
     * Common pattern - idle-tick math: `(production * deltaTime) / cost`
     *
     * @example
     * // Equivalent to production.mul(deltaTime).div(cost) but ~30-40% faster
     * const consumed = production.mulDiv(deltaTime, cost);
     *
     * @throws `"Division by zero"` when divisor is zero.
     */
    public mulDiv(multiplier: ArbitraryNumber, divisor: ArbitraryNumber): ArbitraryNumber {
        if (divisor.coefficient === 0) throw new ArbitraryNumberDomainError("Division by zero", { dividend: this.toNumber(), divisor: 0 });
        if (this.coefficient === 0 || multiplier.coefficient === 0) return ArbitraryNumber.Zero;

        // Multiply coefficients and divide in one step — (a * b) / c
        const c = (this.coefficient * multiplier.coefficient) / divisor.coefficient;
        const e = this.exponent + multiplier.exponent - divisor.exponent;

        // Product of two [1,10) values is in [1,100); dividing by [1,10) gives (0.1,100).
        // So we may need to shift up or down by at most one step.
        const absC = c < 0 ? -c : c;
        if (absC >= 10) return ArbitraryNumber.createNormalized(c / 10, e + 1);
        if (absC < 1) return ArbitraryNumber.createNormalized(c * 10, e - 1);

        return ArbitraryNumber.createNormalized(c, e);
    }

    /**
     * Efficiently sums an array of ArbitraryNumbers in a single normalisation pass.
     *
     * **Why it's fast:** standard chained `.add()` normalises after every element (N log10 calls).
     * `sumArray` aligns all coefficients to the largest exponent (pivot), sums them,
     * then normalises once - regardless of array size.
     *
     * For 50 elements: chained add ~ 50 log10 calls + 50 allocations;
     * sumArray ~ 50 divisions + 1 log10 call + 1 allocation -> ~9* faster.
     *
     * Common pattern - income aggregation: `total = ArbitraryNumber.sumArray(incomeSourcesPerTick)`
     *
     * @example
     * const total = ArbitraryNumber.sumArray(incomeSources); // far faster than .reduce((a, b) => a.add(b))
     *
     * @param numbers - Array to sum. Empty array returns {@link Zero}. Single element returned as-is.
     */
    public static sumArray(numbers: ArbitraryNumber[]): ArbitraryNumber {
        const len = numbers.length;
        if (len === 0) return ArbitraryNumber.Zero;
        if (len === 1) return numbers[0]!;

        // Find the pivot exponent (largest) - sets the alignment anchor.
        // Values with exponent diff > PrecisionCutoff relative to the pivot are negligible.
        let pivotExp = numbers[0]!.exponent;
        for (let i = 1; i < len; i++) {
            const n = numbers[i]!;
            if (n.exponent > pivotExp) pivotExp = n.exponent;
        }

        // Align all coefficients to the pivot exponent and accumulate - no log10 yet.
        let total = 0;
        for (let i = 0; i < len; i++) {
            const n = numbers[i]!;
            if (n.coefficient === 0) continue;

            const diff = pivotExp - n.exponent;   // always >= 0
            if (diff > ArbitraryNumber.PrecisionCutoff) continue;  // negligible vs pivot

            total += n.coefficient / pow10Int(diff);
        }

        // Single normalisation pass for the entire array.
        if (total === 0) return ArbitraryNumber.Zero;

        const abs = Math.abs(total);
        const shift = Math.floor(Math.log10(abs));
        const scale = pow10(shift);
        if (scale === 0) return ArbitraryNumber.Zero;

        return ArbitraryNumber.createNormalized(total / scale, pivotExp + shift);
    }

    /**
     * Compares this number to `other`.
     *
     * @returns `1` if `this > other`, `-1` if `this < other`, `0` if equal.
     *
     * @example
     * new ArbitraryNumber(1, 4).compareTo(new ArbitraryNumber(9, 3)); // 1  (10000 > 9000)
     * new ArbitraryNumber(-1, 4).compareTo(new ArbitraryNumber(1, 3)); // -1 (-10000 < 1000)
     */
    public compareTo(other: ArbitraryNumber): number {
        const thisNegative = this.coefficient < 0;
        const otherNegative = other.coefficient < 0;

        // one is negative and the other is not
        if (thisNegative !== otherNegative) {
            return thisNegative ? -1 : 1;
        }

        if (this.exponent !== other.exponent) {
            // Zero is stored as {coefficient: 0, exponent: 0}.  Without the guard below,
            // Zero.compareTo({c: 5, e: -1}) would hit the exponent branch and return 1
            // (0 > -1) instead of the correct -1 (0 < 0.5).  The guard is inside the
            // exponent-differs branch so the same-exponent hot path pays zero extra cost.
            if (this.coefficient === 0) return otherNegative ? 1 : -1;
            if (other.coefficient === 0) return thisNegative ? -1 : 1;

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
     * Returns the largest integer less than or equal to this number (floor toward -Infinity).
     *
     * Numbers with `exponent >= PrecisionCutoff` are already integers at that scale
     * and are returned unchanged.
     *
     * @example
     * new ArbitraryNumber(1.7, 0).floor();  // 1
     * new ArbitraryNumber(-1.7, 0).floor(); // -2
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

        return new ArbitraryNumber(Math.floor(this.coefficient * pow10(this.exponent)), 0);
    }

    /**
     * Returns the smallest integer greater than or equal to this number (ceil toward +Infinity).
     *
     * Numbers with `exponent >= PrecisionCutoff` are already integers at that scale
     * and are returned unchanged.
     *
     * @example
     * new ArbitraryNumber(1.2, 0).ceil();  // 2
     * new ArbitraryNumber(-1.7, 0).ceil(); // -1
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

        return new ArbitraryNumber(Math.ceil(this.coefficient * pow10(this.exponent)), 0);
    }

    /**
     * Clamps `value` to the inclusive range `[min, max]`.
     *
     * @example
     * ArbitraryNumber.clamp(new ArbitraryNumber(5, 2), new ArbitraryNumber(1, 3), new ArbitraryNumber(2, 3)); // 1*10^3  (500 clamped to [1000, 2000])
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
     * Returns the smaller of `a` and `b`.
     * @example ArbitraryNumber.min(a, b)
     */
    public static min(a: ArbitraryNumber, b: ArbitraryNumber): ArbitraryNumber {
        return a.lessThan(b) ? a : b;
    }

    /**
     * Returns the larger of `a` and `b`.
     * @example ArbitraryNumber.max(a, b)
     */
    public static max(a: ArbitraryNumber, b: ArbitraryNumber): ArbitraryNumber {
        return a.greaterThan(b) ? a : b;
    }

    /**
     * Linear interpolation: `a + (b - a) * t` where `t in [0, 1]` is a plain number.
     *
     * Used for smooth animations and tweening in game UIs.
     * `t = 0` returns `a`; `t = 1` returns `b`.
     *
     * @param t - Interpolation factor as a plain `number`. Values outside [0, 1] are allowed (extrapolation).
     * @example
     * ArbitraryNumber.lerp(an(100), an(200), 0.5); // 150
     */
    public static lerp(a: ArbitraryNumber, b: ArbitraryNumber, t: number): ArbitraryNumber {
        if (t === 0) return a;
        if (t === 1) return b;

        return a.add(b.sub(a).mul(ArbitraryNumber.from(t)));
    }

    /**
     * Runs `fn` with `PrecisionCutoff` temporarily set to `cutoff`, then restores the previous value.
     *
     * Useful when one section of code needs different precision than the rest.
     *
     * @example
     * // Run financial calculation with higher precision
     * const result = ArbitraryNumber.withPrecision(50, () => a.add(b));
     */
    public static withPrecision<T>(cutoff: number, fn: () => T): T {
        const prev = ArbitraryNumber.PrecisionCutoff;
        ArbitraryNumber.PrecisionCutoff = cutoff;
        try {
            return fn();
        } finally {
            ArbitraryNumber.PrecisionCutoff = prev;
        }
    }

    /**
     * Returns `log10(this)` as a plain JavaScript `number`.
     *
     * Because the number is stored as `c * 10^e`, this is computed exactly as
     * `log10(c) + e` - no precision loss from the exponent.
     *
     * @example
     * new ArbitraryNumber(1, 6).log10();    // 6
     * new ArbitraryNumber(1.5, 3).log10();  // log10(1.5) + 3  ~ 3.176
     *
     * @throws `"Logarithm of zero is undefined"` when this is zero.
     * @throws `"Logarithm of a negative number is undefined"` when this is negative.
     */
    public log10(): number {
        if (this.coefficient === 0) {
            throw new ArbitraryNumberDomainError("Logarithm of zero is undefined", { value: 0 });
        }

        if (this.coefficient < 0) {
            throw new ArbitraryNumberDomainError("Logarithm of a negative number is undefined", { value: this.toNumber() });
        }

        return Math.log10(this.coefficient) + this.exponent;
    }

    /**
     * Returns √this.
     *
     * Computed as pure coefficient math - no `Math.log10` call. Cost: one `Math.sqrt`.
     * For even exponents: `sqrt(c) * 10^(e/2)`.
     * For odd exponents: `sqrt(c * 10) * 10^((e-1)/2)`.
     *
     * @throws `"Square root of negative number"` when this is negative.
     * @example
     * new ArbitraryNumber(4, 0).sqrt();   // 2
     * new ArbitraryNumber(1, 4).sqrt();   // 1*10^2  (= 100)
     */
    public sqrt(): ArbitraryNumber {
        if (this.coefficient < 0) throw new ArbitraryNumberDomainError("Square root of negative number", { value: this.toNumber() });
        if (this.coefficient === 0) return ArbitraryNumber.Zero;
        if (this.exponent % 2 !== 0) {
            // Odd exponent: shift one factor of 10 into the coefficient
            return ArbitraryNumber.createNormalized(Math.sqrt(this.coefficient * 10), (this.exponent - 1) / 2);
        }

        return ArbitraryNumber.createNormalized(Math.sqrt(this.coefficient), this.exponent / 2);
    }

    /**
     * Returns the nearest integer value (rounds half-up).
     *
     * Numbers with `exponent >= PrecisionCutoff` are already integers at that scale
     * and are returned unchanged.
     *
     * @example
     * new ArbitraryNumber(1.5, 0).round();  // 2
     * new ArbitraryNumber(1.4, 0).round();  // 1
     * new ArbitraryNumber(-1.5, 0).round(); // -1 (half-up toward positive infinity)
     */
    public round(): ArbitraryNumber {
        if (this.coefficient === 0) return ArbitraryNumber.Zero;
        if (this.exponent >= ArbitraryNumber.PrecisionCutoff) return this;

        if (this.exponent < 0) {
            // exponent <= -2: |value| < 0.1 -> always rounds to 0
            if (this.exponent <= -2) return ArbitraryNumber.Zero;

            // exponent === -1: value = coefficient * 0.1  (no Math.pow needed)
            const rounded = Math.round(this.coefficient * 0.1);
            return rounded === 0
                ? ArbitraryNumber.Zero
                : new ArbitraryNumber(rounded, 0);
        }

        return new ArbitraryNumber(Math.round(this.coefficient * pow10(this.exponent)), 0);
    }

    /**
     * Returns `1` if positive, `-1` if negative, `0` if zero.
     *
     * @example
     * new ArbitraryNumber(1.5, 3).sign();  // 1
     * new ArbitraryNumber(-1.5, 3).sign(); // -1
     * ArbitraryNumber.Zero.sign();         // 0
     */
    public sign(): Signum {
        return Math.sign(this.coefficient) as Signum;
    }

    /**
     * Converts to a plain JavaScript `number`.
     *
     * Precision is limited to float64 (~15 significant digits).
     * Returns `Infinity` for exponents beyond the float64 range (>=308).
     * Returns `0` for exponents below the float64 range (<=-324).
     *
     * @example
     * new ArbitraryNumber(1.5, 3).toNumber();  // 1500
     * new ArbitraryNumber(1, 400).toNumber();  // Infinity
     */
    public toNumber(): number {
        return this.coefficient * pow10(this.exponent);
    }

    /**
     * Returns a stable, minimal JSON representation: `{ c: number, e: number }`.
     *
     * The keys `c` and `e` are intentionally short to keep save-game blobs small.
     * Reconstruct via {@link ArbitraryNumber.fromJSON}.
     *
     * Round-trip guarantee: `ArbitraryNumber.fromJSON(x.toJSON()).equals(x)` is always `true`.
     *
     * @example
     * JSON.stringify(an(1.5, 6)); // '{"c":1.5,"e":6}'
     */
    public toJSON(): { c: number; e: number } {
        return { c: this.coefficient, e: this.exponent };
    }

    /**
     * Returns a raw string representation: `"<coefficient>|<exponent>"`.
     *
     * Useful for compact textual serialization. Reconstruct via {@link ArbitraryNumber.parse}.
     *
     * @example
     * an(1.5, 3).toRaw();  // "1.5|3"
     * an(-2, 6).toRaw();   // "-2|6"
     */
    public toRaw(): string {
        return `${this.coefficient}|${this.exponent}`;
    }

    /**
     * Reconstructs an `ArbitraryNumber` from a `toJSON()` blob.
     *
     * @example
     * const n = an(1.5, 6);
     * ArbitraryNumber.fromJSON(n.toJSON()).equals(n); // true
     *
     * @param obj - Object with numeric `c` (coefficient) and `e` (exponent) fields.
     * @throws `ArbitraryNumberInputError` when the object shape is invalid or values are non-finite.
     */
    public static fromJSON(obj: unknown): ArbitraryNumber {
        if (
            obj === null ||
            typeof obj !== "object" ||
            !("c" in obj) ||
            !("e" in obj) ||
            typeof (obj as Record<string, unknown>).c !== "number" ||
            typeof (obj as Record<string, unknown>).e !== "number"
        ) {
            throw new ArbitraryNumberInputError(
                "ArbitraryNumber.fromJSON: expected { c: number, e: number }",
                String(obj),
            );
        }

        const { c, e } = obj as { c: number; e: number };

        if (!isFinite(c)) {
            throw new ArbitraryNumberInputError("ArbitraryNumber.fromJSON: c must be finite", c);
        }
        if (!isFinite(e)) {
            throw new ArbitraryNumberInputError("ArbitraryNumber.fromJSON: e must be finite", e);
        }

        // c and e come from toJSON() which stores already-normalised values, so use
        // createNormalized for the zero-cost fast path. Still call normalizeFrom for
        // externally-constructed blobs where c may not be normalised.
        return ArbitraryNumber.normalizeFrom(c, e);
    }

    /**
     * Parses a string into an `ArbitraryNumber`.
     *
     * Accepted formats:
     * - Raw pipe format (exact round-trip): `"1.5|3"`, `"-2.5|-6"`
     * - Standard scientific notation: `"1.5e+3"`, `"1.5e-3"`, `"1.5E3"`, `"1.5e3"`
     * - Plain decimal: `"1500"`, `"-0.003"`, `"0"`
     *
     * @example
     * ArbitraryNumber.parse("1.5|3");    // same as an(1.5, 3)
     * ArbitraryNumber.parse("1.5e+3");   // same as ArbitraryNumber.from(1500)
     * ArbitraryNumber.parse("1500");     // same as ArbitraryNumber.from(1500)
     *
     * @throws `ArbitraryNumberInputError` when the string cannot be parsed or produces a non-finite value.
     */
    public static parse(s: string): ArbitraryNumber {
        if (typeof s !== "string" || s.trim() === "") {
            throw new ArbitraryNumberInputError("ArbitraryNumber.parse: input must be a non-empty string", s);
        }

        const trimmed = s.trim();

        // Raw pipe format: "coefficient|exponent"
        const pipeIdx = trimmed.indexOf("|");
        if (pipeIdx !== -1) {
            const cStr = trimmed.slice(0, pipeIdx);
            const eStr = trimmed.slice(pipeIdx + 1);
            const c = Number(cStr);
            const e = Number(eStr);
            if (!isFinite(c) || !isFinite(e) || cStr === "" || eStr === "") {
                throw new ArbitraryNumberInputError("ArbitraryNumber.parse: invalid pipe format", s);
            }

            return ArbitraryNumber.normalizeFrom(c, e);
        }

        // Scientific or plain decimal — delegate to Number()
        const n = Number(trimmed);
        if (!isFinite(n)) {
            throw new ArbitraryNumberInputError("ArbitraryNumber.parse: value is not finite", s);
        }

        return new ArbitraryNumber(n, 0);
    }

    /** Returns `true` when this number is zero. */
    public isZero(): boolean { return this.coefficient === 0; }

    /** Returns `true` when this number is strictly positive. */
    public isPositive(): boolean { return this.coefficient > 0; }

    /** Returns `true` when this number is strictly negative. */
    public isNegative(): boolean { return this.coefficient < 0; }

    /**
     * Returns `true` when this number has no fractional part.
     * Numbers with `exponent >= PrecisionCutoff` are always considered integers.
     */
    public isInteger(): boolean {
        if (this.coefficient === 0) return true;
        if (this.exponent >= ArbitraryNumber.PrecisionCutoff) return true;
        if (this.exponent < 0) return false;

        // exponent in [0, PrecisionCutoff-1] - covered by pow10 table (0-15)
        return Number.isInteger(this.coefficient * pow10(this.exponent));
    }

    /**
     * Allows implicit coercion via `+an(1500)` (returns `toNumber()`) and
     * template literals / string concatenation (returns `toString()`).
     *
     * `hint === "number"` → `toNumber()`; all other hints → `toString()`.
     */
    public [Symbol.toPrimitive](hint: string): number | string {
        return hint === "number" ? this.toNumber() : this.toString();
    }

    /**
     * Custom Node.js inspect output so `console.log(an(1500))` renders `"1.50e+3"`
     * instead of the raw object representation.
     */
    public [Symbol.for("nodejs.util.inspect.custom")](): string {
        return this.toString();
    }

    /**
     * Formats this number as a string using the given notation plugin.
     *
     * Defaults to {@link scientificNotation} when no plugin is provided.
     * `decimals` controls the number of decimal places passed to the plugin and defaults to `2`.
     *
     * @example
     * new ArbitraryNumber(1.5, 3).toString();                  // "1.50e+3"
     * new ArbitraryNumber(1.5, 3).toString(unitNotation);       // "1.50 K"
     * new ArbitraryNumber(1.5, 3).toString(unitNotation, 4);    // "1.5000 K"
     *
     * @param notation - The formatting plugin to use.
     * @param decimals - Number of decimal places to render. Defaults to `2`.
     */
    public toString(notation: NotationPlugin = scientificNotation, decimals = 2): string {
        return notation.format(this.coefficient, this.exponent, decimals);
    }
}
