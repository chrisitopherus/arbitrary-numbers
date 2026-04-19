import { scientificNotation } from "../plugin/ScientificNotation";
import { type Signum } from "../types/core";
import { type NotationPlugin } from "../types/plugin";
import { type ArbitraryNumberJson, type Nullable } from "../types/utility";
import { pow10 } from "../constants/pow10";
import { ArbitraryNumberInputError, ArbitraryNumberDomainError } from "../errors";

// Module-level cache for the hot-path scaleCutoff read.
// Kept in sync with ArbitraryNumber.defaults.scaleCutoff by withPrecision().
// Direct mutation of defaults.scaleCutoff bypasses this cache — use withPrecision().
let _scaleCutoff = 15;

/**
 * Global tunables for `ArbitraryNumber`.
 *
 * Mutating these is a process-level change — not per-instance.
 */
export interface ArbitraryNumberDefaults {
    /**
     * Exponent-difference threshold below which the smaller operand is negligible
     * and silently skipped during addition/subtraction.
     *
     * Default: 15 (matches float64 coefficient precision of ~15.95 significant digits).
     */
    scaleCutoff: number;
    /** Default decimal places used by `toString()` when no argument is supplied. */
    notationDecimals: number;
}

/**
 * A mutable number with effectively unlimited range, stored as `coefficient * 10^exponent`
 * in normalised scientific notation.
 *
 * The coefficient is always in `[1, 10)` (or `0`). Arithmetic methods **mutate `this`** and
 * return `this` — enabling zero-allocation chaining on the hot path:
 *
 * ```ts
 * gold.add(drop).sub(cost).mul(multiplier);
 * ```
 *
 * Call `.clone()` before any operation where you need to preserve the original value.
 *
 * Addition short-circuits when the exponent difference between operands exceeds
 * {@link ArbitraryNumber.defaults.scaleCutoff} — the smaller value is below the precision
 * floor and is silently discarded.
 *
 * **Static = allocate. Instance = mutate.**
 * Static arithmetic methods (`ArbitraryNumber.add`, etc.) always return a new instance.
 * Instance methods (`a.add(b)`) mutate `a` and return `a`.
 *
 * @example
 * const gold = new ArbitraryNumber(1.5, 3);  // 1_500
 * gold.add(drop).sub(cost).mul(multiplier);  // mutates gold
 * const snapshot = gold.clone();             // safe copy
 */
export class ArbitraryNumber {
    /** The significand, always in `[1, 10)` or `0`. */
    public coefficient: number;
    /** The power of 10 by which the coefficient is scaled. */
    public exponent: number;

    /** Global tunables. Mutating these is a process-level change. */
    public static readonly defaults: ArbitraryNumberDefaults = {
        scaleCutoff: 15,
        notationDecimals: 2,
    };

    /** The additive identity: `0`. Frozen — calling mutating methods throws. */
    public static readonly Zero: FrozenArbitraryNumber = new ArbitraryNumber(0, 0) as unknown as FrozenArbitraryNumber;
    /** The multiplicative identity: `1`. Frozen — calling mutating methods throws. */
    public static readonly One: FrozenArbitraryNumber = new ArbitraryNumber(1, 0) as unknown as FrozenArbitraryNumber;
    /** `10`. Frozen — calling mutating methods throws. */
    public static readonly Ten: FrozenArbitraryNumber = new ArbitraryNumber(1, 1) as unknown as FrozenArbitraryNumber;

    /**
     * Constructs a new `ArbitraryNumber` and immediately normalises it so that
     * `1 <= |coefficient| < 10` (or `coefficient === 0`).
     *
     * Always two numeric arguments — this keeps the constructor monomorphic so V8
     * locks in a hidden class on first use (~5 ns allocation).
     *
     * @example
     * new ArbitraryNumber(15, 3); // stored as { coefficient: 1.5, exponent: 4 }
     *
     * @throws `ArbitraryNumberInputError` for `NaN`/`Infinity` coefficient or exponent.
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
        const scale = pow10(shift);
        if (scale === 0) {
            this.coefficient = 0;
            this.exponent = 0;
            return;
        }

        this.coefficient = coefficient / scale;
        this.exponent = exponent + shift;
    }

    /**
     * @internal Fast-path factory for already-normalised values. Not exported from `index.ts`.
     *
     * Allocates a new instance and writes the two fields directly — bypasses validation
     * and normalisation. Only valid when `|coefficient|` is already in `[1, 10)` (or 0)
     * and `exponent` is correct.
     */
    public static unsafe(coefficient: number, exponent: number): ArbitraryNumber {
        const n = new ArbitraryNumber(0, 0);
        n.coefficient = coefficient;
        n.exponent = exponent;
        return n;
    }

    /** @internal Normalise an arbitrary `(c, e)` pair into a new instance. */
    private static _normalizeNew(c: number, e: number): ArbitraryNumber {
        if (c === 0) return ArbitraryNumber.Zero;

        const abs = Math.abs(c);
        const shift = Math.floor(Math.log10(abs));
        const scale = pow10(shift);
        if (scale === 0) return ArbitraryNumber.Zero;

        return ArbitraryNumber.unsafe(c / scale, e + shift);
    }

