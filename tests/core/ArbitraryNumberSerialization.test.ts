import { describe, it, expect } from "vitest";
import { ArbitraryNumber } from "../../src/core/ArbitraryNumber";
import { ArbitraryNumberInputError } from "../../src/errors";

const raw = (c: number, e: number) => new ArbitraryNumber(c, e);
const num = (v: number) => ArbitraryNumber.from(v);

// ---------------------------------------------------------------------------
// toJSON / fromJSON
// ---------------------------------------------------------------------------

describe("toJSON", () => {
    it("returns { c, e } with normalised values", () => {
        const n = raw(1.5, 6);
        expect(n.toJSON()).toEqual({ c: 1.5, e: 6 });
    });

    it("zero serialises to { c: 0, e: 0 }", () => {
        expect(ArbitraryNumber.Zero.toJSON()).toEqual({ c: 0, e: 0 });
    });

    it("negative coefficient serialises correctly", () => {
        expect(raw(-2.5, 3).toJSON()).toEqual({ c: -2.5, e: 3 });
    });

    it("negative exponent serialises correctly", () => {
        expect(raw(1.5, -3).toJSON()).toEqual({ c: 1.5, e: -3 });
    });

    it("One serialises to { c: 1, e: 0 }", () => {
        expect(ArbitraryNumber.One.toJSON()).toEqual({ c: 1, e: 0 });
    });

    it("large exponent: 1e300", () => {
        expect(raw(1.0, 300).toJSON()).toEqual({ c: 1, e: 300 });
    });

    it("JSON.stringify produces compact { c, e } output", () => {
        expect(JSON.stringify(raw(1.5, 6))).toBe("{\"c\":1.5,\"e\":6}");
    });
});

describe("fromJSON", () => {
    it("reconstructs a basic value", () => {
        expect(ArbitraryNumber.fromJSON({ c: 1.5, e: 6 }).equals(raw(1.5, 6))).toBe(true);
    });

    it("reconstructs zero", () => {
        expect(ArbitraryNumber.fromJSON({ c: 0, e: 0 }).equals(ArbitraryNumber.Zero)).toBe(true);
    });

    it("reconstructs negative coefficient", () => {
        const n = raw(-2.5, 3);
        expect(ArbitraryNumber.fromJSON(n.toJSON()).equals(n)).toBe(true);
    });

    it("reconstructs negative exponent", () => {
        const n = raw(1.5, -3);
        expect(ArbitraryNumber.fromJSON(n.toJSON()).equals(n)).toBe(true);
    });

    it("accepts externally-constructed un-normalised blob", () => {
        // coefficient=15, exponent=2 → normalises to 1.5e+3
        const n = ArbitraryNumber.fromJSON({ c: 15, e: 2 });
        expect(n.coefficient).toBeCloseTo(1.5, 10);
        expect(n.exponent).toBe(3);
    });

    it("throws for null", () => {
        expect(() => ArbitraryNumber.fromJSON(null)).toThrow(ArbitraryNumberInputError);
    });

    it("throws for missing c", () => {
        expect(() => ArbitraryNumber.fromJSON({ e: 3 })).toThrow(ArbitraryNumberInputError);
    });

    it("throws for missing e", () => {
        expect(() => ArbitraryNumber.fromJSON({ c: 1.5 })).toThrow(ArbitraryNumberInputError);
    });

    it("throws for non-numeric c", () => {
        expect(() => ArbitraryNumber.fromJSON({ c: "1.5", e: 3 })).toThrow(ArbitraryNumberInputError);
    });

    it("throws for non-numeric e", () => {
        expect(() => ArbitraryNumber.fromJSON({ c: 1.5, e: "3" })).toThrow(ArbitraryNumberInputError);
    });

    it("throws for Infinity c", () => {
        expect(() => ArbitraryNumber.fromJSON({ c: Infinity, e: 3 })).toThrow(ArbitraryNumberInputError);
    });

    it("throws for NaN c", () => {
        expect(() => ArbitraryNumber.fromJSON({ c: NaN, e: 3 })).toThrow(ArbitraryNumberInputError);
    });

    it("throws for NaN e", () => {
        expect(() => ArbitraryNumber.fromJSON({ c: 1.5, e: NaN })).toThrow(ArbitraryNumberInputError);
    });

    it("throws for non-object input", () => {
        expect(() => ArbitraryNumber.fromJSON("1.5|3")).toThrow(ArbitraryNumberInputError);
        expect(() => ArbitraryNumber.fromJSON(42)).toThrow(ArbitraryNumberInputError);
        expect(() => ArbitraryNumber.fromJSON(undefined)).toThrow(ArbitraryNumberInputError);
    });
});

