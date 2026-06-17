# CP20B Publish Manifest

## Identity

- Checkpoint: CP20B - Persisted CP20A Opportunity Proof
- Base main SHA: e8b8cf75b19a60656a74844e3f32e4b001b211ce
- Local commit SHA: 753dd3a100630ea525289c424ea136fa162af5bd
- Branch name: cp20b-persisted-cp20a-opportunity

## Archive Contents

This clean archive contains exactly these four file entries and nothing else:

- app/internal/cp20b/page.tsx
- db/schema.ts
- lib/runtime/cp20b-persisted-cp20a-opportunity.ts
- CP20B_PUBLISH_MANIFEST.md

## Git Diff Proof

Command: git diff --name-status main..HEAD

```text
A	app/internal/cp20b/page.tsx
M	db/schema.ts
A	lib/runtime/cp20b-persisted-cp20a-opportunity.ts
```

Command: git diff --stat main..HEAD

```text
 app/internal/cp20b/page.tsx                      | 414 +++++++++++
 db/schema.ts                                     | 155 ++++
 lib/runtime/cp20b-persisted-cp20a-opportunity.ts | 898 +++++++++++++++++++++++
 3 files changed, 1467 insertions(+)
```

## File Hashes And Sizes

| File | SHA-256 | Bytes |
| --- | --- | ---: |
| app/internal/cp20b/page.tsx | f962321f108ca08a30284eb59196d7767faafb879fa0c8aba84fa0ee05090aa0 | 15414 |
| db/schema.ts | 9024c80367c645b672b5fe41cf690e1c23a5ec2427a86a9145f8b35fa9cd28cc | 82642 |
| lib/runtime/cp20b-persisted-cp20a-opportunity.ts | c2905b3180a56cc823581d910ba06d64353d445a8c004dbb1695af7e7df8b136 | 29294 |

## Runtime Safety Confirmations

- No /internal/cp20b route load was performed.
- No db:push was run.
- No SerpApi calls were made.
- No Firecrawl calls were made.
- No live provider proof was triggered during implementation or bundle creation.

## Verification

Command: npm run type-check

Result: passed.

```text
> fetchi-ai@0.1.0 type-check
> tsc --noEmit
```

Command: npm run build

Result: exact local build compiled and type-checked, then failed during page data collection because DATABASE_URL is not set in the local environment.

```text
> fetchi-ai@0.1.0 build
> next build

  ▲ Next.js 14.2.29

   Creating an optimized production build ...
 ✓ Compiled successfully
   Linting and checking validity of types ...
   Collecting page data ...
Error: DATABASE_URL environment variable is not set. Replit should auto-inject this.

> Build error occurred
Error: Failed to collect page data for /app/leads
```

Command: DATABASE_URL=postgres://fetchi:fetchi@localhost:5432/fetchi NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_Y2xlcmsuZXhhbXBsZS5jb20k npm run build

Result: supplemental dummy-env build passed and emitted a route table containing /internal/cp20b.

## Route Count Correction

- Build route table has 23 rows including /_not-found.
- Filesystem route/page count is 22.
- The earlier "build route count: 22" excluded /_not-found; the corrected count including /_not-found is 23.
