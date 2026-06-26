# KEA Platform

Adaptive learning platform for JEE/KCET coaching institutes, starting with organic chemistry. No runtime AI — all intelligence is precomputed and stored in the database.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Local Setup](#local-setup)
3. [How the Site Works](#how-the-site-works)
4. [Adding Questions](#adding-questions)
5. [Adding Study Materials](#adding-study-materials)
6. [Production Checklist](#production-checklist)
7. [What Still Needs to Be Built](#what-still-needs-to-be-built)

---

## Tech Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| Database | PostgreSQL + Prisma v7 |
| Auth | Auth.js v5 (next-auth@beta) — credentials + JWT |
| Styling | Tailwind CSS v4 (CSS-first, no config file) |
| Charts | Recharts |
| LaTeX | react-katex / KaTeX |
| Icons | Lucide React |
| Validation | Zod + React Hook Form |

---

## Local Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 14+

#### Install PostgreSQL

**macOS (Homebrew):**
```bash
brew install postgresql@16
brew services start postgresql@16
```

**Ubuntu / Debian:**
```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**Windows:** Download the installer from [postgresql.org/download/windows](https://www.postgresql.org/download/windows/) and run it. The installer sets up the service automatically.

> **Note (Zed editor users):** Zed bundles its own Node. Prefix every terminal command with:
> ```bash
> export PATH="$HOME/.local/share/zed/node/node-v24.11.0-linux-x64/bin:$PATH"
> ```

### 1. Clone and install

```bash
git clone <repo-url> kea-platform
cd kea-platform
npm install
```

### 2. Create the database

Open a PostgreSQL shell. On Linux you may need `sudo -u postgres psql`; on macOS/Windows just `psql -U postgres`.

```sql
CREATE USER kea WITH PASSWORD 'yourpassword';
CREATE DATABASE kea OWNER kea;
\q
```

You can use any username and password you like instead of `kea` / `yourpassword` — just use the same values in `.env.local` in the next step.

### 3. Configure environment

Create `.env.local` in the project root, substituting the username and password you chose above:

```env
DATABASE_URL="postgresql://kea:yourpassword@localhost:5432/kea"
AUTH_SECRET="<generate: openssl rand -base64 32>"
AUTH_URL="http://localhost:3000"
```

Generate `AUTH_SECRET` once and paste it in:

```bash
openssl rand -base64 32
```

### 4. Run migrations and seed

```bash
npm run db:migrate     # creates all 10 tables
npm run db:seed        # seeds concept taxonomy + demo users
```

The seed creates:
- **Teacher:** `teacher@keaplatform.com` / `teacher123`
- **Student:** `student@keaplatform.com` / `student123`
- 47 organic chemistry concept nodes (GOC, Hydrocarbons, Haloalkanes, Alcohols, Aldehydes/Ketones, Amines, Biomolecules, Polymers, Everyday Chemistry)

### 5. Start dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to `/login`.

### Dev commands reference

| Command | What it does |
|---|---|
| `npm run dev` | Start dev server with Turbopack |
| `npm run build` | Production build (catches type/config errors) |
| `npm run db:migrate` | Run new Prisma migrations |
| `npm run db:seed` | Re-seed taxonomy and demo users |
| `npm run db:studio` | Visual DB browser at localhost:5555 |
| `npm run db:generate` | Regenerate Prisma client after schema changes |
| `npm run import -- ./questions.json` | Bulk import questions from JSON |

---

## How the Site Works

### Student portal

Students log in and land on `/dashboard`.

| Page | Path | Purpose |
|---|---|---|
| Dashboard | `/dashboard` | Mastery overview, weak topics, recent sessions |
| Custom Test | `/test/custom` | Filter by chapter / topic / skill / difficulty and generate a test |
| PYQ Papers | `/test/pyq` | Browse past exam papers by exam type and year |
| Adaptive Test | `/test/adaptive` | Auto-generates a test targeting the student's weakest concepts |
| Mistakes | `/mistakes` | All incorrect attempts, filterable, with explanations |
| Progress | `/progress` | Mastery heatmap (chapter × skill) + accuracy over time chart |
| Resources | `/resources` | Teacher-uploaded materials, grouped by concept |

**Test flow:** Student starts a test → `/test/[id]/attempt` (question sidebar, timer, per-answer autosave) → Submit → mastery recalculated → `/test/[id]/review` (per-question result with explanation).

**Adaptive logic:** After each test, `StudentMastery` is updated with weighted accuracy per `(student, concept, skill)`. The adaptive generator finds concepts with mastery < 60%, checks their prerequisites in the concept tree, and surfaces prerequisite gaps first. Question `difficultyActual` self-corrects after 20+ attempts.

### Teacher admin panel

Teachers log in and land on `/admin/class`.

| Page | Path | Purpose |
|---|---|---|
| Class Analytics | `/admin/class` | All concepts sorted by average class mastery ascending |
| Topic drill-down | `/admin/class/[conceptId]` | Per-student breakdown for a specific concept |
| Student view | `/student/[id]/dashboard` | Read-only view of any student's full dashboard |
| Upload Materials | `/admin/upload` | Upload files linked to a concept |
| Review Questions | `/admin/questions` | Approve or reject imported questions before they go live |

Click a concept row → see every student's mastery for it. Click "View →" next to a student → opens their dashboard in read-only mode (same component, action buttons hidden, teacher banner shown at top).

### Database schema (10 tables)

```
Institute          top-level tenant
User               students and teachers (role: STUDENT | TEACHER | ADMIN)
Batch              class group within an institute
ConceptTaxonomy    topic/chapter tree with prerequisite edges
Question           questions with metadata, LaTeX-compatible text fields
Resource           uploaded study materials linked to a concept
Test               a set of questions (type: custom | pyq | adaptive)
TestSession        one student's attempt at a Test
Attempt            one answered question within a TestSession
StudentMastery     per-(student, concept, skill) mastery score, updated after each session
```

---

## Adding Questions

Questions are imported via JSON. There is no in-app editor yet.

### Step 1: Find concept IDs

```bash
npm run db:studio
# browse ConceptTaxonomy table
```

Or query directly:

```bash
psql -U kea -d kea -c 'SELECT "conceptId", name, chapter FROM "ConceptTaxonomy" ORDER BY chapter, name;'
```

### Step 2: Prepare the JSON file

```json
[
  {
    "conceptId": "CHEM_ORG_ALDOL_001",
    "skill": "MECHANISM_UNDERSTANDING",
    "questionType": "MCQ",
    "questionText": "What is the major product of aldol condensation of acetaldehyde?",
    "options": ["Crotonaldehyde", "Acetaldol", "Paraldehyde", "Acetic acid"],
    "correctOption": "Crotonaldehyde",
    "explanation": "Aldol condensation gives crotonaldehyde via dehydration of the aldol product.",
    "difficultyAi": 3,
    "bloomsLevel": "APPLY",
    "expectedTimeSec": 90,
    "exam": "KCET",
    "year": 2023,
    "source": "KCET 2023",
    "misconceptions": ["Confuses aldol addition with condensation"]
  }
]
```

**Required:** `conceptId`, `skill`, `questionType`, `questionText`, `correctOption`, `explanation`

**Enum values:**

| Field | Allowed values |
|---|---|
| `skill` | `CONCEPT_RECALL`, `MECHANISM_UNDERSTANDING`, `PRODUCT_PREDICTION`, `FORMULA_APPLICATION`, `NUMERICAL_SOLVING`, `MULTI_STEP_REASONING`, `GRAPH_INTERPRETATION`, `ISOMER_CLASSIFICATION`, `EXPERIMENTAL_ANALYSIS`, `UNIT_CONVERSION` |
| `questionType` | `MCQ`, `NUMERICAL`, `ASSERTION_REASON`, `MATRIX_MATCH`, `INTEGER_ANSWER` |
| `bloomsLevel` | `REMEMBER`, `UNDERSTAND`, `APPLY`, `ANALYZE`, `EVALUATE` |
| `exam` | `KCET`, `JEE_MAINS`, `JEE_ADVANCED`, `COMEDK`, `GENERAL` |
| `difficultyAi` | Integer 1–5 |

LaTeX is supported in `questionText`, `options`, and `explanation` using KaTeX syntax (e.g. `$\\frac{d}{dx}$`).

### Step 3: Import

```bash
npm run import -- ./questions.json
```

Prints: imported / skipped duplicates / failed (with validation errors per record).

All imported questions are set to `status: PENDING` — they are invisible to students until approved.

### Step 4: Teacher approves

Teacher login → **Review Questions** (`/admin/questions`) → Approve or Reject each pending question.

---

## Adding Study Materials

Teacher login → **Upload Materials** (`/admin/upload`).

Select a file, choose a type (Notes, Video, PDF, Assignment, Practice Set, Recorded Lecture), then pick the chapter and topic. A `Resource` record is created linked to that concept.

Students see materials on `/resources`, with their weakest topics surfaced first.

**Current storage:** Files are saved to `public/uploads/` on the server. For production, replace with S3 or R2 (see below).

---

## Production Checklist

### Infrastructure

- [ ] **Hosted PostgreSQL** — Supabase, Neon, Railway, or RDS. Append `?sslmode=require` to `DATABASE_URL`
- [ ] **App hosting** — Vercel (zero-config for Next.js), Railway, or a VPS behind nginx/Caddy with HTTPS. Run `npm run build && npm start`
- [ ] **File storage** — replace `public/uploads/` with S3 or Cloudflare R2. Update `src/app/api/admin/upload/route.ts` to upload to the bucket and store the object URL in `Resource.url`
- [ ] **Environment variables** — set `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL` (must be the production domain) in the hosting platform's secret manager. `AUTH_URL` must match the domain exactly or Auth.js cookies won't work

### Auth & security

- [ ] **Password reset** — no "forgot password" flow exists yet. Build: generate time-limited token → email it (Resend is simplest) → verify on `/reset-password`
- [ ] **Rate limiting** on `/api/auth/callback/credentials` — brute-force protection. Use `@upstash/ratelimit` with Upstash Redis, or a simple in-memory counter in proxy middleware
- [ ] **Content Security Policy** — add CSP headers via `headers()` in `next.config.ts`. KaTeX needs `style-src 'unsafe-inline'`
- [ ] **HTTPS** — automatic on Vercel; on self-hosted use Caddy (`caddy reverse-proxy --from yourdomain.com --to localhost:3000`) or Let's Encrypt + nginx

### Multi-tenancy

- [ ] **Enforce `instituteId` on all API queries** — the schema is multi-tenant but the API routes currently do not filter by `session.user.instituteId`. Before multiple institutes use the same deployment, every query touching students/teachers/questions must add a `where: { instituteId }` clause
- [ ] **Batch management UI** — no UI to create batches or assign students to them

### User management

- [ ] **Student invite flow** — currently only seed users exist. Build: teacher generates an invite link with a signed token → student sets password on first visit
- [ ] **Bulk student import** — CSV upload → create `User` rows with bcrypt-hashed temporary passwords

### Reliability

- [ ] **Error monitoring** — add Sentry (`@sentry/nextjs`). Add `sentry.server.config.ts` and `sentry.client.config.ts`
- [ ] **Database backups** — enable automated daily backups. Supabase and Neon do this by default
- [ ] **Health check endpoint** — add `src/app/api/health/route.ts` returning `{ ok: true }` for uptime monitors
- [ ] **Connection pooling** — at scale, point `DATABASE_URL` to a PgBouncer pooler (Supabase uses port 6543 for the pooler)

### Performance

- [ ] **Cache heavy reads** — mastery and class analytics are read-heavy. Wrap the relevant `prisma` calls in `unstable_cache` or add a Redis layer with a short TTL (60s)
- [ ] **CDN for uploads** — if using S3/R2, serve files through CloudFront or Cloudflare so media loads fast without hitting the app server

---

## What Still Needs to Be Built

| Feature | Location | Notes |
|---|---|---|
| In-app question editor | `/admin/questions/new` | Single-question add without JSON import |
| Password reset | `/forgot-password`, `/reset-password` | Needs transactional email (Resend) |
| Student invite / registration | `/invite/[token]` | Teacher generates link, student sets password |
| Batch management | `/admin/batches` | Create batches, assign students |
| Institute onboarding | `/admin/institute` | Name, logo, timezone |
| PYQ paper creation UI | `/admin/papers/new` | Currently PYQ tests must be seeded directly in DB |
| Notifications | Header bell | "New test assigned", "Mastery improved" |
| PDF in-page viewer | `/resources` | Inline viewer instead of raw download |
| Mobile layout | All pages | Currently desktop-only (~900px min-width) |
| Analytics export | `/admin/export` | CSV download of student performance data |
| Leaderboard | `/leaderboard` | Per-batch ranking — optional |