    /** @internal Normalise `(c, e)` into `this` (mutates). Returns `this`. */
    private _normalizeInto(c: number, e: number): this {
        if (c === 0) { this.coefficient = 0; this.exponent = 0; return this; }

        const abs = c < 0 ? -c : c;
        // Fast path: after add/sub the result is almost always in [0.1, 100).
        if (abs < 10) {
            if (abs >= 1) { this.coefficient = c; this.exponent = e; return this; }

            this.coefficient = c * 10; this.exponent = e - 1; return this;
        }
        if (abs < 100) { this.coefficient = c / 10; this.exponent = e + 1; return this; }
        // Slow path: large carry, cancellation to subnormal, or non-finite.
        if (!isFinite(c)) { this.coefficient = 0; this.exponent = 0; return this; }

        const shift = Math.floor(Math.log10(abs));
        const scale = pow10(shift);
        if (scale === 0) { this.coefficient = 0; this.exponent = 0; return this; }

        this.coefficient = c / scale;
        this.exponent = e + shift;
        return this;
    }

    // ── Factories ──────────────────────────────────────────────────────────────

    /**
     * Returns a fresh, unfrozen copy of this number. The canonical way to preserve
     * a value before mutating it:
     *
     * ```ts
     * const before = gold.clone();
     * gold.add(drop);
     * ```
     */
    public clone(): ArbitraryNumber {
        return ArbitraryNumber.unsafe(this.coefficient, this.exponent);
    }

    /**
     * Creates an `ArbitraryNumber` from a plain JavaScript `number`.
     *
     * @throws `ArbitraryNumberInputError` for `NaN`, `Infinity`, or `-Infinity`.
     *
     * @example
     * ArbitraryNumber.from(1500);  // { coefficient: 1.5, exponent: 3 }
     */
    public static from(value: number): ArbitraryNumber {
        if (!isFinite(value)) {
            throw new ArbitraryNumberInputError("ArbitraryNumber.from: value must be finite", value);
        }

        return new ArbitraryNumber(value, 0);
    }

    /**
     * Like `from`, but returns `null` instead of throwing for non-finite inputs.
     *
     * Use at system boundaries (form inputs, external APIs) where bad input should
     * be handled gracefully.
     *
     * @example
     * ArbitraryNumber.tryFrom(Infinity) // null
     * ArbitraryNumber.tryFrom(1500)     // ArbitraryNumber { coefficient: 1.5, exponent: 3 }
     */
    public static tryFrom(value: number): Nullable<ArbitraryNumber> {
        if (!isFinite(value)) return null;

        return new ArbitraryNumber(value, 0);
    }

    // ── Static arithmetic (allocate) ───────────────────────────────────────────

    /**
     * Returns a **new** instance equal to `a + b`.
     *
     * Static methods always allocate — use instance `.add()` on hot paths.
     */
    public static add(a: ArbitraryNumber, b: ArbitraryNumber): ArbitraryNumber {
        return a.clone().add(b);
    }

    /**
     * Returns a **new** instance equal to `a - b`.
     */
    public static sub(a: ArbitraryNumber, b: ArbitraryNumber): ArbitraryNumber {
        return a.clone().sub(b);
    }

    /**
     * Returns a **new** instance equal to `a * b`.
     */
    public static mul(a: ArbitraryNumber, b: ArbitraryNumber): ArbitraryNumber {
        return a.clone().mul(b);
    }

    /**
     * Returns a **new** instance equal to `a / b`.
     *
     * @throws `"Division by zero"` when `b` is zero.
     */
    public static div(a: ArbitraryNumber, b: ArbitraryNumber): ArbitraryNumber {
        return a.clone().div(b);
    }

    // ── Instance arithmetic (mutate this) ──────────────────────────────────────

    /**
     * Adds `other` to this number in-place.
     *
     * When the exponent difference exceeds `defaults.scaleCutoff`, the smaller
     * operand has no effect and `this` is returned unchanged.
     *
     * **Mutates `this`. Returns `this`.**
     *
     * @example
     * gold.add(drop); // gold is mutated
     */
    public add(other: ArbitraryNumber): this {
        if (other.coefficient === 0) return this;
        if (this.coefficient === 0) {
            this.coefficient = other.coefficient;
            this.exponent = other.exponent;
            return this;
        }

        const cutoff = _scaleCutoff;
        const diff = this.exponent - other.exponent;
        if (diff > cutoff) return this;
        if (diff < -cutoff) {
            this.coefficient = other.coefficient;
            this.exponent = other.exponent;
            return this;
        }

        // snapshot other before writing (self-reference safety: a.add(a))
        const oc = other.coefficient;
        const oe = other.exponent;

        let c: number, e: number;
        if (diff >= 0) {
            c = this.coefficient + oc / pow10(diff);
            e = this.exponent;
        } else {
            c = oc + this.coefficient / pow10(-diff);
            e = oe;
        }

        return this._normalizeInto(c, e);
    }

    /**
     * Subtracts `other` from this number in-place.
     *
     * **Mutates `this`. Returns `this`.**
     */
    public sub(other: ArbitraryNumber): this {
        if (other.coefficient === 0) return this;

        // snapshot other (self-reference safety)
        const oc = other.coefficient;
        const oe = other.exponent;
        const negOc = -oc;

        if (this.coefficient === 0) {
            this.coefficient = negOc;
            this.exponent = oe;
            return this;
        }

        const cutoff = _scaleCutoff;
        const diff = this.exponent - oe;
        if (diff > cutoff) return this;
        if (diff < -cutoff) {
            this.coefficient = negOc;
            this.exponent = oe;
            return this;
        }

        let c: number, e: number;
        if (diff >= 0) {
            c = this.coefficient + negOc / pow10(diff);
            e = this.exponent;
        } else {
            c = negOc + this.coefficient / pow10(-diff);
            e = oe;
        }

        return this._normalizeInto(c, e);
    }

