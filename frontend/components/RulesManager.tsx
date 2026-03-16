import { useState, useEffect } from 'react';
import { Plus, Trash2, ToggleLeft, ToggleRight, ChevronDown, ChevronUp } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import {
  loadRules, saveRules,
  type AutoRule, type RuleConditionField, type RuleConditionOp, type RuleActionType,
} from '@/lib/rules';

const FIELD_OPTIONS: { value: RuleConditionField; label: string }[] = [
  { value: 'sender',  label: 'Sender' },
  { value: 'subject', label: 'Subject' },
  { value: 'body',    label: 'Body' },
];

const OP_OPTIONS: { value: RuleConditionOp; label: string }[] = [
  { value: 'contains',    label: 'contains' },
  { value: 'starts_with', label: 'starts with' },
  { value: 'ends_with',   label: 'ends with' },
  { value: 'equals',      label: 'equals' },
];

const CATEGORY_OPTIONS = [
  'urgent', 'needs_response', 'follow_up', 'fyi', 'newsletter', 'spam', 'other',
];

const PRIORITY_OPTIONS = ['high', 'medium', 'low'];

function newRule(): AutoRule {
  return {
    id: `rule_${Date.now()}`,
    name: 'New Rule',
    enabled: true,
    conditions: [{ field: 'sender', op: 'contains', value: '' }],
    actions: [{ type: 'set_category', value: 'urgent' }],
    created_at: new Date().toISOString(),
  };
}

export default function RulesManager() {
  const [rules, setRules] = useState<AutoRule[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setRules(loadRules());
  }, []);

  const persist = (updated: AutoRule[]) => {
    setRules(updated);
    saveRules(updated);
  };

  const addRule = () => {
    const r = newRule();
    const updated = [...rules, r];
    persist(updated);
    setExpanded(r.id);
  };

  const deleteRule = (id: string) => {
    persist(rules.filter((r) => r.id !== id));
    if (expanded === id) setExpanded(null);
  };

  const toggleRule = (id: string) => {
    persist(rules.map((r) => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const updateRule = (id: string, patch: Partial<AutoRule>) => {
    persist(rules.map((r) => r.id === id ? { ...r, ...patch } : r));
  };

  const handleSaveAll = () => {
    saveRules(rules);
    toast.success('Rules saved');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Rules run in order and override AI classification in the email list.
        </p>
        <button
          onClick={addRule}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary-600 hover:bg-primary-700 px-3 py-2 text-sm font-medium text-white transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Rule
        </button>
      </div>

      {rules.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">No rules yet. Add one to auto-label incoming emails.</p>
        </div>
      )}

      <div className="space-y-3">
        {rules.map((rule) => (
          <div key={rule.id} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
            {/* Rule header */}
            <div className="flex items-center gap-3 px-4 py-3">
              <button onClick={() => toggleRule(rule.id)} title={rule.enabled ? 'Disable' : 'Enable'}>
                {rule.enabled
                  ? <ToggleRight className="h-5 w-5 text-primary-600" />
                  : <ToggleLeft className="h-5 w-5 text-gray-400" />}
              </button>

              <input
                type="text"
                value={rule.name}
                onChange={(e) => updateRule(rule.id, { name: e.target.value })}
                className="flex-1 bg-transparent text-sm font-medium text-gray-900 dark:text-gray-100 focus:outline-none"
                placeholder="Rule name"
              />

              <button
                onClick={() => setExpanded(expanded === rule.id ? null : rule.id)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {expanded === rule.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              <button
                onClick={() => deleteRule(rule.id)}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {/* Rule body */}
            {expanded === rule.id && (
              <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-4 space-y-4">
                {/* Conditions */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    IF (all match)
                  </p>
                  <div className="space-y-2">
                    {rule.conditions.map((cond, ci) => (
                      <div key={ci} className="flex items-center gap-2 flex-wrap">
                        <select
                          value={cond.field}
                          onChange={(e) => {
                            const conds = [...rule.conditions];
                            conds[ci] = { ...conds[ci], field: e.target.value as RuleConditionField };
                            updateRule(rule.id, { conditions: conds });
                          }}
                          className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          {FIELD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>

                        <select
                          value={cond.op}
                          onChange={(e) => {
                            const conds = [...rule.conditions];
                            conds[ci] = { ...conds[ci], op: e.target.value as RuleConditionOp };
                            updateRule(rule.id, { conditions: conds });
                          }}
                          className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          {OP_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>

                        <input
                          type="text"
                          value={cond.value}
                          onChange={(e) => {
                            const conds = [...rule.conditions];
                            conds[ci] = { ...conds[ci], value: e.target.value };
                            updateRule(rule.id, { conditions: conds });
                          }}
                          placeholder="value..."
                          className="flex-1 min-w-[120px] rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />

                        {rule.conditions.length > 1 && (
                          <button
                            onClick={() => {
                              const conds = rule.conditions.filter((_, i) => i !== ci);
                              updateRule(rule.id, { conditions: conds });
                            }}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => updateRule(rule.id, { conditions: [...rule.conditions, { field: 'sender', op: 'contains', value: '' }] })}
                      className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
                    >
                      + Add condition
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    THEN
                  </p>
                  <div className="space-y-2">
                    {rule.actions.map((action, ai) => (
                      <div key={ai} className="flex items-center gap-2 flex-wrap">
                        <select
                          value={action.type}
                          onChange={(e) => {
                            const acts = [...rule.actions];
                            const newType = e.target.value as RuleActionType;
                            acts[ai] = { type: newType, value: newType === 'set_category' ? 'urgent' : 'high' };
                            updateRule(rule.id, { actions: acts });
                          }}
                          className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="set_category">Set Category</option>
                          <option value="set_priority">Set Priority</option>
                        </select>

                        <select
                          value={action.value}
                          onChange={(e) => {
                            const acts = [...rule.actions];
                            acts[ai] = { ...acts[ai], value: e.target.value };
                            updateRule(rule.id, { actions: acts });
                          }}
                          className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 capitalize"
                        >
                          {(action.type === 'set_category' ? CATEGORY_OPTIONS : PRIORITY_OPTIONS).map((v) => (
                            <option key={v} value={v} className="capitalize">{v.replace('_', ' ')}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleSaveAll}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary-600 hover:bg-primary-700 px-4 py-2 text-sm font-medium text-white transition-colors"
                >
                  Save Rule
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
