export interface SchemaMigrationDefinition {
  description: string;
  id: string;
  statements: string[];
}

export const NORMALIZED_MIGRATIONS: SchemaMigrationDefinition[] = [
  {
    id: '004-normalized-iam-and-client-schema',
    description: 'Create normalized IAM, RBAC, client account, and counsel tables.',
    statements: [
      `CREATE TABLE IF NOT EXISTS business_sequences (
        sequence_key VARCHAR(64) NOT NULL,
        sequence_year SMALLINT UNSIGNED NOT NULL,
        next_value BIGINT UNSIGNED NOT NULL,
        created_at DATETIME(6) NOT NULL,
        updated_at DATETIME(6) NOT NULL,
        PRIMARY KEY (sequence_key, sequence_year),
        CONSTRAINT chk_business_sequences_next_value CHECK (next_value > 0)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS users (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        public_id CHAR(26) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(40) NULL,
        display_name VARCHAR(160) NOT NULL,
        first_name VARCHAR(80) NOT NULL,
        last_name VARCHAR(80) NULL,
        actor_type_code VARCHAR(32) NOT NULL,
        account_status_code VARCHAR(32) NOT NULL,
        timezone_name VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata',
        locale_code VARCHAR(16) NOT NULL DEFAULT 'en-IN',
        avatar_url VARCHAR(500) NULL,
        login_enabled TINYINT(1) NOT NULL DEFAULT 1,
        last_login_at DATETIME(6) NULL,
        email_verified_at DATETIME(6) NULL,
        phone_verified_at DATETIME(6) NULL,
        created_at DATETIME(6) NOT NULL,
        updated_at DATETIME(6) NOT NULL,
        archived_at DATETIME(6) NULL,
        row_version BIGINT UNSIGNED NOT NULL DEFAULT 1,
        PRIMARY KEY (id),
        UNIQUE KEY uq_users_public_id (public_id),
        UNIQUE KEY uq_users_email (email),
        UNIQUE KEY uq_users_phone (phone)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS user_credentials (
        user_id BIGINT UNSIGNED NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        password_algo VARCHAR(64) NOT NULL,
        password_changed_at DATETIME(6) NOT NULL,
        must_rotate_password TINYINT(1) NOT NULL DEFAULT 0,
        PRIMARY KEY (user_id),
        CONSTRAINT fk_user_credentials_user FOREIGN KEY (user_id)
          REFERENCES users (id)
          ON UPDATE CASCADE
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS user_oauth_accounts (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        public_id CHAR(26) NOT NULL,
        user_id BIGINT UNSIGNED NOT NULL,
        provider_code VARCHAR(32) NOT NULL,
        provider_subject VARCHAR(255) NOT NULL,
        provider_email VARCHAR(255) NULL,
        linked_at DATETIME(6) NOT NULL,
        created_at DATETIME(6) NOT NULL,
        updated_at DATETIME(6) NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_user_oauth_accounts_public_id (public_id),
        UNIQUE KEY uq_user_oauth_provider_subject (provider_code, provider_subject),
        CONSTRAINT fk_user_oauth_accounts_user FOREIGN KEY (user_id)
          REFERENCES users (id)
          ON UPDATE CASCADE
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS user_sessions (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        public_id CHAR(26) NOT NULL,
        user_id BIGINT UNSIGNED NOT NULL,
        session_token_hash CHAR(64) NOT NULL,
        csrf_secret_hash CHAR(64) NOT NULL,
        remember_me TINYINT(1) NOT NULL DEFAULT 0,
        ip_address VARCHAR(45) NULL,
        user_agent TEXT NULL,
        device_label VARCHAR(100) NULL,
        expires_at DATETIME(6) NOT NULL,
        last_seen_at DATETIME(6) NOT NULL,
        revoked_at DATETIME(6) NULL,
        created_at DATETIME(6) NOT NULL,
        updated_at DATETIME(6) NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_user_sessions_public_id (public_id),
        UNIQUE KEY uq_user_sessions_token_hash (session_token_hash),
        INDEX idx_user_sessions_user (user_id),
        INDEX idx_user_sessions_expires (expires_at),
        CONSTRAINT fk_user_sessions_user FOREIGN KEY (user_id)
          REFERENCES users (id)
          ON UPDATE CASCADE
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS email_verification_tokens (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        public_id CHAR(26) NOT NULL,
        user_id BIGINT UNSIGNED NOT NULL,
        purpose_code VARCHAR(32) NOT NULL,
        code_hash CHAR(64) NOT NULL,
        expires_at DATETIME(6) NOT NULL,
        sent_at DATETIME(6) NOT NULL,
        consumed_at DATETIME(6) NULL,
        attempt_count INT UNSIGNED NOT NULL DEFAULT 0,
        created_at DATETIME(6) NOT NULL,
        updated_at DATETIME(6) NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_email_verification_public_id (public_id),
        INDEX idx_email_verification_user (user_id),
        INDEX idx_email_verification_expires (expires_at),
        CONSTRAINT fk_email_verification_tokens_user FOREIGN KEY (user_id)
          REFERENCES users (id)
          ON UPDATE CASCADE
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS phone_verification_tokens (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        public_id CHAR(26) NOT NULL,
        user_id BIGINT UNSIGNED NOT NULL,
        phone_snapshot VARCHAR(40) NOT NULL,
        purpose_code VARCHAR(32) NOT NULL,
        code_hash CHAR(64) NOT NULL,
        expires_at DATETIME(6) NOT NULL,
        sent_at DATETIME(6) NOT NULL,
        consumed_at DATETIME(6) NULL,
        attempt_count INT UNSIGNED NOT NULL DEFAULT 0,
        created_at DATETIME(6) NOT NULL,
        updated_at DATETIME(6) NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_phone_verification_public_id (public_id),
        INDEX idx_phone_verification_user (user_id),
        INDEX idx_phone_verification_expires (expires_at),
        CONSTRAINT fk_phone_verification_tokens_user FOREIGN KEY (user_id)
          REFERENCES users (id)
          ON UPDATE CASCADE
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        public_id CHAR(26) NOT NULL,
        user_id BIGINT UNSIGNED NOT NULL,
        code_hash CHAR(64) NOT NULL,
        expires_at DATETIME(6) NOT NULL,
        sent_at DATETIME(6) NOT NULL,
        consumed_at DATETIME(6) NULL,
        attempt_count INT UNSIGNED NOT NULL DEFAULT 0,
        created_at DATETIME(6) NOT NULL,
        updated_at DATETIME(6) NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_password_reset_public_id (public_id),
        INDEX idx_password_reset_user (user_id),
        INDEX idx_password_reset_expires (expires_at),
        CONSTRAINT fk_password_reset_tokens_user FOREIGN KEY (user_id)
          REFERENCES users (id)
          ON UPDATE CASCADE
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS auth_flows (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        public_id CHAR(26) NOT NULL,
        user_id BIGINT UNSIGNED NOT NULL,
        purpose_code VARCHAR(32) NOT NULL,
        remember_me TINYINT(1) NOT NULL DEFAULT 0,
        pending_phone VARCHAR(40) NULL,
        pending_country VARCHAR(80) NULL,
        oauth_provider_code VARCHAR(32) NULL,
        email_token_id BIGINT UNSIGNED NULL,
        phone_token_id BIGINT UNSIGNED NULL,
        password_reset_token_id BIGINT UNSIGNED NULL,
        flow_token_hash CHAR(64) NOT NULL,
        expires_at DATETIME(6) NOT NULL,
        consumed_at DATETIME(6) NULL,
        created_at DATETIME(6) NOT NULL,
        updated_at DATETIME(6) NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_auth_flows_public_id (public_id),
        UNIQUE KEY uq_auth_flows_token_hash (flow_token_hash),
        INDEX idx_auth_flows_user (user_id),
        INDEX idx_auth_flows_expires (expires_at),
        CONSTRAINT fk_auth_flows_user FOREIGN KEY (user_id)
          REFERENCES users (id)
          ON UPDATE CASCADE
          ON DELETE CASCADE,
        CONSTRAINT fk_auth_flows_email_token FOREIGN KEY (email_token_id)
          REFERENCES email_verification_tokens (id)
          ON UPDATE CASCADE
          ON DELETE SET NULL,
        CONSTRAINT fk_auth_flows_phone_token FOREIGN KEY (phone_token_id)
          REFERENCES phone_verification_tokens (id)
          ON UPDATE CASCADE
          ON DELETE SET NULL,
        CONSTRAINT fk_auth_flows_password_reset_token FOREIGN KEY (password_reset_token_id)
          REFERENCES password_reset_tokens (id)
          ON UPDATE CASCADE
          ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS security_events (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        public_id CHAR(26) NOT NULL,
        user_id BIGINT UNSIGNED NULL,
        identifier_value VARCHAR(255) NULL,
        event_type_code VARCHAR(64) NOT NULL,
        success_flag TINYINT(1) NOT NULL,
        ip_address VARCHAR(45) NULL,
        user_agent TEXT NULL,
        occurred_at DATETIME(6) NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_security_events_public_id (public_id),
        INDEX idx_security_events_user (user_id),
        INDEX idx_security_events_occurred_at (occurred_at),
        CONSTRAINT fk_security_events_user FOREIGN KEY (user_id)
          REFERENCES users (id)
          ON UPDATE CASCADE
          ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS roles (
        code VARCHAR(64) NOT NULL,
        name VARCHAR(120) NOT NULL,
        description TEXT NULL,
        is_system TINYINT(1) NOT NULL DEFAULT 1,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME(6) NOT NULL,
        updated_at DATETIME(6) NOT NULL,
        PRIMARY KEY (code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS permissions (
        code VARCHAR(128) NOT NULL,
        module_name VARCHAR(64) NOT NULL,
        action_name VARCHAR(64) NOT NULL,
        description TEXT NULL,
        created_at DATETIME(6) NOT NULL,
        updated_at DATETIME(6) NOT NULL,
        PRIMARY KEY (code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS role_permissions (
        role_code VARCHAR(64) NOT NULL,
        permission_code VARCHAR(128) NOT NULL,
        granted_at DATETIME(6) NOT NULL,
        PRIMARY KEY (role_code, permission_code),
        CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_code)
          REFERENCES roles (code)
          ON UPDATE CASCADE
          ON DELETE CASCADE,
        CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_code)
          REFERENCES permissions (code)
          ON UPDATE CASCADE
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS user_roles (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL,
        role_code VARCHAR(64) NOT NULL,
        granted_by_user_id BIGINT UNSIGNED NULL,
        starts_at DATETIME(6) NULL,
        ends_at DATETIME(6) NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME(6) NOT NULL,
        updated_at DATETIME(6) NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_user_roles_unique_assignment (user_id, role_code, is_active),
        CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id)
          REFERENCES users (id)
          ON UPDATE CASCADE
          ON DELETE CASCADE,
        CONSTRAINT fk_user_roles_role FOREIGN KEY (role_code)
          REFERENCES roles (code)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,
        CONSTRAINT fk_user_roles_granted_by FOREIGN KEY (granted_by_user_id)
          REFERENCES users (id)
          ON UPDATE CASCADE
          ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS client_accounts (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        public_id CHAR(26) NOT NULL,
        client_code VARCHAR(50) NOT NULL,
        client_type_code VARCHAR(32) NOT NULL,
        legal_name VARCHAR(200) NOT NULL,
        display_name VARCHAR(200) NOT NULL,
        billing_name VARCHAR(200) NOT NULL,
        primary_email VARCHAR(255) NOT NULL,
        primary_phone VARCHAR(40) NOT NULL,
        gstin VARCHAR(24) NULL,
        tax_identifier VARCHAR(64) NULL,
        onboarding_status_code VARCHAR(32) NOT NULL,
        account_status_code VARCHAR(32) NOT NULL,
        owner_user_id BIGINT UNSIGNED NULL,
        created_at DATETIME(6) NOT NULL,
        updated_at DATETIME(6) NOT NULL,
        archived_at DATETIME(6) NULL,
        row_version BIGINT UNSIGNED NOT NULL DEFAULT 1,
        PRIMARY KEY (id),
        UNIQUE KEY uq_client_accounts_public_id (public_id),
        UNIQUE KEY uq_client_accounts_client_code (client_code),
        INDEX idx_client_accounts_owner (owner_user_id),
        CONSTRAINT fk_client_accounts_owner FOREIGN KEY (owner_user_id)
          REFERENCES users (id)
          ON UPDATE CASCADE
          ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS client_account_contacts (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        client_account_id BIGINT UNSIGNED NOT NULL,
        user_id BIGINT UNSIGNED NOT NULL,
        contact_role_code VARCHAR(32) NOT NULL,
        is_primary TINYINT(1) NOT NULL DEFAULT 0,
        is_billing TINYINT(1) NOT NULL DEFAULT 0,
        portal_access_enabled TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME(6) NOT NULL,
        updated_at DATETIME(6) NOT NULL,
        archived_at DATETIME(6) NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_client_account_contacts (client_account_id, user_id),
        INDEX idx_client_account_contacts_user (user_id),
        CONSTRAINT fk_client_account_contacts_account FOREIGN KEY (client_account_id)
          REFERENCES client_accounts (id)
          ON UPDATE CASCADE
          ON DELETE CASCADE,
        CONSTRAINT fk_client_account_contacts_user FOREIGN KEY (user_id)
          REFERENCES users (id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS client_addresses (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        client_account_id BIGINT UNSIGNED NOT NULL,
        address_type_code VARCHAR(32) NOT NULL,
        line1 VARCHAR(255) NOT NULL,
        line2 VARCHAR(255) NULL,
        city VARCHAR(100) NOT NULL,
        state VARCHAR(100) NOT NULL,
        postal_code VARCHAR(20) NOT NULL,
        country_code VARCHAR(16) NOT NULL,
        is_primary TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME(6) NOT NULL,
        updated_at DATETIME(6) NOT NULL,
        archived_at DATETIME(6) NULL,
        PRIMARY KEY (id),
        INDEX idx_client_addresses_account (client_account_id),
        CONSTRAINT fk_client_addresses_account FOREIGN KEY (client_account_id)
          REFERENCES client_accounts (id)
          ON UPDATE CASCADE
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS user_notification_preferences (
        user_id BIGINT UNSIGNED NOT NULL,
        email_updates TINYINT(1) NOT NULL DEFAULT 1,
        sms_alerts TINYINT(1) NOT NULL DEFAULT 1,
        invoice_reminders TINYINT(1) NOT NULL DEFAULT 1,
        case_activity_alerts TINYINT(1) NOT NULL DEFAULT 1,
        product_announcements TINYINT(1) NOT NULL DEFAULT 0,
        updated_at DATETIME(6) NOT NULL,
        PRIMARY KEY (user_id),
        CONSTRAINT fk_user_notification_preferences_user FOREIGN KEY (user_id)
          REFERENCES users (id)
          ON UPDATE CASCADE
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS staff_profiles (
        user_id BIGINT UNSIGNED NOT NULL,
        job_title VARCHAR(120) NOT NULL,
        employment_status_code VARCHAR(32) NOT NULL,
        manager_user_id BIGINT UNSIGNED NULL,
        city VARCHAR(100) NULL,
        state VARCHAR(100) NULL,
        PRIMARY KEY (user_id),
        INDEX idx_staff_profiles_manager (manager_user_id),
        CONSTRAINT fk_staff_profiles_user FOREIGN KEY (user_id)
          REFERENCES users (id)
          ON UPDATE CASCADE
          ON DELETE CASCADE,
        CONSTRAINT fk_staff_profiles_manager FOREIGN KEY (manager_user_id)
          REFERENCES users (id)
          ON UPDATE CASCADE
          ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS counsel_partners (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        public_id CHAR(26) NOT NULL,
        counsel_code VARCHAR(50) NOT NULL,
        full_name VARCHAR(160) NOT NULL,
        organization_name VARCHAR(200) NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(40) NOT NULL,
        bar_registration_number VARCHAR(80) NULL,
        primary_jurisdiction VARCHAR(120) NOT NULL,
        city VARCHAR(100) NOT NULL,
        state VARCHAR(100) NOT NULL,
        country_code VARCHAR(16) NOT NULL,
        years_experience SMALLINT UNSIGNED NOT NULL,
        availability_status_code VARCHAR(32) NOT NULL,
        partner_status_code VARCHAR(32) NOT NULL,
        invited_user_id BIGINT UNSIGNED NULL,
        created_at DATETIME(6) NOT NULL,
        updated_at DATETIME(6) NOT NULL,
        archived_at DATETIME(6) NULL,
        row_version BIGINT UNSIGNED NOT NULL DEFAULT 1,
        PRIMARY KEY (id),
        UNIQUE KEY uq_counsel_partners_public_id (public_id),
        UNIQUE KEY uq_counsel_partners_counsel_code (counsel_code),
        INDEX idx_counsel_partners_invited_user (invited_user_id),
        CONSTRAINT fk_counsel_partners_invited_user FOREIGN KEY (invited_user_id)
          REFERENCES users (id)
          ON UPDATE CASCADE
          ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS counsel_partner_expertise (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        counsel_partner_id BIGINT UNSIGNED NOT NULL,
        legal_domain_id BIGINT UNSIGNED NOT NULL,
        service_id BIGINT UNSIGNED NULL,
        proficiency_level_code VARCHAR(32) NOT NULL,
        years_experience SMALLINT UNSIGNED NOT NULL DEFAULT 0,
        created_at DATETIME(6) NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_counsel_partner_expertise (counsel_partner_id, legal_domain_id, service_id),
        INDEX idx_counsel_partner_expertise_service (service_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`
    ],
  },
  {
    id: '005-normalized-catalog-and-matter-schema',
    description: 'Create normalized catalog, pricing, request, matter, and package tables.',
    statements: [
      `CREATE TABLE IF NOT EXISTS legal_domains (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        public_id CHAR(26) NOT NULL,
        domain_code VARCHAR(64) NOT NULL,
        domain_name VARCHAR(160) NOT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME(6) NOT NULL,
        updated_at DATETIME(6) NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_legal_domains_public_id (public_id),
        UNIQUE KEY uq_legal_domains_code (domain_code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS services (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        public_id CHAR(26) NOT NULL,
        service_code VARCHAR(64) NOT NULL,
        legal_domain_id BIGINT UNSIGNED NOT NULL,
        service_name VARCHAR(180) NOT NULL,
        service_description TEXT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        is_subscription_eligible TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME(6) NOT NULL,
        updated_at DATETIME(6) NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_services_public_id (public_id),
        UNIQUE KEY uq_services_code (service_code),
        INDEX idx_services_domain (legal_domain_id),
        CONSTRAINT fk_services_domain FOREIGN KEY (legal_domain_id)
          REFERENCES legal_domains (id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `SELECT 1`,
      `CREATE TABLE IF NOT EXISTS consultation_modes (
        code VARCHAR(32) NOT NULL,
        label VARCHAR(100) NOT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        PRIMARY KEY (code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS request_statuses (
        code VARCHAR(32) NOT NULL,
        label VARCHAR(120) NOT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        is_terminal TINYINT(1) NOT NULL DEFAULT 0,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        PRIMARY KEY (code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS matter_stages (
        code VARCHAR(32) NOT NULL,
        label VARCHAR(120) NOT NULL,
        stage_order INT NOT NULL,
        is_client_visible TINYINT(1) NOT NULL DEFAULT 1,
        is_terminal TINYINT(1) NOT NULL DEFAULT 0,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        PRIMARY KEY (code),
        CONSTRAINT chk_matter_stages_stage_order CHECK (stage_order > 0)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS matter_operational_statuses (
        code VARCHAR(32) NOT NULL,
        label VARCHAR(120) NOT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        is_terminal TINYINT(1) NOT NULL DEFAULT 0,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        PRIMARY KEY (code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS invoice_statuses (
        code VARCHAR(32) NOT NULL,
        label VARCHAR(120) NOT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        is_terminal TINYINT(1) NOT NULL DEFAULT 0,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        PRIMARY KEY (code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS payment_statuses (
        code VARCHAR(32) NOT NULL,
        label VARCHAR(120) NOT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        is_terminal TINYINT(1) NOT NULL DEFAULT 0,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        PRIMARY KEY (code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS thread_statuses (
        code VARCHAR(32) NOT NULL,
        label VARCHAR(120) NOT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        is_terminal TINYINT(1) NOT NULL DEFAULT 0,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        PRIMARY KEY (code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS event_statuses (
        code VARCHAR(32) NOT NULL,
        label VARCHAR(120) NOT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        is_terminal TINYINT(1) NOT NULL DEFAULT 0,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        PRIMARY KEY (code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS notification_types (
        code VARCHAR(64) NOT NULL,
        label VARCHAR(140) NOT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        PRIMARY KEY (code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS pricing_service_slabs (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        effective_from DATE NOT NULL,
        effective_to DATE NULL,
        min_service_count INT UNSIGNED NOT NULL,
        max_service_count INT UNSIGNED NULL,
        base_amount DECIMAL(14,2) NOT NULL,
        per_extra_service_amount DECIMAL(14,2) NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME(6) NOT NULL,
        updated_at DATETIME(6) NOT NULL,
        PRIMARY KEY (id),
        CONSTRAINT chk_pricing_service_slabs_counts CHECK (
          min_service_count > 0 AND (
            max_service_count IS NULL OR max_service_count >= min_service_count
          )
        ),
        CONSTRAINT chk_pricing_service_slabs_amounts CHECK (
          base_amount >= 0 AND (
            per_extra_service_amount IS NULL OR per_extra_service_amount >= 0
          )
        )
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS pricing_urgency_rules (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        urgency_code VARCHAR(32) NOT NULL,
        label VARCHAR(120) NOT NULL,
        surcharge_type_code VARCHAR(16) NOT NULL,
        surcharge_value DECIMAL(14,2) NOT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME(6) NOT NULL,
        updated_at DATETIME(6) NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_pricing_urgency_rules_code (urgency_code),
        CONSTRAINT chk_pricing_urgency_rules_value CHECK (surcharge_value >= 0)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS pricing_consultation_mode_rules (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        consultation_mode_code VARCHAR(32) NOT NULL,
        surcharge_type_code VARCHAR(16) NOT NULL,
        surcharge_value DECIMAL(14,2) NOT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME(6) NOT NULL,
        updated_at DATETIME(6) NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_pricing_consultation_mode_rules_code (consultation_mode_code),
        CONSTRAINT fk_pricing_consultation_mode_rules_mode FOREIGN KEY (consultation_mode_code)
          REFERENCES consultation_modes (code)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,
        CONSTRAINT chk_pricing_consultation_mode_rules_value CHECK (surcharge_value >= 0)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS tax_rates (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        tax_code VARCHAR(32) NOT NULL,
        tax_name VARCHAR(120) NOT NULL,
        rate_percent DECIMAL(5,2) NOT NULL,
        jurisdiction_code VARCHAR(32) NOT NULL,
        effective_from DATE NOT NULL,
        effective_to DATE NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME(6) NOT NULL,
        updated_at DATETIME(6) NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_tax_rates_code (tax_code),
        CONSTRAINT chk_tax_rates_percent CHECK (rate_percent >= 0 AND rate_percent <= 100)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS subscription_plans (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        public_id CHAR(26) NOT NULL,
        plan_code VARCHAR(64) NOT NULL,
        plan_name VARCHAR(120) NOT NULL,
        description TEXT NULL,
        billing_interval_code VARCHAR(32) NOT NULL,
        interval_count INT UNSIGNED NOT NULL DEFAULT 1,
        fee_amount DECIMAL(14,2) NOT NULL,
        currency_code CHAR(3) NOT NULL DEFAULT 'INR',
        tax_rate_id BIGINT UNSIGNED NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME(6) NOT NULL,
        updated_at DATETIME(6) NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_subscription_plans_public_id (public_id),
        UNIQUE KEY uq_subscription_plans_code (plan_code),
        CONSTRAINT fk_subscription_plans_tax_rate FOREIGN KEY (tax_rate_id)
          REFERENCES tax_rates (id)
          ON UPDATE CASCADE
          ON DELETE SET NULL,
        CONSTRAINT chk_subscription_plans_amount CHECK (fee_amount >= 0),
        CONSTRAINT chk_subscription_plans_interval CHECK (interval_count > 0)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS subscription_plan_services (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        subscription_plan_id BIGINT UNSIGNED NOT NULL,
        service_id BIGINT UNSIGNED NOT NULL,
        included_quantity INT UNSIGNED NULL,
        created_at DATETIME(6) NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_subscription_plan_services (subscription_plan_id, service_id),
        CONSTRAINT fk_subscription_plan_services_plan FOREIGN KEY (subscription_plan_id)
          REFERENCES subscription_plans (id)
          ON UPDATE CASCADE
          ON DELETE CASCADE,
        CONSTRAINT fk_subscription_plan_services_service FOREIGN KEY (service_id)
          REFERENCES services (id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS service_requests (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        public_id CHAR(26) NOT NULL,
        request_number VARCHAR(50) NOT NULL,
        client_account_id BIGINT UNSIGNED NOT NULL,
        requested_by_user_id BIGINT UNSIGNED NOT NULL,
        status_code VARCHAR(32) NOT NULL,
        title VARCHAR(200) NOT NULL,
        issue_summary VARCHAR(500) NOT NULL,
        detailed_description LONGTEXT NULL,
        legal_domain_id BIGINT UNSIGNED NOT NULL,
        consultation_mode_code VARCHAR(32) NOT NULL,
        urgency_rule_id BIGINT UNSIGNED NOT NULL,
        preferred_start_at DATETIME(6) NULL,
        preferred_end_at DATETIME(6) NULL,
        contact_name_snapshot VARCHAR(160) NOT NULL,
        contact_email_snapshot VARCHAR(255) NOT NULL,
        contact_mobile_snapshot VARCHAR(40) NOT NULL,
        whatsapp_same_as_mobile TINYINT(1) NOT NULL DEFAULT 1,
        past_legal_action_flag TINYINT(1) NOT NULL DEFAULT 0,
        quote_total_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
        submitted_at DATETIME(6) NULL,
        created_at DATETIME(6) NOT NULL,
        updated_at DATETIME(6) NOT NULL,
        archived_at DATETIME(6) NULL,
        row_version BIGINT UNSIGNED NOT NULL DEFAULT 1,
        PRIMARY KEY (id),
        UNIQUE KEY uq_service_requests_public_id (public_id),
        UNIQUE KEY uq_service_requests_number (request_number),
        INDEX idx_service_requests_client (client_account_id),
        INDEX idx_service_requests_status (status_code),
        CONSTRAINT fk_service_requests_client_account FOREIGN KEY (client_account_id)
          REFERENCES client_accounts (id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,
        CONSTRAINT fk_service_requests_requested_by FOREIGN KEY (requested_by_user_id)
          REFERENCES users (id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,
        CONSTRAINT fk_service_requests_status FOREIGN KEY (status_code)
          REFERENCES request_statuses (code)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,
        CONSTRAINT fk_service_requests_legal_domain FOREIGN KEY (legal_domain_id)
          REFERENCES legal_domains (id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,
        CONSTRAINT fk_service_requests_consultation_mode FOREIGN KEY (consultation_mode_code)
          REFERENCES consultation_modes (code)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,
        CONSTRAINT fk_service_requests_urgency_rule FOREIGN KEY (urgency_rule_id)
          REFERENCES pricing_urgency_rules (id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,
        CONSTRAINT chk_service_requests_quote_total CHECK (quote_total_amount >= 0)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS request_services (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        service_request_id BIGINT UNSIGNED NOT NULL,
        service_id BIGINT UNSIGNED NOT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        quoted_base_fee DECIMAL(14,2) NOT NULL DEFAULT 0,
        created_at DATETIME(6) NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_request_services (service_request_id, service_id),
        CONSTRAINT fk_request_services_request FOREIGN KEY (service_request_id)
          REFERENCES service_requests (id)
          ON UPDATE CASCADE
          ON DELETE CASCADE,
        CONSTRAINT fk_request_services_service FOREIGN KEY (service_id)
          REFERENCES services (id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,
        CONSTRAINT chk_request_services_fee CHECK (quoted_base_fee >= 0)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS pricing_quotes (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        public_id CHAR(26) NOT NULL,
        service_request_id BIGINT UNSIGNED NOT NULL,
        version_no INT UNSIGNED NOT NULL,
        service_count INT UNSIGNED NOT NULL,
        base_amount DECIMAL(14,2) NOT NULL,
        urgency_surcharge_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
        consultation_mode_surcharge_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
        discount_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
        tax_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
        total_amount DECIMAL(14,2) NOT NULL,
        currency_code CHAR(3) NOT NULL DEFAULT 'INR',
        is_final TINYINT(1) NOT NULL DEFAULT 0,
        accepted_at DATETIME(6) NULL,
        created_by_user_id BIGINT UNSIGNED NOT NULL,
        created_at DATETIME(6) NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_pricing_quotes_public_id (public_id),
        UNIQUE KEY uq_pricing_quotes_version (service_request_id, version_no),
        CONSTRAINT fk_pricing_quotes_request FOREIGN KEY (service_request_id)
          REFERENCES service_requests (id)
          ON UPDATE CASCADE
          ON DELETE CASCADE,
        CONSTRAINT fk_pricing_quotes_created_by FOREIGN KEY (created_by_user_id)
          REFERENCES users (id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,
        CONSTRAINT chk_pricing_quotes_amounts CHECK (
          service_count > 0 AND base_amount >= 0 AND urgency_surcharge_amount >= 0 AND
          consultation_mode_surcharge_amount >= 0 AND discount_amount >= 0 AND
          tax_amount >= 0 AND total_amount >= 0
        )
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS pricing_quote_lines (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        pricing_quote_id BIGINT UNSIGNED NOT NULL,
        line_type_code VARCHAR(32) NOT NULL,
        service_id BIGINT UNSIGNED NULL,
        pricing_rule_source_code VARCHAR(64) NULL,
        description VARCHAR(255) NOT NULL,
        quantity DECIMAL(12,2) NOT NULL DEFAULT 1.00,
        unit_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
        line_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
        sort_order INT NOT NULL DEFAULT 0,
        created_at DATETIME(6) NOT NULL,
        PRIMARY KEY (id),
        INDEX idx_pricing_quote_lines_quote (pricing_quote_id),
        CONSTRAINT fk_pricing_quote_lines_quote FOREIGN KEY (pricing_quote_id)
          REFERENCES pricing_quotes (id)
          ON UPDATE CASCADE
          ON DELETE CASCADE,
        CONSTRAINT fk_pricing_quote_lines_service FOREIGN KEY (service_id)
          REFERENCES services (id)
          ON UPDATE CASCADE
          ON DELETE SET NULL,
        CONSTRAINT chk_pricing_quote_lines_amounts CHECK (
          quantity > 0 AND unit_amount >= 0 AND line_amount >= 0
        )
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS request_status_history (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        service_request_id BIGINT UNSIGNED NOT NULL,
        from_status_code VARCHAR(32) NULL,
        to_status_code VARCHAR(32) NOT NULL,
        changed_by_user_id BIGINT UNSIGNED NULL,
        change_note TEXT NULL,
        changed_at DATETIME(6) NOT NULL,
        PRIMARY KEY (id),
        INDEX idx_request_status_history_request (service_request_id),
        CONSTRAINT fk_request_status_history_request FOREIGN KEY (service_request_id)
          REFERENCES service_requests (id)
          ON UPDATE CASCADE
          ON DELETE CASCADE,
        CONSTRAINT fk_request_status_history_from FOREIGN KEY (from_status_code)
          REFERENCES request_statuses (code)
          ON UPDATE CASCADE
          ON DELETE SET NULL,
        CONSTRAINT fk_request_status_history_to FOREIGN KEY (to_status_code)
          REFERENCES request_statuses (code)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,
        CONSTRAINT fk_request_status_history_changed_by FOREIGN KEY (changed_by_user_id)
          REFERENCES users (id)
          ON UPDATE CASCADE
          ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS matters (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        public_id CHAR(26) NOT NULL,
        matter_number VARCHAR(50) NOT NULL,
        service_request_id BIGINT UNSIGNED NULL,
        client_account_id BIGINT UNSIGNED NOT NULL,
        opened_by_user_id BIGINT UNSIGNED NOT NULL,
        legal_domain_id BIGINT UNSIGNED NOT NULL,
        title VARCHAR(255) NOT NULL,
        issue_summary VARCHAR(500) NOT NULL,
        detailed_description LONGTEXT NULL,
        current_stage_code VARCHAR(32) NOT NULL,
        operational_status_code VARCHAR(32) NOT NULL,
        consultation_mode_code VARCHAR(32) NOT NULL,
        urgency_rule_id BIGINT UNSIGNED NOT NULL,
        priority_code VARCHAR(32) NOT NULL,
        quoted_total_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
        paid_total_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
        refunded_total_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
        due_total_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
        opened_at DATETIME(6) NOT NULL,
        last_activity_at DATETIME(6) NOT NULL,
        closed_at DATETIME(6) NULL,
        created_at DATETIME(6) NOT NULL,
        updated_at DATETIME(6) NOT NULL,
        archived_at DATETIME(6) NULL,
        row_version BIGINT UNSIGNED NOT NULL DEFAULT 1,
        PRIMARY KEY (id),
        UNIQUE KEY uq_matters_public_id (public_id),
        UNIQUE KEY uq_matters_number (matter_number),
        UNIQUE KEY uq_matters_request (service_request_id),
        INDEX idx_matters_client (client_account_id),
        INDEX idx_matters_status (operational_status_code),
        FULLTEXT KEY ftx_matters_title_issue (title, issue_summary),
        CONSTRAINT fk_matters_request FOREIGN KEY (service_request_id)
          REFERENCES service_requests (id)
          ON UPDATE CASCADE
          ON DELETE SET NULL,
        CONSTRAINT fk_matters_client_account FOREIGN KEY (client_account_id)
          REFERENCES client_accounts (id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,
        CONSTRAINT fk_matters_opened_by FOREIGN KEY (opened_by_user_id)
          REFERENCES users (id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,
        CONSTRAINT fk_matters_legal_domain FOREIGN KEY (legal_domain_id)
          REFERENCES legal_domains (id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,
        CONSTRAINT fk_matters_stage FOREIGN KEY (current_stage_code)
          REFERENCES matter_stages (code)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,
        CONSTRAINT fk_matters_operational_status FOREIGN KEY (operational_status_code)
          REFERENCES matter_operational_statuses (code)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,
        CONSTRAINT fk_matters_consultation_mode FOREIGN KEY (consultation_mode_code)
          REFERENCES consultation_modes (code)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,
        CONSTRAINT fk_matters_urgency_rule FOREIGN KEY (urgency_rule_id)
          REFERENCES pricing_urgency_rules (id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,
        CONSTRAINT chk_matters_amounts CHECK (
          quoted_total_amount >= 0 AND paid_total_amount >= 0 AND refunded_total_amount >= 0 AND
          due_total_amount >= 0
        )
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS matter_services (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        matter_id BIGINT UNSIGNED NOT NULL,
        service_id BIGINT UNSIGNED NOT NULL,
        final_fee DECIMAL(14,2) NOT NULL DEFAULT 0,
        service_status_code VARCHAR(32) NOT NULL,
        completed_at DATETIME(6) NULL,
        created_at DATETIME(6) NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_matter_services (matter_id, service_id),
        CONSTRAINT fk_matter_services_matter FOREIGN KEY (matter_id)
          REFERENCES matters (id)
          ON UPDATE CASCADE
          ON DELETE CASCADE,
        CONSTRAINT fk_matter_services_service FOREIGN KEY (service_id)
          REFERENCES services (id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,
        CONSTRAINT chk_matter_services_fee CHECK (final_fee >= 0)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS matter_assignments (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        matter_id BIGINT UNSIGNED NOT NULL,
        assignment_role_code VARCHAR(32) NOT NULL,
        internal_user_id BIGINT UNSIGNED NULL,
        counsel_partner_id BIGINT UNSIGNED NULL,
        is_primary TINYINT(1) NOT NULL DEFAULT 0,
        fee_agreed_amount DECIMAL(14,2) NULL,
        fee_paid_amount DECIMAL(14,2) NULL,
        fee_due_amount DECIMAL(14,2) NULL,
        assigned_by_user_id BIGINT UNSIGNED NOT NULL,
        assigned_at DATETIME(6) NOT NULL,
        removed_at DATETIME(6) NULL,
        assignment_status_code VARCHAR(32) NOT NULL,
        notes TEXT NULL,
        PRIMARY KEY (id),
        INDEX idx_matter_assignments_matter (matter_id),
        INDEX idx_matter_assignments_internal_user (internal_user_id),
        INDEX idx_matter_assignments_counsel (counsel_partner_id),
        CONSTRAINT fk_matter_assignments_matter FOREIGN KEY (matter_id)
          REFERENCES matters (id)
          ON UPDATE CASCADE
          ON DELETE CASCADE,
        CONSTRAINT fk_matter_assignments_internal_user FOREIGN KEY (internal_user_id)
          REFERENCES users (id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,
        CONSTRAINT fk_matter_assignments_counsel FOREIGN KEY (counsel_partner_id)
          REFERENCES counsel_partners (id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,
        CONSTRAINT fk_matter_assignments_assigned_by FOREIGN KEY (assigned_by_user_id)
          REFERENCES users (id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,
        CONSTRAINT chk_matter_assignments_fees CHECK (
          (fee_agreed_amount IS NULL OR fee_agreed_amount >= 0) AND
          (fee_paid_amount IS NULL OR fee_paid_amount >= 0) AND
          (fee_due_amount IS NULL OR fee_due_amount >= 0)
        )
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS matter_stage_history (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        matter_id BIGINT UNSIGNED NOT NULL,
        stage_code VARCHAR(32) NOT NULL,
        entered_at DATETIME(6) NOT NULL,
        exited_at DATETIME(6) NULL,
        changed_by_user_id BIGINT UNSIGNED NULL,
        visible_to_client TINYINT(1) NOT NULL DEFAULT 1,
        change_note TEXT NULL,
        PRIMARY KEY (id),
        INDEX idx_matter_stage_history_matter (matter_id),
        CONSTRAINT fk_matter_stage_history_matter FOREIGN KEY (matter_id)
          REFERENCES matters (id)
          ON UPDATE CASCADE
          ON DELETE CASCADE,
        CONSTRAINT fk_matter_stage_history_stage FOREIGN KEY (stage_code)
          REFERENCES matter_stages (code)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,
        CONSTRAINT fk_matter_stage_history_changed_by FOREIGN KEY (changed_by_user_id)
          REFERENCES users (id)
          ON UPDATE CASCADE
          ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS matter_updates (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        matter_id BIGINT UNSIGNED NOT NULL,
        update_type_code VARCHAR(32) NOT NULL,
        title VARCHAR(200) NOT NULL,
        body_text TEXT NOT NULL,
        visible_to_client TINYINT(1) NOT NULL DEFAULT 1,
        created_by_user_id BIGINT UNSIGNED NULL,
        created_at DATETIME(6) NOT NULL,
        edited_at DATETIME(6) NULL,
        PRIMARY KEY (id),
        INDEX idx_matter_updates_matter (matter_id),
        CONSTRAINT fk_matter_updates_matter FOREIGN KEY (matter_id)
          REFERENCES matters (id)
          ON UPDATE CASCADE
          ON DELETE CASCADE,
        CONSTRAINT fk_matter_updates_created_by FOREIGN KEY (created_by_user_id)
          REFERENCES users (id)
          ON UPDATE CASCADE
          ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS matter_packages (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        public_id CHAR(26) NOT NULL,
        matter_id BIGINT UNSIGNED NOT NULL,
        package_name VARCHAR(160) NOT NULL,
        description TEXT NULL,
        total_price DECIMAL(14,2) NOT NULL,
        created_by_user_id BIGINT UNSIGNED NOT NULL,
        created_at DATETIME(6) NOT NULL,
        updated_at DATETIME(6) NOT NULL,
        archived_at DATETIME(6) NULL,
        row_version BIGINT UNSIGNED NOT NULL DEFAULT 1,
        PRIMARY KEY (id),
        UNIQUE KEY uq_matter_packages_public_id (public_id),
        INDEX idx_matter_packages_matter (matter_id),
        CONSTRAINT fk_matter_packages_matter FOREIGN KEY (matter_id)
          REFERENCES matters (id)
          ON UPDATE CASCADE
          ON DELETE CASCADE,
        CONSTRAINT fk_matter_packages_created_by FOREIGN KEY (created_by_user_id)
          REFERENCES users (id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,
        CONSTRAINT chk_matter_packages_price CHECK (total_price >= 0)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS matter_package_services (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        matter_package_id BIGINT UNSIGNED NOT NULL,
        service_id BIGINT UNSIGNED NOT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        created_at DATETIME(6) NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_matter_package_services (matter_package_id, service_id),
        CONSTRAINT fk_matter_package_services_package FOREIGN KEY (matter_package_id)
          REFERENCES matter_packages (id)
          ON UPDATE CASCADE
          ON DELETE CASCADE,
        CONSTRAINT fk_matter_package_services_service FOREIGN KEY (service_id)
          REFERENCES services (id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `SELECT 1`
    ],
  },
  {
    id: '006-normalized-documents-events-messaging-schema',
    description: 'Create normalized document, upload, event, messaging, and read-model support tables.',
    statements: [
      `CREATE TABLE IF NOT EXISTS documents (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        public_id CHAR(26) NOT NULL,
        document_number VARCHAR(50) NOT NULL,
        owner_client_account_id BIGINT UNSIGNED NOT NULL,
        title VARCHAR(255) NOT NULL,
        category_code VARCHAR(32) NOT NULL,
        visibility_scope_code VARCHAR(32) NOT NULL,
        current_version_no INT UNSIGNED NOT NULL DEFAULT 0,
        created_by_user_id BIGINT UNSIGNED NOT NULL,
        created_at DATETIME(6) NOT NULL,
        updated_at DATETIME(6) NOT NULL,
        archived_at DATETIME(6) NULL,
        row_version BIGINT UNSIGNED NOT NULL DEFAULT 1,
        PRIMARY KEY (id),
        UNIQUE KEY uq_documents_public_id (public_id),
        UNIQUE KEY uq_documents_number (document_number),
        INDEX idx_documents_owner (owner_client_account_id),
        CONSTRAINT fk_documents_owner_account FOREIGN KEY (owner_client_account_id)
          REFERENCES client_accounts (id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,
        CONSTRAINT fk_documents_created_by FOREIGN KEY (created_by_user_id)
          REFERENCES users (id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS document_versions (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        public_id CHAR(26) NOT NULL,
        document_id BIGINT UNSIGNED NOT NULL,
        version_no INT UNSIGNED NOT NULL,
        storage_driver_code VARCHAR(32) NOT NULL,
        storage_path VARCHAR(500) NOT NULL,
        original_file_name VARCHAR(255) NOT NULL,
        mime_type VARCHAR(160) NOT NULL,
        file_extension VARCHAR(20) NOT NULL,
        file_size_bytes BIGINT UNSIGNED NOT NULL,
        checksum_sha256 CHAR(64) NOT NULL,
        virus_scan_status_code VARCHAR(32) NOT NULL,
        uploaded_by_user_id BIGINT UNSIGNED NOT NULL,
        uploaded_at DATETIME(6) NOT NULL,
        is_current TINYINT(1) NOT NULL DEFAULT 1,
        retention_hold_flag TINYINT(1) NOT NULL DEFAULT 0,
        PRIMARY KEY (id),
        UNIQUE KEY uq_document_versions_public_id (public_id),
        UNIQUE KEY uq_document_versions_document_version (document_id, version_no),
        INDEX idx_document_versions_document (document_id),
        CONSTRAINT fk_document_versions_document FOREIGN KEY (document_id)
          REFERENCES documents (id)
          ON UPDATE CASCADE
          ON DELETE CASCADE,
        CONSTRAINT fk_document_versions_uploaded_by FOREIGN KEY (uploaded_by_user_id)
          REFERENCES users (id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,
        CONSTRAINT chk_document_versions_size CHECK (file_size_bytes >= 0)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS request_documents (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        service_request_id BIGINT UNSIGNED NOT NULL,
        document_id BIGINT UNSIGNED NOT NULL,
        link_role_code VARCHAR(32) NOT NULL,
        created_at DATETIME(6) NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_request_documents (service_request_id, document_id),
        CONSTRAINT fk_request_documents_request FOREIGN KEY (service_request_id)
          REFERENCES service_requests (id)
          ON UPDATE CASCADE
          ON DELETE CASCADE,
        CONSTRAINT fk_request_documents_document FOREIGN KEY (document_id)
          REFERENCES documents (id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS matter_documents (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        matter_id BIGINT UNSIGNED NOT NULL,
        document_id BIGINT UNSIGNED NOT NULL,
        link_role_code VARCHAR(32) NOT NULL,
        created_at DATETIME(6) NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_matter_documents (matter_id, document_id),
        CONSTRAINT fk_matter_documents_matter FOREIGN KEY (matter_id)
          REFERENCES matters (id)
          ON UPDATE CASCADE
          ON DELETE CASCADE,
        CONSTRAINT fk_matter_documents_document FOREIGN KEY (document_id)
          REFERENCES documents (id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS document_download_logs (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        document_id BIGINT UNSIGNED NOT NULL,
        document_version_id BIGINT UNSIGNED NOT NULL,
        downloaded_by_user_id BIGINT UNSIGNED NOT NULL,
        ip_address VARCHAR(45) NULL,
        user_agent TEXT NULL,
        downloaded_at DATETIME(6) NOT NULL,
        PRIMARY KEY (id),
        INDEX idx_document_download_logs_document (document_id),
        CONSTRAINT fk_document_download_logs_document FOREIGN KEY (document_id)
          REFERENCES documents (id)
          ON UPDATE CASCADE
          ON DELETE CASCADE,
        CONSTRAINT fk_document_download_logs_version FOREIGN KEY (document_version_id)
          REFERENCES document_versions (id)
          ON UPDATE CASCADE
          ON DELETE CASCADE,
        CONSTRAINT fk_document_download_logs_user FOREIGN KEY (downloaded_by_user_id)
          REFERENCES users (id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS document_upload_intents (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        public_id CHAR(26) NOT NULL,
        owner_user_id BIGINT UNSIGNED NOT NULL,
        owner_client_account_id BIGINT UNSIGNED NOT NULL,
        source_module VARCHAR(64) NOT NULL,
        request_public_id CHAR(26) NULL,
        matter_public_id CHAR(26) NULL,
        invoice_public_id CHAR(26) NULL,
        thread_public_id CHAR(26) NULL,
        original_name VARCHAR(255) NOT NULL,
        mime_type VARCHAR(160) NOT NULL,
        size_bytes BIGINT UNSIGNED NOT NULL,
        checksum_sha256 CHAR(64) NOT NULL,
        storage_driver_code VARCHAR(32) NOT NULL,
        storage_key VARCHAR(255) NOT NULL,
        status_code VARCHAR(32) NOT NULL,
        document_id BIGINT UNSIGNED NULL,
        document_version_id BIGINT UNSIGNED NULL,
        created_at DATETIME(6) NOT NULL,
        expires_at DATETIME(6) NOT NULL,
        stored_at DATETIME(6) NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_document_upload_intents_public_id (public_id),
        UNIQUE KEY uq_document_upload_intents_storage_key (storage_key),
        CONSTRAINT fk_document_upload_intents_owner_user FOREIGN KEY (owner_user_id)
          REFERENCES users (id)
          ON UPDATE CASCADE
          ON DELETE CASCADE,
        CONSTRAINT fk_document_upload_intents_owner_account FOREIGN KEY (owner_client_account_id)
          REFERENCES client_accounts (id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,
        CONSTRAINT fk_document_upload_intents_document FOREIGN KEY (document_id)
          REFERENCES documents (id)
          ON UPDATE CASCADE
          ON DELETE SET NULL,
        CONSTRAINT fk_document_upload_intents_document_version FOREIGN KEY (document_version_id)
          REFERENCES document_versions (id)
          ON UPDATE CASCADE
          ON DELETE SET NULL,
        CONSTRAINT chk_document_upload_intents_size CHECK (size_bytes > 0)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS events (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        public_id CHAR(26) NOT NULL,
        client_account_id BIGINT UNSIGNED NOT NULL,
        matter_id BIGINT UNSIGNED NULL,
        title VARCHAR(255) NOT NULL,
        event_type_code VARCHAR(32) NOT NULL,
        status_code VARCHAR(32) NOT NULL,
        scheduled_start_at DATETIME(6) NOT NULL,
        scheduled_end_at DATETIME(6) NOT NULL,
        timezone_name VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata',
        mode_code VARCHAR(32) NOT NULL,
        location_text VARCHAR(255) NULL,
        meeting_provider_code VARCHAR(32) NOT NULL,
        external_meeting_id VARCHAR(255) NULL,
        join_url VARCHAR(500) NULL,
        host_url VARCHAR(500) NULL,
        client_visible_flag TINYINT(1) NOT NULL DEFAULT 1,
        notes TEXT NULL,
        created_by_user_id BIGINT UNSIGNED NOT NULL,
        cancelled_by_user_id BIGINT UNSIGNED NULL,
        created_at DATETIME(6) NOT NULL,
        updated_at DATETIME(6) NOT NULL,
        cancelled_at DATETIME(6) NULL,
        row_version BIGINT UNSIGNED NOT NULL DEFAULT 1,
        PRIMARY KEY (id),
        UNIQUE KEY uq_events_public_id (public_id),
        INDEX idx_events_client (client_account_id),
        INDEX idx_events_matter (matter_id),
        CONSTRAINT fk_events_client_account FOREIGN KEY (client_account_id)
          REFERENCES client_accounts (id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,
        CONSTRAINT fk_events_matter FOREIGN KEY (matter_id)
          REFERENCES matters (id)
          ON UPDATE CASCADE
          ON DELETE SET NULL,
        CONSTRAINT fk_events_status FOREIGN KEY (status_code)
          REFERENCES event_statuses (code)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,
        CONSTRAINT fk_events_created_by FOREIGN KEY (created_by_user_id)
          REFERENCES users (id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,
        CONSTRAINT fk_events_cancelled_by FOREIGN KEY (cancelled_by_user_id)
          REFERENCES users (id)
          ON UPDATE CASCADE
          ON DELETE SET NULL,
        CONSTRAINT chk_events_time CHECK (scheduled_end_at > scheduled_start_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS event_participants (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        event_id BIGINT UNSIGNED NOT NULL,
        participant_role_code VARCHAR(32) NOT NULL,
        internal_user_id BIGINT UNSIGNED NULL,
        client_contact_user_id BIGINT UNSIGNED NULL,
        counsel_partner_id BIGINT UNSIGNED NULL,
        rsvp_status_code VARCHAR(32) NOT NULL,
        attendance_status_code VARCHAR(32) NOT NULL,
        joined_at DATETIME(6) NULL,
        left_at DATETIME(6) NULL,
        created_at DATETIME(6) NOT NULL,
        PRIMARY KEY (id),
        CONSTRAINT fk_event_participants_event FOREIGN KEY (event_id)
          REFERENCES events (id)
          ON UPDATE CASCADE
          ON DELETE CASCADE,
        CONSTRAINT fk_event_participants_internal_user FOREIGN KEY (internal_user_id)
          REFERENCES users (id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,
        CONSTRAINT fk_event_participants_client_user FOREIGN KEY (client_contact_user_id)
          REFERENCES users (id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,
        CONSTRAINT fk_event_participants_counsel FOREIGN KEY (counsel_partner_id)
          REFERENCES counsel_partners (id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS event_reminders (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        event_id BIGINT UNSIGNED NOT NULL,
        recipient_user_id BIGINT UNSIGNED NOT NULL,
        channel_code VARCHAR(32) NOT NULL,
        scheduled_at DATETIME(6) NOT NULL,
        sent_at DATETIME(6) NULL,
        delivery_status_code VARCHAR(32) NOT NULL,
        failure_reason VARCHAR(255) NULL,
        PRIMARY KEY (id),
        INDEX idx_event_reminders_event (event_id),
        CONSTRAINT fk_event_reminders_event FOREIGN KEY (event_id)
          REFERENCES events (id)
          ON UPDATE CASCADE
          ON DELETE CASCADE,
        CONSTRAINT fk_event_reminders_recipient FOREIGN KEY (recipient_user_id)
          REFERENCES users (id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS conversation_threads (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        public_id CHAR(26) NOT NULL,
        thread_number VARCHAR(50) NOT NULL,
        thread_type_code VARCHAR(32) NOT NULL,
        client_account_id BIGINT UNSIGNED NOT NULL,
        matter_id BIGINT UNSIGNED NULL,
        subject VARCHAR(255) NULL,
        status_code VARCHAR(32) NOT NULL,
        created_by_user_id BIGINT UNSIGNED NOT NULL,
        assigned_owner_user_id BIGINT UNSIGNED NULL,
        last_message_at DATETIME(6) NULL,
        created_at DATETIME(6) NOT NULL,
        updated_at DATETIME(6) NOT NULL,
        closed_at DATETIME(6) NULL,
        archived_at DATETIME(6) NULL,
        row_version BIGINT UNSIGNED NOT NULL DEFAULT 1,
        PRIMARY KEY (id),
        UNIQUE KEY uq_conversation_threads_public_id (public_id),
        UNIQUE KEY uq_conversation_threads_number (thread_number),
        INDEX idx_conversation_threads_client (client_account_id),
        INDEX idx_conversation_threads_matter (matter_id),
        CONSTRAINT fk_conversation_threads_client_account FOREIGN KEY (client_account_id)
          REFERENCES client_accounts (id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,
        CONSTRAINT fk_conversation_threads_matter FOREIGN KEY (matter_id)
          REFERENCES matters (id)
          ON UPDATE CASCADE
          ON DELETE SET NULL,
        CONSTRAINT fk_conversation_threads_status FOREIGN KEY (status_code)
          REFERENCES thread_statuses (code)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,
        CONSTRAINT fk_conversation_threads_created_by FOREIGN KEY (created_by_user_id)
          REFERENCES users (id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,
        CONSTRAINT fk_conversation_threads_assigned_owner FOREIGN KEY (assigned_owner_user_id)
          REFERENCES users (id)
          ON UPDATE CASCADE
          ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `SELECT 1`,
      `CREATE TABLE IF NOT EXISTS messages (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        public_id CHAR(26) NOT NULL,
        thread_id BIGINT UNSIGNED NOT NULL,
        sender_user_id BIGINT UNSIGNED NULL,
        sender_counsel_partner_id BIGINT UNSIGNED NULL,
        sender_system_code VARCHAR(32) NULL,
        message_type_code VARCHAR(32) NOT NULL,
        body_text TEXT NOT NULL,
        visible_to_client TINYINT(1) NOT NULL DEFAULT 1,
        reply_to_message_id BIGINT UNSIGNED NULL,
        sent_at DATETIME(6) NOT NULL,
        edited_at DATETIME(6) NULL,
        deleted_at DATETIME(6) NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_messages_public_id (public_id),
        INDEX idx_messages_thread (thread_id),
        CONSTRAINT fk_messages_thread FOREIGN KEY (thread_id)
          REFERENCES conversation_threads (id)
          ON UPDATE CASCADE
          ON DELETE CASCADE,
        CONSTRAINT fk_messages_sender_user FOREIGN KEY (sender_user_id)
          REFERENCES users (id)
          ON UPDATE CASCADE
          ON DELETE SET NULL,
        CONSTRAINT fk_messages_sender_counsel FOREIGN KEY (sender_counsel_partner_id)
          REFERENCES counsel_partners (id)
          ON UPDATE CASCADE
          ON DELETE SET NULL,
        CONSTRAINT fk_messages_reply_to FOREIGN KEY (reply_to_message_id)
          REFERENCES messages (id)
          ON UPDATE CASCADE
          ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS thread_participants (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        thread_id BIGINT UNSIGNED NOT NULL,
        participant_role_code VARCHAR(32) NOT NULL,
        internal_user_id BIGINT UNSIGNED NULL,
        client_contact_user_id BIGINT UNSIGNED NULL,
        counsel_partner_id BIGINT UNSIGNED NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        joined_at DATETIME(6) NOT NULL,
        left_at DATETIME(6) NULL,
        last_read_message_id BIGINT UNSIGNED NULL,
        last_read_at DATETIME(6) NULL,
        PRIMARY KEY (id),
        INDEX idx_thread_participants_thread (thread_id),
        CONSTRAINT fk_thread_participants_thread FOREIGN KEY (thread_id)
          REFERENCES conversation_threads (id)
          ON UPDATE CASCADE
          ON DELETE CASCADE,
        CONSTRAINT fk_thread_participants_internal_user FOREIGN KEY (internal_user_id)
          REFERENCES users (id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,
        CONSTRAINT fk_thread_participants_client_user FOREIGN KEY (client_contact_user_id)
          REFERENCES users (id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,
        CONSTRAINT fk_thread_participants_counsel FOREIGN KEY (counsel_partner_id)
          REFERENCES counsel_partners (id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,
        CONSTRAINT fk_thread_participants_last_read_message FOREIGN KEY (last_read_message_id)
          REFERENCES messages (id)
          ON UPDATE CASCADE
          ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS message_document_versions (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        message_id BIGINT UNSIGNED NOT NULL,
        document_version_id BIGINT UNSIGNED NOT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        created_at DATETIME(6) NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_message_document_versions (message_id, document_version_id),
        CONSTRAINT fk_message_document_versions_message FOREIGN KEY (message_id)
          REFERENCES messages (id)
          ON UPDATE CASCADE
          ON DELETE CASCADE,
        CONSTRAINT fk_message_document_versions_version FOREIGN KEY (document_version_id)
          REFERENCES document_versions (id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS message_reads (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        message_id BIGINT UNSIGNED NOT NULL,
        user_id BIGINT UNSIGNED NOT NULL,
        read_at DATETIME(6) NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_message_reads (message_id, user_id),
        CONSTRAINT fk_message_reads_message FOREIGN KEY (message_id)
          REFERENCES messages (id)
          ON UPDATE CASCADE
          ON DELETE CASCADE,
        CONSTRAINT fk_message_reads_user FOREIGN KEY (user_id)
          REFERENCES users (id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`
    ],
  },
  {
    id: '007-normalized-billing-notification-audit-schema',
    description: 'Create normalized billing, payment, notification, invoice-link, and audit tables.',
    statements: [
      `CREATE TABLE IF NOT EXISTS payment_methods (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        public_id CHAR(26) NOT NULL,
        client_account_id BIGINT UNSIGNED NOT NULL,
        added_by_user_id BIGINT UNSIGNED NOT NULL,
        provider_code VARCHAR(32) NOT NULL,
        method_type_code VARCHAR(32) NOT NULL,
        provider_customer_ref VARCHAR(255) NULL,
        provider_method_ref VARCHAR(255) NULL,
        display_label VARCHAR(120) NOT NULL,
        brand_last4 VARCHAR(16) NULL,
        expiry_month TINYINT UNSIGNED NULL,
        expiry_year SMALLINT UNSIGNED NULL,
        upi_id VARCHAR(100) NULL,
        is_default TINYINT(1) NOT NULL DEFAULT 0,
        method_status_code VARCHAR(32) NOT NULL,
        created_at DATETIME(6) NOT NULL,
        updated_at DATETIME(6) NOT NULL,
        archived_at DATETIME(6) NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_payment_methods_public_id (public_id),
        CONSTRAINT fk_payment_methods_client_account FOREIGN KEY (client_account_id)
          REFERENCES client_accounts (id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,
        CONSTRAINT fk_payment_methods_added_by FOREIGN KEY (added_by_user_id)
          REFERENCES users (id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS subscriptions (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        public_id CHAR(26) NOT NULL,
        subscription_number VARCHAR(50) NOT NULL,
        client_account_id BIGINT UNSIGNED NOT NULL,
        subscription_plan_id BIGINT UNSIGNED NOT NULL,
        payment_method_id BIGINT UNSIGNED NULL,
        subscription_status_code VARCHAR(32) NOT NULL,
        start_date DATE NOT NULL,
        current_period_start DATE NOT NULL,
        current_period_end DATE NOT NULL,
        next_billing_at DATETIME(6) NULL,
        cancel_at_period_end TINYINT(1) NOT NULL DEFAULT 0,
        cancelled_at DATETIME(6) NULL,
        ended_at DATETIME(6) NULL,
        created_by_user_id BIGINT UNSIGNED NOT NULL,
        created_at DATETIME(6) NOT NULL,
        updated_at DATETIME(6) NOT NULL,
        archived_at DATETIME(6) NULL,
        row_version BIGINT UNSIGNED NOT NULL DEFAULT 1,
        PRIMARY KEY (id),
        UNIQUE KEY uq_subscriptions_public_id (public_id),
        UNIQUE KEY uq_subscriptions_number (subscription_number),
        CONSTRAINT fk_subscriptions_client_account FOREIGN KEY (client_account_id)
          REFERENCES client_accounts (id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,
        CONSTRAINT fk_subscriptions_plan FOREIGN KEY (subscription_plan_id)
          REFERENCES subscription_plans (id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,
        CONSTRAINT fk_subscriptions_payment_method FOREIGN KEY (payment_method_id)
          REFERENCES payment_methods (id)
          ON UPDATE CASCADE
          ON DELETE SET NULL,
        CONSTRAINT fk_subscriptions_created_by FOREIGN KEY (created_by_user_id)
          REFERENCES users (id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS invoices (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        public_id CHAR(26) NOT NULL,
        invoice_number VARCHAR(50) NOT NULL,
        client_account_id BIGINT UNSIGNED NOT NULL,
        matter_id BIGINT UNSIGNED NULL,
        subscription_id BIGINT UNSIGNED NULL,
        invoice_type_code VARCHAR(32) NOT NULL,
        status_code VARCHAR(32) NOT NULL,
        currency_code CHAR(3) NOT NULL DEFAULT 'INR',
        issue_date DATE NOT NULL,
        due_date DATE NOT NULL,
        subtotal_amount DECIMAL(14,2) NOT NULL,
        discount_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
        tax_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
        total_amount DECIMAL(14,2) NOT NULL,
        amount_paid DECIMAL(14,2) NOT NULL DEFAULT 0,
        amount_refunded DECIMAL(14,2) NOT NULL DEFAULT 0,
        amount_due DECIMAL(14,2) NOT NULL DEFAULT 0,
        created_by_user_id BIGINT UNSIGNED NOT NULL,
        created_at DATETIME(6) NOT NULL,
        updated_at DATETIME(6) NOT NULL,
        archived_at DATETIME(6) NULL,
        row_version BIGINT UNSIGNED NOT NULL DEFAULT 1,
        PRIMARY KEY (id),
        UNIQUE KEY uq_invoices_public_id (public_id),
        UNIQUE KEY uq_invoices_number (invoice_number),
        INDEX idx_invoices_client (client_account_id),
        INDEX idx_invoices_matter (matter_id),
        CONSTRAINT fk_invoices_client_account FOREIGN KEY (client_account_id)
          REFERENCES client_accounts (id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,
        CONSTRAINT fk_invoices_matter FOREIGN KEY (matter_id)
          REFERENCES matters (id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,
        CONSTRAINT fk_invoices_subscription FOREIGN KEY (subscription_id)
          REFERENCES subscriptions (id)
          ON UPDATE CASCADE
          ON DELETE SET NULL,
        CONSTRAINT fk_invoices_status FOREIGN KEY (status_code)
          REFERENCES invoice_statuses (code)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,
        CONSTRAINT fk_invoices_created_by FOREIGN KEY (created_by_user_id)
          REFERENCES users (id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,
        CONSTRAINT chk_invoices_amounts CHECK (
          subtotal_amount >= 0 AND discount_amount >= 0 AND tax_amount >= 0 AND total_amount >= 0 AND
          amount_paid >= 0 AND amount_refunded >= 0 AND amount_due >= 0
        )
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS invoice_billing_snapshots (
        invoice_id BIGINT UNSIGNED NOT NULL,
        billing_name VARCHAR(200) NOT NULL,
        billing_email VARCHAR(255) NOT NULL,
        billing_phone VARCHAR(40) NOT NULL,
        address_line1 VARCHAR(255) NOT NULL,
        address_line2 VARCHAR(255) NULL,
        city VARCHAR(100) NOT NULL,
        state VARCHAR(100) NOT NULL,
        postal_code VARCHAR(20) NOT NULL,
        country_code VARCHAR(16) NOT NULL,
        gstin VARCHAR(24) NULL,
        created_at DATETIME(6) NOT NULL,
        PRIMARY KEY (invoice_id),
        CONSTRAINT fk_invoice_billing_snapshots_invoice FOREIGN KEY (invoice_id)
          REFERENCES invoices (id)
          ON UPDATE CASCADE
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS invoice_lines (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        invoice_id BIGINT UNSIGNED NOT NULL,
        line_type_code VARCHAR(32) NOT NULL,
        service_id BIGINT UNSIGNED NULL,
        subscription_plan_id BIGINT UNSIGNED NULL,
        description VARCHAR(255) NOT NULL,
        quantity DECIMAL(12,2) NOT NULL DEFAULT 1.00,
        unit_price DECIMAL(14,2) NOT NULL DEFAULT 0,
        line_subtotal DECIMAL(14,2) NOT NULL DEFAULT 0,
        discount_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
        taxable_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
        line_total DECIMAL(14,2) NOT NULL DEFAULT 0,
        sort_order INT NOT NULL DEFAULT 0,
        created_at DATETIME(6) NOT NULL,
        PRIMARY KEY (id),
        INDEX idx_invoice_lines_invoice (invoice_id),
        CONSTRAINT fk_invoice_lines_invoice FOREIGN KEY (invoice_id)
          REFERENCES invoices (id)
          ON UPDATE CASCADE
          ON DELETE CASCADE,
        CONSTRAINT fk_invoice_lines_service FOREIGN KEY (service_id)
          REFERENCES services (id)
          ON UPDATE CASCADE
          ON DELETE SET NULL,
        CONSTRAINT fk_invoice_lines_subscription_plan FOREIGN KEY (subscription_plan_id)
          REFERENCES subscription_plans (id)
          ON UPDATE CASCADE
          ON DELETE SET NULL,
        CONSTRAINT chk_invoice_lines_amounts CHECK (
          quantity > 0 AND unit_price >= 0 AND line_subtotal >= 0 AND
          discount_amount >= 0 AND taxable_amount >= 0 AND line_total >= 0
        )
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS invoice_line_taxes (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        invoice_line_id BIGINT UNSIGNED NOT NULL,
        tax_rate_id BIGINT UNSIGNED NULL,
        tax_code_snapshot VARCHAR(32) NOT NULL,
        tax_name_snapshot VARCHAR(120) NOT NULL,
        tax_percent_snapshot DECIMAL(5,2) NOT NULL,
        taxable_amount DECIMAL(14,2) NOT NULL,
        tax_amount DECIMAL(14,2) NOT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        created_at DATETIME(6) NOT NULL,
        PRIMARY KEY (id),
        INDEX idx_invoice_line_taxes_line (invoice_line_id),
        CONSTRAINT fk_invoice_line_taxes_line FOREIGN KEY (invoice_line_id)
          REFERENCES invoice_lines (id)
          ON UPDATE CASCADE
          ON DELETE CASCADE,
        CONSTRAINT fk_invoice_line_taxes_tax_rate FOREIGN KEY (tax_rate_id)
          REFERENCES tax_rates (id)
          ON UPDATE CASCADE
          ON DELETE SET NULL,
        CONSTRAINT chk_invoice_line_taxes_amounts CHECK (
          tax_percent_snapshot >= 0 AND tax_percent_snapshot <= 100 AND
          taxable_amount >= 0 AND tax_amount >= 0
        )
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS invoice_installments (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        invoice_id BIGINT UNSIGNED NOT NULL,
        installment_no INT UNSIGNED NOT NULL,
        due_date DATE NOT NULL,
        amount_due DECIMAL(14,2) NOT NULL,
        amount_paid DECIMAL(14,2) NOT NULL DEFAULT 0,
        amount_remaining DECIMAL(14,2) NOT NULL DEFAULT 0,
        status_code VARCHAR(32) NOT NULL,
        paid_at DATETIME(6) NULL,
        created_at DATETIME(6) NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_invoice_installments_no (invoice_id, installment_no),
        INDEX idx_invoice_installments_invoice (invoice_id),
        CONSTRAINT fk_invoice_installments_invoice FOREIGN KEY (invoice_id)
          REFERENCES invoices (id)
          ON UPDATE CASCADE
          ON DELETE CASCADE,
        CONSTRAINT chk_invoice_installments_amounts CHECK (
          installment_no > 0 AND amount_due >= 0 AND amount_paid >= 0 AND amount_remaining >= 0
        )
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS payment_transactions (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        public_id CHAR(26) NOT NULL,
        client_account_id BIGINT UNSIGNED NOT NULL,
        payment_method_id BIGINT UNSIGNED NULL,
        gateway_provider_code VARCHAR(32) NOT NULL,
        gateway_order_ref VARCHAR(255) NULL,
        gateway_payment_ref VARCHAR(255) NULL,
        status_code VARCHAR(32) NOT NULL,
        currency_code CHAR(3) NOT NULL DEFAULT 'INR',
        gross_amount DECIMAL(14,2) NOT NULL,
        gateway_fee_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
        net_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
        failure_reason VARCHAR(255) NULL,
        initiated_at DATETIME(6) NOT NULL,
        authorized_at DATETIME(6) NULL,
        captured_at DATETIME(6) NULL,
        failed_at DATETIME(6) NULL,
        created_by_user_id BIGINT UNSIGNED NULL,
        created_at DATETIME(6) NOT NULL,
        updated_at DATETIME(6) NOT NULL,
        row_version BIGINT UNSIGNED NOT NULL DEFAULT 1,
        PRIMARY KEY (id),
        UNIQUE KEY uq_payment_transactions_public_id (public_id),
        INDEX idx_payment_transactions_client (client_account_id),
        CONSTRAINT fk_payment_transactions_client_account FOREIGN KEY (client_account_id)
          REFERENCES client_accounts (id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,
        CONSTRAINT fk_payment_transactions_payment_method FOREIGN KEY (payment_method_id)
          REFERENCES payment_methods (id)
          ON UPDATE CASCADE
          ON DELETE SET NULL,
        CONSTRAINT fk_payment_transactions_status FOREIGN KEY (status_code)
          REFERENCES payment_statuses (code)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,
        CONSTRAINT fk_payment_transactions_created_by FOREIGN KEY (created_by_user_id)
          REFERENCES users (id)
          ON UPDATE CASCADE
          ON DELETE SET NULL,
        CONSTRAINT chk_payment_transactions_amounts CHECK (
          gross_amount >= 0 AND gateway_fee_amount >= 0 AND net_amount >= 0
        )
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS payment_allocations (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        payment_transaction_id BIGINT UNSIGNED NOT NULL,
        invoice_id BIGINT UNSIGNED NOT NULL,
        invoice_installment_id BIGINT UNSIGNED NULL,
        amount_applied DECIMAL(14,2) NOT NULL,
        created_at DATETIME(6) NOT NULL,
        PRIMARY KEY (id),
        INDEX idx_payment_allocations_payment (payment_transaction_id),
        INDEX idx_payment_allocations_invoice (invoice_id),
        CONSTRAINT fk_payment_allocations_payment FOREIGN KEY (payment_transaction_id)
          REFERENCES payment_transactions (id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,
        CONSTRAINT fk_payment_allocations_invoice FOREIGN KEY (invoice_id)
          REFERENCES invoices (id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,
        CONSTRAINT fk_payment_allocations_installment FOREIGN KEY (invoice_installment_id)
          REFERENCES invoice_installments (id)
          ON UPDATE CASCADE
          ON DELETE SET NULL,
        CONSTRAINT chk_payment_allocations_amount CHECK (amount_applied > 0)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS refunds (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        public_id CHAR(26) NOT NULL,
        payment_transaction_id BIGINT UNSIGNED NOT NULL,
        invoice_id BIGINT UNSIGNED NULL,
        amount DECIMAL(14,2) NOT NULL,
        refund_status_code VARCHAR(32) NOT NULL,
        reason_text TEXT NOT NULL,
        gateway_refund_ref VARCHAR(255) NULL,
        requested_by_user_id BIGINT UNSIGNED NOT NULL,
        approved_by_user_id BIGINT UNSIGNED NULL,
        requested_at DATETIME(6) NOT NULL,
        completed_at DATETIME(6) NULL,
        created_at DATETIME(6) NOT NULL,
        updated_at DATETIME(6) NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_refunds_public_id (public_id),
        INDEX idx_refunds_payment (payment_transaction_id),
        CONSTRAINT fk_refunds_payment FOREIGN KEY (payment_transaction_id)
          REFERENCES payment_transactions (id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,
        CONSTRAINT fk_refunds_invoice FOREIGN KEY (invoice_id)
          REFERENCES invoices (id)
          ON UPDATE CASCADE
          ON DELETE SET NULL,
        CONSTRAINT fk_refunds_requested_by FOREIGN KEY (requested_by_user_id)
          REFERENCES users (id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,
        CONSTRAINT fk_refunds_approved_by FOREIGN KEY (approved_by_user_id)
          REFERENCES users (id)
          ON UPDATE CASCADE
          ON DELETE SET NULL,
        CONSTRAINT chk_refunds_amount CHECK (amount > 0)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS invoice_documents (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        invoice_id BIGINT UNSIGNED NOT NULL,
        document_id BIGINT UNSIGNED NOT NULL,
        link_role_code VARCHAR(32) NOT NULL,
        created_at DATETIME(6) NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_invoice_documents (invoice_id, document_id),
        CONSTRAINT fk_invoice_documents_invoice FOREIGN KEY (invoice_id)
          REFERENCES invoices (id)
          ON UPDATE CASCADE
          ON DELETE CASCADE,
        CONSTRAINT fk_invoice_documents_document FOREIGN KEY (document_id)
          REFERENCES documents (id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS notifications (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        public_id CHAR(26) NOT NULL,
        recipient_user_id BIGINT UNSIGNED NOT NULL,
        notification_type_code VARCHAR(64) NOT NULL,
        title VARCHAR(255) NOT NULL,
        body_text TEXT NOT NULL,
        priority_code VARCHAR(16) NOT NULL,
        matter_id BIGINT UNSIGNED NULL,
        invoice_id BIGINT UNSIGNED NULL,
        thread_id BIGINT UNSIGNED NULL,
        event_id BIGINT UNSIGNED NULL,
        document_id BIGINT UNSIGNED NULL,
        is_read TINYINT(1) NOT NULL DEFAULT 0,
        read_at DATETIME(6) NULL,
        dismissed_at DATETIME(6) NULL,
        created_at DATETIME(6) NOT NULL,
        expires_at DATETIME(6) NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_notifications_public_id (public_id),
        INDEX idx_notifications_recipient (recipient_user_id),
        CONSTRAINT fk_notifications_recipient FOREIGN KEY (recipient_user_id)
          REFERENCES users (id)
          ON UPDATE CASCADE
          ON DELETE CASCADE,
        CONSTRAINT fk_notifications_type FOREIGN KEY (notification_type_code)
          REFERENCES notification_types (code)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,
        CONSTRAINT fk_notifications_matter FOREIGN KEY (matter_id)
          REFERENCES matters (id)
          ON UPDATE CASCADE
          ON DELETE SET NULL,
        CONSTRAINT fk_notifications_invoice FOREIGN KEY (invoice_id)
          REFERENCES invoices (id)
          ON UPDATE CASCADE
          ON DELETE SET NULL,
        CONSTRAINT fk_notifications_thread FOREIGN KEY (thread_id)
          REFERENCES conversation_threads (id)
          ON UPDATE CASCADE
          ON DELETE SET NULL,
        CONSTRAINT fk_notifications_event FOREIGN KEY (event_id)
          REFERENCES events (id)
          ON UPDATE CASCADE
          ON DELETE SET NULL,
        CONSTRAINT fk_notifications_document FOREIGN KEY (document_id)
          REFERENCES documents (id)
          ON UPDATE CASCADE
          ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS audit_events (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        public_id CHAR(26) NOT NULL,
        actor_user_id BIGINT UNSIGNED NULL,
        actor_role_code_snapshot VARCHAR(64) NOT NULL,
        entity_table_name VARCHAR(64) NOT NULL,
        entity_pk BIGINT UNSIGNED NULL,
        action_code VARCHAR(64) NOT NULL,
        action_label VARCHAR(255) NOT NULL,
        source_module VARCHAR(64) NOT NULL,
        request_correlation_id VARCHAR(128) NULL,
        ip_address VARCHAR(45) NULL,
        user_agent TEXT NULL,
        summary_old_value TEXT NULL,
        summary_new_value TEXT NULL,
        occurred_at DATETIME(6) NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_audit_events_public_id (public_id),
        INDEX idx_audit_events_actor (actor_user_id),
        INDEX idx_audit_events_entity (entity_table_name, entity_pk),
        CONSTRAINT fk_audit_events_actor FOREIGN KEY (actor_user_id)
          REFERENCES users (id)
          ON UPDATE CASCADE
          ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS audit_event_changes (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        audit_event_id BIGINT UNSIGNED NOT NULL,
        field_name VARCHAR(128) NOT NULL,
        old_value_text TEXT NULL,
        new_value_text TEXT NULL,
        PRIMARY KEY (id),
        INDEX idx_audit_event_changes_event (audit_event_id),
        CONSTRAINT fk_audit_event_changes_event FOREIGN KEY (audit_event_id)
          REFERENCES audit_events (id)
          ON UPDATE CASCADE
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`
    ],
  },
  {
    id: '008-user-legal-acceptances',
    description: 'Persist legal acceptance events captured during authentication flows.',
    statements: [
      `CREATE TABLE IF NOT EXISTS user_legal_acceptances (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        public_id CHAR(26) NOT NULL,
        user_id BIGINT UNSIGNED NOT NULL,
        acceptance_type_code VARCHAR(64) NOT NULL,
        source_code VARCHAR(64) NOT NULL,
        accepted_at DATETIME(6) NOT NULL,
        ip_address VARCHAR(45) NULL,
        user_agent TEXT NULL,
        created_at DATETIME(6) NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_user_legal_acceptances_public_id (public_id),
        INDEX idx_user_legal_acceptances_user (user_id),
        INDEX idx_user_legal_acceptances_type (user_id, acceptance_type_code, accepted_at),
        CONSTRAINT fk_user_legal_acceptances_user FOREIGN KEY (user_id)
          REFERENCES users (id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`
    ],
  },
  {
    id: '009-auth-flows-normalization-compat',
    description: 'Preserve legacy auth_flows and create the normalized auth_flows table when needed.',
    statements: [
      `SET @auth_flows_has_hashed_token := (
        SELECT COUNT(*)
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'auth_flows'
          AND column_name = 'hashed_token'
      )`,
      `SET @auth_flows_has_public_id := (
        SELECT COUNT(*)
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'auth_flows'
          AND column_name = 'public_id'
      )`,
      `SET @rename_legacy_auth_flows_sql := IF(
        @auth_flows_has_hashed_token > 0 AND @auth_flows_has_public_id = 0,
        'RENAME TABLE auth_flows TO auth_flows_legacy_pre_009',
        'DO 0'
      )`,
      `PREPARE rename_legacy_auth_flows_stmt FROM @rename_legacy_auth_flows_sql`,
      `EXECUTE rename_legacy_auth_flows_stmt`,
      `DEALLOCATE PREPARE rename_legacy_auth_flows_stmt`,
      `CREATE TABLE IF NOT EXISTS auth_flows (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        public_id CHAR(26) NOT NULL,
        user_id BIGINT UNSIGNED NOT NULL,
        purpose_code VARCHAR(32) NOT NULL,
        remember_me TINYINT(1) NOT NULL DEFAULT 0,
        pending_phone VARCHAR(40) NULL,
        pending_country VARCHAR(80) NULL,
        oauth_provider_code VARCHAR(32) NULL,
        email_token_id BIGINT UNSIGNED NULL,
        phone_token_id BIGINT UNSIGNED NULL,
        password_reset_token_id BIGINT UNSIGNED NULL,
        flow_token_hash CHAR(64) NOT NULL,
        expires_at DATETIME(6) NOT NULL,
        consumed_at DATETIME(6) NULL,
        created_at DATETIME(6) NOT NULL,
        updated_at DATETIME(6) NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_auth_flows_public_id (public_id),
        UNIQUE KEY uq_auth_flows_token_hash (flow_token_hash),
        INDEX idx_auth_flows_user (user_id),
        INDEX idx_auth_flows_expires (expires_at),
        CONSTRAINT fk_auth_flows_user FOREIGN KEY (user_id)
          REFERENCES users (id)
          ON UPDATE CASCADE
          ON DELETE CASCADE,
        CONSTRAINT fk_auth_flows_email_token FOREIGN KEY (email_token_id)
          REFERENCES email_verification_tokens (id)
          ON UPDATE CASCADE
          ON DELETE SET NULL,
        CONSTRAINT fk_auth_flows_phone_token FOREIGN KEY (phone_token_id)
          REFERENCES phone_verification_tokens (id)
          ON UPDATE CASCADE
          ON DELETE SET NULL,
        CONSTRAINT fk_auth_flows_password_reset_token FOREIGN KEY (password_reset_token_id)
          REFERENCES password_reset_tokens (id)
          ON UPDATE CASCADE
          ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`
    ],
  },
  {
    id: '010-client-primary-address-guard',
    description:
      'Archive duplicate active primary client addresses and add lookup support for the primary-address upsert path.',
    statements: [
      `UPDATE client_addresses current_address
       INNER JOIN (
         SELECT client_account_id, MIN(id) AS keep_id
         FROM client_addresses
         WHERE archived_at IS NULL
           AND is_primary = 1
         GROUP BY client_account_id
       ) kept
         ON kept.client_account_id = current_address.client_account_id
       SET current_address.is_primary = 0,
           current_address.archived_at = CURRENT_TIMESTAMP(6),
           current_address.updated_at = CURRENT_TIMESTAMP(6)
       WHERE current_address.archived_at IS NULL
         AND current_address.is_primary = 1
         AND current_address.id <> kept.keep_id`,
      `ALTER TABLE client_addresses
       ADD INDEX idx_client_addresses_primary_lookup (client_account_id, archived_at, is_primary, id)`
    ],
  },
  {
    id: '011-twilio-native-phone-otp',
    description:
      'Allow phone verification tokens to store Twilio-native verification metadata instead of custom OTP hashes.',
    statements: [
      `ALTER TABLE phone_verification_tokens
       MODIFY code_hash CHAR(64) NULL`,
      `SET @phone_tokens_has_provider_code := (
        SELECT COUNT(*)
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'phone_verification_tokens'
          AND column_name = 'provider_code'
      )`,
      `SET @add_phone_tokens_provider_code_sql := IF(
        @phone_tokens_has_provider_code = 0,
        'ALTER TABLE phone_verification_tokens ADD COLUMN provider_code VARCHAR(32) NULL AFTER purpose_code',
        'DO 0'
      )`,
      `PREPARE add_phone_tokens_provider_code_stmt FROM @add_phone_tokens_provider_code_sql`,
      `EXECUTE add_phone_tokens_provider_code_stmt`,
      `DEALLOCATE PREPARE add_phone_tokens_provider_code_stmt`,
      `SET @phone_tokens_has_provider_reference := (
        SELECT COUNT(*)
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'phone_verification_tokens'
          AND column_name = 'provider_reference'
      )`,
      `SET @add_phone_tokens_provider_reference_sql := IF(
        @phone_tokens_has_provider_reference = 0,
        'ALTER TABLE phone_verification_tokens ADD COLUMN provider_reference VARCHAR(255) NULL AFTER provider_code',
        'DO 0'
      )`,
      `PREPARE add_phone_tokens_provider_reference_stmt FROM @add_phone_tokens_provider_reference_sql`,
      `EXECUTE add_phone_tokens_provider_reference_stmt`,
      `DEALLOCATE PREPARE add_phone_tokens_provider_reference_stmt`,
      `SET @phone_tokens_has_provider_index := (
        SELECT COUNT(*)
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = 'phone_verification_tokens'
          AND index_name = 'idx_phone_verification_provider'
      )`,
      `SET @add_phone_tokens_provider_index_sql := IF(
        @phone_tokens_has_provider_index = 0,
        'ALTER TABLE phone_verification_tokens ADD INDEX idx_phone_verification_provider (provider_code, provider_reference)',
        'DO 0'
      )`,
      `PREPARE add_phone_tokens_provider_index_stmt FROM @add_phone_tokens_provider_index_sql`,
      `EXECUTE add_phone_tokens_provider_index_stmt`,
      `DEALLOCATE PREPARE add_phone_tokens_provider_index_stmt`
    ],
  },
  {
    id: '012-package-proposal-lifecycle',
    description:
      'Add matter package proposal lifecycle metadata, package features, and package-linked invoice support.',
    statements: [
      `SET @matters_has_selected_package_column := (
        SELECT COUNT(*)
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'matters'
          AND column_name = 'selected_matter_package_id'
      )`,
      `SET @add_matters_selected_package_column_sql := IF(
        @matters_has_selected_package_column = 0,
        'ALTER TABLE matters ADD COLUMN selected_matter_package_id BIGINT UNSIGNED NULL AFTER due_total_amount',
        'DO 0'
      )`,
      `PREPARE add_matters_selected_package_column_stmt FROM @add_matters_selected_package_column_sql`,
      `EXECUTE add_matters_selected_package_column_stmt`,
      `DEALLOCATE PREPARE add_matters_selected_package_column_stmt`,
      `SET @matters_has_selected_package_index := (
        SELECT COUNT(*)
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = 'matters'
          AND index_name = 'idx_matters_selected_package'
      )`,
      `SET @add_matters_selected_package_index_sql := IF(
        @matters_has_selected_package_index = 0,
        'ALTER TABLE matters ADD INDEX idx_matters_selected_package (selected_matter_package_id)',
        'DO 0'
      )`,
      `PREPARE add_matters_selected_package_index_stmt FROM @add_matters_selected_package_index_sql`,
      `EXECUTE add_matters_selected_package_index_stmt`,
      `DEALLOCATE PREPARE add_matters_selected_package_index_stmt`,
      `SET @matters_has_selected_package_fk := (
        SELECT COUNT(*)
        FROM information_schema.referential_constraints
        WHERE constraint_schema = DATABASE()
          AND table_name = 'matters'
          AND constraint_name = 'fk_matters_selected_package'
      )`,
      `SET @add_matters_selected_package_fk_sql := IF(
        @matters_has_selected_package_fk = 0,
        'ALTER TABLE matters ADD CONSTRAINT fk_matters_selected_package FOREIGN KEY (selected_matter_package_id) REFERENCES matter_packages (id) ON UPDATE CASCADE ON DELETE SET NULL',
        'DO 0'
      )`,
      `PREPARE add_matters_selected_package_fk_stmt FROM @add_matters_selected_package_fk_sql`,
      `EXECUTE add_matters_selected_package_fk_stmt`,
      `DEALLOCATE PREPARE add_matters_selected_package_fk_stmt`,
      `SET @packages_has_proposal_version := (
        SELECT COUNT(*)
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'matter_packages'
          AND column_name = 'proposal_version_no'
      )`,
      `SET @add_packages_proposal_version_sql := IF(
        @packages_has_proposal_version = 0,
        'ALTER TABLE matter_packages ADD COLUMN proposal_version_no INT UNSIGNED NULL AFTER matter_id',
        'DO 0'
      )`,
      `PREPARE add_packages_proposal_version_stmt FROM @add_packages_proposal_version_sql`,
      `EXECUTE add_packages_proposal_version_stmt`,
      `DEALLOCATE PREPARE add_packages_proposal_version_stmt`,
      `SET @packages_has_display_order := (
        SELECT COUNT(*)
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'matter_packages'
          AND column_name = 'display_order'
      )`,
      `SET @add_packages_display_order_sql := IF(
        @packages_has_display_order = 0,
        'ALTER TABLE matter_packages ADD COLUMN display_order INT NOT NULL DEFAULT 0 AFTER total_price',
        'DO 0'
      )`,
      `PREPARE add_packages_display_order_stmt FROM @add_packages_display_order_sql`,
      `EXECUTE add_packages_display_order_stmt`,
      `DEALLOCATE PREPARE add_packages_display_order_stmt`,
      `SET @packages_has_is_recommended := (
        SELECT COUNT(*)
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'matter_packages'
          AND column_name = 'is_recommended'
      )`,
      `SET @add_packages_is_recommended_sql := IF(
        @packages_has_is_recommended = 0,
        'ALTER TABLE matter_packages ADD COLUMN is_recommended TINYINT(1) NOT NULL DEFAULT 0 AFTER display_order',
        'DO 0'
      )`,
      `PREPARE add_packages_is_recommended_stmt FROM @add_packages_is_recommended_sql`,
      `EXECUTE add_packages_is_recommended_stmt`,
      `DEALLOCATE PREPARE add_packages_is_recommended_stmt`,
      `SET @packages_has_published_at := (
        SELECT COUNT(*)
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'matter_packages'
          AND column_name = 'published_at'
      )`,
      `SET @add_packages_published_at_sql := IF(
        @packages_has_published_at = 0,
        'ALTER TABLE matter_packages ADD COLUMN published_at DATETIME(6) NULL AFTER updated_at',
        'DO 0'
      )`,
      `PREPARE add_packages_published_at_stmt FROM @add_packages_published_at_sql`,
      `EXECUTE add_packages_published_at_stmt`,
      `DEALLOCATE PREPARE add_packages_published_at_stmt`,
      `SET @packages_has_superseded_at := (
        SELECT COUNT(*)
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'matter_packages'
          AND column_name = 'superseded_at'
      )`,
      `SET @add_packages_superseded_at_sql := IF(
        @packages_has_superseded_at = 0,
        'ALTER TABLE matter_packages ADD COLUMN superseded_at DATETIME(6) NULL AFTER published_at',
        'DO 0'
      )`,
      `PREPARE add_packages_superseded_at_stmt FROM @add_packages_superseded_at_sql`,
      `EXECUTE add_packages_superseded_at_stmt`,
      `DEALLOCATE PREPARE add_packages_superseded_at_stmt`,
      `SET @packages_has_selected_at := (
        SELECT COUNT(*)
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'matter_packages'
          AND column_name = 'selected_at'
      )`,
      `SET @add_packages_selected_at_sql := IF(
        @packages_has_selected_at = 0,
        'ALTER TABLE matter_packages ADD COLUMN selected_at DATETIME(6) NULL AFTER superseded_at',
        'DO 0'
      )`,
      `PREPARE add_packages_selected_at_stmt FROM @add_packages_selected_at_sql`,
      `EXECUTE add_packages_selected_at_stmt`,
      `DEALLOCATE PREPARE add_packages_selected_at_stmt`,
      `UPDATE matter_packages
       SET proposal_version_no = COALESCE(proposal_version_no, 1),
           published_at = COALESCE(published_at, IF(archived_at IS NULL, created_at, NULL))
       WHERE proposal_version_no IS NULL OR published_at IS NULL`,
      `ALTER TABLE matter_packages
       MODIFY proposal_version_no INT UNSIGNED NOT NULL`,
      `SET @packages_has_proposal_index := (
        SELECT COUNT(*)
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = 'matter_packages'
          AND index_name = 'idx_matter_packages_proposal_version'
      )`,
      `SET @add_packages_proposal_index_sql := IF(
        @packages_has_proposal_index = 0,
        'ALTER TABLE matter_packages ADD INDEX idx_matter_packages_proposal_version (matter_id, proposal_version_no)',
        'DO 0'
      )`,
      `PREPARE add_packages_proposal_index_stmt FROM @add_packages_proposal_index_sql`,
      `EXECUTE add_packages_proposal_index_stmt`,
      `DEALLOCATE PREPARE add_packages_proposal_index_stmt`,
      `CREATE TABLE IF NOT EXISTS matter_package_features (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        matter_package_id BIGINT UNSIGNED NOT NULL,
        feature_text VARCHAR(255) NOT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        created_at DATETIME(6) NOT NULL,
        PRIMARY KEY (id),
        INDEX idx_matter_package_features_package (matter_package_id),
        CONSTRAINT fk_matter_package_features_package FOREIGN KEY (matter_package_id)
          REFERENCES matter_packages (id)
          ON UPDATE CASCADE
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `SET @invoices_has_matter_package_column := (
        SELECT COUNT(*)
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'invoices'
          AND column_name = 'matter_package_id'
      )`,
      `SET @add_invoices_matter_package_column_sql := IF(
        @invoices_has_matter_package_column = 0,
        'ALTER TABLE invoices ADD COLUMN matter_package_id BIGINT UNSIGNED NULL AFTER matter_id',
        'DO 0'
      )`,
      `PREPARE add_invoices_matter_package_column_stmt FROM @add_invoices_matter_package_column_sql`,
      `EXECUTE add_invoices_matter_package_column_stmt`,
      `DEALLOCATE PREPARE add_invoices_matter_package_column_stmt`,
      `SET @invoices_has_matter_package_index := (
        SELECT COUNT(*)
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = 'invoices'
          AND index_name = 'idx_invoices_matter_package'
      )`,
      `SET @add_invoices_matter_package_index_sql := IF(
        @invoices_has_matter_package_index = 0,
        'ALTER TABLE invoices ADD INDEX idx_invoices_matter_package (matter_package_id)',
        'DO 0'
      )`,
      `PREPARE add_invoices_matter_package_index_stmt FROM @add_invoices_matter_package_index_sql`,
      `EXECUTE add_invoices_matter_package_index_stmt`,
      `DEALLOCATE PREPARE add_invoices_matter_package_index_stmt`,
      `SET @invoices_has_matter_package_fk := (
        SELECT COUNT(*)
        FROM information_schema.referential_constraints
        WHERE constraint_schema = DATABASE()
          AND table_name = 'invoices'
          AND constraint_name = 'fk_invoices_matter_package'
      )`,
      `SET @add_invoices_matter_package_fk_sql := IF(
        @invoices_has_matter_package_fk = 0,
        'ALTER TABLE invoices ADD CONSTRAINT fk_invoices_matter_package FOREIGN KEY (matter_package_id) REFERENCES matter_packages (id) ON UPDATE CASCADE ON DELETE SET NULL',
        'DO 0'
      )`,
      `PREPARE add_invoices_matter_package_fk_stmt FROM @add_invoices_matter_package_fk_sql`,
      `EXECUTE add_invoices_matter_package_fk_stmt`,
      `DEALLOCATE PREPARE add_invoices_matter_package_fk_stmt`,
      `UPDATE matter_packages mp
       INNER JOIN matters m
         ON m.selected_matter_package_id = mp.id
       SET mp.selected_at = COALESCE(mp.selected_at, mp.updated_at)
       WHERE mp.selected_at IS NULL`
    ],
  },
  {
    id: '013-reminder-retry-lifecycle',
    description:
      'Add retry, locking, and completion metadata for reliable event reminder processing.',
    statements: [
      `SET @event_reminders_has_retry_count := (
        SELECT COUNT(*)
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'event_reminders'
          AND column_name = 'retry_count'
      )`,
      `SET @add_event_reminders_retry_count_sql := IF(
        @event_reminders_has_retry_count = 0,
        'ALTER TABLE event_reminders ADD COLUMN retry_count INT UNSIGNED NOT NULL DEFAULT 0 AFTER failure_reason',
        'DO 0'
      )`,
      `PREPARE add_event_reminders_retry_count_stmt FROM @add_event_reminders_retry_count_sql`,
      `EXECUTE add_event_reminders_retry_count_stmt`,
      `DEALLOCATE PREPARE add_event_reminders_retry_count_stmt`,
      `SET @event_reminders_has_max_attempts := (
        SELECT COUNT(*)
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'event_reminders'
          AND column_name = 'max_attempts'
      )`,
      `SET @add_event_reminders_max_attempts_sql := IF(
        @event_reminders_has_max_attempts = 0,
        'ALTER TABLE event_reminders ADD COLUMN max_attempts INT UNSIGNED NOT NULL DEFAULT 3 AFTER retry_count',
        'DO 0'
      )`,
      `PREPARE add_event_reminders_max_attempts_stmt FROM @add_event_reminders_max_attempts_sql`,
      `EXECUTE add_event_reminders_max_attempts_stmt`,
      `DEALLOCATE PREPARE add_event_reminders_max_attempts_stmt`,
      `SET @event_reminders_has_next_attempt_at := (
        SELECT COUNT(*)
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'event_reminders'
          AND column_name = 'next_attempt_at'
      )`,
      `SET @add_event_reminders_next_attempt_at_sql := IF(
        @event_reminders_has_next_attempt_at = 0,
        'ALTER TABLE event_reminders ADD COLUMN next_attempt_at DATETIME(6) NULL AFTER max_attempts',
        'DO 0'
      )`,
      `PREPARE add_event_reminders_next_attempt_at_stmt FROM @add_event_reminders_next_attempt_at_sql`,
      `EXECUTE add_event_reminders_next_attempt_at_stmt`,
      `DEALLOCATE PREPARE add_event_reminders_next_attempt_at_stmt`,
      `SET @event_reminders_has_locked_at := (
        SELECT COUNT(*)
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'event_reminders'
          AND column_name = 'locked_at'
      )`,
      `SET @add_event_reminders_locked_at_sql := IF(
        @event_reminders_has_locked_at = 0,
        'ALTER TABLE event_reminders ADD COLUMN locked_at DATETIME(6) NULL AFTER next_attempt_at',
        'DO 0'
      )`,
      `PREPARE add_event_reminders_locked_at_stmt FROM @add_event_reminders_locked_at_sql`,
      `EXECUTE add_event_reminders_locked_at_stmt`,
      `DEALLOCATE PREPARE add_event_reminders_locked_at_stmt`,
      `SET @event_reminders_has_locked_by := (
        SELECT COUNT(*)
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'event_reminders'
          AND column_name = 'locked_by'
      )`,
      `SET @add_event_reminders_locked_by_sql := IF(
        @event_reminders_has_locked_by = 0,
        'ALTER TABLE event_reminders ADD COLUMN locked_by VARCHAR(96) NULL AFTER locked_at',
        'DO 0'
      )`,
      `PREPARE add_event_reminders_locked_by_stmt FROM @add_event_reminders_locked_by_sql`,
      `EXECUTE add_event_reminders_locked_by_stmt`,
      `DEALLOCATE PREPARE add_event_reminders_locked_by_stmt`,
      `SET @event_reminders_has_processed_at := (
        SELECT COUNT(*)
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'event_reminders'
          AND column_name = 'processed_at'
      )`,
      `SET @add_event_reminders_processed_at_sql := IF(
        @event_reminders_has_processed_at = 0,
        'ALTER TABLE event_reminders ADD COLUMN processed_at DATETIME(6) NULL AFTER locked_by',
        'DO 0'
      )`,
      `PREPARE add_event_reminders_processed_at_stmt FROM @add_event_reminders_processed_at_sql`,
      `EXECUTE add_event_reminders_processed_at_stmt`,
      `DEALLOCATE PREPARE add_event_reminders_processed_at_stmt`,
      `SET @event_reminders_has_status_due_index := (
        SELECT COUNT(*)
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = 'event_reminders'
          AND index_name = 'idx_event_reminders_status_due'
      )`,
      `SET @add_event_reminders_status_due_index_sql := IF(
        @event_reminders_has_status_due_index = 0,
        'ALTER TABLE event_reminders ADD INDEX idx_event_reminders_status_due (delivery_status_code, scheduled_at, next_attempt_at)',
        'DO 0'
      )`,
      `PREPARE add_event_reminders_status_due_index_stmt FROM @add_event_reminders_status_due_index_sql`,
      `EXECUTE add_event_reminders_status_due_index_stmt`,
      `DEALLOCATE PREPARE add_event_reminders_status_due_index_stmt`,
      `SET @event_reminders_has_lock_index := (
        SELECT COUNT(*)
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = 'event_reminders'
          AND index_name = 'idx_event_reminders_lock'
      )`,
      `SET @add_event_reminders_lock_index_sql := IF(
        @event_reminders_has_lock_index = 0,
        'ALTER TABLE event_reminders ADD INDEX idx_event_reminders_lock (locked_by, delivery_status_code)',
        'DO 0'
      )`,
      `PREPARE add_event_reminders_lock_index_stmt FROM @add_event_reminders_lock_index_sql`,
      `EXECUTE add_event_reminders_lock_index_stmt`,
      `DEALLOCATE PREPARE add_event_reminders_lock_index_stmt`,
      `SET @notifications_has_event_type_index := (
        SELECT COUNT(*)
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = 'notifications'
          AND index_name = 'idx_notifications_event_type_recipient'
      )`,
      `SET @add_notifications_event_type_index_sql := IF(
        @notifications_has_event_type_index = 0,
        'ALTER TABLE notifications ADD INDEX idx_notifications_event_type_recipient (recipient_user_id, event_id, notification_type_code, created_at)',
        'DO 0'
      )`,
      `PREPARE add_notifications_event_type_index_stmt FROM @add_notifications_event_type_index_sql`,
      `EXECUTE add_notifications_event_type_index_stmt`,
      `DEALLOCATE PREPARE add_notifications_event_type_index_stmt`
    ],
  },
  {
    id: '014-invoice-settings-and-gst-tax',
    description: 'Create editable invoice settings used by GST/tax calculation for new invoices.',
    statements: [
      `CREATE TABLE IF NOT EXISTS invoice_settings (
        id TINYINT UNSIGNED NOT NULL,
        business_legal_name VARCHAR(200) NOT NULL,
        billing_display_name VARCHAR(200) NOT NULL,
        gstin VARCHAR(24) NULL,
        business_state VARCHAR(100) NOT NULL,
        invoice_prefix VARCHAR(24) NOT NULL,
        default_sac_code VARCHAR(32) NULL,
        gst_enabled TINYINT(1) NOT NULL DEFAULT 1,
        default_gst_rate_bps INT UNSIGNED NOT NULL DEFAULT 1800,
        tax_mode_code VARCHAR(32) NOT NULL DEFAULT 'forward_charge',
        prices_include_tax TINYINT(1) NOT NULL DEFAULT 0,
        fallback_tax_type_code VARCHAR(32) NOT NULL DEFAULT 'igst',
        payment_terms_days INT UNSIGNED NOT NULL DEFAULT 7,
        invoice_footer TEXT NULL,
        reverse_charge_note TEXT NULL,
        created_at DATETIME(6) NOT NULL,
        updated_at DATETIME(6) NOT NULL,
        row_version BIGINT UNSIGNED NOT NULL DEFAULT 1,
        PRIMARY KEY (id),
        CONSTRAINT chk_invoice_settings_singleton CHECK (id = 1),
        CONSTRAINT chk_invoice_settings_gst_rate CHECK (default_gst_rate_bps <= 10000),
        CONSTRAINT chk_invoice_settings_payment_terms CHECK (payment_terms_days BETWEEN 0 AND 365),
        CONSTRAINT chk_invoice_settings_tax_mode CHECK (tax_mode_code IN ('forward_charge', 'reverse_charge', 'exempt')),
        CONSTRAINT chk_invoice_settings_fallback_tax_type CHECK (fallback_tax_type_code IN ('igst', 'cgst_sgst', 'none'))
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `INSERT INTO invoice_settings (
         id,
         business_legal_name,
         billing_display_name,
         gstin,
         business_state,
         invoice_prefix,
         default_sac_code,
         gst_enabled,
         default_gst_rate_bps,
         tax_mode_code,
         prices_include_tax,
         fallback_tax_type_code,
         payment_terms_days,
         invoice_footer,
         reverse_charge_note,
         created_at,
         updated_at
       )
       SELECT
         1,
         'Global LMG',
         'Global LMG',
         NULL,
         'Not configured',
         'INV',
         NULL,
         1,
         1800,
         'forward_charge',
         0,
         'igst',
         7,
         'Global LMG provides intermediary legal consultancy, coordination, and support services. This invoice is not for legal representation by Global LMG.',
         'Tax payable under reverse charge where applicable.',
         UTC_TIMESTAMP(6),
         UTC_TIMESTAMP(6)
       WHERE NOT EXISTS (SELECT 1 FROM invoice_settings WHERE id = 1)`
    ],
  },
  {
    id: '015-platform-settings-foundation',
    description: 'Create reusable mutable platform settings with RBAC and safe defaults.',
    statements: [
      `CREATE TABLE IF NOT EXISTS platform_settings (
        setting_key VARCHAR(128) NOT NULL,
        setting_value_json JSON NOT NULL,
        category VARCHAR(64) NOT NULL,
        label VARCHAR(160) NOT NULL,
        description TEXT NULL,
        value_type VARCHAR(32) NOT NULL,
        is_sensitive TINYINT(1) NOT NULL DEFAULT 0,
        version BIGINT UNSIGNED NOT NULL DEFAULT 1,
        updated_by BIGINT UNSIGNED NULL,
        updated_at DATETIME(6) NOT NULL,
        created_at DATETIME(6) NOT NULL,
        PRIMARY KEY (setting_key),
        INDEX idx_platform_settings_category (category),
        INDEX idx_platform_settings_updated_by (updated_by),
        CONSTRAINT chk_platform_settings_value_type CHECK (value_type IN ('string', 'text', 'boolean', 'integer', 'decimal', 'select', 'json')),
        CONSTRAINT fk_platform_settings_updated_by FOREIGN KEY (updated_by)
          REFERENCES users (id)
          ON UPDATE CASCADE
          ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `INSERT INTO permissions (code, module_name, action_name, description, created_at, updated_at)
       VALUES ('settings.manage', 'settings', 'manage', 'Manage mutable platform settings', UTC_TIMESTAMP(6), UTC_TIMESTAMP(6))
       ON DUPLICATE KEY UPDATE
         module_name = VALUES(module_name),
         action_name = VALUES(action_name),
         description = VALUES(description),
         updated_at = VALUES(updated_at)`,
      `INSERT INTO role_permissions (role_code, permission_code, granted_at)
       SELECT 'ops_admin', 'settings.manage', UTC_TIMESTAMP(6)
       WHERE EXISTS (SELECT 1 FROM roles WHERE code = 'ops_admin')
       ON DUPLICATE KEY UPDATE granted_at = VALUES(granted_at)`,
      `INSERT INTO platform_settings (
         setting_key,
         setting_value_json,
         category,
         label,
         description,
         value_type,
         is_sensitive,
         version,
         updated_by,
         updated_at,
         created_at
       )
       VALUES
         (
           'platform.display_name',
           JSON_OBJECT('value', 'Global LMG'),
           'general',
           'Platform Display Name',
           'Name shown in operational platform surfaces.',
           'string',
           0,
           1,
           NULL,
           UTC_TIMESTAMP(6),
           UTC_TIMESTAMP(6)
         ),
         (
           'platform.support_email',
           JSON_OBJECT('value', 'support@globallmg.local'),
           'general',
           'Support Email',
           'Default operational support email shown to admins and clients where configured.',
           'string',
           0,
           1,
           NULL,
           UTC_TIMESTAMP(6),
           UTC_TIMESTAMP(6)
         ),
         (
           'platform.support_phone',
           JSON_OBJECT('value', ''),
           'general',
           'Support Phone',
           'Default operational support phone number.',
           'string',
           0,
           1,
           NULL,
           UTC_TIMESTAMP(6),
           UTC_TIMESTAMP(6)
         ),
         (
           'platform.default_timezone',
           JSON_OBJECT('value', 'Asia/Kolkata'),
           'general',
           'Default Timezone',
           'Default timezone for operational displays and future scheduling defaults.',
           'select',
           0,
           1,
           NULL,
           UTC_TIMESTAMP(6),
           UTC_TIMESTAMP(6)
         ),
         (
           'platform.default_currency',
           JSON_OBJECT('value', 'INR'),
           'general',
           'Default Currency',
           'Default currency code for platform displays where a record-specific currency is unavailable.',
           'select',
           0,
           1,
           NULL,
           UTC_TIMESTAMP(6),
           UTC_TIMESTAMP(6)
         ),
         (
           'platform.default_date_format',
           JSON_OBJECT('value', 'DD/MM/YYYY'),
           'general',
           'Default Date Format',
           'Default date format for admin-facing display preferences.',
           'select',
           0,
           1,
           NULL,
           UTC_TIMESTAMP(6),
           UTC_TIMESTAMP(6)
         ),
         (
           'portal.maintenance_banner_enabled',
           JSON_OBJECT('value', FALSE),
           'portal',
           'Maintenance Banner Enabled',
           'Controls whether the portal maintenance banner should be shown by consumers that opt in to these settings.',
           'boolean',
           0,
           1,
           NULL,
           UTC_TIMESTAMP(6),
           UTC_TIMESTAMP(6)
         ),
         (
           'portal.maintenance_banner_message',
           JSON_OBJECT('value', ''),
           'portal',
           'Maintenance Banner Message',
           'Neutral portal maintenance message used when the maintenance banner is enabled.',
           'text',
           0,
           1,
           NULL,
           UTC_TIMESTAMP(6),
           UTC_TIMESTAMP(6)
         ),
         (
           'platform.operational_footer_note',
           JSON_OBJECT('value', 'Global LMG is an intermediary legal consultancy, lawyer-matching, coordination, and support platform. Global LMG is not a law firm and does not provide legal representation.'),
           'general',
           'Operational Footer Note',
           'Neutral footer language for future configurable operational surfaces.',
           'text',
           0,
           1,
           NULL,
           UTC_TIMESTAMP(6),
           UTC_TIMESTAMP(6)
         )
       ON DUPLICATE KEY UPDATE
         category = VALUES(category),
         label = VALUES(label),
         description = VALUES(description),
         value_type = VALUES(value_type),
         is_sensitive = VALUES(is_sensitive)`
    ],
  },
  {
    id: '016-neutral-service-catalog-copy',
    description: 'Replace old default service catalog descriptions with neutral intermediary platform language.',
    statements: [
      `UPDATE services
       SET service_description = 'Lawyer matching and counsel coordination',
           updated_at = UTC_TIMESTAMP(6)
       WHERE service_code = 'get-counsel'
         AND service_description = 'Representation & Arguments'`,
      `UPDATE services
       SET service_description = 'Document coordination and compliance support',
           updated_at = UTC_TIMESTAMP(6)
       WHERE service_code = 'document-review'
         AND service_description = 'Audit & Verification'`,
      `UPDATE services
       SET service_description = 'Drafting coordination for contracts, notices, and applications',
           updated_at = UTC_TIMESTAMP(6)
       WHERE service_code = 'legal-drafting'
         AND service_description = 'Contracts, Notices, Applications'`,
      `UPDATE services
       SET service_description = 'Intake review and coordination planning',
           updated_at = UTC_TIMESTAMP(6)
       WHERE service_code = 'case-assessment'
         AND service_description = 'Merit Analysis & Planning'`,
      `UPDATE services
       SET service_description = 'Independent counsel coordination and case tracking',
           updated_at = UTC_TIMESTAMP(6)
       WHERE service_code = 'litigation-monitoring'
         AND service_description = 'Shadow Counsel & Case Tracking'`,
      `UPDATE services
       SET service_description = 'Registry, filing, and field coordination support',
           updated_at = UTC_TIMESTAMP(6)
       WHERE service_code = 'liaison-support'
         AND service_description = 'Registry, Filing, Police Station'`,
      `UPDATE services
       SET service_description = 'Digital hearing and e-court support coordination',
           updated_at = UTC_TIMESTAMP(6)
       WHERE service_code = 'court-technology'
         AND service_description = 'Live Hearings, E-courts'`
    ],
  },
  {
    id: '017-templates-and-document-types',
    description: 'Create editable admin templates and document type registry for settings workspace.',
    statements: [
      `CREATE TABLE IF NOT EXISTS admin_templates (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        public_id CHAR(26) NOT NULL,
        template_type_code VARCHAR(32) NOT NULL,
        template_name VARCHAR(180) NOT NULL,
        subject VARCHAR(255) NULL,
        body_text TEXT NOT NULL,
        variables_json JSON NOT NULL,
        is_default TINYINT(1) NOT NULL DEFAULT 0,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        version INT UNSIGNED NOT NULL DEFAULT 1,
        created_by_user_id BIGINT UNSIGNED NULL,
        updated_by_user_id BIGINT UNSIGNED NULL,
        created_at DATETIME(6) NOT NULL,
        updated_at DATETIME(6) NOT NULL,
        archived_at DATETIME(6) NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_admin_templates_public_id (public_id),
        INDEX idx_admin_templates_type_active (template_type_code, is_active, archived_at),
        INDEX idx_admin_templates_default (template_type_code, is_default, archived_at),
        CONSTRAINT chk_admin_templates_type CHECK (template_type_code IN ('invoice', 'message', 'notification', 'document_checklist', 'general')),
        CONSTRAINT fk_admin_templates_created_by FOREIGN KEY (created_by_user_id)
          REFERENCES users (id)
          ON UPDATE CASCADE
          ON DELETE SET NULL,
        CONSTRAINT fk_admin_templates_updated_by FOREIGN KEY (updated_by_user_id)
          REFERENCES users (id)
          ON UPDATE CASCADE
          ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS document_types (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        public_id CHAR(26) NOT NULL,
        code VARCHAR(32) NOT NULL,
        name VARCHAR(140) NOT NULL,
        description TEXT NULL,
        category VARCHAR(64) NOT NULL,
        allowed_extensions_json JSON NOT NULL,
        max_size_mb INT UNSIGNED NOT NULL DEFAULT 25,
        requires_review TINYINT(1) NOT NULL DEFAULT 1,
        client_visible_default TINYINT(1) NOT NULL DEFAULT 0,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        display_order INT NOT NULL DEFAULT 0,
        created_at DATETIME(6) NOT NULL,
        updated_at DATETIME(6) NOT NULL,
        archived_at DATETIME(6) NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_document_types_public_id (public_id),
        UNIQUE KEY uq_document_types_code (code),
        INDEX idx_document_types_active_order (is_active, display_order),
        CONSTRAINT chk_document_types_max_size CHECK (max_size_mb BETWEEN 1 AND 200)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `INSERT INTO admin_templates (
         public_id,
         template_type_code,
         template_name,
         subject,
         body_text,
         variables_json,
         is_default,
         is_active,
         version,
         created_by_user_id,
         updated_by_user_id,
         created_at,
         updated_at,
         archived_at
       )
       SELECT
         CONCAT('tplseed', LPAD(ROW_NUMBER() OVER (ORDER BY seed.template_type_code, seed.template_name), 19, '0')),
         seed.template_type_code,
         seed.template_name,
         seed.subject,
         seed.body_text,
         seed.variables_json,
         seed.is_default,
         1,
         1,
         NULL,
         NULL,
         UTC_TIMESTAMP(6),
         UTC_TIMESTAMP(6),
         NULL
       FROM (
         SELECT 'invoice' AS template_type_code, 'Standard Invoice Note' AS template_name, NULL AS subject,
           'Thank you for using {{platformName}} for coordination and support services. Invoice {{invoiceNumber}} is due by {{dueDate}}.' AS body_text,
           JSON_ARRAY('platformName', 'invoiceNumber', 'dueDate') AS variables_json,
           1 AS is_default
         UNION ALL
         SELECT 'message', 'Client Follow-up Reply', NULL,
           'Hello {{clientName}}, thank you for your message. Our team will coordinate the next step for {{matterTitle}} and update you shortly.',
           JSON_ARRAY('clientName', 'matterTitle'),
           1
         UNION ALL
         SELECT 'notification', 'Document Shared Notice', NULL,
           'A document has been shared for {{matterTitle}}. Please review it in your client portal.',
           JSON_ARRAY('matterTitle'),
           1
         UNION ALL
         SELECT 'document_checklist', 'Standard Intake Checklist', NULL,
           'Please upload identity proof, matter background documents, and any correspondence relevant to {{matterTitle}}.',
           JSON_ARRAY('matterTitle'),
           1
         UNION ALL
         SELECT 'general', 'Operational Footer', NULL,
           'Global LMG is an intermediary legal consultancy, lawyer-matching, coordination, and support platform. Global LMG is not a law firm and does not provide legal representation.',
           JSON_ARRAY('platformName'),
           1
       ) seed
       WHERE NOT EXISTS (
         SELECT 1
         FROM admin_templates existing
         WHERE existing.template_type_code = seed.template_type_code
           AND existing.template_name = seed.template_name
       )`,
      `INSERT INTO document_types (
         public_id,
         code,
         name,
         description,
         category,
         allowed_extensions_json,
         max_size_mb,
         requires_review,
         client_visible_default,
         is_active,
         display_order,
         created_at,
         updated_at,
         archived_at
       )
       SELECT
         CONCAT('doctype', LPAD(ROW_NUMBER() OVER (ORDER BY seed.display_order), 19, '0')),
         seed.code,
         seed.name,
         seed.description,
         seed.category,
         seed.allowed_extensions_json,
         seed.max_size_mb,
         seed.requires_review,
         seed.client_visible_default,
         1,
         seed.display_order,
         UTC_TIMESTAMP(6),
         UTC_TIMESTAMP(6),
         NULL
       FROM (
         SELECT 'attachment' AS code, 'General Attachment' AS name, 'General matter or client attachment.' AS description,
           'general' AS category, JSON_ARRAY('pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'txt', 'csv', 'xls', 'xlsx', 'zip') AS allowed_extensions_json,
           25 AS max_size_mb, 1 AS requires_review, 0 AS client_visible_default, 10 AS display_order
         UNION ALL
         SELECT 'identity-proof', 'Identity Proof', 'Identity or KYC-supporting document.', 'identity',
           JSON_ARRAY('pdf', 'jpg', 'jpeg', 'png'), 10, 1, 0, 20
         UNION ALL
         SELECT 'matter-background', 'Matter Background', 'Background material shared for coordination and support.', 'matter',
           JSON_ARRAY('pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'txt'), 25, 1, 0, 30
         UNION ALL
         SELECT 'invoice-support', 'Invoice Support', 'Billing, payment, or invoice supporting document.', 'billing',
           JSON_ARRAY('pdf', 'jpg', 'jpeg', 'png', 'csv', 'xls', 'xlsx'), 15, 1, 0, 40
       ) seed
       WHERE NOT EXISTS (
         SELECT 1
         FROM document_types existing
         WHERE existing.code = seed.code
       )`
    ],
  },
  {
    id: '018-notification-settings',
    description: 'Create editable notification delivery settings and reminder offset configuration.',
    statements: [
      `CREATE TABLE IF NOT EXISTS notification_delivery_settings (
        notification_type_code VARCHAR(64) NOT NULL,
        in_app_enabled TINYINT(1) NOT NULL DEFAULT 1,
        email_enabled TINYINT(1) NOT NULL DEFAULT 0,
        sms_enabled TINYINT(1) NOT NULL DEFAULT 0,
        push_enabled TINYINT(1) NOT NULL DEFAULT 0,
        template_public_id CHAR(26) NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        updated_by_user_id BIGINT UNSIGNED NULL,
        created_at DATETIME(6) NOT NULL,
        updated_at DATETIME(6) NOT NULL,
        PRIMARY KEY (notification_type_code),
        INDEX idx_notification_delivery_template (template_public_id),
        CONSTRAINT fk_notification_delivery_type FOREIGN KEY (notification_type_code)
          REFERENCES notification_types (code)
          ON UPDATE CASCADE
          ON DELETE CASCADE,
        CONSTRAINT fk_notification_delivery_template FOREIGN KEY (template_public_id)
          REFERENCES admin_templates (public_id)
          ON UPDATE CASCADE
          ON DELETE SET NULL,
        CONSTRAINT fk_notification_delivery_updated_by FOREIGN KEY (updated_by_user_id)
          REFERENCES users (id)
          ON UPDATE CASCADE
          ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS reminder_settings (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        public_id CHAR(26) NOT NULL,
        event_type_code VARCHAR(32) NULL,
        offset_minutes INT UNSIGNED NOT NULL,
        channel_code VARCHAR(32) NOT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        display_order INT NOT NULL DEFAULT 0,
        created_by_user_id BIGINT UNSIGNED NULL,
        updated_by_user_id BIGINT UNSIGNED NULL,
        created_at DATETIME(6) NOT NULL,
        updated_at DATETIME(6) NOT NULL,
        archived_at DATETIME(6) NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_reminder_settings_public_id (public_id),
        INDEX idx_reminder_settings_active (event_type_code, is_active, archived_at, display_order),
        CONSTRAINT chk_reminder_settings_offset CHECK (offset_minutes BETWEEN 1 AND 10080),
        CONSTRAINT chk_reminder_settings_channel CHECK (channel_code IN ('in_app', 'email', 'sms')),
        CONSTRAINT fk_reminder_settings_created_by FOREIGN KEY (created_by_user_id)
          REFERENCES users (id)
          ON UPDATE CASCADE
          ON DELETE SET NULL,
        CONSTRAINT fk_reminder_settings_updated_by FOREIGN KEY (updated_by_user_id)
          REFERENCES users (id)
          ON UPDATE CASCADE
          ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `INSERT INTO notification_delivery_settings (
         notification_type_code,
         in_app_enabled,
         email_enabled,
         sms_enabled,
         push_enabled,
         template_public_id,
         is_active,
         updated_by_user_id,
         created_at,
         updated_at
       )
       SELECT
         nt.code,
         1,
         0,
         0,
         0,
         NULL,
         nt.is_active,
         NULL,
         UTC_TIMESTAMP(6),
         UTC_TIMESTAMP(6)
       FROM notification_types nt
       WHERE NOT EXISTS (
         SELECT 1
         FROM notification_delivery_settings existing
         WHERE existing.notification_type_code = nt.code
       )`,
      `INSERT INTO reminder_settings (
         public_id,
         event_type_code,
         offset_minutes,
         channel_code,
         is_active,
         display_order,
         created_by_user_id,
         updated_by_user_id,
         created_at,
         updated_at,
         archived_at
       )
       SELECT
         seed.public_id,
         NULL,
         seed.offset_minutes,
         'in_app',
         1,
         seed.display_order,
         NULL,
         NULL,
         UTC_TIMESTAMP(6),
         UTC_TIMESTAMP(6),
         NULL
       FROM (
         SELECT 'remset00000000000000000001' AS public_id, 1440 AS offset_minutes, 10 AS display_order
         UNION ALL
         SELECT 'remset00000000000000000002', 60, 20
       ) seed
       WHERE NOT EXISTS (
         SELECT 1
         FROM reminder_settings existing
         WHERE existing.event_type_code IS NULL
           AND existing.offset_minutes = seed.offset_minutes
           AND existing.channel_code = 'in_app'
           AND existing.archived_at IS NULL
       )`
    ],
  },
  {
    id: '019-admin-user-preferences',
    description: 'Create per-admin profile preference storage.',
    statements: [
      `CREATE TABLE IF NOT EXISTS admin_user_preferences (
        user_id BIGINT UNSIGNED NOT NULL,
        default_landing_path VARCHAR(120) NOT NULL DEFAULT '/dashboard',
        date_format VARCHAR(32) NOT NULL DEFAULT 'DD/MM/YYYY',
        density_code VARCHAR(32) NOT NULL DEFAULT 'comfortable',
        avatar_color VARCHAR(32) NOT NULL DEFAULT '#2C2B29',
        in_app_notifications_enabled TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME(6) NOT NULL,
        updated_at DATETIME(6) NOT NULL,
        PRIMARY KEY (user_id),
        CONSTRAINT chk_admin_preferences_density CHECK (density_code IN ('comfortable', 'compact')),
        CONSTRAINT fk_admin_preferences_user FOREIGN KEY (user_id)
          REFERENCES users (id)
          ON UPDATE CASCADE
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`
    ],
  },
  {
    id: '020-counsel-staff-registry',
    description:
      'Add registry metadata for external counsel, field partners, and client-visible matter assignments.',
    statements: [
      `SET @counsel_partners_has_partner_type := (
        SELECT COUNT(*)
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'counsel_partners'
          AND column_name = 'partner_type_code'
      )`,
      `SET @add_counsel_partners_partner_type_sql := IF(
        @counsel_partners_has_partner_type = 0,
        'ALTER TABLE counsel_partners ADD COLUMN partner_type_code VARCHAR(32) NOT NULL DEFAULT ''external_counsel'' AFTER organization_name',
        'DO 0'
      )`,
      `PREPARE add_counsel_partners_partner_type_stmt FROM @add_counsel_partners_partner_type_sql`,
      `EXECUTE add_counsel_partners_partner_type_stmt`,
      `DEALLOCATE PREPARE add_counsel_partners_partner_type_stmt`,
      `SET @counsel_partners_has_specialization := (
        SELECT COUNT(*)
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'counsel_partners'
          AND column_name = 'specialization_text'
      )`,
      `SET @add_counsel_partners_specialization_sql := IF(
        @counsel_partners_has_specialization = 0,
        'ALTER TABLE counsel_partners ADD COLUMN specialization_text VARCHAR(255) NULL AFTER bar_registration_number',
        'DO 0'
      )`,
      `PREPARE add_counsel_partners_specialization_stmt FROM @add_counsel_partners_specialization_sql`,
      `EXECUTE add_counsel_partners_specialization_stmt`,
      `DEALLOCATE PREPARE add_counsel_partners_specialization_stmt`,
      `SET @matter_assignments_has_visible_to_client := (
        SELECT COUNT(*)
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'matter_assignments'
          AND column_name = 'visible_to_client'
      )`,
      `SET @add_matter_assignments_visible_to_client_sql := IF(
        @matter_assignments_has_visible_to_client = 0,
        'ALTER TABLE matter_assignments ADD COLUMN visible_to_client TINYINT(1) NOT NULL DEFAULT 1 AFTER is_primary',
        'DO 0'
      )`,
      `PREPARE add_matter_assignments_visible_to_client_stmt FROM @add_matter_assignments_visible_to_client_sql`,
      `EXECUTE add_matter_assignments_visible_to_client_stmt`,
      `DEALLOCATE PREPARE add_matter_assignments_visible_to_client_stmt`,
      `SET @counsel_partners_has_registry_index := (
        SELECT COUNT(*)
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = 'counsel_partners'
          AND index_name = 'idx_counsel_partners_registry'
      )`,
      `SET @add_counsel_partners_registry_index_sql := IF(
        @counsel_partners_has_registry_index = 0,
        'ALTER TABLE counsel_partners ADD INDEX idx_counsel_partners_registry (partner_type_code, partner_status_code, archived_at, full_name)',
        'DO 0'
      )`,
      `PREPARE add_counsel_partners_registry_index_stmt FROM @add_counsel_partners_registry_index_sql`,
      `EXECUTE add_counsel_partners_registry_index_stmt`,
      `DEALLOCATE PREPARE add_counsel_partners_registry_index_stmt`,
      `SET @matter_assignments_has_visibility_index := (
        SELECT COUNT(*)
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = 'matter_assignments'
          AND index_name = 'idx_matter_assignments_client_visibility'
      )`,
      `SET @add_matter_assignments_visibility_index_sql := IF(
        @matter_assignments_has_visibility_index = 0,
        'ALTER TABLE matter_assignments ADD INDEX idx_matter_assignments_client_visibility (matter_id, visible_to_client, assignment_status_code, removed_at)',
        'DO 0'
      )`,
      `PREPARE add_matter_assignments_visibility_index_stmt FROM @add_matter_assignments_visibility_index_sql`,
      `EXECUTE add_matter_assignments_visibility_index_stmt`,
      `DEALLOCATE PREPARE add_matter_assignments_visibility_index_stmt`
    ],
  },
  {
    id: '021-client-account-settings',
    description:
      'Persist client WhatsApp contact metadata, expanded communication preferences, and email-change verification targets.',
    statements: [
      `SET @contacts_has_mobile_number := (
        SELECT COUNT(*)
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'client_account_contacts'
          AND column_name = 'mobile_number'
      )`,
      `SET @add_contacts_mobile_number_sql := IF(
        @contacts_has_mobile_number = 0,
        'ALTER TABLE client_account_contacts ADD COLUMN mobile_number VARCHAR(40) NULL AFTER is_billing',
        'DO 0'
      )`,
      `PREPARE add_contacts_mobile_number_stmt FROM @add_contacts_mobile_number_sql`,
      `EXECUTE add_contacts_mobile_number_stmt`,
      `DEALLOCATE PREPARE add_contacts_mobile_number_stmt`,
      `SET @contacts_has_whatsapp_number := (
        SELECT COUNT(*)
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'client_account_contacts'
          AND column_name = 'whatsapp_number'
      )`,
      `SET @add_contacts_whatsapp_number_sql := IF(
        @contacts_has_whatsapp_number = 0,
        'ALTER TABLE client_account_contacts ADD COLUMN whatsapp_number VARCHAR(40) NULL AFTER mobile_number',
        'DO 0'
      )`,
      `PREPARE add_contacts_whatsapp_number_stmt FROM @add_contacts_whatsapp_number_sql`,
      `EXECUTE add_contacts_whatsapp_number_stmt`,
      `DEALLOCATE PREPARE add_contacts_whatsapp_number_stmt`,
      `SET @contacts_has_whatsapp_same := (
        SELECT COUNT(*)
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'client_account_contacts'
          AND column_name = 'whatsapp_same_as_mobile'
      )`,
      `SET @add_contacts_whatsapp_same_sql := IF(
        @contacts_has_whatsapp_same = 0,
        'ALTER TABLE client_account_contacts ADD COLUMN whatsapp_same_as_mobile TINYINT(1) NOT NULL DEFAULT 1 AFTER whatsapp_number',
        'DO 0'
      )`,
      `PREPARE add_contacts_whatsapp_same_stmt FROM @add_contacts_whatsapp_same_sql`,
      `EXECUTE add_contacts_whatsapp_same_stmt`,
      `DEALLOCATE PREPARE add_contacts_whatsapp_same_stmt`,
      `SET @requests_has_whatsapp_snapshot := (
        SELECT COUNT(*)
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'service_requests'
          AND column_name = 'contact_whatsapp_snapshot'
      )`,
      `SET @add_requests_whatsapp_snapshot_sql := IF(
        @requests_has_whatsapp_snapshot = 0,
        'ALTER TABLE service_requests ADD COLUMN contact_whatsapp_snapshot VARCHAR(40) NULL AFTER contact_mobile_snapshot',
        'DO 0'
      )`,
      `PREPARE add_requests_whatsapp_snapshot_stmt FROM @add_requests_whatsapp_snapshot_sql`,
      `EXECUTE add_requests_whatsapp_snapshot_stmt`,
      `DEALLOCATE PREPARE add_requests_whatsapp_snapshot_stmt`,
      `SET @email_tokens_has_email_snapshot := (
        SELECT COUNT(*)
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'email_verification_tokens'
          AND column_name = 'email_snapshot'
      )`,
      `SET @add_email_tokens_email_snapshot_sql := IF(
        @email_tokens_has_email_snapshot = 0,
        'ALTER TABLE email_verification_tokens ADD COLUMN email_snapshot VARCHAR(255) NULL AFTER user_id',
        'DO 0'
      )`,
      `PREPARE add_email_tokens_email_snapshot_stmt FROM @add_email_tokens_email_snapshot_sql`,
      `EXECUTE add_email_tokens_email_snapshot_stmt`,
      `DEALLOCATE PREPARE add_email_tokens_email_snapshot_stmt`,
      `SET @preferences_has_in_app_alerts := (
        SELECT COUNT(*)
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'user_notification_preferences'
          AND column_name = 'in_app_alerts'
      )`,
      `SET @add_preferences_in_app_alerts_sql := IF(
        @preferences_has_in_app_alerts = 0,
        'ALTER TABLE user_notification_preferences ADD COLUMN in_app_alerts TINYINT(1) NOT NULL DEFAULT 1 AFTER user_id',
        'DO 0'
      )`,
      `PREPARE add_preferences_in_app_alerts_stmt FROM @add_preferences_in_app_alerts_sql`,
      `EXECUTE add_preferences_in_app_alerts_stmt`,
      `DEALLOCATE PREPARE add_preferences_in_app_alerts_stmt`,
      `SET @preferences_has_whatsapp_alerts := (
        SELECT COUNT(*)
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'user_notification_preferences'
          AND column_name = 'whatsapp_alerts'
      )`,
      `SET @add_preferences_whatsapp_alerts_sql := IF(
        @preferences_has_whatsapp_alerts = 0,
        'ALTER TABLE user_notification_preferences ADD COLUMN whatsapp_alerts TINYINT(1) NOT NULL DEFAULT 0 AFTER sms_alerts',
        'DO 0'
      )`,
      `PREPARE add_preferences_whatsapp_alerts_stmt FROM @add_preferences_whatsapp_alerts_sql`,
      `EXECUTE add_preferences_whatsapp_alerts_stmt`,
      `DEALLOCATE PREPARE add_preferences_whatsapp_alerts_stmt`,
      `SET @email_tokens_has_change_lookup := (
        SELECT COUNT(*)
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = 'email_verification_tokens'
          AND index_name = 'idx_email_verification_user_purpose'
      )`,
      `SET @add_email_tokens_change_lookup_sql := IF(
        @email_tokens_has_change_lookup = 0,
        'ALTER TABLE email_verification_tokens ADD INDEX idx_email_verification_user_purpose (user_id, purpose_code, expires_at)',
        'DO 0'
      )`,
      `PREPARE add_email_tokens_change_lookup_stmt FROM @add_email_tokens_change_lookup_sql`,
      `EXECUTE add_email_tokens_change_lookup_stmt`,
      `DEALLOCATE PREPARE add_email_tokens_change_lookup_stmt`,
      `SET @phone_tokens_has_change_lookup := (
        SELECT COUNT(*)
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = 'phone_verification_tokens'
          AND index_name = 'idx_phone_verification_user_purpose'
      )`,
      `SET @add_phone_tokens_change_lookup_sql := IF(
        @phone_tokens_has_change_lookup = 0,
        'ALTER TABLE phone_verification_tokens ADD INDEX idx_phone_verification_user_purpose (user_id, purpose_code, expires_at)',
        'DO 0'
      )`,
      `PREPARE add_phone_tokens_change_lookup_stmt FROM @add_phone_tokens_change_lookup_sql`,
      `EXECUTE add_phone_tokens_change_lookup_stmt`,
      `DEALLOCATE PREPARE add_phone_tokens_change_lookup_stmt`
    ],
  },
  {
    id: '022-request-pricing-configuration',
    description:
      'Make request services, consultation modes, urgency hours, and country pricing configurable with historical request snapshots.',
    statements: [
      `SET @services_has_base_fee := (
        SELECT COUNT(*)
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'services'
          AND column_name = 'base_fee_amount'
      )`,
      `SET @add_services_base_fee_sql := IF(
        @services_has_base_fee = 0,
        'ALTER TABLE services ADD COLUMN base_fee_amount DECIMAL(14,2) NOT NULL DEFAULT 1000.00 AFTER service_description',
        'DO 0'
      )`,
      `PREPARE add_services_base_fee_stmt FROM @add_services_base_fee_sql`,
      `EXECUTE add_services_base_fee_stmt`,
      `DEALLOCATE PREPARE add_services_base_fee_stmt`,
      `SET @services_has_icon_code := (
        SELECT COUNT(*)
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'services'
          AND column_name = 'service_icon_code'
      )`,
      `SET @add_services_icon_code_sql := IF(
        @services_has_icon_code = 0,
        'ALTER TABLE services ADD COLUMN service_icon_code VARCHAR(64) NULL AFTER base_fee_amount',
        'DO 0'
      )`,
      `PREPARE add_services_icon_code_stmt FROM @add_services_icon_code_sql`,
      `EXECUTE add_services_icon_code_stmt`,
      `DEALLOCATE PREPARE add_services_icon_code_stmt`,
      `UPDATE services
       SET base_fee_amount = 1000.00
       WHERE base_fee_amount IS NULL OR base_fee_amount = 0`,
      `UPDATE services
       SET service_icon_code = CASE service_code
         WHEN 'get-counsel' THEN 'Users'
         WHEN 'document-review' THEN 'FileCheck'
         WHEN 'legal-drafting' THEN 'FileText'
         WHEN 'case-assessment' THEN 'Target'
         WHEN 'litigation-monitoring' THEN 'Eye'
         WHEN 'liaison-support' THEN 'Briefcase'
         WHEN 'court-technology' THEN 'Monitor'
         ELSE COALESCE(service_icon_code, 'Briefcase')
       END
       WHERE service_icon_code IS NULL`,
      `SET @consultation_modes_has_description := (
        SELECT COUNT(*)
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'consultation_modes'
          AND column_name = 'description_text'
      )`,
      `SET @add_consultation_modes_description_sql := IF(
        @consultation_modes_has_description = 0,
        'ALTER TABLE consultation_modes ADD COLUMN description_text VARCHAR(255) NULL AFTER label',
        'DO 0'
      )`,
      `PREPARE add_consultation_modes_description_stmt FROM @add_consultation_modes_description_sql`,
      `EXECUTE add_consultation_modes_description_stmt`,
      `DEALLOCATE PREPARE add_consultation_modes_description_stmt`,
      `SET @consultation_modes_has_transport_note := (
        SELECT COUNT(*)
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'consultation_modes'
          AND column_name = 'transport_disclaimer_text'
      )`,
      `SET @add_consultation_modes_transport_note_sql := IF(
        @consultation_modes_has_transport_note = 0,
        'ALTER TABLE consultation_modes ADD COLUMN transport_disclaimer_text VARCHAR(500) NULL AFTER description_text',
        'DO 0'
      )`,
      `PREPARE add_consultation_modes_transport_note_stmt FROM @add_consultation_modes_transport_note_sql`,
      `EXECUTE add_consultation_modes_transport_note_stmt`,
      `DEALLOCATE PREPARE add_consultation_modes_transport_note_stmt`,
      `UPDATE consultation_modes
       SET transport_disclaimer_text = 'Transportation cost is extra and borne by the client. Final travel support cost depends on city and country.'
       WHERE code = 'in-person'
         AND (transport_disclaimer_text IS NULL OR transport_disclaimer_text = '')`,
      `SET @urgency_rules_has_response_hours := (
        SELECT COUNT(*)
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'pricing_urgency_rules'
          AND column_name = 'response_window_hours'
      )`,
      `SET @add_urgency_rules_response_hours_sql := IF(
        @urgency_rules_has_response_hours = 0,
        'ALTER TABLE pricing_urgency_rules ADD COLUMN response_window_hours INT UNSIGNED NULL AFTER label',
        'DO 0'
      )`,
      `PREPARE add_urgency_rules_response_hours_stmt FROM @add_urgency_rules_response_hours_sql`,
      `EXECUTE add_urgency_rules_response_hours_stmt`,
      `DEALLOCATE PREPARE add_urgency_rules_response_hours_stmt`,
      `UPDATE pricing_urgency_rules
       SET response_window_hours = CASE urgency_code
         WHEN 'within-2hrs' THEN 2
         WHEN 'within-6hrs' THEN 6
         WHEN 'standard' THEN 48
         ELSE COALESCE(response_window_hours, 48)
       END
       WHERE response_window_hours IS NULL`,
      `CREATE TABLE IF NOT EXISTS country_pricing_overrides (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        public_id CHAR(26) NOT NULL,
        country_code VARCHAR(8) NOT NULL,
        country_name VARCHAR(120) NOT NULL,
        currency_code CHAR(3) NOT NULL,
        price_multiplier DECIMAL(14,6) NOT NULL DEFAULT 1.000000,
        is_default TINYINT(1) NOT NULL DEFAULT 0,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME(6) NOT NULL,
        updated_at DATETIME(6) NOT NULL,
        archived_at DATETIME(6) NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_country_pricing_public_id (public_id),
        UNIQUE KEY uq_country_pricing_country (country_code),
        INDEX idx_country_pricing_active (country_code, is_active, archived_at),
        CONSTRAINT chk_country_pricing_multiplier CHECK (price_multiplier >= 0)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `INSERT INTO country_pricing_overrides (
         public_id, country_code, country_name, currency_code, price_multiplier, is_default, is_active, created_at, updated_at
       ) VALUES
         (UPPER(SUBSTRING(REPLACE(UUID(), '-', ''), 1, 26)), 'DEFAULT', 'Default', 'INR', 1.000000, 1, 1, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)),
         (UPPER(SUBSTRING(REPLACE(UUID(), '-', ''), 1, 26)), 'IN', 'India', 'INR', 1.000000, 0, 1, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)),
         (UPPER(SUBSTRING(REPLACE(UUID(), '-', ''), 1, 26)), 'US', 'United States', 'USD', 0.012000, 0, 1, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)),
         (UPPER(SUBSTRING(REPLACE(UUID(), '-', ''), 1, 26)), 'AU', 'Australia', 'AUD', 0.018000, 0, 1, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6))
       ON DUPLICATE KEY UPDATE
         country_name = VALUES(country_name),
         currency_code = VALUES(currency_code),
         updated_at = VALUES(updated_at)`,
      `SET @service_requests_has_country_snapshot := (
        SELECT COUNT(*)
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'service_requests'
          AND column_name = 'country_code_snapshot'
      )`,
      `SET @add_service_requests_country_snapshot_sql := IF(
        @service_requests_has_country_snapshot = 0,
        'ALTER TABLE service_requests ADD COLUMN country_code_snapshot VARCHAR(8) NULL AFTER whatsapp_same_as_mobile',
        'DO 0'
      )`,
      `PREPARE add_service_requests_country_snapshot_stmt FROM @add_service_requests_country_snapshot_sql`,
      `EXECUTE add_service_requests_country_snapshot_stmt`,
      `DEALLOCATE PREPARE add_service_requests_country_snapshot_stmt`,
      `SET @service_requests_has_currency_snapshot := (
        SELECT COUNT(*)
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'service_requests'
          AND column_name = 'currency_code'
      )`,
      `SET @add_service_requests_currency_snapshot_sql := IF(
        @service_requests_has_currency_snapshot = 0,
        'ALTER TABLE service_requests ADD COLUMN currency_code CHAR(3) NULL AFTER country_code_snapshot',
        'DO 0'
      )`,
      `PREPARE add_service_requests_currency_snapshot_stmt FROM @add_service_requests_currency_snapshot_sql`,
      `EXECUTE add_service_requests_currency_snapshot_stmt`,
      `DEALLOCATE PREPARE add_service_requests_currency_snapshot_stmt`,
      `SET @request_services_has_name_snapshot := (
        SELECT COUNT(*)
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'request_services'
          AND column_name = 'service_name_snapshot'
      )`,
      `SET @add_request_services_name_snapshot_sql := IF(
        @request_services_has_name_snapshot = 0,
        'ALTER TABLE request_services ADD COLUMN service_name_snapshot VARCHAR(180) NULL AFTER service_id',
        'DO 0'
      )`,
      `PREPARE add_request_services_name_snapshot_stmt FROM @add_request_services_name_snapshot_sql`,
      `EXECUTE add_request_services_name_snapshot_stmt`,
      `DEALLOCATE PREPARE add_request_services_name_snapshot_stmt`,
      `SET @request_services_has_currency := (
        SELECT COUNT(*)
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'request_services'
          AND column_name = 'currency_code'
      )`,
      `SET @add_request_services_currency_sql := IF(
        @request_services_has_currency = 0,
        'ALTER TABLE request_services ADD COLUMN currency_code CHAR(3) NULL AFTER quoted_base_fee',
        'DO 0'
      )`,
      `PREPARE add_request_services_currency_stmt FROM @add_request_services_currency_sql`,
      `EXECUTE add_request_services_currency_stmt`,
      `DEALLOCATE PREPARE add_request_services_currency_stmt`,
      `SET @request_services_has_country_pricing := (
        SELECT COUNT(*)
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'request_services'
          AND column_name = 'country_pricing_override_id'
      )`,
      `SET @add_request_services_country_pricing_sql := IF(
        @request_services_has_country_pricing = 0,
        'ALTER TABLE request_services ADD COLUMN country_pricing_override_id BIGINT UNSIGNED NULL AFTER currency_code',
        'DO 0'
      )`,
      `PREPARE add_request_services_country_pricing_stmt FROM @add_request_services_country_pricing_sql`,
      `EXECUTE add_request_services_country_pricing_stmt`,
      `DEALLOCATE PREPARE add_request_services_country_pricing_stmt`,
      `SET @pricing_quotes_has_country_snapshot := (
        SELECT COUNT(*)
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'pricing_quotes'
          AND column_name = 'country_code'
      )`,
      `SET @add_pricing_quotes_country_snapshot_sql := IF(
        @pricing_quotes_has_country_snapshot = 0,
        'ALTER TABLE pricing_quotes ADD COLUMN country_code VARCHAR(8) NULL AFTER currency_code',
        'DO 0'
      )`,
      `PREPARE add_pricing_quotes_country_snapshot_stmt FROM @add_pricing_quotes_country_snapshot_sql`,
      `EXECUTE add_pricing_quotes_country_snapshot_stmt`,
      `DEALLOCATE PREPARE add_pricing_quotes_country_snapshot_stmt`,
      `SET @pricing_quotes_has_country_pricing := (
        SELECT COUNT(*)
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'pricing_quotes'
          AND column_name = 'country_pricing_override_id'
      )`,
      `SET @add_pricing_quotes_country_pricing_sql := IF(
        @pricing_quotes_has_country_pricing = 0,
        'ALTER TABLE pricing_quotes ADD COLUMN country_pricing_override_id BIGINT UNSIGNED NULL AFTER country_code',
        'DO 0'
      )`,
      `PREPARE add_pricing_quotes_country_pricing_stmt FROM @add_pricing_quotes_country_pricing_sql`,
      `EXECUTE add_pricing_quotes_country_pricing_stmt`,
      `DEALLOCATE PREPARE add_pricing_quotes_country_pricing_stmt`
    ],
  },
];
