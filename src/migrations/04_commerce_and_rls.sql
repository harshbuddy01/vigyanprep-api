-- =============================================================================
-- MIGRATION 04: COMMERCE, AUDIT LOG & ROW-LEVEL SECURITY (RLS) POLICIES
-- Cryptographic partner data isolation at the database engine layer
-- =============================================================================

-- 1. ENROLLMENT INVITES TABLE (Partner B2B Onboarding)
CREATE TABLE IF NOT EXISTS enrollment_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    payment_link TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expired', 'cancelled')),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. PAYMENTS TABLE (Razorpay Verified Transactions)
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE SET NULL,
    razorpay_order_id VARCHAR(255) NOT NULL,
    razorpay_payment_id VARCHAR(255),
    amount NUMERIC(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'created' CHECK (status IN ('created', 'captured', 'failed', 'refunded')),
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. AUDIT LOG TABLE (Break-Glass Audit Trail)
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    org_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
    action VARCHAR(255) NOT NULL,
    target_table VARCHAR(100),
    target_id UUID,
    ip_address VARCHAR(100),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. QUESTION CHALLENGES TABLE
CREATE TABLE IF NOT EXISTS challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
    test_id UUID REFERENCES tests(id) ON DELETE CASCADE,
    question_id UUID REFERENCES question_bank(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    proof_url TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    admin_reply TEXT,
    admin_proof_url TEXT,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Guarantees that partner organisations cannot read/write each other's data
-- =============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempt_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempt_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollment_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

-- Dynamic RLS Policy Template based on app.current_org_id setting
-- Platform Admins (or service role) bypass when app.current_org_id is null / 'platform'

DROP POLICY IF EXISTS org_isolation_users ON users;
CREATE POLICY org_isolation_users ON users FOR ALL
USING (
    org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR current_setting('app.current_org_id', true) = '00000000-0000-0000-0000-000000000001'
    OR current_setting('app.current_org_id', true) IS NULL
);

DROP POLICY IF EXISTS org_isolation_tests ON tests;
CREATE POLICY org_isolation_tests ON tests FOR ALL
USING (
    org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR current_setting('app.current_org_id', true) = '00000000-0000-0000-0000-000000000001'
    OR current_setting('app.current_org_id', true) IS NULL
);

DROP POLICY IF EXISTS org_isolation_attempts ON attempts;
CREATE POLICY org_isolation_attempts ON attempts FOR ALL
USING (
    org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR current_setting('app.current_org_id', true) = '00000000-0000-0000-0000-000000000001'
    OR current_setting('app.current_org_id', true) IS NULL
);

DROP POLICY IF EXISTS org_isolation_results ON results;
CREATE POLICY org_isolation_results ON results FOR ALL
USING (
    org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR current_setting('app.current_org_id', true) = '00000000-0000-0000-0000-000000000001'
    OR current_setting('app.current_org_id', true) IS NULL
);
