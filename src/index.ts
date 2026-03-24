// Core
export { ArbitraryNumber } from "./core/ArbitraryNumber";

// Plugins
export { ScientificNotation, scientificNotation } from "./plugin/ScientificNotation";
export { LetterNotation, letterNotation } from "./plugin/LetterNotation";
export { UnitNotation, unitNotation } from "./plugin/UnitNotation";
export { SuffixNotationBase } from "./plugin/SuffixNotationBase";

// Constants
export { CLASSIC_UNITS, COMPACT_UNITS } from "./constants/units";

// Utilities
export { ArbitraryNumberGuard } from "./utility/ArbitraryNumberGuard";

// Types
export type { NotationPlugin, SuffixProvider, SuffixNotationPlugin, SuffixNotationPluginOptions, Unit, UnitArray, UnitNotationOptions } from "./types/plugin";
export type { NormalizedNumber } from "./types/core";