    /**
     * Multiplies this number by `other` in-place.
     *
     * **Mutates `this`. Returns `this`.**
     */
    public mul(other: ArbitraryNumber): this {
        if (this.coefficient === 0) return this;
        if (other.coefficient === 0) {
            this.coefficient = 0;
            this.exponent = 0;
            return this;
        }

        const c = this.coefficient * other.coefficient;
        const e = this.exponent + other.exponent;
        const absC = c < 0 ? -c : c;
        if (absC >= 10) {
            this.coefficient = c / 10;
            this.exponent = e + 1;
        } else {
            this.coefficient = c;
            this.exponent = e;
        }

        return this;
    }

    /**
     * Divides this number by `other` in-place.
     *
     * **Mutates `this`. Returns `this`.**
     *
     * @throws `"Division by zero"` when `other` is zero.
     */
    public div(other: ArbitraryNumber): this {
        if (other.coefficient === 0) {
            throw new ArbitraryNumberDomainError("Division by zero", { dividend: this.toNumber(), divisor: 0 });
        }
        if (this.coefficient === 0) return this;

        const c = this.coefficient / other.coefficient;
        const e = this.exponent - other.exponent;
        if (c === 0) {
            this.coefficient = 0;
            this.exponent = 0;
            return this;
        }

        const absC = c < 0 ? -c : c;
        if (absC < 1) {
            this.coefficient = c * 10;
            this.exponent = e - 1;
        } else {
            this.coefficient = c;
            this.exponent = e;
        }

        return this;
    }

    /**
     * Negates this number in-place.
     *
     * **Mutates `this`. Returns `this`.**
     */
    public negate(): this {
        this.coefficient = -this.coefficient;
        return this;
    }

    /**
     * Sets this number to its absolute value in-place.
     *
     * **Mutates `this`. Returns `this`.**
     */
    public abs(): this {
        if (this.coefficient < 0) this.coefficient = -this.coefficient;

        return this;
    }

    /**
     * Raises this number to the power `n` in-place.
     *
     * Supports integer, fractional, and negative exponents.
     * `x^0` always sets `this` to `1`, including `0^0` (by convention).
     *
     * **Mutates `this`. Returns `this`.**
     *
     * @throws `"Zero cannot be raised to a negative power"` when this is zero and `n < 0`.
     */
    public pow(n: number): this {
        if (n === 0) {
            this.coefficient = 1;
            this.exponent = 0;
            return this;
        }

        if (this.coefficient === 0) {
            if (n < 0) {
                throw new ArbitraryNumberDomainError("Zero cannot be raised to a negative power", { exponent: n });
            }

            return this;
        }

        if (this.coefficient < 0 && !Number.isInteger(n)) {
            throw new ArbitraryNumberDomainError(
                "ArbitraryNumber.pow: fractional exponent of a negative base is not supported",
                { base: this.toNumber(), exponent: n },
            );
        }

        const rawExp = this.exponent * n;
        const intExp = Math.floor(rawExp);
        const fracExp = rawExp - intExp;
        const newC = Math.pow(this.coefficient, n) * pow10(fracExp);
        return this._normalizeInto(newC, intExp);
    }

    /**
     * Fused multiply-add in-place: `this = (this * multiplier) + addend`.
     *
     * Faster than `.mul(multiplier).add(addend)` — one normalisation pass total, no
     * intermediate allocation.
     *
     * **Mutates `this`. Returns `this`.**
     */
    public mulAdd(multiplier: ArbitraryNumber, addend: ArbitraryNumber): this {
        if (this.coefficient === 0 || multiplier.coefficient === 0) {
            this.coefficient = addend.coefficient;
            this.exponent = addend.exponent;
            return this;
        }

        // snapshot addend before touching this (self-ref safety)
        const ac = addend.coefficient;
        const ae = addend.exponent;

        let cp = this.coefficient * multiplier.coefficient;
        let ep = this.exponent + multiplier.exponent;
        const absCp = cp < 0 ? -cp : cp;
        if (absCp >= 10) { cp /= 10; ep += 1; }

        if (ac === 0) {
            this.coefficient = cp;
            this.exponent = ep;
            return this;
        }

        const cutoff = _scaleCutoff;
        const diff = ep - ae;
        if (diff > cutoff) {
            this.coefficient = cp;
            this.exponent = ep;
            return this;
        }
        if (diff < -cutoff) {
            this.coefficient = ac;
            this.exponent = ae;
            return this;
        }

        let c: number, e: number;
        if (diff >= 0) {
            c = cp + ac / pow10(diff);
            e = ep;
        } else {
            c = ac + cp / pow10(-diff);
            e = ae;
        }

        return this._normalizeInto(c, e);
    }

    /**
     * @internal
     * Computes `(this + sign * addendC * 10^addendE)` and writes the normalised
     * result back into `this`. Used by `addMul` and `subMul` to share the alignment
     * logic without duplication.
     *
     * Returns the sign-adjusted addend coefficient so callers can detect the
     * zero-result case. Writes the intermediate normalised sum into `this.coefficient`
     * / `this.exponent` ready for the subsequent multiply step.
     */
    private _addScaledInto(addendC: number, addendE: number): void {
        if (this.coefficient === 0) {
            this.coefficient = addendC; this.exponent = addendE; return;
        }
        if (addendC === 0) return; // this is already correct

        const cutoff = _scaleCutoff;
        const diff = this.exponent - addendE;
        if (diff > cutoff) return;
        if (diff < -cutoff) { this.coefficient = addendC; this.exponent = addendE; return; }

        let cs: number, es: number;
        if (diff >= 0) {
            cs = this.coefficient + addendC / pow10(diff); es = this.exponent;
        } else {
            cs = addendC + this.coefficient / pow10(-diff); es = addendE;
        }

        // Inline fast-normalize (same logic as _normalizeInto but without calling it
        // so V8 can see this is a continuation of the same JIT unit).
        if (cs === 0) { this.coefficient = 0; this.exponent = 0; return; }

        const abs = cs < 0 ? -cs : cs;
        if (abs < 10) {
            if (abs >= 1) { this.coefficient = cs; this.exponent = es; return; }

            this.coefficient = cs * 10; this.exponent = es - 1; return;
        }
        if (abs < 100) { this.coefficient = cs / 10; this.exponent = es + 1; return; }
        if (!isFinite(cs)) { this.coefficient = 0; this.exponent = 0; return; }

        const shift = Math.floor(Math.log10(abs));
        const scale = pow10(shift);
        if (scale === 0) { this.coefficient = 0; this.exponent = 0; return; }

        this.coefficient = cs / scale; this.exponent = es + shift;
    }

