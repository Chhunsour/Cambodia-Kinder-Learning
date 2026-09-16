import { Locale } from "@/types";
import { km } from "./translations/km";
import { en } from "./translations/en";
import { TranslationDictionary, TranslationKey } from "./types";

const dictionaries: Record<Locale, TranslationDictionary> = {
  km,
  en,
};

export class I18nManager {
  private currentLocale: Locale = "km"; // Default Cambodia-first

  public setLocale(locale: Locale): void {
    this.currentLocale = locale;
  }

  public getLocale(): Locale {
    return this.currentLocale;
  }

  public translate(key: TranslationKey, params?: Record<string, string | number>): string {
    const dict = dictionaries[this.currentLocale] || dictionaries.km;
    const [section, prop] = key.split(".") as [keyof TranslationDictionary, string];

    const sectionObj = dict[section];
    if (!sectionObj) return key;

    let result = (sectionObj as Record<string, string>)[prop] ?? key;

    if (params) {
      for (const [paramKey, paramVal] of Object.entries(params)) {
        result = result.replace(new RegExp(`\\{\\{\\s*${paramKey}\\s*\\}\\}`, "g"), String(paramVal));
      }
    }

    return result;
  }
}

export const i18n = new I18nManager();
