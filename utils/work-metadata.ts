import { Language } from '../constants/locales';

const normalize = (value: string): string => value.trim().toLowerCase();

const UNKNOWN_VALUES = new Set(['unknown', '未知']);
const STANDARD_EDITION_VALUES = new Set(['standard edition', '标准版']);

export const getDefaultWorkYear = (language: Language): string =>
    language === 'zh' ? '未知' : 'Unknown';

export const getDefaultWorkEdition = (language: Language): string =>
    language === 'zh' ? '标准版' : 'Standard Edition';

const isUnknownValue = (value: string): boolean => UNKNOWN_VALUES.has(normalize(value));

export const formatWorkYearForDisplay = (value: string, _language: Language): string => {
    if (!value) return '';
    if (isUnknownValue(value)) return '';
    return value;
};

export const formatWorkEditionForDisplay = (value: string, language: Language): string => {
    if (!value) return getDefaultWorkEdition(language);
    if (STANDARD_EDITION_VALUES.has(normalize(value))) {
        return getDefaultWorkEdition(language);
    }
    return value;
};

export const formatWorkMetaForDisplay = (
    edition: string,
    year: string,
    language: Language
): string => {
    const editionText = formatWorkEditionForDisplay(edition, language).trim();
    const yearText = formatWorkYearForDisplay(year, language).trim();
    if (editionText && yearText) return `${editionText} / ${yearText}`;
    return editionText || yearText;
};
