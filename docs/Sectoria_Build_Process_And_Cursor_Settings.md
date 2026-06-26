# Sectoria.pk — Complete Build Process
## From Empty Computer to First Running Session: Every Step Automated or Precisely Explained

---

## PART 1 — INSTALL REQUIRED TOOLS (run these commands, in order)

### 1.1 Install Node.js 22 LTS (via nvm — recommended)

nvm lets you switch Node versions without breaking other projects.

**Mac / Linux — install nvm first, then Node:**
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
# Close and reopen your terminal, then:
nvm install 22
nvm use 22
nvm alias default 22
node -v   # should print v22.x.x
```

**Windows — use nvm-windows:**
Download and run the installer from:
https://github.com/coreybutler/nvm-windows/releases
Then in a new terminal (run as Administrator):
```
nvm install 22.0.0
nvm use 22.0.0
node -v
```

---

### 1.2 Install pnpm

```bash
npm install -g pnpm
pnpm -v   # should print 9.x.x or higher
```

---

### 1.3 Install PostgreSQL

**Mac (Homebrew):**
```bash
brew install postgresql@16
brew services start postgresql@16
echo 'export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
psql --version   # should print psql (PostgreSQL) 16.x
# Create the database
createdb sectoria_pk
```

**Windows:**
Download the installer from https://www.postgresql.org/download/windows/
Run it, choose version 16, remember the password you set for the `postgres`
user. After install, open pgAdmin (installed automatically) and create a
new database called `sectoria_pk`.

**Skip local install — use Neon (free, cloud, zero setup):**
Go to https://neon.tech → Sign up free → New project → name it `sectoria-pk`
→ copy the connection string (looks like
`postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/sectoria_pk`)
→ save it — you'll need it for the `.env` file in Step 3.4.

---

### 1.4 Install Redis

**Mac:**
```bash
brew install redis
brew services start redis
redis-cli ping   # should respond: PONG
```

**Windows:**
Redis doesn't have an official Windows build. Use one of these:
- WSL2 (recommended): open WSL terminal, then `sudo apt install redis-server && sudo service redis-server start`
- Or use Upstash (free, cloud, zero setup): https://upstash.com → new Redis
  database → copy the REST URL and token → save for the `.env` file.

**Skip local install — use Upstash (free, cloud, zero setup):**
Go to https://upstash.com → sign up free → Create Database → choose the
region closest to you → copy `UPSTASH_REDIS_REST_URL` and
`UPSTASH_REDIS_REST_TOKEN` → save for the `.env` file.

---

### 1.5 Install Git (if not already installed)

```bash
git --version   # if this prints a version, skip to 1.6
```

**Mac:** Git comes with Xcode Command Line Tools: `xcode-select --install`
**Windows:** Download from https://git-scm.com/download/win

Configure your identity (required for commits):
```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

---

### 1.6 Install Cursor IDE

Download from https://cursor.com → install for your OS.
Open Cursor at least once so it finishes its first-run setup before
continuing.

---

## PART 2 — CREATE THE PROJECT AND PLACE THE FOUNDATION FILES

### 2.1 Create the project folder and initialise Git

```bash
# Replace ~/projects with wherever you keep your code
mkdir -p ~/projects/sectoria-pk
cd ~/projects/sectoria-pk
git init
git branch -M main
```

---

### 2.2 Create a GitHub repository

Go to https://github.com/new
- Repository name: `sectoria-pk`
- Visibility: Private
- Do NOT tick "Add a README" or anything else — leave it completely empty
- Click "Create repository"

Copy the remote URL shown (e.g. `https://github.com/yourusername/sectoria-pk.git`)
then run:

```bash
git remote add origin https://github.com/yourusername/sectoria-pk.git
# replace the URL above with your actual repo URL
```

---

### 2.3 Extract and copy the foundation package (handles hidden files)

Download `sectoria-pk-foundation.zip` to your Downloads folder.
These commands extract it and copy everything — including hidden dotfiles
like `.cursor/` and `.cursorignore` — directly into your project:

**Mac / Linux:**
```bash
cd ~/projects/sectoria-pk
unzip -o ~/Downloads/sectoria-pk-foundation.zip
# This creates a subfolder. Now copy its contents up to the root:
cp -r sectoria-pk-foundation/. .
rm -rf sectoria-pk-foundation
# Confirm hidden files are present:
ls -la
```

