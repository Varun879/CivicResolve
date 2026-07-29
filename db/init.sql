-- Enable PostGIS for geospatial lookups and UUID generation
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. Canonical Enumerations & Types
-- ==========================================
DO $$ BEGIN
    CREATE TYPE role_enum AS ENUM ('CITIZEN', 'FIELD_OFFICER', 'DEPT_HEAD', 'COMMISSIONER', 'SUPER_ADMIN', 'DEPARTMENT_HEAD', 'MUNICIPAL_COMMISSIONER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE auth_provider_enum AS ENUM ('LOCAL', 'GOOGLE', 'OTP');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE reward_level_enum AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'DIAMOND', 'CITY_GUARDIAN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE complaint_status_enum AS ENUM ('REPORTED', 'VERIFIED', 'ASSIGNED', 'ACCEPTED', 'WORK_STARTED', 'UNDER_INSPECTION', 'RESOLVED', 'CITIZEN_VERIFICATION', 'CLOSED', 'REJECTED', 'REOPENED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE category_enum AS ENUM ('POTHOLE', 'DAMAGED_ROAD', 'FOOTPATH_DAMAGE', 'STREETLIGHT', 'TRAFFIC_SIGNAL', 'GARBAGE', 'ILLEGAL_DUMPING', 'OVERFLOWING_DUSTBIN', 'ANIMAL_CARCASS', 'DRAINAGE_BLOCKAGE', 'WATER_LOGGING', 'SEWAGE_OVERFLOW', 'WATER_LEAKAGE', 'OPEN_MANHOLE', 'FALLEN_TREE', 'PARK_MAINTENANCE', 'PUBLIC_PROPERTY_DAMAGE', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE severity_enum AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE priority_band_enum AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE escalation_level_enum AS ENUM ('FIELD_OFFICER', 'ASSISTANT_ENGINEER', 'EXECUTIVE_ENGINEER', 'MUNICIPAL_COMMISSIONER', 'STATE_DASHBOARD');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE image_type_enum AS ENUM ('BEFORE', 'PROGRESS', 'AFTER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE notification_channel_enum AS ENUM ('PUSH', 'EMAIL', 'SMS');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE performance_grade_enum AS ENUM ('EXCELLENT', 'GOOD', 'AVERAGE', 'NEEDS_IMPROVEMENT', 'CRITICAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==========================================
-- 2. Domain Models (Tables)
-- ==========================================

CREATE TABLE IF NOT EXISTS "user" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50),
    password_hash VARCHAR(255),
    role VARCHAR(50) NOT NULL,
    auth_provider VARCHAR(50) NOT NULL,
    points INTEGER DEFAULT 0,
    reward_level VARCHAR(50) DEFAULT 'BRONZE',
    department VARCHAR(255),
    location VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT chk_user_points_non_negative CHECK (points >= 0),
    CONSTRAINT chk_user_email_format CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._+%-]+@[A-Za-z0-9.-]+[.][A-Za-z]+$'),
    CONSTRAINT chk_user_name_not_empty CHECK (length(trim(name)) > 0),
    CONSTRAINT chk_user_role CHECK (role IN ('CITIZEN', 'FIELD_OFFICER', 'DEPT_HEAD', 'COMMISSIONER', 'SUPER_ADMIN', 'DEPARTMENT_HEAD', 'MUNICIPAL_COMMISSIONER')),
    CONSTRAINT chk_user_auth_provider CHECK (auth_provider IN ('LOCAL', 'GOOGLE', 'OTP')),
    CONSTRAINT chk_user_reward_level CHECK (reward_level IN ('BRONZE', 'SILVER', 'GOLD', 'DIAMOND', 'CITY_GUARDIAN'))
);

CREATE TABLE IF NOT EXISTS department (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    category_list JSONB,
    CONSTRAINT chk_dept_name_not_empty CHECK (length(trim(name)) > 0)
);

CREATE TABLE IF NOT EXISTS region (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    CONSTRAINT chk_region_name_not_empty CHECK (length(trim(name)) > 0)
);

