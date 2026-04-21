export interface CustomTag {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

const TAGS_KEY = 'mailair_custom_tags';
const EMAIL_TAGS_KEY = 'mailair_email_tags';

const DEFAULT_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#3b82f6', '#ef4444', '#14b8a6',
];

export function getNextColor(tags: CustomTag[]): string {
  return DEFAULT_COLORS[tags.length % DEFAULT_COLORS.length];
}

export function loadTags(): CustomTag[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(TAGS_KEY) || '[]') as CustomTag[];
  } catch {
    return [];
  }
}

export function saveTags(tags: CustomTag[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TAGS_KEY, JSON.stringify(tags));
}

export function createTag(name: string, color: string): CustomTag {
  return { id: `tag_${Date.now()}`, name, color, created_at: new Date().toISOString() };
}

export function getEmailTags(emailId: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const all = JSON.parse(localStorage.getItem(EMAIL_TAGS_KEY) || '{}') as Record<string, string[]>;
    return all[emailId] || [];
  } catch {
    return [];
  }
}

export function setEmailTags(emailId: string, tagIds: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    const all = JSON.parse(localStorage.getItem(EMAIL_TAGS_KEY) || '{}') as Record<string, string[]>;
    if (tagIds.length === 0) {
      delete all[emailId];
    } else {
      all[emailId] = tagIds;
    }
    localStorage.setItem(EMAIL_TAGS_KEY, JSON.stringify(all));
  } catch {}
}