**Windows (PowerShell):**
```powershell
cd $HOME\projects\sectoria-pk
Expand-Archive -Path "$HOME\Downloads\sectoria-pk-foundation.zip" -DestinationPath "."
# Copy everything including hidden folders up to root:
robocopy sectoria-pk-foundation . /E /IS /IT
Remove-Item sectoria-pk-foundation -Recurse -Force
# Confirm files are present (including hidden):
Get-ChildItem -Force
```

---

### 2.4 Verify 22 rules are present

```bash
# Mac / Linux:
find .cursor/rules -name "*.mdc" | wc -l
# Should print: 22

# Windows (PowerShell):
(Get-ChildItem .cursor\rules -Filter *.mdc).Count
# Should print: 22
```

If it prints less than 22, the hidden-file copy didn't work. Re-run the
copy commands from 2.3 — particularly the `cp -r` / `robocopy` step.

---

### 2.5 Fill in your `.env` file

The `.env.example` file already exists in the project. Copy it to `.env`
and fill in the real values:

```bash
# Mac / Linux:
cp .env.example .env

# Windows (PowerShell):
Copy-Item .env.example .env
```

Now open `.env` in any text editor and fill in:

```
DATABASE_URL="postgresql://user:password@localhost:5432/sectoria_pk"
# → If using Neon: paste the connection string from Step 1.3
# → If using local PostgreSQL on Mac: postgresql://localhost/sectoria_pk
# → If using local PostgreSQL on Windows: postgresql://postgres:yourpassword@localhost:5432/sectoria_pk

AUTH_SECRET="run-this-command-and-paste-result"
# → Generate by running: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

AUTH_URL="http://localhost:3000"

REDIS_URL="redis://localhost:6379"
# → If using Upstash: leave REDIS_URL blank and fill the two lines below instead:
UPSTASH_REDIS_REST_URL="paste from Upstash dashboard"
UPSTASH_REDIS_REST_TOKEN="paste from Upstash dashboard"

ENCRYPTION_KEY="run-this-command-and-paste-result"
# → Generate by running: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Leave all verification adapter fields blank for now — mocks are used automatically:
NADRA_API_URL=""
NADRA_API_KEY=""
FBR_PRAL_API_URL=""
FBR_PRAL_API_KEY=""
PLRA_API_URL=""
PLRA_API_KEY=""
S3_BUCKET=""
S3_REGION=""
S3_ACCESS_KEY_ID=""
S3_SECRET_ACCESS_KEY=""
```

---

### 2.6 Commit the foundation as the very first commit

```bash
git add -A
git commit -m "chore: add Cursor rules, docs, and project config"
git push -u origin main
```

This is intentional — the 22 rules and docs are the first thing in
version history, before a single line of app code. Cursor reads them
from the moment you open the folder.

---

## PART 3 — CURSOR IDE CONFIGURATION (ONE-TIME, DO BEFORE SESSION 0)

Open Cursor. Open the `sectoria-pk` folder: File → Open Folder →
select `~/projects/sectoria-pk`.

Cursor will show a popup: "Do you want to install the recommended
extensions for this repository?" Click **Install All**. This installs
all 22 extensions from `.vscode/extensions.json` in one click.
Wait for it to finish before continuing.

---

### 3.1 Verify the 22 rules loaded

**Exact steps:**
1. Press `Cmd + Shift + J` (Mac) or `Ctrl + Shift + J` (Windows/Linux)
   to open Cursor Settings
2. Click **Rules** in the left sidebar
3. You will see two sections: "User Rules" and "Project Rules"
4. Under **Project Rules**, you should see 22 items listed — one per
   `.mdc` file

What to check for each rule:
- `000-core.mdc` → should say **Always** under the "Type" column
- `domain-logic.mdc`, `database.mdc`, `nextjs-app-router.mdc`,
  `ui-design-system.mdc`, `ui-ux-excellence.mdc`, `seo.mdc`,
  `testing.mdc`, `verification-adapters.mdc`, `api-trpc.mdc`,
  `oop-and-domain-modeling.mdc`, `code-clarity-and-comments.mdc`,
  `json-and-config-conventions.mdc`, `routing-and-navigation.mdc`,
  `middleware-and-guards.mdc` → should say **Auto Attached**
