/**
 * Format benchmarks — mitata
 *
 * Compares ArbitraryNumber.toString() with each built-in notation plugin
 * against the nearest native JS string-conversion equivalent.
 *
 * Scenarios
 * ─────────
 * small   exponent = 0   (no suffix needed)
 * mid     exponent = 6   (unit: "M" / letter: "b")
 * large   exponent = 30  (deep in letter-notation territory)
 * huge    exponent = 100 (beyond any native number precision)
 */

import { bench, do_not_optimize, group, run, summary } from "mitata";
import { ArbitraryNumber } from "../src/core/ArbitraryNumber";
import { scientificNotation } from "../src/plugin/ScientificNotation";
import { letterNotation } from "../src/plugin/AlphabetNotation";
import { unitNotation } from "../src/plugin/UnitNotation";

// ─── Pre-built operands ────────────────────────────────────────────────────

const small = new ArbitraryNumber(1.5,   0);  // 1.5
const mid   = new ArbitraryNumber(3.2,   6);  // 3.2e6
const large = new ArbitraryNumber(7.7,  30);  // 7.7e30
const huge  = new ArbitraryNumber(1.1, 100);  // 1.1e100

// ─── scientificNotation ───────────────────────────────────────────────────

summary(() => {
    group("scientificNotation — exponent 0", () => {
        bench("native toFixed(2)              ", () => do_not_optimize((1.5).toFixed(2)));
        bench("ArbitraryNumber.toString       ", () => do_not_optimize(small.toString(scientificNotation)));
    });

    group("scientificNotation — exponent 6", () => {
        bench("native toFixed + template      ", () => do_not_optimize(`${(3.2).toFixed(2)}e+6`));
        bench("ArbitraryNumber.toString       ", () => do_not_optimize(mid.toString(scientificNotation)));
    });

    group("scientificNotation — exponent 30", () => {
        bench("native toExponential(2)        ", () => do_not_optimize((7.7e30).toExponential(2)));
        bench("ArbitraryNumber.toString       ", () => do_not_optimize(large.toString(scientificNotation)));
    });

    group("scientificNotation — exponent 100 (beyond native precision)", () => {
        bench("native template (loses precision)", () => do_not_optimize(`${(1.1).toFixed(2)}e+100`));
        bench("ArbitraryNumber.toString         ", () => do_not_optimize(huge.toString(scientificNotation)));
    });
});

// ─── unitNotation ─────────────────────────────────────────────────────────

summary(() => {
    group("unitNotation — exponent 0 (below unit threshold)", () => {
        bench("native toFixed(2)              ", () => do_not_optimize((1.5).toFixed(2)));
        bench("ArbitraryNumber.toString       ", () => do_not_optimize(small.toString(unitNotation)));
    });

    group("unitNotation — exponent 6 (M)", () => {
        bench("native template \"3.20 M\"      ", () => do_not_optimize(`${(3.2).toFixed(2)} M`));
        bench("ArbitraryNumber.toString       ", () => do_not_optimize(mid.toString(unitNotation)));
    });

    group("unitNotation — exponent 100 (falls back to letterNotation)", () => {
        bench("native template (loses precision)", () => do_not_optimize(`${(1.1).toFixed(2)}e+100`));
        bench("ArbitraryNumber.toString         ", () => do_not_optimize(huge.toString(unitNotation)));
    });
});

// ─── letterNotation ───────────────────────────────────────────────────────

summary(() => {
    group("letterNotation — exponent 6 (→ b)", () => {
        bench("native template \"3.20b\"       ", () => do_not_optimize(`${(3.2).toFixed(2)}b`));
        bench("ArbitraryNumber.toString       ", () => do_not_optimize(mid.toString(letterNotation)));
    });

    group("letterNotation — exponent 30 (→ k)", () => {
        bench("native template \"7.70k\"       ", () => do_not_optimize(`${(7.7).toFixed(2)}k`));
        bench("ArbitraryNumber.toString       ", () => do_not_optimize(large.toString(letterNotation)));
    });

    group("letterNotation — exponent 100 (deep multi-letter tier)", () => {
        bench("native template (loses precision)", () => do_not_optimize(`${(1.1).toFixed(2)}e+100`));
        bench("ArbitraryNumber.toString         ", () => do_not_optimize(huge.toString(letterNotation)));
    });
});

// ─── Decimal precision impact ─────────────────────────────────────────────

summary(() => {
    group("scientificNotation — decimal places (exponent 6)", () => {
        bench("decimals = 0", () => do_not_optimize(mid.toString(scientificNotation, 0)));
        bench("decimals = 2", () => do_not_optimize(mid.toString(scientificNotation, 2)));
        bench("decimals = 4", () => do_not_optimize(mid.toString(scientificNotation, 4)));
        bench("decimals = 6", () => do_not_optimize(mid.toString(scientificNotation, 6)));
    });
});

await run({ colors: true });
