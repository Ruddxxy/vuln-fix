/**
 * Language constants for translation and localization features
 */

export interface Language {
  code: string;
  name: string;
}

/**
 * Supported languages for article translation
 */
export const LANGUAGES: Language[] = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "ru", name: "Russian" },
  { code: "zh", name: "Chinese" },
  { code: "ja", name: "Japanese" },
  { code: "ar", name: "Arabic" },
  { code: "hi", name: "Hindi" }
];

/**
 * Get language name by code
 * @param code - Language code (e.g., "en", "es")
 * @returns Language name or undefined if not found
 */
export function getLanguageName(code: string): string | undefined {
  return LANGUAGES.find((lang) => lang.code === code)?.name;
}

/**
 * Get language code by name
 * @param name - Language name (e.g., "English", "Spanish")
 * @returns Language code or undefined if not found
 */
export function getLanguageCode(name: string): string | undefined {
  return LANGUAGES.find((lang) => lang.name.toLowerCase() === name.toLowerCase())?.code;
}

/**
 * Check if a language code is supported
 * @param code - Language code to check
 * @returns true if the language is supported
 */
export function isLanguageSupported(code: string): boolean {
  return LANGUAGES.some((lang) => lang.code === code);
}

/**
 * Get all language codes
 * @returns Array of all supported language codes
 */
export function getLanguageCodes(): string[] {
  return LANGUAGES.map((lang) => lang.code);
}

/**
 * Get all language names
 * @returns Array of all supported language names
 */
export function getLanguageNames(): string[] {
  return LANGUAGES.map((lang) => lang.name);
}