- `architecture.mdc`, `security.mdc`, `dependency-management.mdc`,
  `documentation.mdc`, `auth-and-access-control.mdc`,
  `scalability-and-performance.mdc` → should say **Agent Requested**
- `git-workflow.mdc` → should say **Manual**

If any rule shows the wrong type, open the `.mdc` file in Cursor,
check its frontmatter (the block between the `---` lines at the top),
and fix the `alwaysApply` / `globs` values to match the table above.

---

### 3.2 Add documentation sources (@Docs)

This lets you type `@Next.js` or `@tRPC` in any Cursor chat and pull
in live official documentation, rather than the model guessing from
training data that may be out of date.

**Exact steps:**
1. Press `Cmd + Shift + J` / `Ctrl + Shift + J` → Cursor Settings
2. Click **Docs** in the left sidebar
3. Click **+ Add new doc** for each of the following:

| Name to type | URL to paste |
|---|---|
| Next.js | https://nextjs.org/docs |
| tRPC | https://trpc.io/docs |
| Prisma | https://www.prisma.io/docs |
| Auth.js | https://authjs.dev |
| Tailwind CSS | https://tailwindcss.com/docs |

For each one: type the name → paste the URL → click Confirm → wait for
the green "Indexed" indicator before adding the next one.

---

### 3.3 Confirm .cursorignore is working

The `.cursorignore` file is already in the project from the foundation
zip. To confirm Cursor is reading it:

1. Press `Cmd + Shift + J` / `Ctrl + Shift + J` → Cursor Settings
2. Click **Indexing** in the left sidebar
3. Click **Ignored files**
4. You should see `node_modules/`, `.next/`, `.turbo/`, `dist/`,
   `build/`, `coverage/` in the list

If the list is empty, close and reopen Cursor with the project folder.
The `.cursorignore` file is read on startup.

---

### 3.4 Set the model for each task type

**Exact steps:**
1. In any Cursor chat or composer window, click the model name shown
   at the bottom left of the input box (it shows the currently selected
   model)
2. A dropdown appears with all available models

Set these as your defaults based on task:
- For **domain logic, security, and architecture sessions**
  (Sessions 2, 3, 11): select your strongest model (claude-opus or
  equivalent — the most capable one shown in the list)
- For **boilerplate and UI sessions** (Sessions 4, 6, 7, 8, 9, 10):
  select a faster model (claude-sonnet or equivalent — mid-tier)
- For **scaffolding and config sessions** (Sessions 0, 1):
  either model works fine

You don't set a permanent global default per task type — just change it
at the start of each new chat session before typing your prompt.

---

### 3.5 Set auto-run permissions

This lets Cursor run safe commands (install, test, lint, build) on its
own without asking you each time, while still requiring your confirmation
for destructive ones.

**Exact steps:**
1. Press `Cmd + Shift + J` / `Ctrl + Shift + J` → Cursor Settings
2. Click **Features** in the left sidebar
3. Scroll down to **Agent** section
4. Find **Auto-run** and toggle it ON
5. Under "Allowed commands", add each of the following one by one by
   clicking "+ Add command":

```
pnpm install
pnpm test
pnpm lint
pnpm typecheck
pnpm build
pnpm dev
git status
git diff
git add
git commit
npx prisma generate
npx prisma migrate dev
npx prisma studio
turbo run build
turbo run test
turbo run lint
```

6. Under "Blocked commands" (or "Require confirmation"), add:

```
git push
git push --force
prisma migrate reset
rm -rf
npm publish
pnpm publish
```

---

### 3.6 Enable Privacy Mode

Because this project handles CNIC/NTN-shaped data even in mock form.

**Exact steps:**
1. Press `Cmd + Shift + J` / `Ctrl + Shift + J` → Cursor Settings
2. Click **General** in the left sidebar
3. Scroll down to **Privacy**
4. Toggle **Privacy Mode** to ON
5. A confirmation dialog will appear — confirm it

---

### 3.7 Enable the Next.js DevTools MCP server (do this after Session 0)

Skip this step now — come back to it after Session 0 creates the
`apps/web` folder and you have run `pnpm dev` at least once.