    /**
     * Fused add-multiply in-place: `this = (this + addend) * multiplier`.
     *
     * **Mutates `this`. Returns `this`.**
     */
    public addMul(addend: ArbitraryNumber, multiplier: ArbitraryNumber): this {
        if (multiplier.coefficient === 0) {
            this.coefficient = 0; this.exponent = 0; return this;
        }

        // snapshot all args before any write (self-ref safety)
        const ac = addend.coefficient;
        const ae = addend.exponent;
        const mc = multiplier.coefficient;
        const me = multiplier.exponent;

        this._addScaledInto(ac, ae);
        if (this.coefficient === 0) return this;

        let cp = this.coefficient * mc;
        const ep = this.exponent + me;
        const absCp = cp < 0 ? -cp : cp;
        if (absCp >= 10) { cp /= 10; this.coefficient = cp; this.exponent = ep + 1; return this; }

        this.coefficient = cp; this.exponent = ep;
        return this;
    }

    /**
     * Fused multiply-subtract in-place: `this = (this * multiplier) - subtrahend`.
     *
     * **Mutates `this`. Returns `this`.**
     */
    public mulSub(multiplier: ArbitraryNumber, subtrahend: ArbitraryNumber): this {
        // snapshot before writing
        const sc = subtrahend.coefficient;
        const se = subtrahend.exponent;

        if (this.coefficient === 0 || multiplier.coefficient === 0) {
            this.coefficient = sc === 0 ? 0 : -sc;
            this.exponent = sc === 0 ? 0 : se;
            return this;
        }

        let cp = this.coefficient * multiplier.coefficient;
        let ep = this.exponent + multiplier.exponent;
        const absCp = cp < 0 ? -cp : cp;
        if (absCp >= 10) { cp /= 10; ep += 1; }

        if (sc === 0) {
            this.coefficient = cp; this.exponent = ep; return this;
        }

        const cutoff = _scaleCutoff;
        const diff = ep - se;
        if (diff > cutoff) { this.coefficient = cp; this.exponent = ep; return this; }
        if (diff < -cutoff) { this.coefficient = -sc; this.exponent = se; return this; }

        let c: number, e: number;
        if (diff >= 0) { c = cp - sc / pow10(diff); e = ep; }
        else           { c = -sc + cp / pow10(-diff); e = se; }

        return this._normalizeInto(c, e);
    }

    /**
     * Fused subtract-multiply in-place: `this = (this - subtrahend) * multiplier`.
     *
     * **Mutates `this`. Returns `this`.**
     */
    public subMul(subtrahend: ArbitraryNumber, multiplier: ArbitraryNumber): this {
        if (multiplier.coefficient === 0) {
            this.coefficient = 0; this.exponent = 0; return this;
        }

        // snapshot all args before any write (self-ref safety)
        const sc = subtrahend.coefficient;
        const se = subtrahend.exponent;
        const mc = multiplier.coefficient;
        const me = multiplier.exponent;

        this._addScaledInto(-sc, se);
        if (this.coefficient === 0) return this;

        let cp = this.coefficient * mc;
        const ep = this.exponent + me;
        const absCp = cp < 0 ? -cp : cp;
        if (absCp >= 10) { cp /= 10; this.coefficient = cp; this.exponent = ep + 1; return this; }

        this.coefficient = cp; this.exponent = ep;
        return this;
    }

    /**
     * Fused divide-add in-place: `this = (this / divisor) + addend`.
     *
     * **Mutates `this`. Returns `this`.**
     *
     * @throws `"Division by zero"` when divisor is zero.
     */
    public divAdd(divisor: ArbitraryNumber, addend: ArbitraryNumber): this {
        if (divisor.coefficient === 0) {
            throw new ArbitraryNumberDomainError("Division by zero", { dividend: this.toNumber(), divisor: 0 });
        }

        // snapshot addend
        const ac = addend.coefficient;
        const ae = addend.exponent;

        if (this.coefficient === 0) {
            this.coefficient = ac;
            this.exponent = ae;
            return this;
        }

        let cd = this.coefficient / divisor.coefficient;
        let ed = this.exponent - divisor.exponent;
        const absC = cd < 0 ? -cd : cd;
        if (absC < 1) { cd *= 10; ed -= 1; }

        if (ac === 0) {
            this.coefficient = cd;
            this.exponent = ed;
            return this;
        }

        const cutoff = _scaleCutoff;
        const diff = ed - ae;
        if (diff > cutoff) {
            this.coefficient = cd;
            this.exponent = ed;
            return this;
        }
        if (diff < -cutoff) {
            this.coefficient = ac;
            this.exponent = ae;
            return this;
        }

        let c: number, e: number;
        if (diff >= 0) { c = cd + ac / pow10(diff); e = ed; }
        else { c = ac + cd / pow10(-diff); e = ae; }

        return this._normalizeInto(c, e);
    }

