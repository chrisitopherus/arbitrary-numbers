import { UnitNotationOptions } from "../types/plugin";
import { SuffixNotationBase } from "./SuffixNotationBase";

export class UnitNotation extends SuffixNotationBase {
    private readonly options: UnitNotationOptions;
    public constructor(options: UnitNotationOptions) {
        super();
        this.options = options;
    }

    public override getSuffix(exponent: number): string {
        throw new Error("Method not implemented.");
    }

    public override format(coefficient: number, exponent: number, decimals: number): string {
        return `${coefficient.toFixed(decimals)}`;
    }
}

