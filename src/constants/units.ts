import { Unit } from "../types/plugin";

/**
 * Full named unit list from Thousand (10³) to Centillion (10³⁰³).
 *
 * Intended for use with {@link UnitNotation} when human-readable long-form names matter.
 *
 * @example
 * const notation = new UnitNotation({ units: CLASSIC_UNITS });
 */
export const CLASSIC_UNITS: ReadonlyArray<Unit> = [
    { exponent: 3, symbol: "K", name: "Thousand" },
    { exponent: 6, symbol: "M", name: "Million" },
    { exponent: 9, symbol: "B", name: "Billion" },
    { exponent: 12, symbol: "T", name: "Trillion" },
    { exponent: 15, symbol: "Qa", name: "Quadrillion" },
    { exponent: 18, symbol: "Qi", name: "Quintillion" },
    { exponent: 21, symbol: "Sx", name: "Sextillion" },
    { exponent: 24, symbol: "Sp", name: "Septillion" },
    { exponent: 27, symbol: "Oc", name: "Octillion" },
    { exponent: 30, symbol: "No", name: "Nonillion" },
    { exponent: 33, symbol: "Dc", name: "Decillion" },
    { exponent: 36, symbol: "UDc", name: "Undecillion" },
    { exponent: 39, symbol: "DDc", name: "Duodecillion" },
    { exponent: 42, symbol: "TDc", name: "Tredecillion" },
    { exponent: 45, symbol: "QaDc", name: "Quattuordecillion" },
    { exponent: 48, symbol: "QiDc", name: "Quindecillion" },
    { exponent: 51, symbol: "SxDc", name: "Sexdecillion" },
    { exponent: 54, symbol: "SpDc", name: "Septendecillion" },
    { exponent: 57, symbol: "OcDc", name: "Octodecillion" },
    { exponent: 60, symbol: "NoDc", name: "Novemdecillion" },
    { exponent: 63, symbol: "Vg", name: "Vigintillion" },
    { exponent: 66, symbol: "UVg", name: "Unvigintillion" },
    { exponent: 69, symbol: "DVg", name: "Duovigintillion" },
    { exponent: 72, symbol: "TVg", name: "Trevigintillion" },
    { exponent: 75, symbol: "QaVg", name: "Quattuorvigintillion" },
    { exponent: 78, symbol: "QiVg", name: "Quinvigintillion" },
    { exponent: 81, symbol: "SxVg", name: "Sexvigintillion" },
    { exponent: 84, symbol: "SpVg", name: "Septenvigintillion" },
    { exponent: 87, symbol: "OcVg", name: "Octovigintillion" },
    { exponent: 90, symbol: "NoVg", name: "Novemvigintillion" },
    { exponent: 93, symbol: "Tg", name: "Trigintillion" },
    { exponent: 96, symbol: "UTg", name: "Untrigintillion" },
    { exponent: 99, symbol: "DTg", name: "Duotrigintillion" },
    { exponent: 303, symbol: "Ct", name: "Centillion" },
] as const;

/**
 * Compact unit list from Thousand (10³) to Nonillion (10³⁰), using short symbols only.
 *
 * Intended for tight UI spaces. Numbers beyond Nonillion fall back to whatever
 * `fallback` plugin is configured on the {@link UnitNotation} instance.
 *
 * @example
 * const notation = new UnitNotation({ units: COMPACT_UNITS, fallback: letterNotation });
 */
export const COMPACT_UNITS: ReadonlyArray<Unit> = [
    { exponent: 3, symbol: "k" },
    { exponent: 6, symbol: "M" },
    { exponent: 9, symbol: "B" },
    { exponent: 12, symbol: "T" },
    { exponent: 15, symbol: "Qa" },
    { exponent: 18, symbol: "Qi" },
    { exponent: 21, symbol: "Sx" },
    { exponent: 24, symbol: "Sp" },
    { exponent: 27, symbol: "Oc" },
    { exponent: 30, symbol: "No" },
] as const;