    /**
     * Fused multiply-divide in-place: `this = (this * multiplier) / divisor`.
     *
     * **Mutates `this`. Returns `this`.**
     *
     * @throws `"Division by zero"` when divisor is zero.
     */
    public mulDiv(multiplier: ArbitraryNumber, divisor: ArbitraryNumber): this {
        if (divisor.coefficient === 0) {
            throw new ArbitraryNumberDomainError("Division by zero", { dividend: this.toNumber(), divisor: 0 });
        }
        if (this.coefficient === 0) return this;
        if (multiplier.coefficient === 0) {
            this.coefficient = 0;
            this.exponent = 0;
            return this;
        }

        const c = (this.coefficient * multiplier.coefficient) / divisor.coefficient;
        const e = this.exponent + multiplier.exponent - divisor.exponent;

        const absC = c < 0 ? -c : c;
        if (absC >= 10) {
            this.coefficient = c / 10;
            this.exponent = e + 1;
        } else if (absC < 1) {
            this.coefficient = c * 10;
            this.exponent = e - 1;
        } else {
            this.coefficient = c;
            this.exponent = e;
        }

        return this;
    }

    // ── Batch (static, allocate) ───────────────────────────────────────────────

    /**
     * Efficiently sums an array of `ArbitraryNumber`s in a single pass.
     *
     * Maintains a running pivot exponent and rescales the accumulator when a larger
     * exponent is encountered — one pass, no pre-scan needed.
     *
     * Empty array returns `Zero`. Single element returned as-is (no clone).
     */
    public static sumArray(numbers: ArbitraryNumber[]): ArbitraryNumber {
        const len = numbers.length;
        if (len === 0) return ArbitraryNumber.Zero;
        if (len === 1) return numbers[0]!;

        const cutoff = _scaleCutoff;
        let pivot = -Infinity;
        let total = 0;

        for (let i = 0; i < len; i++) {
            const n = numbers[i]!;
            if (n.coefficient === 0) continue;

            if (n.exponent > pivot) {
                if (pivot !== -Infinity) {
                    const drop = n.exponent - pivot;
                    total = drop > cutoff ? 0 : total / pow10(drop);
                }

                pivot = n.exponent;
                total += n.coefficient;
            } else {
                const diff = pivot - n.exponent;
                if (diff <= cutoff) total += n.coefficient / pow10(diff);
            }
        }

        if (total === 0 || pivot === -Infinity) return ArbitraryNumber.Zero;

        const abs = total < 0 ? -total : total;
        if (abs < 10) {
            if (abs >= 1) return ArbitraryNumber.unsafe(total, pivot);

            return ArbitraryNumber.unsafe(total * 10, pivot - 1);
        }
        if (abs < 100) return ArbitraryNumber.unsafe(total / 10, pivot + 1);

        const shift = Math.floor(Math.log10(abs));
        const scale = pow10(shift);
        if (scale === 0) return ArbitraryNumber.Zero;

        return ArbitraryNumber.unsafe(total / scale, pivot + shift);
    }

    /**
     * Multiplies an array of `ArbitraryNumber`s in a single pass.
     *
     * Empty array returns `One`. Single element returned as-is.
     */
    public static productArray(numbers: ArbitraryNumber[]): ArbitraryNumber {
        const len = numbers.length;
        if (len === 0) return ArbitraryNumber.One;
        if (len === 1) return numbers[0]!;

        let c = 1;
        let e = 0;

        for (let i = 0; i < len; i++) {
            const n = numbers[i]!;
            if (n.coefficient === 0) return ArbitraryNumber.Zero;

            c *= n.coefficient;
            e += n.exponent;

            // All inputs are normalised (|c| ∈ [1,10)), so the product is in [1,100).
            // A single one-step renorm is always sufficient.
            if (c >= 10 || c <= -10) { c /= 10; e += 1; }
        }

        return ArbitraryNumber._normalizeNew(c, e);
    }

    /**
     * Returns the largest value in an array. Empty array returns `Zero`.
     */
    public static maxOfArray(numbers: ArbitraryNumber[]): ArbitraryNumber {
        if (numbers.length === 0) return ArbitraryNumber.Zero;

        let max = numbers[0]!;
        for (let i = 1; i < numbers.length; i++) {
            if (numbers[i]!.greaterThan(max)) max = numbers[i]!;
        }

        return max;
    }

    /**
     * Returns the smallest value in an array. Empty array returns `Zero`.
     */
    public static minOfArray(numbers: ArbitraryNumber[]): ArbitraryNumber {
        if (numbers.length === 0) return ArbitraryNumber.Zero;

        let min = numbers[0]!;
        for (let i = 1; i < numbers.length; i++) {
            if (numbers[i]!.lessThan(min)) min = numbers[i]!;
        }

        return min;
    }

    // ── Rounding (mutate) ──────────────────────────────────────────────────────

    /**
     * Rounds down to the nearest integer in-place (floor toward −∞).
     *
     * **Mutates `this`. Returns `this`.**
     */
    public floor(): this {
        if (this.coefficient === 0) return this;
        if (this.exponent >= _scaleCutoff) return this;

        if (this.exponent < 0) {
            this.coefficient = this.coefficient >= 0 ? 0 : -1;
            this.exponent = 0;
            return this;
        }

        return this._normalizeInto(Math.floor(this.coefficient * pow10(this.exponent)), 0);
    }

