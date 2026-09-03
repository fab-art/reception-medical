-- RSSB Medical Invoice Reception & Verification — Supabase schema
--
-- Replaces the previous schema.sql, which modeled a fully normalized,
-- auth.users-based structure that nothing in the app actually wrote to.
-- The app (src/lib/db.js) works with four flat records — facilities,
-- officers, invoices, settings — plus an append-only invoice_events log.
-- This schema matches those shapes 1:1 (camelCase JS field -> snake_case
-- column), which is what src/lib/casing.js converts between automatically.
--
-- Run this whole file once in the Supabase SQL editor (or `supabase db push`)
-- on a fresh project before deploying.

create extension if not exists pgcrypto;

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

create table if not exists officers (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  role             text,
  pin              text,
  is_receptionist  boolean not null default false,
  is_district_officer boolean not null default false,
  active           boolean not null default true
);
create unique index if not exists idx_officers_pin on officers(pin) where pin is not null;

create table if not exists invoices (
  id                       uuid primary key default gen_random_uuid(),
  receipt_no               text unique not null,
  facility_code            text,
  facility_name            text,
  district                 text,
  province                 text,
  category                 text,
  period_month             text,
  period_year              int,
  bill_number              text,
  vouchers                 int default 0,
  amount_billed            numeric(18,2) default 0,
  submitted_by_name        text,
  received_by_name         text,
  received_at              timestamptz,
  submitted_to_hq_at       timestamptz,
  status                   text not null default 'reception_check',
  assigned_officer_id      uuid references officers(id),
  assigned_at              timestamptz,
  requirements_complete    boolean default false,
  correction_count         int default 0,
  correction_reason        text,
  last_returned_at         timestamptz,
  deduction_amount         numeric(18,2),
  verified_amount          numeric(18,2),
  bill_id                  text,
  vouchers_done            int default 0,
  verification_started_at  timestamptz,
  verified_at              timestamptz,
  amount_to_pay            numeric(18,2),
  sent_to_finance_at       timestamptz,
  payment_id               text,
  paid_at                  timestamptz,
  notes                    text,
  delay_reason             text,
  delay_stage              text,
  sync_status              text default 'synced',
  updated_at               timestamptz not null default now()
);
create index if not exists idx_invoices_status on invoices(status);
create index if not exists idx_invoices_facility on invoices(facility_code);
create index if not exists idx_invoices_officer on invoices(assigned_officer_id);
create index if not exists idx_invoices_period on invoices(period_year, period_month);

create table if not exists invoice_events (
  id          uuid primary key default gen_random_uuid(),
  invoice_id  uuid references invoices(id) on delete cascade,
  action      text not null,
  actor       text,
  at          timestamptz not null default now(),
  details     jsonb default '{}'::jsonb
);
create index if not exists idx_events_invoice on invoice_events(invoice_id);

create table if not exists settings (
  id                    int primary key default 1,
  branch                text,
  province              text,
  district              text,
  verification_sla_days int default 15,
  admin_password        text,
  superadmin_password   text,
  reception_password    text,
  constraint settings_singleton check (id = 1)
);

-- KPI view: verification SLA measured from submitted_to_hq_at to verified_at.
create or replace view v_invoice_sla as
select id, receipt_no, submitted_to_hq_at, verified_at,
       extract(epoch from (coalesce(verified_at, now()) - submitted_to_hq_at)) / 86400.0 as days_to_verification,
       case when verified_at is not null and verified_at <= submitted_to_hq_at + interval '15 days' then true else false end as sla_met,
       case when verified_at is null and now() > submitted_to_hq_at + interval '15 days' then true else false end as sla_breached
from invoices
where submitted_to_hq_at is not null;

-- This app currently authenticates with a shared admin/superadmin/reception
-- password and per-officer PINs (see src/lib/auth.js), not Supabase Auth, so
-- there is no auth.uid() to write row-level policies against yet. RLS is left
-- disabled and access is controlled by only ever shipping the anon key to the
-- client with the operations this app needs. If you later add Supabase Auth,
-- enable RLS on every table above and write policies keyed off auth.uid().
