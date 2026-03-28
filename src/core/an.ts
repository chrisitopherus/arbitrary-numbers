import type { AnFunction } from "../types/core";
import { ArbitraryNumber } from "./ArbitraryNumber";

const createAn = ((coefficient: number, exponent = 0) =>
    new ArbitraryNumber(coefficient, exponent)) as AnFunction;

createAn.from = (value: number) => ArbitraryNumber.from(value);

export const an: AnFunction = createAn;