    /**
     * Rounds up to the nearest integer in-place (ceil toward +∞).
     *
     * **Mutates `this`. Returns `this`.**
     */
    public ceil(): this {
        if (this.coefficient === 0) return this;
        if (this.exponent >= _scaleCutoff) return this;

        if (this.exponent < 0) {
            const ceiled = this.coefficient > 0 ? 1 : 0;
            this.coefficient = ceiled;
            this.exponent = 0;
            return this;
        }

        return this._normalizeInto(Math.ceil(this.coefficient * pow10(this.exponent)), 0);
    }

    /**
     * Rounds to the nearest integer in-place.
     *
     * Uses `Math.round` semantics: half-values round toward positive infinity
     * (`0.5 → 1`, `-0.5 → 0`). This matches JavaScript's built-in convention.
     *
     * **Mutates `this`. Returns `this`.**
     */
    public round(): this {
        if (this.coefficient === 0) return this;
        if (this.exponent >= _scaleCutoff) return this;

        if (this.exponent < 0) {
            if (this.exponent <= -2) {
                this.coefficient = 0;
                this.exponent = 0;
                return this;
            }

            const rounded = Math.round(this.coefficient * 0.1) || 0; // normalize -0 to +0
            this.coefficient = rounded;
            this.exponent = 0;
            return this;
        }

        return this._normalizeInto(Math.round(this.coefficient * pow10(this.exponent)), 0);
    }

    /**
     * Truncates toward zero in-place.
     *
     * **Mutates `this`. Returns `this`.**
     */
    public trunc(): this {
        if (this.coefficient === 0) return this;
        if (this.exponent >= _scaleCutoff) return this;
        if (this.exponent < 0) {
            this.coefficient = 0;
            this.exponent = 0;
            return this;
        }

        return this._normalizeInto(Math.trunc(this.coefficient * pow10(this.exponent)), 0);
    }

    // ── Roots & logs ───────────────────────────────────────────────────────────

    /**
     * Returns √this in-place.
     *
     * **Mutates `this`. Returns `this`.**
     *
     * @throws `"Square root of negative number"` when this is negative.
     */
    public sqrt(): this {
        if (this.coefficient < 0) {
            throw new ArbitraryNumberDomainError("Square root of negative number", { value: this.toNumber() });
        }
        if (this.coefficient === 0) return this;

        if (this.exponent % 2 !== 0) {
            this.coefficient = Math.sqrt(this.coefficient * 10);
            this.exponent = (this.exponent - 1) / 2;
        } else {
            this.coefficient = Math.sqrt(this.coefficient);
            this.exponent = this.exponent / 2;
        }

        return this;
    }

    /**
     * Returns ∛this in-place.
     *
     * **Mutates `this`. Returns `this`.**
     */
    public cbrt(): this {
        if (this.coefficient === 0) return this;

        const rem = ((this.exponent % 3) + 3) % 3;
        const baseExp = (this.exponent - rem) / 3;

        if (rem === 0) {
            this.coefficient = Math.cbrt(this.coefficient);
            this.exponent = baseExp;
        } else if (rem === 1) {
            this.coefficient = Math.cbrt(this.coefficient * 10);
            this.exponent = baseExp;
        } else {
            this.coefficient = Math.cbrt(this.coefficient * 100);
            this.exponent = baseExp;
        }

        return this;
    }

    /**
     * Returns `log10(this)` as a plain `number`.
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
     * Returns `log_base(this)` as a plain `number`.
     *
     * @param base - Must be positive and not 1.
     * @throws `"Logarithm base must be positive and not 1"` for invalid base.
     */
    public log(base: number): number {
        if (base <= 0 || base === 1 || !isFinite(base)) {
            throw new ArbitraryNumberDomainError("Logarithm base must be positive and not 1", { base });
        }

        return this.log10() / Math.log10(base);
    }

    /**
     * Returns `ln(this)` as a plain `number`.
     */
    public ln(): number {
        return this.log10() / Math.LOG10E;
    }

    /**
     * Returns `10^n` as a new `ArbitraryNumber`.
     *
     * @throws `"ArbitraryNumber.exp10: n must be finite"` for non-finite `n`.
     */
    public static exp10(n: number): ArbitraryNumber {
        if (!isFinite(n)) {
            throw new ArbitraryNumberInputError("ArbitraryNumber.exp10: n must be finite", n);
        }

        const intPart = Math.floor(n);
        const fracPart = n - intPart;
        return ArbitraryNumber.unsafe(Math.pow(10, fracPart), intPart);
    }

    // ── Comparisons (read-only) ────────────────────────────────────────────────

    /**
     * Compares this number to `other`.
     *
     * @returns `1` if `this > other`, `-1` if `this < other`, `0` if equal.
     */
    public compareTo(other: ArbitraryNumber): number {
        const thisNegative = this.coefficient < 0;
        const otherNegative = other.coefficient < 0;

        if (thisNegative !== otherNegative) {
            return thisNegative ? -1 : 1;
        }

        if (this.exponent !== other.exponent) {
            if (this.coefficient === 0) return otherNegative ? 1 : -1;
            if (other.coefficient === 0) return thisNegative ? -1 : 1;

            const thisExpHigher = this.exponent > other.exponent;
            return thisNegative
                ? (thisExpHigher ? -1 : 1)
                : (thisExpHigher ? 1 : -1);
        }

        if (this.coefficient !== other.coefficient) {
            return this.coefficient > other.coefficient ? 1 : -1;
        }

        return 0;
    }

