/**
 * Base class for all errors thrown by the arbitrary-numbers library.
 *
 * Catch this to handle any error from the library regardless of type.
 */
export class ArbitraryNumberError extends Error {
    public constructor(message: string) {
        super(message);
        this.name = "ArbitraryNumberError";
    }
}

/**
 * Thrown when invalid input is provided to a constructor or factory method.
 *
 * @example
 * try {
 *     ArbitraryNumber.from(Infinity);
 * } catch (e) {
 *     if (e instanceof ArbitraryNumberInputError) {
 *         console.log(e.value); // Infinity
 *     }
 * }
 */
export class ArbitraryNumberInputError extends ArbitraryNumberError {
    /** The invalid value that caused the error. */
    public readonly value: number | string;

    public constructor(message: string, value: number | string) {
        super(message);
        this.name = "ArbitraryNumberInputError";
        this.value = value;
    }
}

/**
 * Thrown when a mathematical operation is undefined for the given operands.
 *
 * @example
 * try {
 *     an(10).div(an(0));
 * } catch (e) {
 *     if (e instanceof ArbitraryNumberDomainError) {
 *         console.log(e.context); // { dividend: 10 }
 *     }
 * }
 */
export class ArbitraryNumberDomainError extends ArbitraryNumberError {
    /** The operands involved in the failed operation, as plain numbers. */
    public readonly context: Record<string, number>;

    public constructor(message: string, context: Record<string, number>) {
        super(message);
        this.name = "ArbitraryNumberDomainError";
        this.context = context;
    }
}
