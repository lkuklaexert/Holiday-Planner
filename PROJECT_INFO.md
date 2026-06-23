# Holiday Planner – Project Operations Manual

> Last Updated: 2026-06-23

---

# 1. Project Overview

**Application**
Holiday Planner

**Purpose**
Employee holiday management system built with React, Supabase and Cloudflare.

**Current Version**
v0.8.0

**Current Status**
Core HR holiday planning system operational with authentication, employee management, department management, planner, bookings, import/export and role foundations.

---

# 2. GitHub

**Repository**
https://github.com/lkuklaexert/Holiday-Planner

**GitHub Owner**
lkuklaexert

**Default Branch**
main

## Branch Strategy

### main

Production branch.

Used by live users.

### staging

Testing branch.

All development work is completed and tested on staging before release.

### Release Rule

Features are developed and validated on staging.

Only approved and tested changes are merged into main.

---

# 3. Deployment Register

## Cloudflare Pages

**Project Name**
holiday-planner

**Cloudflare Owner**
Exertis Cloudflare Account

**Cloudflare Email**
[lukasz.kukla@exertis.com](mailto:lukasz.kukla@exertis.com)

---

## Deployment Environments

### Production

**Branch**
main

**URL**
https://holiday-planner-5lq.pages.dev

**Purpose**
Live environment used by employees.

---

### Staging

**Branch**
staging

**URL**
Latest successful deployment from the staging branch in Cloudflare Pages → Deployments.

**Purpose**
Testing environment before production release.

---

## Release Process

1. Develop feature on staging.
2. Build locally.
3. Commit and push to staging.
4. Cloudflare deploys staging preview.
5. Complete live testing.
6. Approve release.
7. Merge staging into main.
8. Push main.
9. Cloudflare deploys production.
10. Verify production.

---

## Build Configuration

**Framework**
Vite

**Build Command**

```bash
npm run build
```

**Output Directory**

```text
dist
```

---

# 4. Supabase

**Authentication**
Email / Password

**Database**
PostgreSQL

**User Roles**

```text
admin
manager
viewer
```

**Role Direction (Future)**

Roles will ultimately be managed through employee records rather than directly through Supabase administration.

Employees will be linked to authentication accounts using:

```text
employees.auth_user_id
        ↓
auth.users.id
        ↓
profiles.id
```

---

# 5. Environment Variables

Configured in Cloudflare Pages.

Required:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Never store:

* Service Role Keys
* Passwords
* API secrets
* Personal access tokens

---

# 6. Local Development

## Install

```bash
npm install
```

## Run Development Server

```bash
npm run dev
```

## Production Build

```bash
npm run build
```

## Preview Production Build

```bash
npm run preview
```

---

# 7. Development Workflow

## Standard Feature Workflow

1. Implement feature.
2. Build locally.
3. Commit to staging.
4. Push to staging.
5. Cloudflare deploys staging.
6. Live test.
7. Approve.
8. Merge into main.
9. Push main.
10. Cloudflare deploys production.
11. Verify production.
12. Mark roadmap item complete.

## Definition of Done

A feature is only complete when:

* Code implemented.
* Build successful.
* Committed.
* Pushed.
* Deployed.
* Live tested.
* Console clean.
* Roadmap updated.

---

# 8. Technology Stack

## Frontend

* React
* Vite
* Tailwind CSS

## Backend

* Supabase

## Hosting

* Cloudflare Pages

## Source Control

* GitHub

---

# 9. Release Checklist

Before merging staging into main:

□ npm run build passes

□ Cloudflare staging deployment successful

□ Live testing completed

□ Console clean

□ No critical bugs found

□ Feature marked complete on roadmap

□ PROJECT_INFO.md updated if required

---

# 10. Recovery Checklist

If moving to another computer:

* Clone GitHub repository.
* Run npm install.
* Verify Node.js.
* Verify Cloudflare access.
* Verify Supabase access.
* Verify environment variables.
* Run npm run build.
* Verify staging deployment.
* Verify production deployment.

---

# 11. Notes

Do not store:

* Passwords
* API secrets
* Service Role Keys
* Personal access tokens

This document records infrastructure, deployment and operational information for the Holiday Planner application.
