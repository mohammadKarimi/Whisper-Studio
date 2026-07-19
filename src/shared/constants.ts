/**
 * Constants shared between the Electron main process and the renderer.
 * Import via the `@shared` path alias.
 */

/** Supported media file extensions used in the file-open dialog filter. */
export const SUPPORTED_MEDIA_EXTENSIONS = [
  'mp3',
  'mp4',
  'mpeg',
  'mpga',
  'm4a',
  'wav',
  'webm',
  'aac',
  'flac',
  'ogg',
  'wma',
  'mov',
  'mkv',
  'avi'
] as const

/**
 * Human-readable Whisper language names shown in the UI.
 * "Auto" triggers automatic language detection in the CLI.
 */
export const WHISPER_LANGUAGES = [
  'Auto',
  'Afrikaans',
  'Albanian',
  'Amharic',
  'Arabic',
  'Armenian',
  'Assamese',
  'Azerbaijani',
  'Bashkir',
  'Basque',
  'Belarusian',
  'Bengali',
  'Bosnian',
  'Breton',
  'Bulgarian',
  'Burmese',
  'Cantonese',
  'Castilian',
  'Catalan',
  'Chinese',
  'Croatian',
  'Czech',
  'Danish',
  'Dutch',
  'English',
  'Estonian',
  'Faroese',
  'Finnish',
  'Flemish',
  'French',
  'Galician',
  'Georgian',
  'German',
  'Greek',
  'Gujarati',
  'Haitian',
  'Haitian Creole',
  'Hausa',
  'Hawaiian',
  'Hebrew',
  'Hindi',
  'Hungarian',
  'Icelandic',
  'Indonesian',
  'Italian',
  'Japanese',
  'Javanese',
  'Kannada',
  'Kazakh',
  'Khmer',
  'Korean',
  'Lao',
  'Latin',
  'Latvian',
  'Letzeburgesch',
  'Lingala',
  'Lithuanian',
  'Luxembourgish',
  'Macedonian',
  'Malagasy',
  'Malay',
  'Malayalam',
  'Maltese',
  'Mandarin',
  'Maori',
  'Marathi',
  'Moldavian',
  'Moldovan',
  'Mongolian',
  'Myanmar',
  'Nepali',
  'Norwegian',
  'Nynorsk',
  'Occitan',
  'Panjabi',
  'Pashto',
  'Persian',
  'Polish',
  'Portuguese',
  'Punjabi',
  'Pushto',
  'Romanian',
  'Russian',
  'Sanskrit',
  'Serbian',
  'Shona',
  'Sindhi',
  'Sinhala',
  'Sinhalese',
  'Slovak',
  'Slovenian',
  'Somali',
  'Spanish',
  'Sundanese',
  'Swahili',
  'Swedish',
  'Tagalog',
  'Tajik',
  'Tamil',
  'Tatar',
  'Telugu',
  'Thai',
  'Tibetan',
  'Turkish',
  'Turkmen',
  'Ukrainian',
  'Urdu',
  'Uzbek',
  'Valencian',
  'Vietnamese',
  'Welsh',
  'Yiddish',
  'Yoruba'
] as const

export type WhisperLanguage = (typeof WHISPER_LANGUAGES)[number]

/**
 * Canonical Whisper model catalog. This is the single source of truth for all
 * model metadata used across the main process, renderer, and settings screens.
 *
 * Rules:
 *  - Add new downloadable models here only.
 *  - Do NOT duplicate this data in strings.ts or model-cache.ts.
 */
export const WHISPER_CATALOG_MODELS = [
  {
    id: 'tiny',
    label: 'Tiny',
    params: '39M',
    size: '75 MB',
    vram: '≈1 GB',
    speed: 'Fastest',
    accuracy: 'Low',
    recommended: false,
    desc: 'Minimal accuracy, real-time on CPU'
  },
  {
    id: 'base',
    label: 'Base',
    params: '74M',
    size: '145 MB',
    vram: '≈1 GB',
    speed: 'Very Fast',
    accuracy: 'Low',
    recommended: false,
    desc: 'Good for quick drafts'
  },
  {
    id: 'small',
    label: 'Small',
    params: '244M',
    size: '484 MB',
    vram: '≈2 GB',
    speed: 'Fast',
    accuracy: 'Medium',
    recommended: false,
    desc: 'Balanced speed and quality'
  },
  {
    id: 'medium',
    label: 'Medium',
    params: '769M',
    size: '1.5 GB',
    vram: '≈5 GB',
    speed: 'Medium',
    accuracy: 'High',
    recommended: false,
    desc: 'High accuracy for most use cases'
  },
  {
    id: 'large-v2',
    label: 'Large v2',
    params: '1.55B',
    size: '3 GB',
    vram: '≈10 GB',
    speed: 'Slow',
    accuracy: 'Highest',
    recommended: true,
    desc: 'Best accuracy, multilingual'
  },
  {
    id: 'large-v3',
    label: 'Large v3',
    params: '1.55B',
    size: '3 GB',
    vram: '≈10 GB',
    speed: 'Slow',
    accuracy: 'Highest',
    recommended: true,
    desc: 'Latest large model with improved accuracy'
  },
  {
    id: 'large-v3-turbo',
    label: 'Large v3 Turbo',
    params: '809M',
    size: '1.6 GB',
    vram: '≈6 GB',
    speed: 'Fast',
    accuracy: 'High',
    recommended: false,
    desc: 'Fast with near large-v3 accuracy'
  }
] as const

export type WhisperCatalogModel = (typeof WHISPER_CATALOG_MODELS)[number]

/**
 * Models whose HuggingFace repo is NOT under the Systran organization.
 * The download pipeline uses these overrides instead of the default
 * `Systran/faster-whisper-{modelId}` pattern.
 */
