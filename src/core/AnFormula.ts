import { ArbitraryNumber } from "./ArbitraryNumber";
import { type Maybe } from "../types/utility";

type FormulaStep = (value: ArbitraryNumber) => void;

/**
 * A reusable, named pipeline of `ArbitraryNumber` operations.
 *
 * `AnFormula` stores operations as closures and runs them on `.apply()` or `.applyInPlace()`.
 * The same formula can be applied to any number of values without re-defining the pipeline.
 *
 * Each builder method returns a **new** `AnFormula` — the original is unchanged.
 *
 * @example
 * const armorReduction = formula("Armor Reduction")
 *     .subMul(armor, an(0.75))
 *     .floor();
 *
 * const physDamage = armorReduction.apply(physBase);   // physBase unchanged
 * armorReduction.applyInPlace(enemyAtk);               // enemyAtk mutated
 *
 * @example
 * // Compose formulas
 * const critBonus = formula("Crit Bonus").mul(critMult).ceil();
 * const full      = armorReduction.then(critBonus);
 * const result    = full.apply(baseDamage);
 */
class AnFormula {
    private readonly _name: Maybe<string>;
    private readonly steps: ReadonlyArray<FormulaStep>;

    /** Prefer the {@link formula} factory function over calling this directly. */
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
     */
    public named(name: string): AnFormula {
        return new AnFormula(name, this.steps);
    }

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

    // ── Fused ─────────────────────────────────────────────────────────────────

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
    /** Appends `negate()` to the pipeline. */
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
     */
    public then(next: AnFormula): AnFormula {
        return new AnFormula(this._name, [...this.steps, ...next.steps]);
    }

    // ── Terminal ──────────────────────────────────────────────────────────────

    /**
     * Clones `value` once, runs the pipeline against the clone, and returns it.
     *
     * The original `value` is never mutated.
     *
     * @example
     * const damage = damageFormula.apply(playerAtk); // playerAtk unchanged
     */
    public apply(value: ArbitraryNumber | number): ArbitraryNumber {
        const result: ArbitraryNumber = value instanceof ArbitraryNumber
            ? value.clone()
            : ArbitraryNumber.from(value);

        for (const step of this.steps) {
            step(result);
        }

        return result;
    }

    /**
     * Runs the pipeline directly against `value`, mutating it in-place.
     *
     * Use on hot paths where you don't need to preserve the original value.
     *
     * @example
     * damageFormula.applyInPlace(enemyAtk); // enemyAtk is mutated
     */
    public applyInPlace(value: ArbitraryNumber): void {
        for (const step of this.steps) {
            step(value);
        }
    }
}

/**
 * Creates an {@link AnFormula} pipeline, optionally named.
 *
 * Build the pipeline by chaining methods — each returns a new `AnFormula`.
 * Call {@link AnFormula.apply} or {@link AnFormula.applyInPlace} to run it.
 *
 * @example
 * import { formula, an } from 'arbitrary-numbers';
 *
 * const armorReduction = formula("Armor Reduction")
 *     .subMul(armor, an(0.75))
 *     .floor();
 *
 * const physDmg = armorReduction.apply(physBase);
 * armorReduction.applyInPlace(tempValue);
 */
function formula(name?: Maybe<string>): AnFormula {
    return new AnFormula(name, []);
}

export { AnFormula, formula };
