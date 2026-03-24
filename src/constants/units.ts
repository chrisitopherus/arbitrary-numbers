import { Unit, UnitArray } from "../types/plugin";

/**
 * Full tier-indexed unit list from Thousand (tier 1, 10³) to Centillion (tier 101, 10³⁰³).
 *
 * Array index = tier = `Math.floor(exponent / 3)`. Tiers 34–100 are `undefined` —
 * numbers in that range fall through to whatever fallback is configured on the
 * {@link UnitNotation} instance (letterNotation for the pre-built `unitNotation`).
 *
 * @example
 * const notation = new UnitNotation({ units: CLASSIC_UNITS, separator: " " });
 * notation.format(1.5, 3, 2);  // "1.50 K"
 * notation.format(1.5, 6, 2);  // "1.50 M"
 */
export const CLASSIC_UNITS: UnitArray = (() => {
    const u: Array<Unit | undefined> = [
        undefined,                                         // tier  0: exponent  0–2  (no unit)
        { symbol: "K",    name: "Thousand" },             // tier  1: exponent  3
        { symbol: "M",    name: "Million" },              // tier  2: exponent  6
        { symbol: "B",    name: "Billion" },              // tier  3: exponent  9
        { symbol: "T",    name: "Trillion" },             // tier  4: exponent 12
        { symbol: "Qa",   name: "Quadrillion" },          // tier  5: exponent 15
        { symbol: "Qi",   name: "Quintillion" },          // tier  6: exponent 18
        { symbol: "Sx",   name: "Sextillion" },           // tier  7: exponent 21
        { symbol: "Sp",   name: "Septillion" },           // tier  8: exponent 24
        { symbol: "Oc",   name: "Octillion" },            // tier  9: exponent 27
        { symbol: "No",   name: "Nonillion" },            // tier 10: exponent 30
        { symbol: "Dc",   name: "Decillion" },            // tier 11: exponent 33
        { symbol: "UDc",  name: "Undecillion" },          // tier 12: exponent 36
        { symbol: "DDc",  name: "Duodecillion" },         // tier 13: exponent 39
        { symbol: "TDc",  name: "Tredecillion" },         // tier 14: exponent 42
        { symbol: "QaDc", name: "Quattuordecillion" },    // tier 15: exponent 45
        { symbol: "QiDc", name: "Quindecillion" },        // tier 16: exponent 48
        { symbol: "SxDc", name: "Sexdecillion" },         // tier 17: exponent 51
        { symbol: "SpDc", name: "Septendecillion" },      // tier 18: exponent 54
        { symbol: "OcDc", name: "Octodecillion" },        // tier 19: exponent 57
        { symbol: "NoDc", name: "Novemdecillion" },       // tier 20: exponent 60
        { symbol: "Vg",   name: "Vigintillion" },         // tier 21: exponent 63
        { symbol: "UVg",  name: "Unvigintillion" },       // tier 22: exponent 66
        { symbol: "DVg",  name: "Duovigintillion" },      // tier 23: exponent 69
        { symbol: "TVg",  name: "Trevigintillion" },      // tier 24: exponent 72
        { symbol: "QaVg", name: "Quattuorvigintillion" }, // tier 25: exponent 75
        { symbol: "QiVg", name: "Quinvigintillion" },     // tier 26: exponent 78
        { symbol: "SxVg", name: "Sexvigintillion" },      // tier 27: exponent 81
        { symbol: "SpVg", name: "Septenvigintillion" },   // tier 28: exponent 84
        { symbol: "OcVg", name: "Octovigintillion" },     // tier 29: exponent 87
        { symbol: "NoVg", name: "Novemvigintillion" },    // tier 30: exponent 90
        { symbol: "Tg",   name: "Trigintillion" },        // tier 31: exponent 93
        { symbol: "UTg",  name: "Untrigintillion" },      // tier 32: exponent 96
        { symbol: "DTg",  name: "Duotrigintillion" },     // tier 33: exponent 99
        // tiers 34–100: undefined — fallback fires for these exponents
    ];
    u[101] = { symbol: "Ct", name: "Centillion" };        // tier 101: exponent 303
    return Object.freeze(u);
})();

/**
 * Compact tier-indexed unit list from Thousand (tier 1, 10³) to Nonillion (tier 10, 10³⁰).
 *
 * Intended for tight UI spaces. Tiers beyond 10 (exponent > 32) fall back to whatever
 * fallback plugin is configured on the {@link UnitNotation} instance.
 *
 * @example
 * const notation = new UnitNotation({ units: COMPACT_UNITS, fallback: letterNotation, separator: " " });
 * notation.format(1.5, 3, 2);  // "1.50 k"
 * notation.format(1.5, 6, 2);  // "1.50 M"
 */
export const COMPACT_UNITS: UnitArray = Object.freeze([
    undefined,           // tier  0: exponent 0–2  (no unit)
    { symbol: "k" },    // tier  1: exponent  3
    { symbol: "M" },    // tier  2: exponent  6
    { symbol: "B" },    // tier  3: exponent  9
    { symbol: "T" },    // tier  4: exponent 12
    { symbol: "Qa" },   // tier  5: exponent 15
    { symbol: "Qi" },   // tier  6: exponent 18
    { symbol: "Sx" },   // tier  7: exponent 21
    { symbol: "Sp" },   // tier  8: exponent 24
    { symbol: "Oc" },   // tier  9: exponent 27
    { symbol: "No" },   // tier 10: exponent 30
]);