export const WHISPER_MODEL_REPO_OVERRIDES: Readonly<Record<string, string>> = {
  'large-v3-turbo': 'deepdml/faster-whisper-large-v3-turbo-ct2'
}

/** Returns the HuggingFace repo ID for a given model ID. */
export function getWhisperModelHfRepo(modelId: string): string {
  return WHISPER_MODEL_REPO_OVERRIDES[modelId] ?? `Systran/faster-whisper-${modelId}`
}

/**
 * Converts a HuggingFace repo ID (e.g. "org/name") to the directory name
 * the HF hub cache creates on disk (e.g. "models--org--name").
 */
export function hfRepoToCacheDirName(repoId: string): string {
  return `models--${repoId.replace('/', '--')}`
}

/**
 * Lookup table used by the main-process cache scanner to enrich any .pt file
 * it finds in the Whisper cache directory (including English-only variants and
 * legacy model names that are not in the downloadable catalog).
 */
export const WHISPER_KNOWN_MODELS: Readonly<Record<string, { params: string }>> = {
  tiny: { params: '39M' },
  'tiny.en': { params: '39M' },
  base: { params: '74M' },
  'base.en': { params: '74M' },
  small: { params: '244M' },
  'small.en': { params: '244M' },
  medium: { params: '769M' },
  'medium.en': { params: '769M' },
  large: { params: '1.55B' },
  'large-v1': { params: '1.55B' },
  'large-v2': { params: '1.55B' },
  'large-v3': { params: '1.55B' },
  turbo: { params: '809M' },
  'large-v3-turbo': { params: '809M' }
}

export const WHISPER_DOWNLOADABLE_IDS: readonly string[] = [
  ...WHISPER_CATALOG_MODELS.map((m) => m.id)
]

/**
 * Target Python version used consistently across all platforms.
 *
 * Pinned to a release with full prebuilt wheel coverage for `torch` and
 * `whisperx`. Newer Python versions often lack these wheels, causing
 * source builds or install failures. Used by both interpreter discovery
 * (preferred over bare `python`/`python3`) and the platform installers.
 */
export const PYTHON_TARGET_VERSION = '3.12' as const

export const MODEL_FETCHING_CACHE_DURATION_MS = 5000

/**
 * Maps lowercase language display names to their ISO 639 codes.
 * Used by the Whisper CLI `--language` argument.
 */
export const WHISPER_LANGUAGE_CODES: Record<string, string> = {
  afrikaans: 'af',
  albanian: 'sq',
  amharic: 'am',
  arabic: 'ar',
  armenian: 'hy',
  assamese: 'as',
  azerbaijani: 'az',
  bashkir: 'ba',
  basque: 'eu',
  belarusian: 'be',
  bengali: 'bn',
  bosnian: 'bs',
  breton: 'br',
  bulgarian: 'bg',
  burmese: 'my',
  cantonese: 'yue',
  castilian: 'es',
  catalan: 'ca',
  chinese: 'zh',
  croatian: 'hr',
  czech: 'cs',
  danish: 'da',
  dutch: 'nl',
  english: 'en',
  estonian: 'et',
  faroese: 'fo',
  finnish: 'fi',
  flemish: 'nl',
  french: 'fr',
  galician: 'gl',
  georgian: 'ka',
  german: 'de',
  greek: 'el',
  gujarati: 'gu',
  haitian: 'ht',
  'haitian creole': 'ht',
  hausa: 'ha',
  hawaiian: 'haw',
  hebrew: 'he',
  hindi: 'hi',
  hungarian: 'hu',
  icelandic: 'is',
  indonesian: 'id',
  italian: 'it',
  japanese: 'ja',
  javanese: 'jw',
  kannada: 'kn',
  kazakh: 'kk',
  khmer: 'km',
  korean: 'ko',
  lao: 'lo',
  latin: 'la',
  latvian: 'lv',
  letzeburgesch: 'lb',
  lingala: 'ln',
  lithuanian: 'lt',
  luxembourgish: 'lb',
  macedonian: 'mk',
  malagasy: 'mg',
  malay: 'ms',
  malayalam: 'ml',
  maltese: 'mt',
  mandarin: 'zh',
  maori: 'mi',
  marathi: 'mr',
  moldavian: 'ro',
  moldovan: 'ro',
  mongolian: 'mn',
  myanmar: 'my',
  nepali: 'ne',
  norwegian: 'no',
  nynorsk: 'nn',
  occitan: 'oc',
  panjabi: 'pa',
  pashto: 'ps',
  persian: 'fa',
  polish: 'pl',
  portuguese: 'pt',
  punjabi: 'pa',
  pushto: 'ps',
  romanian: 'ro',
  russian: 'ru',
  sanskrit: 'sa',
  serbian: 'sr',
  shona: 'sn',
  sindhi: 'sd',
  sinhala: 'si',
  sinhalese: 'si',
  slovak: 'sk',
  slovenian: 'sl',
  somali: 'so',
  spanish: 'es',
  sundanese: 'su',
  swahili: 'sw',
  swedish: 'sv',
  tagalog: 'tl',
  tajik: 'tg',
  tamil: 'ta',
  tatar: 'tt',
  telugu: 'te',
  thai: 'th',
  tibetan: 'bo',
  turkish: 'tr',
  turkmen: 'tk',
  ukrainian: 'uk',
  urdu: 'ur',
  uzbek: 'uz',
  valencian: 'ca',
  vietnamese: 'vi',
  welsh: 'cy',
  yiddish: 'yi',
  yoruba: 'yo'
}

export const DEFAULT_MANIFEST_URL =
  'https://github.com/mohammadKarimi/Whisper-Studio/releases/download/runtime-v1.0.0/runtime-manifest.json'
