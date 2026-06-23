# Holiday Planner – Project Operations Manual

> Last Updated: 2026-06-21

---

# 1. Project Overview

**Application**
Holiday Planner

**Purpose**
Employee holiday management system built with React, Supabase and Cloudflare.

**Current Version**
v0.8.0

---

# 2. GitHub

**Repository**
https://github.com/lkuklaexert/Holiday-Planner

**Default Branch**
main

Branch Strategy

main
Production branch

staging
Testing branch

Feature development is completed on staging and merged into main after approval.

---

# 3. Deployment Register

## Deployment Environments

### Production

Branch:
main

URL:
TODO

Purpose:
Live system used by employees.

---

### Staging

Branch:
staging

URL:
TODO

Purpose:
Testing environment before production release.

---

### Release Process

1. Develop on staging
2. Test on staging Cloudflare deployment
3. Approve changes
4. Merge staging into main
5. Deploy production

## Current Production

**Cloudflare Owner**
TODO

**Cloudflare Email**
TODO

**GitHub Owner**
lkuklaexert

**Cloudflare Project Name**
> TODO

**GitHub Repository**
https://github.com/lkuklaexert/Holiday-Planner


**Production URL**
> TODO

**Preview URL**
> TODO

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

**Project Name**
> TODO

**Project URL**
> TODO

**Authentication**
Email / Password

**Database**
PostgreSQL

---

# 5. Environment Variables

Configured in Cloudflare.

Required:

- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY

> Never store secret keys or passwords in this file.

---

# 6. Local Development

Install

```bash
npm install
```

Run

```bash
npm run dev
```

Production Build

```bash
npm run build
```

Preview Production Build

```bash
npm run preview
```

---

# 7. Deployment Workflow

1. Develop feature
2. Test locally
3. Commit
4. Push to GitHub
5. Cloudflare auto-deploys
6. Live test
7. Mark roadmap item complete

---

# 8. Technology Stack

## Frontend

- React
- Vite
- Tailwind CSS

## Backend

- Supabase

## Hosting

- Cloudflare Pages

## Source Control

- GitHub

---

# Release Checklist

Before merging staging into main:

□ npm run build passes
□ Cloudflare staging deployment successful
□ Live testing completed
□ Console clean
□ No critical bugs found
□ Feature marked complete on roadmap
□ PROJECT_INFO.md updated if required

# 9. Recovery Checklist

If moving to another computer:

- Clone GitHub repository
- Run `npm install`
- Verify Node.js
- Verify Cloudflare account
- Verify Supabase project
- Verify environment variables
- Run `npm run build`
- Deploy

---

# 10. Notes

Do **not** store:

- Passwords
- API secrets
- Service Role Keys
- Personal access tokens

This document is intended to record infrastructure and deployment information only.