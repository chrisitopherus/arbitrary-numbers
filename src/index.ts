// Core
export { ArbitraryNumber } from "./core/ArbitraryNumber";
export { an } from "./core/an";
export { AnChain, chain } from "./core/AnChain";
export { AnFormula, formula } from "./core/AnFormula";

// Plugins
export { ScientificNotation, scientificNotation } from "./plugin/ScientificNotation";
export { AlphabetNotation, alphabetSuffix, letterNotation } from "./plugin/AlphabetNotation";
export { UnitNotation, unitNotation } from "./plugin/UnitNotation";
export { SuffixNotationBase } from "./plugin/SuffixNotationBase";

// Constants
export { CLASSIC_UNITS, COMPACT_UNITS } from "./constants/units";

// Utilities
export { ArbitraryNumberGuard } from "./utility/ArbitraryNumberGuard";
export { ArbitraryNumberOps } from "./utility/ArbitraryNumberOps";
export { ArbitraryNumberHelpers } from "./utility/ArbitraryNumberHelpers";

// Short aliases
export { ArbitraryNumberOps as ops } from "./utility/ArbitraryNumberOps";
export { ArbitraryNumberGuard as guard } from "./utility/ArbitraryNumberGuard";
export { ArbitraryNumberHelpers as helpers } from "./utility/ArbitraryNumberHelpers";

// Types
export type { ArbitraryNumberish } from "./types/utility";
export type { AnFunction, NormalizedNumber, Signum, Mod3 } from "./types/core";
export type { NotationPlugin, SuffixProvider, SuffixNotationPlugin, SuffixNotationPluginOptions, AlphabetNotationOptions, Unit, UnitArray, UnitNotationOptions } from "./types/plugin";
