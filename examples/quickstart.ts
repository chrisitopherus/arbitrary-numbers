import { an, chain, formula, unitNotation } from "../src/index.ts";

const jsHuge = Number("1e500");
const jsTiny = Number("1e-500");

const huge = an(1, 500);
const tiny = an(1, -500);

const damage = chain(an(6.2, 15))
    .subMul(an(8.5, 13), an(7.5, -1))
    .floor()
    .done();

const tick = formula("tick")
    .mulAdd(an(1.08), an(2.5, 6));

let gold = an(7.5, 12);
for (let i = 0; i < 3; i += 1) {
    gold = tick.apply(gold);
}

console.log("=== Range limits (JS vs arbitrary-numbers) ===");
console.log(`JS Number('1e500')  -> ${jsHuge}`);
console.log(`AN an(1, 500)       -> ${huge.toString()}`);
console.log(`JS Number('1e-500') -> ${jsTiny}`);
console.log(`AN an(1, -500)      -> ${tiny.toString()}`);

console.log("");
console.log("=== Game math helpers ===");
console.log(`Damage (chain + fused subMul)  -> ${damage.toString(unitNotation)}`);
console.log(`Gold after 3 ticks (formula)   -> ${gold.toString(unitNotation)}`);