    /** Returns `true` if `this > other`. */
    public greaterThan(other: ArbitraryNumber): boolean { return this.compareTo(other) > 0; }
    /** Returns `true` if `this < other`. */
    public lessThan(other: ArbitraryNumber): boolean { return this.compareTo(other) < 0; }
    /** Returns `true` if `this >= other`. */
    public greaterThanOrEqual(other: ArbitraryNumber): boolean { return this.compareTo(other) >= 0; }
    /** Returns `true` if `this <= other`. */
    public lessThanOrEqual(other: ArbitraryNumber): boolean { return this.compareTo(other) <= 0; }
    /** Returns `true` if `this === other` in value. */
    public equals(other: ArbitraryNumber): boolean { return this.compareTo(other) === 0; }

    // ── Clamp / min / max (static, allocate) ──────────────────────────────────

    /**
     * Clamps `value` to the inclusive range `[min, max]`. Returns one of the three
     * inputs (no allocation).
     */
    public static clamp(value: ArbitraryNumber, min: ArbitraryNumber, max: ArbitraryNumber): ArbitraryNumber {
        if (value.lessThan(min)) return min;
        if (value.greaterThan(max)) return max;

        return value;
    }

    /** Returns the smaller of `a` and `b`. */
    public static min(a: ArbitraryNumber, b: ArbitraryNumber): ArbitraryNumber {
        return a.lessThan(b) ? a : b;
    }

    /** Returns the larger of `a` and `b`. */
    public static max(a: ArbitraryNumber, b: ArbitraryNumber): ArbitraryNumber {
        return a.greaterThan(b) ? a : b;
    }

    /**
     * Linear interpolation: `a + (b - a) * t`.
     *
     * Returns `a` unchanged when `t === 0`, `b` unchanged when `t === 1`.
     * All other values of `t` allocate and return a fresh instance.
     */
    public static lerp(a: ArbitraryNumber, b: ArbitraryNumber, t: number): ArbitraryNumber {
        if (t === 0) return a;
        if (t === 1) return b;

        return a.clone().add(b.clone().sub(a).mul(ArbitraryNumber.from(t)));
    }

    /**
     * Runs `fn` with `defaults.scaleCutoff` temporarily set to `cutoff`, then restores it.
     */
    public static withPrecision<T>(cutoff: number, fn: () => T): T {
        const prev = ArbitraryNumber.defaults.scaleCutoff;
        ArbitraryNumber.defaults.scaleCutoff = cutoff;
        _scaleCutoff = cutoff;
        try {
            return fn();
        } finally {
            ArbitraryNumber.defaults.scaleCutoff = prev;
            _scaleCutoff = prev;
        }
    }

    // ── Predicates (read-only) ─────────────────────────────────────────────────

    /** Returns `true` when this number is zero. */
    public isZero(): boolean { return this.coefficient === 0; }
    /** Returns `true` when this number is strictly positive. */
    public isPositive(): boolean { return this.coefficient > 0; }
    /** Returns `true` when this number is strictly negative. */
    public isNegative(): boolean { return this.coefficient < 0; }

    /**
     * Returns `true` when this number has no fractional part.
     * Numbers with `exponent >= scaleCutoff` are always considered integers.
     */
    public isInteger(): boolean {
        if (this.coefficient === 0) return true;
        if (this.exponent >= _scaleCutoff) return true;
        if (this.exponent < 0) return false;

        return Number.isInteger(this.coefficient * pow10(this.exponent));
    }

    /**
     * Returns `1` if positive, `-1` if negative, `0` if zero.
     */
    public sign(): Signum {
        return Math.sign(this.coefficient) as Signum;
    }

    // ── Freeze ─────────────────────────────────────────────────────────────────

    /**
     * Returns a `FrozenArbitraryNumber` wrapping the same value.
     *
     * Mutating methods on the frozen instance throw `ArbitraryNumberMutationError`.
     * Call `.clone()` on the frozen instance to get a fresh, mutable copy.
     */
    public freeze(): FrozenArbitraryNumber {
        return new FrozenArbitraryNumber(this.coefficient, this.exponent);
    }

    // ── Serialization ──────────────────────────────────────────────────────────

    /**
     * Converts to a plain JavaScript `number`.
     *
     * Returns `Infinity` for exponents beyond float64 range (>=308).
     * Returns `0` for exponents below float64 range (<=-324).
     */
    public toNumber(): number {
        return this.coefficient * pow10(this.exponent);
    }

    /**
     * Returns a stable, minimal JSON representation: `{ c: number, e: number }`.
     *
     * Round-trip guarantee: `ArbitraryNumber.fromJSON(x.toJSON()).equals(x)` is always `true`.
     */
    public toJSON(): ArbitraryNumberJson {
        return { c: this.coefficient, e: this.exponent };
    }

    /**
     * Returns a compact string representation: `"<coefficient>|<exponent>"`.
     *
     * Shorter than JSON for save-game serialisation. Reconstruct via `ArbitraryNumber.parse`.
     *
     * @example
     * an(1500).toRawString() // "1.5|3"
     */
    public toRawString(): string {
        return `${this.coefficient}|${this.exponent}`;
    }

