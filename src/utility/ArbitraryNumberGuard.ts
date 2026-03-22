import { ArbitraryNumber } from "../core/ArbitraryNumber";
import { ScientificNotation } from "../types/core";

export class ArbitraryNumberGuard {
    public static isArbitraryNumber(obj: unknown): obj is ArbitraryNumber {
        return obj instanceof ArbitraryNumber;
    }

    public static isScientificNotation(obj: unknown): obj is ScientificNotation {
        return obj !== undefined
            && typeof (obj as ScientificNotation)?.coefficient === "number"
            && typeof (obj as ScientificNotation)?.exponent === "number";
    }

    public static isZero(obj: unknown): boolean{
        return ArbitraryNumberGuard.isArbitraryNumber(obj) && obj.coefficient === 0;
    }
}