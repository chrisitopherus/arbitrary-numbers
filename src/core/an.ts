import { ArbitraryNumber } from "./ArbitraryNumber";

/**
 * Type of the {@link an} shorthand function.
 *
 * Callable as `an(coefficient, exponent?)` and also has a
 * `.from(value)` static method for plain JS number conversion.
 */
export interface AnFunction {
    (coefficient: number, exponent?: number): ArbitraryNumber;
    from(value: number): ArbitraryNumber;
}

const create = ((coefficient: number, exponent = 0) =>
    new ArbitraryNumber(coefficient, exponent)) as AnFunction;

create.from = (value: number) => ArbitraryNumber.from(value);

export const an: AnFunction = create;
