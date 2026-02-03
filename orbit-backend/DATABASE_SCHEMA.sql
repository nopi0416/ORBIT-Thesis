-- ORBIT Authentication & User Management Tables
-- Run these SQL commands in your Supabase PostgreSQL database

-- 1. Users Table
CREATE TABLE IF NOT EXISTS tblusers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(50) DEFAULT 'requestor',
  is_active BOOLEAN DEFAULT true,
  password_change_required BOOLEAN DEFAULT false,
  password_changed_at TIMESTAMP,
  password_expires_at TIMESTAMP,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email for faster lookups
CREATE INDEX idx_tblusers_email ON tblusers(email);

-- 2. OTP Table (One-Time Password)
CREATE TABLE IF NOT EXISTS tblotp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  otp VARCHAR(6) NOT NULL,
  type VARCHAR(50) DEFAULT 'reset', -- 'reset' or 'register'
  is_used BOOLEAN DEFAULT false,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email for faster lookups
CREATE INDEX idx_tblotp_email ON tblotp(email);

-- 3. Security Questions Table
CREATE TABLE IF NOT EXISTS tblsecurity_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  question_1 TEXT NOT NULL,
  answer_1 VARCHAR(255) NOT NULL,
  question_2 TEXT NOT NULL,
  answer_2 VARCHAR(255) NOT NULL,
  question_3 TEXT NOT NULL,
  answer_3 VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES tblusers(id) ON DELETE CASCADE
);

-- Create index on user_id for faster lookups
CREATE INDEX idx_tblsecurity_questions_user_id ON tblsecurity_questions(user_id);

-- 4. Support Tickets Table
CREATE TABLE IF NOT EXISTS tblsupport_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  issue_type VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'open', -- 'open', 'in_progress', 'closed'
  priority VARCHAR(50) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  resolution_notes TEXT,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email for faster lookups
CREATE INDEX idx_tblsupport_tickets_email ON tblsupport_tickets(email);
CREATE INDEX idx_tblsupport_tickets_status ON tblsupport_tickets(status);

-- 5. User Agreement Acceptances Table
CREATE TABLE IF NOT EXISTS tbluser_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  version VARCHAR(20) DEFAULT '1.0',
  accepted_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES tblusers(id) ON DELETE CASCADE
);

-- Create index on user_id for faster lookups
CREATE INDEX idx_tbluser_agreements_user_id ON tbluser_agreements(user_id);

-- 6. Password History Table (optional - for tracking password changes)
CREATE TABLE IF NOT EXISTS tblpassword_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  old_password VARCHAR(255) NOT NULL,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES tblusers(id) ON DELETE CASCADE
);

-- Create index on user_id for faster lookups
CREATE INDEX idx_tblpassword_history_user_id ON tblpassword_history(user_id);

-- 7. Login Audit Log Table (optional - for security audit trails)
CREATE TABLE IF NOT EXISTS tbllogin_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email VARCHAR(255),
  login_status VARCHAR(50), -- 'success', 'failed'
  ip_address VARCHAR(50),
  user_agent TEXT,
  logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES tblusers(id) ON DELETE CASCADE
);

-- Create index on user_id for faster lookups
CREATE INDEX idx_tbllogin_audit_user_id ON tbllogin_audit(user_id);

-- Add FOREIGN KEY constraints for referenced tables if not already present
ALTER TABLE tblsecurity_questions
  ADD CONSTRAINT fk_tblsecurity_questions_user_id
  FOREIGN KEY (user_id) REFERENCES tblusers(id) ON DELETE CASCADE;

ALTER TABLE tbluser_agreements
  ADD CONSTRAINT fk_tbluser_agreements_user_id
  FOREIGN KEY (user_id) REFERENCES tblusers(id) ON DELETE CASCADE;

ALTER TABLE tblpassword_history
  ADD CONSTRAINT fk_tblpassword_history_user_id
  FOREIGN KEY (user_id) REFERENCES tblusers(id) ON DELETE CASCADE;

ALTER TABLE tbllogin_audit
  ADD CONSTRAINT fk_tbllogin_audit_user_id
  FOREIGN KEY (user_id) REFERENCES tblusers(id) ON DELETE CASCADE;