When you're ready (after Session 0):
1. Run the project in dev mode first:
   ```bash
   cd ~/projects/sectoria-pk
   pnpm dev
   ```
2. Next.js will print a message in the terminal saying something like:
   "MCP server available at http://localhost:3001" or a similar URL
3. Press `Cmd + Shift + J` / `Ctrl + Shift + J` → Cursor Settings
4. Click **MCP** in the left sidebar
5. Click **+ Add MCP Server**
6. Name: `Next.js DevTools`
7. URL: paste the URL from the terminal (e.g. `http://localhost:3001`)
8. Click Save
9. A green "Connected" indicator confirms it worked

After this is connected, Cursor can read build errors, browser console
output, and React component trees directly — no more copy-pasting error
messages into chat manually.

---

### 3.8 Let the codebase finish indexing

After opening the folder and installing extensions, Cursor indexes the
project automatically. You will see a spinning indicator at the bottom
of the Cursor window labelled "Indexing..." — wait for it to disappear
and show a checkmark before starting any session. This usually takes
under 60 seconds for a fresh project.

---

## PART 4 — THE BUILD: SESSION BY SESSION

Each session is a **separate, new Cursor chat**. Do not continue from
the previous chat. Open a new one every time (click the + icon in the
chat panel, or press `Cmd/Ctrl + L`).

At the start of every session, type `@` in the chat box and select
these two files to add them to context:
```
@Sectoria_Cursor_Prompt.md
@Sectoria_File_Structure.md
```
These are your master spec and your checklist — Cursor needs both in
context to build correctly.

---

### Session 0 — Monorepo scaffolding

**What this builds:** `turbo.json`, root `package.json`, `pnpm-workspace.yaml`
with version catalog, `.github/workflows/ci.yml`, and `packages/config`
(shared ESLint + tsconfig presets).

**Paste this into a new Cursor chat:**
```
@Sectoria_Cursor_Prompt.md @Sectoria_File_Structure.md

Start Session 0 from the build prompt. Create the complete monorepo
scaffold: turbo.json, root package.json with pnpm workspace config
and version catalog (use the exact versions from
docs/architecture/dependency-baseline.md), .github/workflows/ci.yml
running turbo test lint typecheck on every PR, and packages/config
with shared eslint flat config and tsconfig presets. Do not create
any application code yet.
```

**After Cursor finishes, run in terminal:**
```bash
pnpm install
```
It should complete with no errors and no peer-dependency version conflicts.
If it does show version conflicts, paste the error back into the chat and
ask Cursor to fix it by checking `dependency-baseline.md`.

**Commit:**
```bash
git add -A
git commit -m "chore(monorepo): scaffolding, config packages, and CI pipeline"
git push
```

---

### Session 1 — packages/types

**What this builds:** All Zod schemas and inferred TypeScript types —
the single source of truth for data shapes used by every other package.

**Paste into a new Cursor chat:**
```
@Sectoria_Cursor_Prompt.md @Sectoria_File_Structure.md

Start Session 1. Build packages/types exactly as listed in the file
structure document — every schema file (common.ts, society.ts,
inventory-category.ts, plot.ts, payment-plan.ts, booking.ts, escrow.ts,
user.ts, dealer-profile.ts, society-partner-authorization.ts, review.ts,
ledger-event.ts, tax.ts, verification.ts), all exported from index.ts.
Derive all TypeScript types from the Zod schemas using z.infer —
no hand-written parallel interfaces.
```

**After Cursor finishes, verify:**
```bash
pnpm --filter @sectoria/types typecheck
# Should complete with no errors
```

**Commit:**
```bash
git add -A
git commit -m "feat(types): complete Zod schema package"
git push
```

---

### Session 2a — packages/domain/tax (do tax alone, first)

**What this builds:** The FBR tax calculation engine (Sections 236C,
236K, 7E, Stamp Duty) with versioned rate tables and full test coverage.

**Paste into a new Cursor chat:**
```
@Sectoria_Cursor_Prompt.md @Sectoria_File_Structure.md

Start Session 2, tax package only. Write the test file first in
packages/domain/tax/src/__tests__/calculate-transfer-tax.test.ts
covering all required edge cases: all 9 combinations of seller/buyer
ATL status (filer/late-filer/non-filer), exactly-at-threshold for
Section 7E (PKR 25,000,000), one rupee above threshold, one below,
sale price below FBR table value (taxes must use FBR value not agreed
price), and zero/negative price inputs (must throw a typed error).
Then implement packages/domain/tax/src/calculate-transfer-tax.ts
until all tests pass. No imports from Next.js, Prisma, or React anywhere
in this package.
```

