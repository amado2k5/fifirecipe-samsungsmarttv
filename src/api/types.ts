/** Types matching docs/tv-api.md in the fifirecipes repo. */

export interface LanguageInfo {
  code: string;
  nativeName: string;
  englishName: string;
  dir: 'ltr' | 'rtl';
  complete: boolean;
}

export interface EndpointTemplates {
  index: string;
  feed: string;
  chapters: string;
  kids: string;
  recipe: string;
  i18n: string;
  search: string;
  videos: string;
  kidsRecipe: string;
  images: string;
}

export interface TvManifest {
  version: string;
  generatedAt: string;
  recipeCount: number;
  pageSize: number;
  languages: LanguageInfo[];
  endpoints: EndpointTemplates;
}

/** One entry in tv/index/{lang}.json */
export interface RecipeCard {
  id: string;
  title: string;
  titleEn?: string;
  category?: string;
  cookingMethod?: string;
  prepTime?: string;
  cookTime?: string;
  servings?: string;
  difficulty?: 'easy' | 'medium' | 'master';
  image?: string;
  hasVideo?: boolean;
  chapter?: number;
  chapterName?: string;
}

export interface FeedRow {
  key: string;
  title: string;
  items: string[];
}

export interface Feed {
  rows: FeedRow[];
}

export interface Chapter {
  id: number;
  name: string;
  recipeCount: number;
  coverImage?: string;
}

export interface KidsCard {
  id: string;
  title: string;
  group: string;
  ages: string;
  minutes: number;
  noCook: boolean;
  allergens?: string[];
  cover: string;
}

export interface ImageInfo {
  card: string;
  full: string;
  w: number;
  h: number;
}

/** /data/recipes/{id}.json */
export interface RecipeIngredient {
  id: string;
  name: string;
  standardAmount?: string;
  notes?: string;
}

export interface RecipeInstruction {
  stepNumber: number;
  text: string;
  textEn?: string;
  phase?: 'prep' | 'cook' | 'finish' | 'alternative';
  isAlternative?: boolean;
  alternativeLabel?: string;
  importance?: 'core' | 'tip' | 'variation';
}

export interface RawDocVersion {
  title: string;
  pageNumber?: number;
  ingredients: string[];
  instructions: string[];
  notes?: string[];
}

export interface RecipeCore {
  id: string;
  title: string;
  titleEn?: string;
  chapter?: string;
  chapterNumber?: number;
  category?: string;
  cookingMethod?: string;
  prepTime?: string;
  cookTime?: string;
  servings?: string;
  masterIngredients: RecipeIngredient[];
  uniqueInstructions: RecipeInstruction[];
  rawDocVersions?: Record<string, RawDocVersion>;
}

export interface RecipeTranslation {
  title?: string;
  chapter?: string;
  category?: string;
  cookingMethod?: string;
  prepTime?: string;
  cookTime?: string;
  servings?: string;
  culturalNotes?: string;
  ingredients?: Record<string, { name?: string; standardAmount?: string }>;
  instructions?: Record<string, string>;
}

export interface RecipeEstimate {
  servings?: number;
  kcal?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
  fiber?: number;
  sugar?: number;
}

export interface RecipeFile {
  recipe: RecipeCore;
  estimate?: RecipeEstimate;
  translations: Record<string, RecipeTranslation>;
}

/** /data/videos/{id}.json — YouTube hits per language. */
export interface VideoItem {
  id: string;
  title: string;
  channel?: string;
  duration?: string;
  views?: string;
  short?: boolean;
}

export type VideoFile = Record<string, VideoItem[]>;

/** /data/kids/{lang}/{id}.json */
export interface KidsRecipeDetail {
  id: string;
  group: string;
  ages: string;
  minutes: number;
  servings?: number;
  noCook: boolean;
  allergens?: string[];
  cover: string;
  title: string;
  intro?: string;
  ingredients: { art: string; text: string }[];
  tools?: string[];
  steps: { act?: string; items?: string[]; tool?: string; adult?: string; timer?: number; text: string }[];
  tip?: string;
}
