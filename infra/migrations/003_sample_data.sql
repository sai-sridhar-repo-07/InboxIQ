-- Run only in development environment
-- =============================================
-- SAMPLE DATA FOR LOCAL DEVELOPMENT & TESTING
-- =============================================
-- Prerequisites:
--   1. Run 001_initial_schema.sql first
--   2. Run 002_pgvector_functions.sql second
--   3. Replace '00000000-0000-0000-0000-000000000000' with a real
--      auth.users UUID from your local Supabase instance, OR
--      temporarily disable RLS for seeding:
--        ALTER TABLE emails DISABLE ROW LEVEL SECURITY;
--        -- run inserts --
--        ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
--
-- Usage:
--   supabase db reset  (resets and reruns all migrations)
--   psql $DATABASE_URL -f 003_sample_data.sql
-- =============================================

DO $$
DECLARE
    sample_user_id UUID := '00000000-0000-0000-0000-000000000000';
    email_1_id UUID := uuid_generate_v4();
    email_2_id UUID := uuid_generate_v4();
    email_3_id UUID := uuid_generate_v4();
BEGIN

-- =============================================
-- SAMPLE USER PROFILE
-- =============================================
INSERT INTO user_profiles (id, name, company_description, tone_preference, urgency_threshold)
VALUES (
    sample_user_id,
    'Alex Developer',
    'A SaaS startup building productivity tools for small teams.',
    'professional',
    7
)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- SAMPLE EMAILS
-- =============================================

-- Email 1: High-priority client request
INSERT INTO emails (
    id,
    user_id,
    gmail_message_id,
    thread_id,
    subject,
    sender,
    sender_email,
    recipient,
    body,
    received_at,
    priority,
    category,
    ai_summary,
    confidence_score,
    processed,
    processed_at,
    read,
    labels
)
VALUES (
    email_1_id,
    sample_user_id,
    'msg_sample_001',
    'thread_sample_001',
    'Urgent: Contract renewal deadline this Friday',
    'Sarah Johnson',
    'sarah.johnson@bigclient.com',
    'alex@inboxiq.app',
    'Hi Alex,

I wanted to follow up on the contract renewal we discussed last week. Our legal team needs the signed documents by this Friday (EOD) or we will need to pause the engagement until Q2.

Could you please review the attached terms and let me know if everything looks good? If there are any changes needed, please flag them ASAP so we have time to revise.

Best regards,
Sarah Johnson
VP of Operations, BigClient Corp',
    NOW() - INTERVAL '2 hours',
    9,
    'enterprise_client',
    'Client requires signed contract renewal by Friday EOD or engagement pauses until Q2. Immediate review and response needed.',
    0.95,
    TRUE,
    NOW() - INTERVAL '1 hour',
    FALSE,
    ARRAY['inbox', 'important', 'client']
),

-- Email 2: Medium-priority team update
(
    email_2_id,
    sample_user_id,
    'msg_sample_002',
    'thread_sample_002',
    'Q1 Engineering Sprint Review - Notes & Next Steps',
    'Marcus Chen',
    'marcus@yourcompany.com',
    'alex@inboxiq.app',
    'Hey Alex,

Here are the notes from today''s sprint review:

Completed:
- Auth flow refactor (ticket #142)
- Gmail webhook integration (ticket #156)
- Dashboard performance improvements

In Progress:
- AI classifier fine-tuning (ticket #161) - 70% done
- Stripe billing integration (ticket #163) - needs your input on pricing tiers

Blocked:
- Mobile responsive design - waiting on Figma files from design team

Next sprint planning is Thursday at 2pm. Please review the proposed ticket list before then.

Cheers,
Marcus',
    NOW() - INTERVAL '5 hours',
    5,
    'internal',
    'Sprint review summary: auth, Gmail webhook, and dashboard completed. Billing integration needs input. Planning meeting Thursday 2pm.',
    0.88,
    TRUE,
    NOW() - INTERVAL '4 hours',
    TRUE,
    ARRAY['inbox', 'team']
),

-- Email 3: Low-priority newsletter
(
    email_3_id,
    sample_user_id,
    'msg_sample_003',
    'thread_sample_003',
    'This Week in AI: GPT-5 Benchmarks, Claude Updates & More',
    'The AI Weekly Digest',
    'newsletter@aiweekly.dev',
    'alex@inboxiq.app',
    'Welcome to this week''s AI digest!

TOP STORIES:
1. OpenAI releases new reasoning benchmarks showing 40% improvement in code generation tasks
2. Anthropic announces Claude''s expanded context window now supports 500k tokens
3. Google DeepMind''s Gemini Ultra scores top marks on MMLU professional law benchmark

TOOLS & RELEASES:
- LangChain v0.3 drops with improved streaming support
- Hugging Face releases new open-source embedding model (free tier available)
- Cursor IDE integrates multi-file refactoring with GPT-4o

READING:
"Why RAG is eating the world" - a deep dive into retrieval-augmented generation

Unsubscribe | View in browser',
    NOW() - INTERVAL '1 day',
    2,
    'newsletter',
    'Weekly AI newsletter covering GPT-5 benchmarks, Claude context window expansion, and new developer tooling releases.',
    0.92,
    TRUE,
    NOW() - INTERVAL '23 hours',
    FALSE,
    ARRAY['inbox', 'newsletter']
);

-- =============================================
-- SAMPLE ACTION ITEMS
-- =============================================
INSERT INTO actions (email_id, user_id, task, deadline, status)
VALUES
    (
        email_1_id,
        sample_user_id,
        'Review and sign contract renewal documents from Sarah Johnson at BigClient Corp',
        NOW() + INTERVAL '2 days',
        'pending'
    ),
    (
        email_1_id,
        sample_user_id,
        'Reply to Sarah confirming receipt and expected turnaround time',
        NOW() + INTERVAL '4 hours',
        'pending'
    ),
    (
        email_2_id,
        sample_user_id,
        'Review proposed Q2 sprint ticket list before Thursday 2pm planning meeting',
        NOW() + INTERVAL '2 days',
        'pending'
    ),
    (
        email_2_id,
        sample_user_id,
        'Provide input on Stripe billing pricing tiers to unblock ticket #163',
        NOW() + INTERVAL '1 day',
        'in_progress'
    );

-- =============================================
-- SAMPLE REPLY DRAFTS
-- =============================================
INSERT INTO reply_drafts (email_id, user_id, draft_text, confidence)
VALUES (
    email_1_id,
    sample_user_id,
    'Hi Sarah,

Thank you for the reminder. I have reviewed the contract renewal terms and everything looks good from our end.

I will have the signed documents back to you by Thursday EOD, giving you a full day of buffer before your Friday deadline.

Please let me know if anything else is needed in the meantime.

Best regards,
Alex',
    0.87
);

END $$;