**After Cursor finishes, verify:**
```bash
pnpm --filter @sectoria/domain-tax test
# Must show all tests passing with no skipped tests
```

**Commit:**
```bash
git add -A
git commit -m "feat(domain-tax): FBR tax engine with full test coverage"
git push
```

---

### Session 2b — packages/domain/escrow

**Paste into a new Cursor chat:**
```
@Sectoria_Cursor_Prompt.md @Sectoria_File_Structure.md

Build packages/domain/escrow. Implement the state machine definition
(all legal transitions between EscrowState values), the
transition-escrow-state.ts function that validates and applies a
transition returning { nextState, event }, and a typed
InvalidEscrowTransitionError. Write tests first covering: every legal
transition from every state, every illegal transition (must throw
InvalidEscrowTransitionError with a descriptive message), and the
idempotency of reading current state. No framework imports.
```

**Verify:**
```bash
pnpm --filter @sectoria/domain-escrow test
```

**Commit:**
```bash
git add -A
git commit -m "feat(domain-escrow): escrow state machine with tests"
git push
```

---

### Session 2c — packages/domain/balloting

**Paste into a new Cursor chat:**
```
@Sectoria_Cursor_Prompt.md @Sectoria_File_Structure.md

Build packages/domain/balloting. The run-ballot function must be
deterministic — same entries + same seed always produces the same
result. Tests must verify: determinism (call twice with same input,
expect identical output), the result includes the seed and a SHA-256
hash of the input set, and an empty entries array throws a descriptive
error. No framework imports.
```

**Verify:**
```bash
pnpm --filter @sectoria/domain-balloting test
```

**Commit:**
```bash
git add -A
git commit -m "feat(domain-balloting): deterministic seeded ballot algorithm"
git push
```

---

### Session 2d — packages/domain/allocation

**Paste into a new Cursor chat:**
```
@Sectoria_Cursor_Prompt.md @Sectoria_File_Structure.md

Build packages/domain/allocation with FIFO and BALLOT strategy
implementations. Tests must cover: FIFO assigns the lowest available
serial number, BALLOT strategy returns a pending result (no immediate
assignment), and attempting to allocate from a category with zero
available units throws a typed error. No framework imports.
```

**Verify:**
```bash
pnpm --filter @sectoria/domain-allocation test
```

**Commit:**
```bash
git add -A
git commit -m "feat(domain-allocation): plot allocation strategies"
git push
```

---

### Session 2e — packages/domain/trust-score

**Paste into a new Cursor chat:**
```
@Sectoria_Cursor_Prompt.md @Sectoria_File_Structure.md

Build packages/domain/trust-score. Verified-transaction count must
carry at least 50% of the total score weight. Tests must verify:
a dealer with zero completed transactions cannot score above 50/100
regardless of other inputs, weight percentages sum to exactly 100,
and a null/undefined input throws a typed error. No framework imports.
```

**Verify:**
```bash
pnpm --filter @sectoria/domain-trust-score test
```

**Commit:**
```bash
git add -A
git commit -m "feat(domain-trust-score): trust scoring engine"
git push
```

---

### Session 2f — packages/domain/ledger

**Paste into a new Cursor chat:**
```
@Sectoria_Cursor_Prompt.md @Sectoria_File_Structure.md

Build packages/domain/ledger. The create-ledger-event function returns
a typed LedgerEvent object — it does not write to any database. Tests
must verify: every required field is present in the returned event,
and the createdAt timestamp is a valid ISO string. No framework imports.
```

**Verify:**
```bash
pnpm --filter @sectoria/domain-ledger test
```

**Commit:**
```bash
git add -A
git commit -m "feat(domain-ledger): audit ledger event builder"
git push
```

---

### Session 3a — packages/database

