// Core
export { ArbitraryNumber } from "./core/ArbitraryNumber";
export { an } from "./core/an";
export { AnChain, chain } from "./core/AnChain";
export type { AnFunction } from "./core/an";

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

// Short aliases (backwards-compatible)
export { ArbitraryNumberOps as ops } from "./utility/ArbitraryNumberOps";
export { ArbitraryNumberGuard as guard } from "./utility/ArbitraryNumberGuard";

// Types
export type { ArbitraryNumberish } from "./utility/ArbitraryNumberOps";
export type { NotationPlugin, SuffixProvider, SuffixNotationPlugin, SuffixNotationPluginOptions, AlphabetNotationOptions, Unit, UnitArray, UnitNotationOptions } from "./types/plugin";
export type { NormalizedNumber } from "./types/core";
