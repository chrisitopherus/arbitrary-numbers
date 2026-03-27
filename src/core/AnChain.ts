import { ArbitraryNumber } from "./ArbitraryNumber";

/**
 * Fluent builder for multi-step `ArbitraryNumber` expressions.
 *
 * Each method mutates the accumulated value in-place and returns `this`,
 * enabling a readable left-to-right pipeline with no expression-tree
 * overhead.  Every step delegates directly to the underlying
 * `ArbitraryNumber` method — fused variants (`mulAdd`, `mulSub`, etc.)
 * are available here too.
 *
 * @example
 * // Damage formula: ((base - armour) × mult) + flatBonus
 * const result = chain(base)
 *     .subMul(armour, multiplier)
 *     .add(flatBonus)
 *     .done();
 *
 * @remarks
 * No deferred execution — each call runs immediately.  Overhead vs direct
 * method chaining is a single extra method call + `return this` per step
 * (~1–2 ns).  Use fused ops for hot inner loops; the builder is optimised
 * for readability in complex multi-step formulas.
 */
export class AnChain {
    private value: ArbitraryNumber;

    private constructor(start: ArbitraryNumber) {
        this.value = start;
    }

    // ── Construction ────────────────────────────────────────────────────

    public static from(value: ArbitraryNumber | number | string): AnChain {
        if (value instanceof ArbitraryNumber) return new AnChain(value);
        if (typeof value === "number")  return new AnChain(ArbitraryNumber.from(value));

        return new AnChain(ArbitraryNumber.from(parseFloat(value)));
    }

    // ── Arithmetic ───────────────────────────────────────────────────────

    public add(other: ArbitraryNumber): this { this.value = this.value.add(other); return this; }
    public sub(other: ArbitraryNumber): this { this.value = this.value.sub(other); return this; }
    public mul(other: ArbitraryNumber): this { this.value = this.value.mul(other); return this; }
    public div(other: ArbitraryNumber): this { this.value = this.value.div(other); return this; }
    public pow(exp: number):            this { this.value = this.value.pow(exp);   return this; }

    // ── Fused (avoids one intermediate allocation per call) ──────────────

    /** `(this × mult) + add` */
    public mulAdd(mult: ArbitraryNumber, add: ArbitraryNumber):  this { this.value = this.value.mulAdd(mult, add);  return this; }
    /** `(this + add) × mult` */
    public addMul(add: ArbitraryNumber,  mult: ArbitraryNumber): this { this.value = this.value.addMul(add, mult);  return this; }
    /** `(this × mult) − sub` */
    public mulSub(mult: ArbitraryNumber, sub: ArbitraryNumber):  this { this.value = this.value.mulSub(mult, sub);  return this; }
    /** `(this − sub) × mult` */
    public subMul(sub: ArbitraryNumber,  mult: ArbitraryNumber): this { this.value = this.value.subMul(sub, mult);  return this; }
    /** `(this ÷ div) + add` */
    public divAdd(div: ArbitraryNumber,  add: ArbitraryNumber):  this { this.value = this.value.divAdd(div, add);   return this; }

    // ── Unary ────────────────────────────────────────────────────────────

    public abs():   this { this.value = this.value.abs();    return this; }
    public neg():   this { this.value = this.value.negate(); return this; }
    public sqrt():  this { this.value = this.value.sqrt();   return this; }
    public floor(): this { this.value = this.value.floor();  return this; }
    public ceil():  this { this.value = this.value.ceil();   return this; }
    public round(): this { this.value = this.value.round();  return this; }

    // ── Terminal ─────────────────────────────────────────────────────────

    /** Returns the accumulated `ArbitraryNumber` result. */
    public done(): ArbitraryNumber { return this.value; }
}

/**
 * Creates an {@link AnChain} builder starting from `value`.
 *
 * Mirrors the `an` factory shorthand.
 *
 * @example
 * import { chain, an } from 'arbitrary-numbers';
 *
 * const result = chain(an(1.5, 6))
 *     .mulAdd(multiplier, bonus)
 *     .floor()
 *     .done();
 */
export function chain(value: ArbitraryNumber | number | string): AnChain {
    return AnChain.from(value);
}