CREATE TABLE IF NOT EXISTS zone (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    region_id UUID NOT NULL REFERENCES region(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    CONSTRAINT chk_zone_name_not_empty CHECK (length(trim(name)) > 0)
);

CREATE TABLE IF NOT EXISTS ward (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zone_id UUID REFERENCES zone(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    boundary_geojson GEOMETRY(Polygon, 4326),
    CONSTRAINT chk_ward_name_not_empty CHECK (length(trim(name)) > 0)
);

CREATE TABLE IF NOT EXISTS officer (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES "user"(id) ON DELETE CASCADE,
    department_id UUID REFERENCES department(id) ON DELETE RESTRICT,
    designation VARCHAR(255) NOT NULL,
    current_score DECIMAL(5,2) DEFAULT 0.00,
    current_grade VARCHAR(50) DEFAULT 'GOOD',
    CONSTRAINT chk_officer_designation CHECK (length(trim(designation)) > 0),
    CONSTRAINT chk_officer_score CHECK (current_score >= 0.0 AND current_score <= 100.0),
    CONSTRAINT chk_officer_grade CHECK (current_grade IN ('EXCELLENT', 'GOOD', 'AVERAGE', 'NEEDS_IMPROVEMENT', 'CRITICAL'))
);

CREATE TABLE IF NOT EXISTS ward_department_officer (
    ward_id UUID NOT NULL REFERENCES ward(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES department(id) ON DELETE CASCADE,
    officer_id UUID NOT NULL REFERENCES officer(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (ward_id, department_id, officer_id)
);

CREATE TABLE IF NOT EXISTS complaint (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    citizen_id UUID NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
    category VARCHAR(100),
    description TEXT,
    severity VARCHAR(50),
    priority_score DECIMAL(5,4),
    priority_band VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'REPORTED',
    latitude DECIMAL(9,6) NOT NULL,
    longitude DECIMAL(9,6) NOT NULL,
    geom GEOMETRY(Point, 4326),
    ward_id UUID REFERENCES ward(id) ON DELETE SET NULL,
    department_id UUID REFERENCES department(id) ON DELETE RESTRICT,
    assigned_officer_id UUID REFERENCES "user"(id) ON DELETE SET NULL,
    ai_confidence_score DECIMAL(5,4),
    estimated_resolution_hours INTEGER,
    sla_deadline TIMESTAMP WITH TIME ZONE,
    support_count INTEGER DEFAULT 1,
    duplicate_of_id UUID REFERENCES complaint(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    public_id VARCHAR(50),
    reopen_count INTEGER DEFAULT 0,
    image_base64 TEXT,
    resolution_image_base64 TEXT,
    resolution_latitude DECIMAL(9,6),
    resolution_longitude DECIMAL(9,6),
    is_escalated BOOLEAN DEFAULT FALSE,
    superior_officer_id UUID REFERENCES "user"(id) ON DELETE SET NULL,
    CONSTRAINT chk_complaint_latitude CHECK (latitude >= -90.0 AND latitude <= 90.0),
    CONSTRAINT chk_complaint_longitude CHECK (longitude >= -180.0 AND longitude <= 180.0),
    CONSTRAINT chk_complaint_res_lat CHECK (resolution_latitude IS NULL OR (resolution_latitude >= -90.0 AND resolution_latitude <= 90.0)),
    CONSTRAINT chk_complaint_res_lng CHECK (resolution_longitude IS NULL OR (resolution_longitude >= -180.0 AND resolution_longitude <= 180.0)),
    CONSTRAINT chk_complaint_status CHECK (status IN ('REPORTED', 'VERIFIED', 'ASSIGNED', 'ACCEPTED', 'WORK_STARTED', 'UNDER_INSPECTION', 'RESOLVED', 'CITIZEN_VERIFICATION', 'CLOSED', 'REJECTED', 'REOPENED')),
    CONSTRAINT chk_complaint_priority_score CHECK (priority_score IS NULL OR (priority_score >= 0.0 AND priority_score <= 1.0)),
    CONSTRAINT chk_complaint_ai_confidence CHECK (ai_confidence_score IS NULL OR (ai_confidence_score >= 0.0 AND ai_confidence_score <= 1.0)),
    CONSTRAINT chk_complaint_support_count CHECK (support_count >= 1),
    CONSTRAINT chk_complaint_reopen_count CHECK (reopen_count >= 0),
    CONSTRAINT chk_complaint_est_hours CHECK (estimated_resolution_hours IS NULL OR estimated_resolution_hours > 0),
    CONSTRAINT chk_complaint_severity CHECK (severity IS NULL OR severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    CONSTRAINT chk_complaint_priority_band CHECK (priority_band IS NULL OR priority_band IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    CONSTRAINT chk_complaint_resolved_after_created CHECK (resolved_at IS NULL OR resolved_at >= created_at),
    CONSTRAINT chk_complaint_closed_after_created CHECK (closed_at IS NULL OR closed_at >= created_at)
);

CREATE TABLE IF NOT EXISTS complaint_image (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id UUID NOT NULL REFERENCES complaint(id) ON DELETE CASCADE,
    url VARCHAR(1024) NOT NULL,
    type VARCHAR(50) NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT chk_image_type CHECK (type IN ('BEFORE', 'PROGRESS', 'AFTER'))
);

CREATE TABLE IF NOT EXISTS complaint_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id UUID NOT NULL REFERENCES complaint(id) ON DELETE CASCADE,
    from_status VARCHAR(50),
    to_status VARCHAR(50) NOT NULL,
    changed_by UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    reason TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS escalation (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id UUID NOT NULL REFERENCES complaint(id) ON DELETE CASCADE,
    level VARCHAR(50) NOT NULL,
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reason TEXT
);

CREATE TABLE IF NOT EXISTS performance_record (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    officer_id UUID NOT NULL REFERENCES officer(id) ON DELETE CASCADE,
    period VARCHAR(50) NOT NULL,
    avg_resolution_hours DECIMAL(6,2),
    sla_compliance_pct DECIMAL(5,2),
    escalation_count INTEGER DEFAULT 0,
    satisfaction_rating DECIMAL(3,2),
    reopen_rate_pct DECIMAL(5,2),
    score DECIMAL(5,2),
    grade VARCHAR(50),
    UNIQUE(officer_id, period),
    CONSTRAINT chk_perf_sla_pct CHECK (sla_compliance_pct IS NULL OR (sla_compliance_pct >= 0.0 AND sla_compliance_pct <= 100.0)),
    CONSTRAINT chk_perf_reopen_pct CHECK (reopen_rate_pct IS NULL OR (reopen_rate_pct >= 0.0 AND reopen_rate_pct <= 100.0)),
    CONSTRAINT chk_perf_satisfaction CHECK (satisfaction_rating IS NULL OR (satisfaction_rating >= 0.0 AND satisfaction_rating <= 5.0)),
    CONSTRAINT chk_perf_score CHECK (score IS NULL OR (score >= 0.0 AND score <= 100.0)),
    CONSTRAINT chk_perf_escalations CHECK (escalation_count >= 0)
);

CREATE TABLE IF NOT EXISTS reward_transaction (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    citizen_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    reason TEXT NOT NULL,
    reference_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT chk_reward_amount_not_zero CHECK (amount <> 0),
    CONSTRAINT chk_reward_reason_not_empty CHECK (length(trim(reason)) > 0)
);

CREATE TABLE IF NOT EXISTS notification (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    citizen_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    reference_id UUID,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT chk_notif_title_not_empty CHECK (length(trim(title)) > 0),
    CONSTRAINT chk_notif_msg_not_empty CHECK (length(trim(message)) > 0)
);

CREATE TABLE IF NOT EXISTS comment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id UUID NOT NULL REFERENCES complaint(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT chk_comment_content_not_empty CHECK (length(trim(content)) > 0)
);

CREATE TABLE IF NOT EXISTS vote (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id UUID NOT NULL REFERENCES complaint(id) ON DELETE CASCADE,
    citizen_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uk_vote_complaint_citizen UNIQUE (complaint_id, citizen_id)
);

CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES "user"(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(255) NOT NULL,
    entity_id UUID NOT NULL,
    old_value JSONB,
    new_value JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sla_rule (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(100) NOT NULL UNIQUE,
    duration_hours INTEGER NOT NULL,
    CONSTRAINT chk_sla_duration_positive CHECK (duration_hours > 0)
);

CREATE TABLE IF NOT EXISTS priority_factor_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factor_name VARCHAR(255) NOT NULL UNIQUE,
    weight DECIMAL(3,2) NOT NULL,
    CONSTRAINT chk_priority_weight CHECK (weight >= 0.0)
);

-- ==========================================
-- 3. Essential Indexes
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_complaint_geom ON complaint USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_ward_boundary ON ward USING GIST (boundary_geojson);
CREATE INDEX IF NOT EXISTS idx_complaint_status ON complaint (status);
CREATE INDEX IF NOT EXISTS idx_complaint_ward ON complaint (ward_id);
CREATE INDEX IF NOT EXISTS idx_complaint_citizen ON complaint (citizen_id);
CREATE INDEX IF NOT EXISTS idx_complaint_assigned_officer ON complaint (assigned_officer_id);
CREATE INDEX IF NOT EXISTS idx_officer_user ON officer (user_id);
CREATE INDEX IF NOT EXISTS idx_history_complaint ON complaint_status_history (complaint_id);
CREATE INDEX IF NOT EXISTS idx_comment_complaint ON comment (complaint_id, created_at);
CREATE INDEX IF NOT EXISTS idx_reward_citizen ON reward_transaction (citizen_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_citizen_read ON notification (citizen_id, is_read);

-- ==========================================
-- 4. Automatic PostGIS Geometry Trigger
-- ==========================================

CREATE OR REPLACE FUNCTION update_complaint_geom()
RETURNS TRIGGER AS $$
BEGIN
  NEW.geom = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_complaint_geom ON complaint;
CREATE TRIGGER trg_complaint_geom
BEFORE INSERT OR UPDATE OF latitude, longitude ON complaint
FOR EACH ROW
EXECUTE FUNCTION update_complaint_geom();

-- ==========================================
-- 5. Enforce Schema & Constraints on Existing Tables
-- ==========================================

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS department VARCHAR(255);
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS location VARCHAR(255);

ALTER TABLE complaint ADD COLUMN IF NOT EXISTS public_id VARCHAR(50);
ALTER TABLE complaint ADD COLUMN IF NOT EXISTS reopen_count INTEGER DEFAULT 0;
ALTER TABLE complaint ADD COLUMN IF NOT EXISTS image_base64 TEXT;
ALTER TABLE complaint ADD COLUMN IF NOT EXISTS resolution_image_base64 TEXT;
ALTER TABLE complaint ADD COLUMN IF NOT EXISTS resolution_latitude DECIMAL(9,6);
ALTER TABLE complaint ADD COLUMN IF NOT EXISTS resolution_longitude DECIMAL(9,6);
ALTER TABLE complaint ADD COLUMN IF NOT EXISTS is_escalated BOOLEAN DEFAULT FALSE;
ALTER TABLE complaint ADD COLUMN IF NOT EXISTS superior_officer_id UUID REFERENCES "user"(id) ON DELETE SET NULL;

ALTER TABLE notification ADD COLUMN IF NOT EXISTS reference_id UUID;
ALTER TABLE reward_transaction ADD COLUMN IF NOT EXISTS reference_id UUID;

DO $$ BEGIN ALTER TABLE "user" ADD CONSTRAINT chk_user_points_non_negative CHECK (points >= 0); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "user" ADD CONSTRAINT chk_user_name_not_empty CHECK (length(trim(name)) > 0); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "user" ADD CONSTRAINT chk_user_email_format CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._+%-]+@[A-Za-z0-9.-]+[.][A-Za-z]+$'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "user" ADD CONSTRAINT chk_user_role CHECK (role IN ('CITIZEN', 'FIELD_OFFICER', 'DEPT_HEAD', 'COMMISSIONER', 'SUPER_ADMIN', 'DEPARTMENT_HEAD', 'MUNICIPAL_COMMISSIONER')); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "user" ADD CONSTRAINT chk_user_auth_provider CHECK (auth_provider IN ('LOCAL', 'GOOGLE', 'OTP')); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "user" ADD CONSTRAINT chk_user_reward_level CHECK (reward_level IN ('BRONZE', 'SILVER', 'GOLD', 'DIAMOND', 'CITY_GUARDIAN')); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN ALTER TABLE complaint ADD CONSTRAINT chk_complaint_latitude CHECK (latitude >= -90.0 AND latitude <= 90.0); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE complaint ADD CONSTRAINT chk_complaint_longitude CHECK (longitude >= -180.0 AND longitude <= 180.0); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE complaint ADD CONSTRAINT chk_complaint_res_lat CHECK (resolution_latitude IS NULL OR (resolution_latitude >= -90.0 AND resolution_latitude <= 90.0)); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE complaint ADD CONSTRAINT chk_complaint_res_lng CHECK (resolution_longitude IS NULL OR (resolution_longitude >= -180.0 AND resolution_longitude <= 180.0)); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE complaint ADD CONSTRAINT chk_complaint_priority_score CHECK (priority_score IS NULL OR (priority_score >= 0.0 AND priority_score <= 1.0)); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE complaint ADD CONSTRAINT chk_complaint_ai_confidence CHECK (ai_confidence_score IS NULL OR (ai_confidence_score >= 0.0 AND ai_confidence_score <= 1.0)); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE complaint ADD CONSTRAINT chk_complaint_support_count CHECK (support_count >= 1); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE complaint ADD CONSTRAINT chk_complaint_reopen_count CHECK (reopen_count >= 0); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE complaint ADD CONSTRAINT chk_complaint_est_hours CHECK (estimated_resolution_hours IS NULL OR estimated_resolution_hours > 0); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE complaint ADD CONSTRAINT chk_complaint_severity CHECK (severity IS NULL OR severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE complaint ADD CONSTRAINT chk_complaint_priority_band CHECK (priority_band IS NULL OR priority_band IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE complaint ADD CONSTRAINT chk_complaint_resolved_after_created CHECK (resolved_at IS NULL OR resolved_at >= created_at); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE complaint ADD CONSTRAINT chk_complaint_closed_after_created CHECK (closed_at IS NULL OR closed_at >= created_at); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN ALTER TABLE comment ADD CONSTRAINT chk_comment_content_not_empty CHECK (length(trim(content)) > 0); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE notification ADD CONSTRAINT chk_notif_title_not_empty CHECK (length(trim(title)) > 0); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE notification ADD CONSTRAINT chk_notif_msg_not_empty CHECK (length(trim(message)) > 0); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE reward_transaction ADD CONSTRAINT chk_reward_amount_not_zero CHECK (amount <> 0); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE reward_transaction ADD CONSTRAINT chk_reward_reason_not_empty CHECK (length(trim(reason)) > 0); EXCEPTION WHEN duplicate_object THEN null; END $$;
