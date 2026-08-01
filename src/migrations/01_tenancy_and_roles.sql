-- =============================================================================
-- MIGRATION 01: TENANCY AND ROLES SCHEMA
-- Multi-Tenant B2B/B2C Architecture for Vigyan.prep Platform & Partners
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ORGANISATIONS TABLE
CREATE TABLE IF NOT EXISTS organisations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'partner' CHECK (type IN ('platform', 'partner')),
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'archived')),
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50),
    settings JSONB DEFAULT '{
        "auto_publish_results": false,
        "show_platform_ranks": true,
        "allow_offline_sync": true,
        "max_students": 500
    }'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed Platform Org if not exists
INSERT INTO organisations (id, name, type, contact_email)
VALUES ('00000000-0000-0000-0000-000000000001', 'Vigyan.prep Platform HQ', 'platform', 'admin@vigyanprep.com')
ON CONFLICT (id) DO NOTHING;

-- 2. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role VARCHAR(50) NOT NULL CHECK (role IN (
        'super_admin',
        'platform_admin',
        'content_manager',
        'evaluator',
        'partner_admin',
        'partner_staff',
        'student'
    )),
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending_verification')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_org_id ON users(org_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
