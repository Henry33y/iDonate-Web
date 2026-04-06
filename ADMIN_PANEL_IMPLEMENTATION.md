# iDonate Admin Panel Implementation Prompt

## Context

We are developing **iDonate**, a blood donation platform that connects:

- Individual donors
- Recipients
- Hospitals
- Blood banks

The system includes an **Admin Panel** used to ensure platform trust, safety, and data integrity.

An **admin panel already exists in the project**, but it is currently basic and needs to be **analyzed, improved, and extended** to support updated system requirements.

We are **NOT rebuilding the admin panel from scratch**.

We are:

- Reviewing the current implementation
- Identifying gaps
- Refactoring where necessary
- Adding new features incrementally
- Maintaining compatibility with existing code

---

## Current Tech Stack

Frontend: React Native  
Backend: Supabase  
Authentication: Supabase Auth  
Database: PostgreSQL (Supabase)

---

## Primary Goal

Improve the admin panel so it can effectively manage:

1. Institution verification workflow
2. User oversight
3. Blood request monitoring
4. Basic system analytics
5. Educational content management (optional but recommended)

The design should remain:

- simple
- modular
- maintainable
- realistic for an academic final-year project
- scalable for real-world use

---

## Important Design Decision

Institutions must now be separated into two categories:

### 1. Pending Verification

Institutions that have registered but are not yet approved.

Admins must be able to:

- view institution details
- view license number
- view uploaded license document
- approve institution
- reject institution
- optionally add verification notes

---

### 2. Verified Institutions

Institutions that have been approved.

Admins must be able to:

- view institution profile
- monitor institution status
- suspend institution if necessary
- view license information

---

## Database Expectations

The `institutions` table should contain a status field.

### status values

- pending
- approved
- rejected
- suspended

### Example Structure

```

institutions

id (uuid)
name
institution_type
email
phone
address
license_number
license_document_url
status
created_at
verified_at

```

---

## Tasks for AI

### Phase 1 — Analyze Existing Admin Panel

Analyze the current admin panel implementation and provide:

1. current structure of admin panel
2. existing pages
3. existing components
4. existing database queries
5. existing Supabase calls
6. routing structure
7. reusable UI components

Identify:

- what should be kept
- what should be modified
- what should be removed
- what is missing

---

### Phase 2 — Propose Improved Structure

Propose a refined admin panel structure:

```

Admin Dashboard

Dashboard (overview statistics)

Institutions
Verified Institutions
Pending Verification

Users

Blood Requests

Reports (basic analytics)

Education Content (optional)

Settings (minimal)

```

Explain:

- which parts already exist
- which parts must be added
- which parts must be refactored

---

### Phase 3 — Institution Module Refactor

Modify existing institution management logic to support:

#### Tab 1: Pending Verification

Query:

```

status = 'pending'

```

Admin actions:

- approve institution → change status to approved
- reject institution → change status to rejected

---

#### Tab 2: Verified Institutions

Query:

```

status = 'approved'

```

Admin actions:

- view institution profile
- suspend institution → change status to suspended

---

### Phase 4 — Implementation Plan

Generate a step-by-step TODO list including:

- database updates (if needed)
- frontend components to modify
- new components to create
- Supabase queries required
- navigation updates
- state management adjustments
- error handling
- loading states
- role protection for admin routes

Each step must be:

- small
- testable
- incremental

---

### Phase 5 — Safety and Data Integrity

Ensure:

- only admins can access admin panel
- admin actions are validated
- status updates are secure
- no breaking changes to existing functionality

---

## Constraints

Do not over-engineer.

Keep UI simple.

Focus on functionality and clarity.

Avoid unnecessary dependencies.

Code must remain readable and modular.

---

## Expected Output From AI

1. analysis of current admin panel
2. improved folder structure
3. updated navigation structure
4. component modification list
5. Supabase query plan
6. step-by-step implementation TODO list
7. risk areas to watch for

---

## Notes

The goal is to improve the admin panel progressively while preserving existing working functionality.

All changes should support the real-world workflow of verifying healthcare institutions and maintaining platform trust.
```
