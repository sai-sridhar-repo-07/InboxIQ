/**
 * Auto-labeling rules engine — client-side, stored in localStorage.
 * Rules are applied to emails in the email list to override category/priority display.
 */

export type RuleConditionField = 'sender' | 'subject' | 'body';
export type RuleConditionOp = 'contains' | 'starts_with' | 'ends_with' | 'equals';
export type RuleActionType = 'set_category' | 'set_priority';

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
  conditions: RuleCondition[];  // ALL must match (AND logic)
  actions: RuleAction[];
  created_at: string;
}

const STORAGE_KEY = 'inboxiq_auto_rules';

export function loadRules(): AutoRule[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
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
    default:            return false;
  }
}

export function applyRules<T extends Record<string, unknown>>(email: T, rules: AutoRule[]): T {
  let result = { ...email };
  for (const rule of rules) {
    if (!rule.enabled) continue;
    const allMatch = rule.conditions.every((cond) =>
      matchCondition(cond, result as Record<string, string>)
    );
    if (!allMatch) continue;
    for (const action of rule.actions) {
      if (action.type === 'set_category') {
        result = { ...result, ai_analysis: { ...(result.ai_analysis as object ?? {}), category: action.value } };
      } else if (action.type === 'set_priority') {
        const priorityMap: Record<string, number> = { high: 8, medium: 5, low: 2 };
        result = {
          ...result,
          ai_analysis: {
            ...(result.ai_analysis as object ?? {}),
            priority_level: action.value,
            priority_score: priorityMap[action.value] ?? 5,
          },
        };
      }
    }
  }
  return result;
}