    /**
     * Reconstructs an `ArbitraryNumber` from a `toJSON()` blob.
     *
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

        const { c, e } = obj as ArbitraryNumberJson;

        if (!isFinite(c)) {
            throw new ArbitraryNumberInputError("ArbitraryNumber.fromJSON: c must be finite", c);
        }
        
        if (!isFinite(e)) {
            throw new ArbitraryNumberInputError("ArbitraryNumber.fromJSON: e must be finite", e);
        }

        return ArbitraryNumber._normalizeNew(c, e);
    }

    /**
     * Parses a string into an `ArbitraryNumber`.
     *
     * Accepted formats:
     * - Raw pipe format: `"1.5|3"`, `"-2.5|-6"`
     * - Scientific notation: `"1.5e+3"`, `"1.5E3"`
     * - Plain decimal: `"1500"`, `"-0.003"`, `"0"`
     *
     * @throws `ArbitraryNumberInputError` for invalid or non-finite input.
     */
    public static parse(s: string): ArbitraryNumber {
        if (typeof s !== "string" || s.trim() === "") {
            throw new ArbitraryNumberInputError("ArbitraryNumber.parse: input must be a non-empty string", s);
        }

        const trimmed = s.trim();

        const pipeIdx = trimmed.indexOf("|");
        if (pipeIdx !== -1) {
            const cStr = trimmed.slice(0, pipeIdx);
            const eStr = trimmed.slice(pipeIdx + 1);
            const c = Number(cStr);
            const e = Number(eStr);
            if (!isFinite(c) || !isFinite(e) || cStr === "" || eStr === "") {
                throw new ArbitraryNumberInputError("ArbitraryNumber.parse: invalid pipe format", s);
            }

            return ArbitraryNumber._normalizeNew(c, e);
        }

        const n = Number(trimmed);
        if (!isFinite(n)) {
            throw new ArbitraryNumberInputError("ArbitraryNumber.parse: value is not finite", s);
        }

        return new ArbitraryNumber(n, 0);
    }

    // ── String coercion ────────────────────────────────────────────────────────

    /**
     * Allows implicit coercion via `+an(1500)` (returns `toNumber()`) and
     * template literals / string concatenation (returns `toString()`).
     */
    public [Symbol.toPrimitive](hint: string): number | string {
        return hint === "number" ? this.toNumber() : this.toString();
    }

    /** Custom Node.js inspect output so `console.log(an(1500))` renders `"1.50e+3"`. */
    public [Symbol.for("nodejs.util.inspect.custom")](): string {
        return this.toString();
    }

    /**
     * Formats this number as a string using the given notation plugin.
     *
     * Defaults to `scientificNotation` when no plugin is provided.
     * `decimals` controls decimal places and defaults to `defaults.notationDecimals`.
     */
    public toString(
        notation: NotationPlugin = scientificNotation,
        decimals = ArbitraryNumber.defaults.notationDecimals,
    ): string {
        return notation.format(this.coefficient, this.exponent, decimals);
    }
}

// ── FrozenArbitraryNumber ──────────────────────────────────────────────────────

import { ArbitraryNumberMutationError } from "../errors";

/**
 * An immutable wrapper around `ArbitraryNumber`.
 *
 * Created via `number.freeze()`. All mutating methods throw `ArbitraryNumberMutationError`.
 * Call `.clone()` to get a fresh, mutable `ArbitraryNumber`.
 *
 * @example
 * const frozen = gold.freeze();
 * frozen.add(drop);  // throws ArbitraryNumberMutationError
 * const mutable = frozen.clone(); // fresh mutable copy
 */
export class FrozenArbitraryNumber extends ArbitraryNumber {
    /** @internal */
    public constructor(coefficient: number, exponent: number) {
        super(0, 0);
        // bypass normalization — values come from a valid ArbitraryNumber
        this.coefficient = coefficient;
        this.exponent = exponent;
    }

    private _throwMutation(method: string): never {
        throw new ArbitraryNumberMutationError(
            `Cannot call mutating method '${method}' on a frozen ArbitraryNumber`,
        );
    }

    // Every public mutating method on ArbitraryNumber must have an override here.
    // If you add a new mutating method above, add a matching override below.
    public override add(_other: ArbitraryNumber): never { this._throwMutation("add"); }
    public override sub(_other: ArbitraryNumber): never { this._throwMutation("sub"); }
    public override mul(_other: ArbitraryNumber): never { this._throwMutation("mul"); }
    public override div(_other: ArbitraryNumber): never { this._throwMutation("div"); }
    public override negate(): never { this._throwMutation("negate"); }
    public override abs(): never { this._throwMutation("abs"); }
    public override pow(_n: number): never { this._throwMutation("pow"); }
    public override mulAdd(_m: ArbitraryNumber, _a: ArbitraryNumber): never { this._throwMutation("mulAdd"); }
    public override addMul(_a: ArbitraryNumber, _m: ArbitraryNumber): never { this._throwMutation("addMul"); }
    public override mulSub(_m: ArbitraryNumber, _s: ArbitraryNumber): never { this._throwMutation("mulSub"); }
    public override subMul(_s: ArbitraryNumber, _m: ArbitraryNumber): never { this._throwMutation("subMul"); }
    public override divAdd(_d: ArbitraryNumber, _a: ArbitraryNumber): never { this._throwMutation("divAdd"); }
    public override mulDiv(_m: ArbitraryNumber, _d: ArbitraryNumber): never { this._throwMutation("mulDiv"); }
    public override floor(): never { this._throwMutation("floor"); }
    public override ceil(): never { this._throwMutation("ceil"); }
    public override round(): never { this._throwMutation("round"); }
    public override trunc(): never { this._throwMutation("trunc"); }
    public override sqrt(): never { this._throwMutation("sqrt"); }
    public override cbrt(): never { this._throwMutation("cbrt"); }
}

// Replace bootstrap instances with proper FrozenArbitraryNumber singletons.
(ArbitraryNumber as unknown as Record<string, unknown>).Zero = new FrozenArbitraryNumber(0, 0);
(ArbitraryNumber as unknown as Record<string, unknown>).One  = new FrozenArbitraryNumber(1, 0);
(ArbitraryNumber as unknown as Record<string, unknown>).Ten  = new FrozenArbitraryNumber(1, 1);