**Paste into a new Cursor chat:**
```
@Sectoria_Cursor_Prompt.md @Sectoria_File_Structure.md

Build packages/database. Create the complete Prisma schema from Section 5
of the build prompt, the encryption helper (AES-256-GCM using the
ENCRYPTION_KEY env var), and seed.ts matching Section 10 of the build
prompt (5 societies, categories, dealers, buyers, bookings in various
escrow states, reviews only attached to completed bookings). Add a
Postgres trigger migration that blocks UPDATE and DELETE on the
LedgerEvent table (document as ADR-004).
```

**After Cursor finishes, run:**
```bash
npx prisma migrate dev --name init
npx prisma generate
pnpm --filter @sectoria/database seed
npx prisma studio
# Opens a browser tab — visually confirm the seed data looks correct
```

**Commit:**
```bash
git add -A
git commit -m "feat(database): Prisma schema, encryption, seed data, and ledger trigger"
git push
```

---

### Session 3b — packages/verification (run parallel to 3a in a separate chat)

**Paste into a new Cursor chat:**
```
@Sectoria_Cursor_Prompt.md @Sectoria_File_Structure.md

Build packages/verification. Create typed interfaces for all four
adapters (NADRA, FBR ATL, DNFBP, PLRA) with mock implementations
that return schema-valid Pakistani demo data with simulated 1-2 second
network latency. The factory function returns mocks when API env vars
are blank, real adapters when they are set. Tests must verify mock
responses match the corresponding Zod schemas from packages/types.
```

**Verify:**
```bash
pnpm --filter @sectoria/verification test
```

**Commit:**
```bash
git add -A
git commit -m "feat(verification): government API adapters with mock implementations"
git push
```

---

### Session 4 — packages/ui

**Paste into a new Cursor chat:**
```
@Sectoria_Cursor_Prompt.md @Sectoria_File_Structure.md

Build packages/ui. Start with theme.css — the Tailwind v4 @theme block
containing all design tokens (colors, spacing, fonts, radii). Then
build every component from the file structure blueprint, each with a
Storybook story. Priority order: StatusBadge (green/amber/red/blue
variants), TaxBreakdownCard, IdentityCard, CertificateCard, then the
standard primitives (Button, Input, Select, Card, Table, Dialog,
Skeleton, EmptyState, ErrorState, ProgressBar). Every component must
have all 5 states where applicable: loading, empty, error, partial,
success. No business logic or data fetching in any component.
```

**Verify:**
```bash
pnpm --filter @sectoria/ui storybook
# Opens browser — visually inspect every component and its variants
```

**Commit:**
```bash
git add -A
git commit -m "feat(ui): design system components and Storybook stories"
git push
```

---

### Session 5 — packages/api-client

**Paste into a new Cursor chat:**
```
@Sectoria_Cursor_Prompt.md @Sectoria_File_Structure.md

Build packages/api-client. Create the tRPC base setup (trpc.ts,
context), named procedure variants (protectedProcedure,
societyAdminProcedure, dealerProcedure, verifiedBuyerProcedure) with
role and resource-ownership guards, and all six routers (society,
inventory-category, booking, dealer, verification, review, admin).
Each router composes domain functions from packages/domain with
persistence from packages/database inside a Prisma transaction for
any mutation that also writes a LedgerEvent. Write integration tests
for booking.router.ts covering the booking-token-payment →
ALLOCATED escrow transition with a LedgerEvent created in the same
database transaction.
```

**Verify:**
```bash
pnpm --filter @sectoria/api-client test
pnpm --filter @sectoria/api-client typecheck
```

**Commit:**
```bash
git add -A
git commit -m "feat(api-client): tRPC routers with guards, domain composition, and tests"
git push
```

---

### Session 6 — apps/web public marketplace

**Paste into a new Cursor chat:**
```
@Sectoria_Cursor_Prompt.md @Sectoria_File_Structure.md

Build the public marketplace in apps/web. Create the (marketplace)
route group with: homepage, /societies directory page (SSR with URL
search params for filters), /societies/[city]/[society] profile page
(ISR, revalidate 6 hours), /societies/[city]/[society]/[category]
category detail page, /compare comparison tool (dynamic import for
the widget), and /dealers directory. Every page must have
generateMetadata with unique title/description, JSON-LD structured
data (Organization, RealEstateListing, BreadcrumbList schemas),
dynamic opengraph-image.tsx for society pages, and a sitemap.ts
entry. All params must be awaited (async params pattern — Next.js 16).
```

