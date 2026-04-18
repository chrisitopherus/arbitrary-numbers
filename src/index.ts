// Core
export { ArbitraryNumber, FrozenArbitraryNumber } from "./core/ArbitraryNumber";
export type { ArbitraryNumberDefaults } from "./core/ArbitraryNumber";

// Errors
export { ArbitraryNumberError, ArbitraryNumberInputError, ArbitraryNumberDomainError, ArbitraryNumberMutationError } from "./errors";

// Helpers
export { an } from "./core/an";
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
export { ArbitraryNumberHelpers } from "./utility/ArbitraryNumberHelpers";

// Short aliases
export { ArbitraryNumberGuard as guard } from "./utility/ArbitraryNumberGuard";
export { ArbitraryNumberHelpers as helpers } from "./utility/ArbitraryNumberHelpers";

// Types
export type { ArbitraryNumberish, Maybe, Nullable, ArbitraryNumberJson } from "./types/utility";
export type { AnFunction, Signum, Mod3 } from "./types/core";
export type { NotationPlugin, SuffixProvider, SuffixNotationPlugin, SuffixNotationPluginOptions, AlphabetNotationOptions, Unit, UnitArray, UnitNotationOptions } from "./types/plugin";
