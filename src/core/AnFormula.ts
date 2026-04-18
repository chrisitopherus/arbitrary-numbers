import { ArbitraryNumber } from "./ArbitraryNumber";
import { type Maybe } from "../types/utility";

type FormulaStep = (value: ArbitraryNumber) => ArbitraryNumber;

/**
 * A reusable, named pipeline of `ArbitraryNumber` operations.
 *
 * Unlike {@link AnChain}, which executes each step immediately against an
 * accumulated value, `AnFormula` stores the operations as a list of closures
 * and runs them only when {@link apply} is called.  The same formula can be
 * applied to any number of values without re-defining the pipeline.
 *
 * Each builder method returns a **new** `AnFormula` - the original is
 * unchanged.  This makes branching and composition safe:
 *
 * @example
 * const base      = formula().mul(an(2));
 * const withFloor = base.floor();   // new formula - base is unchanged
 * const withCeil  = base.ceil();    // another branch from base
 *
 * @example
 * // Define once, apply to many values
 * const armorReduction = formula("Armor Reduction")
 *     .subMul(armor, an(0.75))
 *     .floor();
 *
 * const physDamage = armorReduction.apply(physBase);
 * const magDamage  = armorReduction.apply(magBase);
 *
 * @example
 * // Compose formulas
 * const critBonus = formula("Crit Bonus").mul(critMult).ceil();
 * const full      = armorReduction.then(critBonus);
 * const result    = full.apply(baseDamage);
 */
export class AnFormula {
    private readonly _name: Maybe<string>;
    private readonly steps: ReadonlyArray<FormulaStep>;

    /**
     * Prefer the {@link formula} factory function over calling this directly.
     */
    public constructor(name?: Maybe<string>, steps: ReadonlyArray<FormulaStep> = []) {
        this._name = name;
        this.steps = steps;
    }

    /** The name passed to {@link formula}, if any. */
    public get name(): Maybe<string> {
        return this._name;
    }

    /**
     * Returns a copy of this formula with a new name, leaving the original unchanged.
     *
     * @param name - The new name.
     * @example
     * const base  = formula().mul(an(2));
     * const named = base.named("Double");
     * named.name   // "Double"
     * base.name    // undefined
     */
    public named(name: string): AnFormula {
        return new AnFormula(name, this.steps);
    }

    // ── Private helper ────────────────────────────────────────────────────────

    private step(fn: FormulaStep): AnFormula {
        return new AnFormula(this._name, [...this.steps, fn]);
    }

    // ── Arithmetic ────────────────────────────────────────────────────────────

    /** Appends `+ other` to the pipeline. */
    public add(other: ArbitraryNumber): AnFormula { return this.step(v => v.add(other)); }
    /** Appends `- other` to the pipeline. */
    public sub(other: ArbitraryNumber): AnFormula { return this.step(v => v.sub(other)); }
    /** Appends `* other` to the pipeline. */
    public mul(other: ArbitraryNumber): AnFormula { return this.step(v => v.mul(other)); }
    /** Appends `/ other` to the pipeline. */
    public div(other: ArbitraryNumber): AnFormula { return this.step(v => v.div(other)); }
    /** Appends `^ exp` to the pipeline. */
    public pow(exp: number): AnFormula { return this.step(v => v.pow(exp)); }

    // ── Fused (avoids one intermediate allocation per call) ───────────────────

    /** Appends `(value * mult) + add` to the pipeline. */
    public mulAdd(mult: ArbitraryNumber, add: ArbitraryNumber): AnFormula { return this.step(v => v.mulAdd(mult, add)); }
    /** Appends `(value + add) * mult` to the pipeline. */
    public addMul(add: ArbitraryNumber, mult: ArbitraryNumber): AnFormula { return this.step(v => v.addMul(add, mult)); }
    /** Appends `(value * mult) - sub` to the pipeline. */
    public mulSub(mult: ArbitraryNumber, sub: ArbitraryNumber): AnFormula { return this.step(v => v.mulSub(mult, sub)); }
    /** Appends `(value - sub) * mult` to the pipeline. */
    public subMul(sub: ArbitraryNumber, mult: ArbitraryNumber): AnFormula { return this.step(v => v.subMul(sub, mult)); }
    /** Appends `(value / div) + add` to the pipeline. */
    public divAdd(div: ArbitraryNumber, add: ArbitraryNumber): AnFormula { return this.step(v => v.divAdd(div, add)); }

    // ── Unary ─────────────────────────────────────────────────────────────────

    /** Appends `abs()` to the pipeline. */
    public abs(): AnFormula { return this.step(v => v.abs()); }
    /** Appends `neg()` to the pipeline. */
    public neg(): AnFormula { return this.step(v => v.negate()); }
    /** Appends `sqrt()` to the pipeline. */
    public sqrt(): AnFormula { return this.step(v => v.sqrt()); }
    /** Appends `floor()` to the pipeline. */
    public floor(): AnFormula { return this.step(v => v.floor()); }
    /** Appends `ceil()` to the pipeline. */
    public ceil(): AnFormula { return this.step(v => v.ceil()); }
    /** Appends `round()` to the pipeline. */
    public round(): AnFormula { return this.step(v => v.round()); }

    // ── Composition ───────────────────────────────────────────────────────────

    /**
     * Returns a new formula that first applies `this`, then applies `next`.
     *
     * Neither operand is mutated.
     *
     * @param next - The formula to apply after `this`.
     * @example
     * const full   = armorReduction.then(critBonus);
     * const result = full.apply(baseDamage);
     */
    public then(next: AnFormula): AnFormula {
        return new AnFormula(this._name, [...this.steps, ...next.steps]);
    }

    // ── Terminal ──────────────────────────────────────────────────────────────

    /**
     * Runs this formula's pipeline against `value` and returns the result.
     *
     * The formula itself is unchanged - call `apply` as many times as needed.
     *
     * @param value - The starting value. Plain `number` is coerced via `ArbitraryNumber.from`.
     * @throws `"ArbitraryNumber.from: value must be finite"` when a plain `number` is non-finite.
     * @example
     * const damage = damageFormula.apply(baseDamage);
     * const scaled = damageFormula.apply(boostedBase);
     */
    public apply(value: ArbitraryNumber | number): ArbitraryNumber {
        let result: ArbitraryNumber = value instanceof ArbitraryNumber
            ? value
            : ArbitraryNumber.from(value);

        for (const step of this.steps) {
            result = step(result);
        }

        return result;
    }
}

/**
 * Creates an {@link AnFormula} pipeline, optionally named.
 *
 * Build the pipeline by chaining methods - each returns a new `AnFormula`
 * so the original is always safe to branch or reuse.  Call {@link AnFormula.apply}
 * to run the pipeline against a value.
 *
 * @param name - Optional label, available via {@link AnFormula.name} for debugging.
 * @example
 * import { formula, an } from 'arbitrary-numbers';
 *
 * const armorReduction = formula("Armor Reduction")
 *     .subMul(armor, an(0.75))   // (base - armor) * 0.75
 *     .floor();
 *
 * const critBonus = formula("Crit Bonus").mul(critMult).ceil();
 *
 * // Reuse across many values
 * const physDmg = armorReduction.apply(physBase);
 * const magDmg  = armorReduction.apply(magBase);
 *
 * // Compose
 * const full   = armorReduction.then(critBonus);
 * const result = full.apply(baseDamage);
 */
export function formula(name?: Maybe<string>): AnFormula {
    return new AnFormula(name, []);
}
