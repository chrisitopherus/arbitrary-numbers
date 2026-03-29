import {
    an,
    chain,
    UnitNotation,
    CLASSIC_UNITS,
    letterNotation,
    ArbitraryNumberHelpers as helpers,
} from "../src/index.ts";
import type { ArbitraryNumber } from "../src/index.ts";

let gold = an(5, 6);      // 5,000,000
let gps = an(2, 5);       // 200,000 per tick
let reactorCost = an(1, 9);
let reactors = 0;

const display = new UnitNotation({
    units: CLASSIC_UNITS,
    fallback: letterNotation,
});

function fmt(value: ArbitraryNumber, decimals = 2): string {
    return value.toString(display, decimals);
}

function snapshot(tick: number): void {
    console.log(
        `[t=${String(tick).padStart(4)}] SNAPSHOT  `
        + `gold=${fmt(gold, 2).padStart(12)}  gps=${fmt(gps, 2).padStart(12)}`,
    );
}

console.log("=== Hyper-growth idle loop (720 ticks) ===");
console.log(`start gold=${fmt(gold)}  gps=${fmt(gps)}  reactorCost=${fmt(reactorCost)}`);

for (let t = 1; t <= 720; t += 1) {
    // Core growth: gold = (gold * 1.12) + gps
    gold = gold.mulAdd(an(1.12), gps);

    if (t % 60 === 0 && helpers.meetsOrExceeds(gold, reactorCost)) {
        const before = gps;
        gold = gold.sub(reactorCost);
        gps = chain(gps).mul(an(1, 25)).floor().done();
        reactorCost = reactorCost.mul(an(8));
        reactors += 1;

        console.log(
            `[t=${String(t).padStart(4)}] REACTOR   #${String(reactors).padStart(2)}  `
            + `gps ${fmt(before)} -> ${fmt(gps)}  `
            + `nextCost=${fmt(reactorCost)}`,
        );
    }

    if (t === 240 || t === 480) {
        const before = gps;
        gps = chain(gps)
            .mul(an(1, 4))
            .add(an(7.5, 6))
            .floor()
            .done();
        console.log(`[t=${String(t).padStart(4)}] PRESTIGE  gps ${fmt(before)} -> ${fmt(gps)}`);
    }

    if (t % 120 === 0) {
        snapshot(t);
    }
}

console.log("\n=== Final scale check ===");
console.log(`reactors bought: ${reactors}`);
console.log(`final gold (unit+letter): ${fmt(gold)}`);
console.log(`final gps  (unit+letter): ${fmt(gps)}`);
console.log(`final gold as JS Number: ${gold.toNumber()}`);
console.log(`final gps as JS Number : ${gps.toNumber()}`);
console.log("If JS shows Infinity while unit+letter output stays finite, the library is doing its job.");
