export const CATEGORIES = [
  'food',
  'transport',
  'shopping',
  'health',
  'entertainment',
  'utilities',
  'other',
]

export const CATEGORY_COLORS = {
  food: '#ef4444',
  transport: '#3b82f6',
  shopping: '#a855f7',
  health: '#10b981',
  entertainment: '#f59e0b',
  utilities: '#06b6d4',
  other: '#6b7280',
}

export const CATEGORY_LABELS = {
  food: 'Food',
  transport: 'Transport',
  shopping: 'Shopping',
  health: 'Health',
  entertainment: 'Entertainment',
  utilities: 'Utilities',
  other: 'Other',
}

export function isValidCategory(c) {
  return CATEGORIES.includes(c)
}
