-- RSSB Medical Invoice Workflow System — Supabase schema
--
-- Tracks one invoice from district submission through verification,
-- reconciliation, QR-tracked transit to HQ, Lead Medical Officer review,
-- Manager sign-off, and Finance payment. Matches src/lib/db.js 1:1
-- (camelCase JS field -> snake_case column via src/lib/casing.js).
--
-- Run this whole file once in the Supabase SQL editor (or `supabase db push`)
-- on a FRESH project. This schema is not compatible with the previous
-- "Pharmacy Reception" app's schema — do not run it against that project's
-- existing tables without a migration plan; the invoices table shape has
-- changed substantially (new pipeline fields, no bill_number/period_year).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Facilities: every hospital, clinic, dental, and optical center RSSB
-- reimburses. One row per facility code.
-- ---------------------------------------------------------------------
create table if not exists facilities (
  id               uuid primary key default gen_random_uuid(),
  code             text unique not null,
  name             text not null,
  district         text,
  province         text,
  category         text,
  sub_category     text,
  staff            text,
  fosa_code        text,
  health_type      text,
  active           boolean not null default true,
  updated_at       timestamptz not null default now()
);
create index if not exists idx_facilities_code on facilities(code);
create index if not exists idx_facilities_district on facilities(district);

-- ---------------------------------------------------------------------
-- Officers: every person who logs in with a PIN, plus the two shared
-- admin/superadmin passwords stored separately in `settings`.
-- role: district_officer | zone_supervisor | hq_assistant | hq_reception
--       | lead_medical_officer | manager | finance
-- ---------------------------------------------------------------------
create table if not exists officers (
  id                      uuid primary key default gen_random_uuid(),
  name                    text not null,
  role                    text not null,
  district                text,
  zone                    text,
  pin                     text,
  assigned_facility_codes jsonb not null default '[]',
  workload_by_period      jsonb not null default '{}',
  is_receptionist         boolean not null default false,
  is_district_officer     boolean not null default false,
  active                  boolean not null default true
);
create unique index if not exists idx_officers_pin on officers(pin) where pin is not null;
create index if not exists idx_officers_role on officers(role);
create index if not exists idx_officers_district on officers(district);
create index if not exists idx_officers_zone on officers(zone);

-- ---------------------------------------------------------------------
-- Invoices: one row per facility+period invoice, carrying every
-- timestamp for every step of the pipeline.
-- status: not_received | no_patient | awaiting_verification |
--   verification_ongoing | awaiting_rectification | under_counter_verification |
--   verification_complete | reconciliation_ongoing | reconciliation_complete |
--   in_transit_to_hq | received_at_hq | lead_review | returned_by_lead |
--   manager_review | returned_by_manager | sent_to_finance |
--   payslip_generated | payment_order_issued | facility_paid
-- ---------------------------------------------------------------------
create table if not exists invoices (
  id                          uuid primary key default gen_random_uuid(),
  receipt_no                  text unique not null,
  billing_id                  text,              -- entered by the officer at verification start, sourced from Finance's own system
  facility_code                text,
  facility_name                text,
  district                     text,
  province                     text,
  category                     text,
  period_month                 text,
  assigned_officer_id          uuid references officers(id) on delete set null,
  assigned_officer_name        text,
  assigned_assistant_id        uuid references officers(id) on delete set null,
  status                       text not null default 'awaiting_verification',

  amount_billed                numeric(18,2) default 0,
  vouchers                     int default 0,
  submitted_at                 timestamptz,

  verification_started_at      timestamptz,
  vouchers_done                int default 0,
  verification_ended_at        timestamptz,
  verification_deadline        timestamptz,
  amount_after_verification    numeric(18,2),
  deduction_amount             numeric(18,2),
  verification_delay_days      numeric,
  verification_delay_reason    text,

  reconciliation_invited_at    timestamptz,
  reconciliation_started_at    timestamptz,
  reconciliation_ended_at      timestamptz,
  reconciliation_delay_reason  text,

  transit_dispatched_at        timestamptz,
  transit_received_at          timestamptz,
  transit_qr_code              text,

  returned_for_correction_at   timestamptz,
  return_reason                text,
  resent_after_correction_at   timestamptz,
  correction_count             int default 0,

  lead_reviewed_at             timestamptz,
  lead_decision                text,
  lead_comment                 text,

  manager_signed_at            timestamptz,
  manager_comment               text,

  sent_to_finance_at           timestamptz,
  payslip_date                 timestamptz,
  payslip_no                   text,
  payment_order_date           timestamptz,
  paid_at                      timestamptz,

  notes                        text,
  last_edited_by               text,
  updated_at                   timestamptz not null default now()
);
create index if not exists idx_invoices_status on invoices(status);
create index if not exists idx_invoices_district on invoices(district);
create index if not exists idx_invoices_officer on invoices(assigned_officer_id);
create index if not exists idx_invoices_assistant on invoices(assigned_assistant_id);
create index if not exists idx_invoices_period on invoices(period_month);
create index if not exists idx_invoices_billing_id on invoices(billing_id);

-- ---------------------------------------------------------------------
-- Invoice events: append-only audit trail. Every workflow transition in
-- src/lib/db.js writes one row here — this is what the invoice "journey"
-- Timeline and every "last edited by / at" label read from. Never
-- updated or deleted, only inserted.
-- ---------------------------------------------------------------------
create table if not exists invoice_events (
  id           uuid primary key default gen_random_uuid(),
  invoice_id   uuid references invoices(id) on delete cascade,
  action       text not null,
  actor        text,
  note         text,
  at           timestamptz not null default now(),
  details      jsonb default '{}'
);
create index if not exists idx_events_invoice on invoice_events(invoice_id);
create index if not exists idx_events_at on invoice_events(at desc);

-- ---------------------------------------------------------------------
-- Settings: single row (id = 1). Branch identity, SLA config, and the
-- two shared oversight passwords (admin / superadmin). Individual staff
-- sign in with their own PIN from the officers table, not these.
-- ---------------------------------------------------------------------
create table if not exists settings (
  id                    int primary key default 1,
  branch                text,
  province              text,
  district              text,
  verification_sla_days int default 15,
  admin_password        text,
  superadmin_password   text
);

-- ---------------------------------------------------------------------
-- Row Level Security
--
-- This app authenticates with shared PINs/passwords rather than Supabase
-- Auth, so there is no auth.uid() to key policies on. Until that changes,
-- RLS stays OFF and access control is enforced entirely in the app layer
-- (src/lib/auth.js resolveLogin + the role checks in every page). This
-- means anyone holding the Supabase anon key can read/write these tables
-- directly, bypassing the app. Treat the anon key as sensitive, and see
-- the migration note in the project README before using this in a real
-- production deployment with real facility/officer data.
-- ---------------------------------------------------------------------
-- alter table facilities enable row level security;
-- alter table officers enable row level security;
-- alter table invoices enable row level security;
-- alter table invoice_events enable row level security;
-- alter table settings enable row level security;
