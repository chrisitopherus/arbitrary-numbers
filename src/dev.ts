import { ArbitraryNumber } from "./core/ArbitraryNumber";
import { letterNotation } from "./plugin/LetterNotation";
import { unitNotation } from "./plugin/UnitNotation";

const number = ArbitraryNumber.from(1234567890);
const number1 = new ArbitraryNumber(1.5, 3);
const number2 = new ArbitraryNumber(1.5, 0);
const number3 = new ArbitraryNumber(1.5, -3);
const number4 = new ArbitraryNumber(1.5, 6);
const number5 = new ArbitraryNumber(1.5, 9);
const number6 = new ArbitraryNumber(1.5, 100);
console.log(number.toString(letterNotation));
console.log(number1.toString(letterNotation));
console.log(number2.toString(letterNotation));
console.log(number3.toString(letterNotation));
console.log(number4.toString(letterNotation));
console.log(number5.toString(letterNotation));
console.log(number6.toString(letterNotation));

console.log("==========");
console.log(number1.toString(unitNotation));
console.log(number2.toString(unitNotation));
console.log(number3.toString(unitNotation));
console.log(number4.toString(unitNotation));
console.log(number5.toString(unitNotation));
console.log(number6.toString(unitNotation));