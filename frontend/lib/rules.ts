/**
 * Auto-labeling rules engine — client-side, stored in localStorage.
 * Rules are applied to emails in the email list to override category/priority display.
 *
 * Supports:
 *  - AND / OR condition logic
 *  - contains, starts_with, ends_with, equals, regex operators
 *  - set_category, set_priority (high/medium/low), set_priority_score (1–10)
 */

export type RuleConditionField = 'sender' | 'subject' | 'body';
export type RuleConditionOp = 'contains' | 'starts_with' | 'ends_with' | 'equals' | 'regex';
export type RuleConditionLogic = 'AND' | 'OR';
export type RuleActionType = 'set_category' | 'set_priority' | 'set_priority_score';

export interface RuleCondition {
  field: RuleConditionField;
  op: RuleConditionOp;
  value: string;
}

export interface RuleAction {
  type: RuleActionType;
  value: string;
}

export interface AutoRule {
  id: string;
  name: string;
  enabled: boolean;
  condition_logic: RuleConditionLogic; // default AND
  conditions: RuleCondition[];
  actions: RuleAction[];
  created_at: string;
}

const STORAGE_KEY = 'mailair_auto_rules';

export function loadRules(): AutoRule[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as AutoRule[];
    // Backfill condition_logic for rules saved before this field existed
    return raw.map((r) => ({ ...r, condition_logic: r.condition_logic ?? 'AND' as const }));
  } catch {
    return [];
  }
}

export function saveRules(rules: AutoRule[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
}

function matchCondition(condition: RuleCondition, email: Record<string, string>): boolean {
  const fieldMap: Record<RuleConditionField, string> = {
    sender: (email.from_email || '') + ' ' + (email.from_name || ''),
    subject: email.subject || '',
    body: email.body_text || email.snippet || '',
  };
  const fieldVal = fieldMap[condition.field].toLowerCase();
  const matchVal = condition.value.toLowerCase();

  switch (condition.op) {
    case 'contains':    return fieldVal.includes(matchVal);
    case 'starts_with': return fieldVal.startsWith(matchVal);
    case 'ends_with':   return fieldVal.endsWith(matchVal);
    case 'equals':      return fieldVal === matchVal;
    case 'regex': {
      try {
        return new RegExp(condition.value, 'i').test(fieldMap[condition.field]);
      } catch {
        return false;
      }
    }
    default:            return false;
  }
}

const PRIORITY_SCORE_MAP: Record<string, number> = { high: 9, medium: 5, low: 2 };

export function applyRules<T extends Record<string, unknown>>(email: T, rules: AutoRule[]): T {
  let result = { ...email };
  for (const rule of rules) {
    if (!rule.enabled) continue;
    const logic = rule.condition_logic ?? 'AND';
    const emailRecord = result as Record<string, string>;
    const matched = logic === 'OR'
      ? rule.conditions.some((cond) => matchCondition(cond, emailRecord))
      : rule.conditions.every((cond) => matchCondition(cond, emailRecord));

    if (!matched) continue;

    for (const action of rule.actions) {
      if (action.type === 'set_category') {
        result = { ...result, ai_analysis: { ...(result.ai_analysis as object ?? {}), category: action.value } };
      } else if (action.type === 'set_priority') {
        const score = PRIORITY_SCORE_MAP[action.value] ?? 5;
        result = {
          ...result,
          ai_analysis: {
            ...(result.ai_analysis as object ?? {}),
            priority_level: action.value,
            priority_score: score,
          },
        };
      } else if (action.type === 'set_priority_score') {
        const score = Math.max(1, Math.min(10, parseInt(action.value, 10) || 5));
        const level = score >= 8 ? 'high' : score >= 5 ? 'medium' : 'low';
        result = {
          ...result,
          ai_analysis: {
            ...(result.ai_analysis as object ?? {}),
            priority_level: level,
            priority_score: score,
          },
        };
      }
    }
  }
  return result;
}