describe("toJSON / fromJSON round-trip", () => {
    const cases: Array<[string, ArbitraryNumber]> = [
        ["zero", ArbitraryNumber.Zero],
        ["one", ArbitraryNumber.One],
        ["ten", ArbitraryNumber.Ten],
        ["positive large", raw(1.5, 6)],
        ["negative coeff", raw(-2.5, 3)],
        ["negative exp", raw(1.5, -6)],
        ["both negative", raw(-1.5, -6)],
        ["very large exp", raw(1.234567, 300)],
        ["very negative exp", raw(9.999, -300)],
        ["coefficient near 1", raw(1.0000001, 10)],
        ["coefficient near 9.9", raw(9.9999, 0)],
        ["from plain number 1500", num(1500)],
        ["from plain number 0.005", num(0.005)],
    ];

    for (const [label, n] of cases) {
        it(`round-trips: ${label}`, () => {
            const restored = ArbitraryNumber.fromJSON(n.toJSON());
            expect(restored.equals(n)).toBe(true);
        });
    }

    it("round-trip via JSON.stringify + JSON.parse", () => {
        const n = raw(1.5, 6);
        const restored = ArbitraryNumber.fromJSON(JSON.parse(JSON.stringify(n)));
        expect(restored.equals(n)).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// toRawString / parse (pipe format)
// ---------------------------------------------------------------------------

describe("toRawString", () => {
    it("produces 'coefficient|exponent' string", () => {
        expect(raw(1.5, 3).toRawString()).toBe("1.5|3");
    });

    it("zero", () => {
        expect(ArbitraryNumber.Zero.toRawString()).toBe("0|0");
    });

    it("negative coefficient", () => {
        expect(raw(-2.5, 6).toRawString()).toBe("-2.5|6");
    });

    it("negative exponent", () => {
        expect(raw(1.5, -3).toRawString()).toBe("1.5|-3");
    });

    it("both negative", () => {
        expect(raw(-1.5, -3).toRawString()).toBe("-1.5|-3");
    });
});

describe("parse", () => {
    describe("pipe format", () => {
        it("parses '1.5|3'", () => {
            expect(ArbitraryNumber.parse("1.5|3").equals(raw(1.5, 3))).toBe(true);
        });

        it("parses '-2.5|6'", () => {
            expect(ArbitraryNumber.parse("-2.5|6").equals(raw(-2.5, 6))).toBe(true);
        });

        it("parses '1.5|-3'", () => {
            expect(ArbitraryNumber.parse("1.5|-3").equals(raw(1.5, -3))).toBe(true);
        });

        it("parses '-1.5|-3'", () => {
            expect(ArbitraryNumber.parse("-1.5|-3").equals(raw(-1.5, -3))).toBe(true);
        });

        it("parses '0|0'", () => {
            expect(ArbitraryNumber.parse("0|0").equals(ArbitraryNumber.Zero)).toBe(true);
        });

        it("throws for malformed pipe '|'", () => {
            expect(() => ArbitraryNumber.parse("|")).toThrow(ArbitraryNumberInputError);
        });

        it("throws for pipe with non-numeric coefficient 'abc|3'", () => {
            expect(() => ArbitraryNumber.parse("abc|3")).toThrow(ArbitraryNumberInputError);
        });

        it("throws for pipe with non-numeric exponent '1.5|abc'", () => {
            expect(() => ArbitraryNumber.parse("1.5|abc")).toThrow(ArbitraryNumberInputError);
        });
    });

    describe("scientific notation strings", () => {
        it("parses '1.5e+3'", () => {
            const n = ArbitraryNumber.parse("1.5e+3");
            expect(n.coefficient).toBeCloseTo(1.5, 10);
            expect(n.exponent).toBe(3);
        });

        it("parses '1.5e-3'", () => {
            const n = ArbitraryNumber.parse("1.5e-3");
            expect(n.coefficient).toBeCloseTo(1.5, 10);
            expect(n.exponent).toBe(-3);
        });

        it("parses '1.5E3' (uppercase E)", () => {
            const n = ArbitraryNumber.parse("1.5E3");
            expect(n.coefficient).toBeCloseTo(1.5, 10);
            expect(n.exponent).toBe(3);
        });

        it("parses '1.5e3' (no sign)", () => {
            const n = ArbitraryNumber.parse("1.5e3");
            expect(n.coefficient).toBeCloseTo(1.5, 10);
            expect(n.exponent).toBe(3);
        });
    });

    describe("plain decimal strings", () => {
        it("parses '1500'", () => {
            const n = ArbitraryNumber.parse("1500");
            expect(n.coefficient).toBeCloseTo(1.5, 10);
            expect(n.exponent).toBe(3);
        });

        it("parses '0'", () => {
            expect(ArbitraryNumber.parse("0").equals(ArbitraryNumber.Zero)).toBe(true);
        });

        it("parses '-0.003'", () => {
            const n = ArbitraryNumber.parse("-0.003");
            expect(n.coefficient).toBeCloseTo(-3.0, 10);
            expect(n.exponent).toBe(-3);
        });

        it("parses '  1500  ' with whitespace", () => {
            const n = ArbitraryNumber.parse("  1500  ");
            expect(n.coefficient).toBeCloseTo(1.5, 10);
        });
    });

    describe("error cases", () => {
        it("throws for empty string", () => {
            expect(() => ArbitraryNumber.parse("")).toThrow(ArbitraryNumberInputError);
        });

        it("throws for whitespace-only string", () => {
            expect(() => ArbitraryNumber.parse("   ")).toThrow(ArbitraryNumberInputError);
        });

        it("throws for 'Infinity'", () => {
            expect(() => ArbitraryNumber.parse("Infinity")).toThrow(ArbitraryNumberInputError);
        });

        it("throws for 'NaN'", () => {
            expect(() => ArbitraryNumber.parse("NaN")).toThrow(ArbitraryNumberInputError);
        });

        it("throws for random text 'hello'", () => {
            expect(() => ArbitraryNumber.parse("hello")).toThrow(ArbitraryNumberInputError);
        });
    });
});

describe("toRaw / parse round-trip", () => {
    const cases: Array<[string, ArbitraryNumber]> = [
        ["zero", ArbitraryNumber.Zero],
        ["one", ArbitraryNumber.One],
        ["positive", raw(1.5, 6)],
        ["negative coeff", raw(-2.5, 3)],
        ["negative exp", raw(1.5, -6)],
        ["both negative", raw(-1.5, -6)],
        ["large exp", raw(1.234567, 300)],
    ];

    for (const [label, n] of cases) {
        it(`round-trips: ${label}`, () => {
            const restored = ArbitraryNumber.parse(n.toRawString());
            expect(restored.equals(n)).toBe(true);
        });
    }
});

// ---------------------------------------------------------------------------
// Symbol.toPrimitive / inspect
// ---------------------------------------------------------------------------

describe("Symbol.toPrimitive", () => {
    it("number hint returns toNumber()", () => {
        const n = raw(1.5, 3);
        expect(n[Symbol.toPrimitive]("number")).toBe(1500);
    });

    it("string hint returns toString()", () => {
        const n = raw(1.5, 3);
        expect(n[Symbol.toPrimitive]("string")).toBe("1.50e+3");
    });

    it("default hint returns toString()", () => {
        const n = raw(1.5, 3);
        expect(n[Symbol.toPrimitive]("default")).toBe("1.50e+3");
    });

    it("+n coerces to toNumber()", () => {
        const n = raw(1.5, 3);
        expect(+n).toBe(1500);
    });

    it("template literal uses string representation", () => {
        const n = raw(1.5, 3);
        expect(`${n}`).toBe("1.50e+3");
    });

    it("zero coerces correctly", () => {
        expect(+ArbitraryNumber.Zero).toBe(0);
    });
});

describe("nodejs.util.inspect.custom", () => {
    const INSPECT = Symbol.for("nodejs.util.inspect.custom");

    it("returns the toString() representation", () => {
        const n = raw(1.5, 3);
        const inspectFn = (n as unknown as Record<symbol, (() => string) | undefined>)[INSPECT]!;
        expect(inspectFn.call(n)).toBe("1.50e+3");
    });

    it("zero renders as '0.00'", () => {
        const zero = ArbitraryNumber.Zero;
        const inspectFn = (zero as unknown as Record<symbol, (() => string) | undefined>)[INSPECT]!;
        expect(inspectFn.call(zero)).toBe("0.00");
    });
});
