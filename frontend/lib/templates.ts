export interface EmailTemplate {
  id: string;
  name: string;
  body: string;
  created_at: string;
}

const STORAGE_KEY = 'inboxiq_email_templates';

const DEFAULT_TEMPLATES: EmailTemplate[] = [
  {
    id: 'tpl_following_up',
    name: 'Following Up',
    body: 'Hi,\n\nI wanted to follow up on my previous email regarding [topic]. Please let me know if you have any questions or need any additional information.\n\nLooking forward to hearing from you.\n\nBest regards,',
    created_at: new Date(0).toISOString(),
  },
  {
    id: 'tpl_decline',
    name: 'Polite Decline',
    body: 'Hi,\n\nThank you for reaching out. After careful consideration, I regret to inform you that we are unable to move forward at this time. We appreciate your interest and hope to work together in the future.\n\nBest regards,',
    created_at: new Date(0).toISOString(),
  },
  {
    id: 'tpl_meeting_confirm',
    name: 'Meeting Confirmation',
    body: 'Hi,\n\nThank you for reaching out! I would be happy to connect. [Proposed time] works well for me. I will send a calendar invite shortly.\n\nLooking forward to speaking with you.\n\nBest regards,',
    created_at: new Date(0).toISOString(),
  },
  {
    id: 'tpl_request_info',
    name: 'Request More Information',
    body: 'Hi,\n\nThank you for your email. To better assist you, could you provide more details about:\n- [Question 1]\n- [Question 2]\n\nOnce I have this information, I will be able to give you a more accurate response.\n\nBest regards,',
    created_at: new Date(0).toISOString(),
  },
];

export function loadTemplates(): EmailTemplate[] {
  if (typeof window === 'undefined') return DEFAULT_TEMPLATES;
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as EmailTemplate[];
    // Merge defaults (by id) with stored
    const storedIds = new Set(stored.map((t) => t.id));
    const defaults = DEFAULT_TEMPLATES.filter((t) => !storedIds.has(t.id));
    return [...defaults, ...stored].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  } catch {
    return DEFAULT_TEMPLATES;
  }
}

export function saveTemplates(templates: EmailTemplate[]): void {
  if (typeof window === 'undefined') return;
  // Only persist user-created templates (not defaults)
  const defaultIds = new Set(DEFAULT_TEMPLATES.map((t) => t.id));
  const custom = templates.filter((t) => !defaultIds.has(t.id));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(custom));
}

export function createTemplate(name: string, body: string): EmailTemplate {
  return {
    id: `tpl_${Date.now()}`,
    name,
    body,
    created_at: new Date().toISOString(),
  };
}
