-- Medical Invoice Workflow System - normalized production schema
create extension if not exists "pgcrypto";

create table if not exists districts(id uuid primary key default gen_random_uuid(), name text unique not null, province text);
create table if not exists facilities(
 id uuid primary key default gen_random_uuid(), code text unique not null, name text not null,
 district_id uuid references districts(id), province text, category text, sub_category text,
 staff_owner text, fosa_code text, health_type text, active boolean default true,
 created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists users_profile(
 id uuid primary key references auth.users(id) on delete cascade, full_name text not null,
 role text not null check(role in ('district_officer','receptionist','verification_officer','lead','super_admin','finance')),
 district_id uuid references districts(id), active boolean default true
);
create table if not exists invoice_submissions(
 id uuid primary key default gen_random_uuid(), receipt_no text unique not null,
 facility_id uuid references facilities(id), invoice_number text, period_month int, period_year int,
 vouchers_billed int default 0, amount_billed numeric(18,2) default 0,
 district_received_at timestamptz, submitted_to_hq_at timestamptz not null default now(),
 hq_received_at timestamptz, current_status text not null default 'submitted_to_hq',
 requirements_complete boolean default false, correction_count int default 0,
 correction_reason text, created_by uuid references auth.users(id), updated_at timestamptz default now()
);
create table if not exists invoice_assignments(
 id uuid primary key default gen_random_uuid(), invoice_id uuid not null references invoice_submissions(id) on delete cascade,
 assigned_to uuid not null references auth.users(id), assigned_by uuid references auth.users(id),
 assigned_at timestamptz default now(), released_at timestamptz, active boolean default true
);
create table if not exists verification_records(
 id uuid primary key default gen_random_uuid(), invoice_id uuid unique not null references invoice_submissions(id) on delete cascade,
 verifier_id uuid references auth.users(id), billing_id text, verification_started_at timestamptz,
 verified_at timestamptz, vouchers_done int default 0, amount_after_verification numeric(18,2),
 deduction_amount numeric(18,2), amount_to_finance numeric(18,2), delay_stage text, delay_reason text,
 notes text
);
create table if not exists correction_cycles(
 id uuid primary key default gen_random_uuid(), invoice_id uuid references invoice_submissions(id) on delete cascade,
 cycle_no int not null, returned_at timestamptz default now(), returned_by uuid references auth.users(id),
 reason text not null, corrected_at timestamptz, reviewed_at timestamptz
);
create table if not exists finance_handoffs(
 id uuid primary key default gen_random_uuid(), invoice_id uuid unique references invoice_submissions(id) on delete cascade,
 sent_at timestamptz, sent_by uuid references auth.users(id), finance_reference text, paid_at timestamptz, status text default 'sent_to_finance'
);
create table if not exists invoice_events(
 id uuid primary key default gen_random_uuid(), invoice_id uuid references invoice_submissions(id) on delete cascade,
 action text not null, actor_id uuid references auth.users(id), event_at timestamptz default now(), details jsonb default '{}'::jsonb
);
create index if not exists idx_invoice_status on invoice_submissions(current_status);
create index if not exists idx_invoice_hq_date on invoice_submissions(submitted_to_hq_at);
create index if not exists idx_assignments_user on invoice_assignments(assigned_to, active);
create index if not exists idx_verification_verifier on verification_records(verifier_id);

-- KPI view: verification SLA is measured from submitted_to_hq_at to verified_at.
create or replace view v_invoice_sla as
select i.id, i.receipt_no, i.submitted_to_hq_at, v.verified_at,
       extract(epoch from(coalesce(v.verified_at, now()) - i.submitted_to_hq_at))/86400.0 as days_to_verification,
       case when v.verified_at is not null and v.verified_at <= i.submitted_to_hq_at + interval '15 days' then true else false end as sla_met,
       case when v.verified_at is null and now() > i.submitted_to_hq_at + interval '15 days' then true else false end as sla_breached
from invoice_submissions i left join verification_records v on v.invoice_id=i.id;

-- In production, enable RLS and write role-aware policies using auth.uid().
alter table districts enable row level security;
alter table facilities enable row level security;
alter table users_profile enable row level security;
alter table invoice_submissions enable row level security;
alter table invoice_assignments enable row level security;
alter table verification_records enable row level security;
alter table correction_cycles enable row level security;
alter table finance_handoffs enable row level security;
alter table invoice_events enable row level security;
