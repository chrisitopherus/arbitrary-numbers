import { scientificNotation } from "../plugin/ScientificNotation";
import { ScientificNotation } from "../types/core";
import { NotationPlugin } from "../types/plugin";
import { ArbitraryNumberArithmetic } from "../utility/ArbitraryNumberArithmetic";

export class ArbitraryNumber implements ScientificNotation {
    public readonly coefficient: number;
    public readonly exponent: number;

    public static readonly PrecisionCutoff = 15;

    public static readonly Zero = new ArbitraryNumber(0, 0);
    public static readonly One = new ArbitraryNumber(1, 0);
    public static readonly Ten = new ArbitraryNumber(1, 1);

    public constructor(coefficient: number, exponent: number) {
        const normalized = ArbitraryNumberArithmetic.normalize({ coefficient, exponent });
        this.coefficient = normalized.coefficient;
        this.exponent = normalized.exponent;
    }

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

    public sub(other: ArbitraryNumber): ArbitraryNumber {
        return this.add(new ArbitraryNumber(-other.coefficient, other.exponent));
    }

    public mul(other: ArbitraryNumber): ArbitraryNumber {
        if (this.coefficient === 0 || other.coefficient === 0) {
            return ArbitraryNumber.Zero;
        }

        return new ArbitraryNumber(
            this.coefficient * other.coefficient,
            this.exponent + other.exponent,
        );
    }

    public div(other: ArbitraryNumber): ArbitraryNumber {
        if (other.coefficient === 0) {
            throw new Error("Division by zero");
        }

        return new ArbitraryNumber(
            this.coefficient / other.coefficient,
            this.exponent - other.exponent,
        );
    }

    public pow(n: number): ArbitraryNumber {
        if (n === 0) {
            return ArbitraryNumber.One;
        }

        if (this.coefficient === 0) {
            return ArbitraryNumber.Zero;
        }

        return new ArbitraryNumber(
            Math.pow(this.coefficient, n),
            this.exponent * n,
        );
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

    public static clamp(value: ArbitraryNumber, min: ArbitraryNumber, max: ArbitraryNumber): ArbitraryNumber {
        if (value.lessThan(min)) return min;
        if (value.greaterThan(max)) return max;

        return value;
    }

    public log10(): number {
        if (this.coefficient === 0) {
            throw new Error("Logarithm of zero is undefined");
        }

        return Math.log10(this.coefficient) + this.exponent;
    }

    public toString(notation: NotationPlugin = scientificNotation): string {
        return notation.format(this.coefficient, this.exponent, ArbitraryNumber.PrecisionCutoff);
    }
}
