import { scientificNotation } from "../plugin/ScientificNotation";
import { ScientificNotation } from "../types/core";
import { NotationPlugin } from "../types/plugin";
import { ArbitraryNumberArithmetic } from "../utility/ArbitraryNumberArithmetic";
import { ArbitraryNumberGuard } from "../utility/ArbitraryNumberGuard";

export class ArbitraryNumber implements ScientificNotation {
    public readonly coefficient: number;
    public readonly exponent: number;

    public static readonly PrecisionCutoff = 15;

    public static readonly Zero = new ArbitraryNumber(0, 0);
    public static readonly One = new ArbitraryNumber(1, 0);
    public static readonly Ten = new ArbitraryNumber(1, 1);

    public constructor(coefficient: number, exponent: number) {
        this.coefficient = coefficient;
        this.exponent = exponent;
    }

    public add(other: ArbitraryNumber): ArbitraryNumber {
        if (ArbitraryNumberGuard.isZero(this)) {
            return other;
        }

        if (ArbitraryNumberGuard.isZero(other)) {
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
        const normalized = ArbitraryNumberArithmetic.normalize(summed);
        return new ArbitraryNumber(normalized.coefficient, normalized.exponent);
    }

    public sub(other: ArbitraryNumber): ArbitraryNumber {
        return this.add(new ArbitraryNumber(-other.coefficient, other.exponent));
    }

    public mul(other: ArbitraryNumber): ArbitraryNumber {
        if (ArbitraryNumberGuard.isZero(this) || ArbitraryNumberGuard.isZero(other)) {
            return ArbitraryNumber.Zero;
        }

        const normalized = ArbitraryNumberArithmetic.normalize({
            coefficient: this.coefficient * other.coefficient,
            exponent: this.exponent + other.exponent,
        });

        return new ArbitraryNumber(normalized.coefficient, normalized.exponent);
    }

    public div(other: ArbitraryNumber): ArbitraryNumber {
        if (ArbitraryNumberGuard.isZero(other)) {
            throw new Error("Division by zero");
        }

        const normalized = ArbitraryNumberArithmetic.normalize({
            coefficient: this.coefficient / other.coefficient,
            exponent: this.exponent - other.exponent,
        });

        return new ArbitraryNumber(normalized.coefficient, normalized.exponent);
    }

    public pow(n: number): ArbitraryNumber {
        if (n === 0) {
            return ArbitraryNumber.One;
        }

        if (ArbitraryNumberGuard.isZero(this)) {
            return ArbitraryNumber.Zero;
        }

        const normalized = ArbitraryNumberArithmetic.normalize({
            coefficient: Math.pow(this.coefficient, n),
            exponent: this.exponent * n,
        });

        return new ArbitraryNumber(normalized.coefficient, normalized.exponent);
    }

    public compareTo(other: ArbitraryNumber): number {
        if (this.exponent !== other.exponent) {
            return this.exponent > other.exponent ? 1 : -1;
        }

        if (this.coefficient !== other.coefficient) {
            return this.coefficient > other.coefficient ? 1 : -1;
        }

        return 0;
    }

    public greaterThan(other: ArbitraryNumber): boolean {
        return this.compareTo(other) > 0;
    }

    public lessThan(other: ArbitraryNumber): boolean {
        return this.compareTo(other) < 0;
    }

    public equals(other: ArbitraryNumber): boolean {
        return this.compareTo(other) === 0;
    }

    public floor(): ArbitraryNumber {
        if (ArbitraryNumberGuard.isZero(this)) {
            return ArbitraryNumber.Zero;
        }

        if (this.exponent >= ArbitraryNumber.PrecisionCutoff) {
            return this;
        }

        if (this.exponent < 0) {
            return this.coefficient >= 0 ? ArbitraryNumber.Zero : new ArbitraryNumber(-1, 0);
        }

        const value = Math.floor(this.coefficient * (10 ** this.exponent));
        const normalized = ArbitraryNumberArithmetic.normalize({ coefficient: value, exponent: 0 });
        return new ArbitraryNumber(normalized.coefficient, normalized.exponent);
    }

    public ceil(): ArbitraryNumber {
        if (ArbitraryNumberGuard.isZero(this)) {
            return ArbitraryNumber.Zero;
        }

        if (this.exponent >= ArbitraryNumber.PrecisionCutoff) {
            return this;
        }

        if (this.exponent < 0) {
            return this.coefficient > 0 ? ArbitraryNumber.One : ArbitraryNumber.Zero;
        }

        const value = Math.ceil(this.coefficient * (10 ** this.exponent));
        const normalized = ArbitraryNumberArithmetic.normalize({ coefficient: value, exponent: 0 });
        return new ArbitraryNumber(normalized.coefficient, normalized.exponent);
    }

    public static clamp(value: ArbitraryNumber, min: ArbitraryNumber, max: ArbitraryNumber): ArbitraryNumber {
        if (value.lessThan(min)) return min;
        if (value.greaterThan(max)) return max;

        return value;
    }

    public log10(): number {
        if (ArbitraryNumberGuard.isZero(this)) {
            throw new Error("Logarithm of zero is undefined");
        }

        return Math.log10(this.coefficient) + this.exponent;
    }

    public toString(notation: NotationPlugin = scientificNotation): string {
        return notation.format(this.coefficient, this.exponent, ArbitraryNumber.PrecisionCutoff);
    }
}