**Verify:**
```bash
pnpm dev
# Open http://localhost:3000 in browser
# Then run Lighthouse in Chrome DevTools (F12 → Lighthouse tab → Analyze)
# SEO and Performance scores must both be >= 90
```

**Commit:**
```bash
git add -A
git commit -m "feat(web): public marketplace with SSR/ISR and full SEO"
git push
```

---

### Session 7 — Buyer dashboard + booking wizard

**Paste into a new Cursor chat:**
```
@Sectoria_Cursor_Prompt.md @Sectoria_File_Structure.md

Build the (buyer) route group in apps/web. Create the buyer dashboard,
bookings list, booking detail page (with escrow state timeline and
LedgerEvent audit trail), and the 5-step booking wizard at
/dashboard/booking/[categoryId]: Step 1 NADRA CNIC verification using
the verification router (with scanning animation while waiting for
mock adapter), Step 2 tax calculation using the tax domain package
(live recalculates as inputs change), Step 3 tax summary review,
Step 4 payment (escrow token, PKR amount shown clearly), Step 5
allocation result and certificate display. Each step must be
independently URL-addressable so progress survives a page refresh.
```

**Verify:**
```bash
pnpm dev
# Walk through the complete booking flow manually using the seeded buyer accounts
# Confirm a LedgerEvent row is created in the database at each step:
npx prisma studio
# Check the LedgerEvent table — should show entries for each transition
```

**Commit:**
```bash
git add -A
git commit -m "feat(web): buyer dashboard and 5-step booking wizard"
git push
```

---

### Session 8 — Society portal

**Paste into a new Cursor chat:**
```
@Sectoria_Cursor_Prompt.md @Sectoria_File_Structure.md

Build the (society) route group in apps/web. Create the society admin
portal with: overview dashboard (compliance score, HSMS status, active
bookings count), inventory management (category list, create/edit
category with pricing and payment plan setup), partner authorization
page (list dealers with active/revoked status, add/revoke a dealer for
a specific category), booking confirmation queue (list incoming bookings
awaiting society action, confirm payment receipt, issue allotment
document), and settings page (LOP/NOC document upload, HSMS link
status). All mutations must check resource ownership — a society admin
can only act on their own society's data.
```

**Verify:**
```bash
pnpm dev
# Log in as a society admin using the seeded accounts (check seed.ts for email/details)
# Confirm you cannot access another society's data by manually editing the URL
```

**Commit:**
```bash
git add -A
git commit -m "feat(web): society admin portal"
git push
```

---

### Session 9 — Dealer portal

**Paste into a new Cursor chat:**
```
@Sectoria_Cursor_Prompt.md @Sectoria_File_Structure.md

Build the (dealer) route group in apps/web. Create: dealer dashboard,
DNFBP certificate verification submission page (upload cert number,
submit for spot-check via DNFBP adapter, show verified/pending/rejected
status), lead pipeline page (buyer enquiries from societies the dealer
is authorized for, with NADRA-verified buyer badge and ATL status
shown), and trust score page (breakdown of the score components).
```

**Verify:**
```bash
pnpm dev
# Log in as a dealer using the seeded accounts
```

**Commit:**
```bash
git add -A
git commit -m "feat(web): dealer portal"
git push
```

---

### Session 10 — Admin

**Paste into a new Cursor chat:**
```
@Sectoria_Cursor_Prompt.md @Sectoria_File_Structure.md

Build the (admin) route group in apps/web. Create: admin dashboard,
verification queue (societies and dealers awaiting approval, with
approve/reject actions that update VerificationTier and log a
LedgerEvent), full ledger viewer (searchable/filterable by entityId,
event type, date range), disputes page (flag and resolve disputed
plots), and revenue dashboard (transfers completed this month, total
escrow released, commission earned broken down by society). Every
admin action must write a LedgerEvent tagged with the admin's userId
and a reason field.
```

**Verify:**
```bash
pnpm dev
# Log in as the super admin account from seed data
```

**Commit:**
```bash
git add -A
git commit -m "feat(web): admin portal"
git push
```

---

### Session 11 — Security hardening

