// =============================================
// SHARED CATEGORY DEFINITIONS
// Single source of truth for all category data.
// Import from here — never define locally.
// =============================================

export type CategoryKey =
  | "produce"
  | "cold_drinks"
  | "bakery"
  | "meat"
  | "dairy"
  | "chilled"
  | "frozen"
  | "pantry"
  | "alcohol"
  | "personal_care"
  | "household"
  | "dogs"
  | "hot_drinks"
  | "other";

// Display labels (emoji + name) used in dropdowns, filter pills, list headers
export const categoryLabels: Record<CategoryKey, string> = {
  produce:       "🥦 Produce",
  cold_drinks:   "🥤 Cold Dinks",
  bakery:        "🍞 Bakery",
  meat:          "🥩 Meat",
  dairy:         "🥛 Dairy",
  chilled:       "🧊 Chilled",
  frozen:        "❄ Frozen",
  pantry:        "🥫 Pantry",
  alcohol:       "🍾 Alcohol",
  personal_care: "🧼 Personal Care",
  household:     "🧴 Household",
  dogs:          "🦴 Dogs",
  hot_drinks:    "☕ Hot Drinks",
  other:         "📦 Other",
};

// Single emoji icons used on item cards when no photo is set
export const categoryIcons: Record<CategoryKey, string> = {
  produce:       "🥦",
  cold_drinks:   "🥤",
  bakery:        "🍞",
  meat:          "🥩",
  dairy:         "🥛",
  chilled:       "🧊",
  frozen:        "❄️",
  pantry:        "🥫",
  alcohol:       "🍾",
  personal_care: "🧼",
  household:     "🧴",
  dogs:          "🦴",
  hot_drinks:    "☕",
  other:         "📦",
};

// Aisle order for sort-by-aisle feature
export const aisleOrder: CategoryKey[] = [
  "produce",
  "chilled",
  "cold_drinks",
  "alcohol",
  "personal_care",
  "pantry",
  "hot_drinks",
  "household",
  "bakery",
  "dogs",
  "dairy",
  "meat",
  "frozen",
  "other",  
];

// Options array for select dropdowns
export const categoryOptions = Object.entries(categoryLabels).map(
  ([value, label]) => ({ value: value as CategoryKey, label })
);