**Paste into a new Cursor chat:**
```
@Sectoria_Cursor_Prompt.md

Perform a full security audit of the codebase against security.mdc.
Check and fix each of the following:
1. next.config.ts — confirm Content-Security-Policy, X-Frame-Options,
   Strict-Transport-Security, and Referrer-Policy headers are set
2. Every auth endpoint, booking initiation endpoint, and verification-
   triggering endpoint has @upstash/ratelimit applied
3. Search the codebase for any console.log, error message, or database
   query that might contain a raw CNIC or NTN string — replace all with
   masked versions or entity IDs
4. Confirm all webhook handlers (escrow, verification) verify the
   request signature BEFORE processing the payload
5. Confirm the LedgerEvent Postgres trigger (from Session 3a) still
   exists in the latest migration
6. Run pnpm turbo run typecheck — fix any remaining type errors
```

**Run the full test suite:**
```bash
pnpm turbo run test lint typecheck
# All must pass with zero errors before committing
```

**Commit:**
```bash
git add -A
git commit -m "security: headers, rate limiting, PII audit, and webhook verification"
git push
```

---

### Session 12 — Documentation pass

**Paste into a new Cursor chat:**
```
@Sectoria_Cursor_Prompt.md

Documentation pass per documentation.mdc. For each package in
packages/*: confirm README.md has a working usage example (update if
the example is stale or missing). For every exported function in
packages/domain/* and packages/verification/*: add or complete TSDoc
comments including @see references to the relevant legal section (e.g.
@see Section 236C). Fill in the ADR files in docs/architecture/ with
the actual decisions made during this build. Update
docs/architecture/access-rights-matrix.md with any actions added
during Sessions 8-10 that don't have a row yet.
```

**Commit:**
```bash
git add -A
git commit -m "docs: complete READMEs, TSDoc, ADRs, and access rights matrix"
git push
```

---

### Session 13 — E2E test suite

**Paste into a new Cursor chat:**
```
@Sectoria_Cursor_Prompt.md @Sectoria_File_Structure.md

Build the Playwright E2E critical-path test in e2e/critical-path.spec.ts
per testing.mdc. The test must cover the complete flow end to end using
the seeded mock data: (1) browse society directory, (2) open a society
profile, (3) open compare tool with two societies, (4) select a
category and open the booking wizard, (5) complete CNIC verification
step using the mock NADRA adapter, (6) confirm tax breakdown is
displayed correctly, (7) complete the booking token payment step,
(8) confirm the allocation result page shows a plot number and
certificate. Run against mock adapters only — no real government API
calls in CI.
```

**Run the E2E tests:**
```bash
npx playwright test
# All tests must pass
npx playwright show-report
# Opens a browser report showing each step — review it
```

**Commit:**
```bash
git add -A
git commit -m "test(e2e): complete critical-path Playwright suite"
git push
```

---

## PART 5 — QUALITY GATE (run between every session)

```bash
pnpm turbo run test lint typecheck
```

This single command runs tests, lint, and type-checking across every
package simultaneously via Turborepo. All must pass before you commit
and move to the next session. If anything fails, paste the error output
into the current Cursor chat and ask it to fix it before moving on.

---

## PART 6 — IF SOMETHING GOES WRONG

**pnpm install fails with version conflicts:**
```bash
cat docs/architecture/dependency-baseline.md
# Check the version listed for the conflicting package
# Then ask Cursor: "Fix the version conflict for [package] — the correct
# version per dependency-baseline.md is [version]"
```

**A test fails after Cursor writes new code:**
Paste the exact test output (the red error lines, not the whole log)
into the same chat session and say: "The test is failing with this
error — fix it without changing the test file, the test is correct."

**Cursor writes a domain package that imports from Prisma or Next.js:**
Say: "This violates the boundary rule in architecture.mdc — packages/
domain must have zero imports from Prisma, Next.js, or React. Move
the offending logic to packages/api-client instead."

**Build error in apps/web after Session 6:**
First check: is the Next.js DevTools MCP connected (Step 3.7)? If yes,
Cursor can read the error directly. If not, paste the exact terminal
error into a new chat session — include the full stack trace.

**CNIC or NTN appears in a log or error message:**
Stop immediately. Say: "A CNIC/NTN is being logged in plaintext — find
every place this can happen in the codebase and replace with the masked
version using the mask-cnic helper from packages/ui, or with the entity
ID only."
