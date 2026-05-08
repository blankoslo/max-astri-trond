---
name: pr-review
description: >
  Structured code review that learns from feedback. Reviews a PR, file, or diff for
  bugs, security issues, and code quality. After presenting findings, collects feedback
  and updates its own learned rules so future reviews improve. Invoke with
  /repo-skills:pr-review, or "review PR <number>", "review this file", "code review".
---

# PR Review Skill

## How to invoke

- `/repo-skills:pr-review` — review current branch diff vs main
- `/repo-skills:pr-review <PR#>` — review a GitHub PR by number
- `/repo-skills:pr-review <file>` — review a single file

## Review process

### Step 1 — gather

- If PR number: `gh pr view <n>` then `gh pr diff <n>`, then `gh api repos/.../pulls/<n>/comments` for existing human/bot review comments
- If file path: read the file directly
- If no args: `git diff main...HEAD` for current branch

### Step 2 — analyze

Work through these lenses in order. Skip lenses with no findings — do not write empty sections.

1. **Bugs** — incorrect behavior, wrong logic, off-by-one, reference vs value equality, broken fallbacks
2. **Security** — unvalidated input at API boundaries, injected values in URLs/queries, hardcoded secrets/emails, missing auth
3. **Reliability** — unhandled NaN from Number(), swallowed errors, missing null checks at API response boundaries, no fallback when external API fails
4. **API design** — wrong HTTP status codes, misleading field names, stale JSDoc/comments, inconsistent response shapes
5. **React/Next.js** — redundant dynamic() wrappers, missing or wrong useEffect deps, dead store methods, SSR leaks
6. **Code quality** — dead code, unused exports, misleading attribution, magic numbers without names

### Step 3 — present findings

Format each finding:
```
path:line: <emoji> <severity>: <problem>. <fix>.
```

Severity:
- 🔴 `bug` — broken behavior
- 🟡 `risk` — fragile, works until it doesn't  
- 🔵 `nit` — style/naming/minor
- ❓ `q` — genuine question

Group by severity (bugs first). Give a one-line summary at the top: `N bugs, M risks, K nits`.

### Step 4 — fix or defer

After presenting findings, ask:
> "Fix all now, fix bugs+risks only, or review findings first?"

Then apply fixes if asked.

### Step 5 — collect feedback and self-update

After the review session, ask:
> "Any findings that were wrong or that I should always/never flag in this codebase?"

When user corrects a finding (false positive, "that's fine here", "don't flag X"):
- Append to **## Learned: ignore patterns** below

When user confirms a pattern should always be caught ("yes always flag this"):
- Append to **## Learned: always check** below

When updating: rewrite the relevant section of this file using the Write tool. Preserve all existing rules — only add, never delete unless the user says to remove a rule.

---

## Learned: always check

- `Number()` conversion on query params must be followed by `isNaN()` guard — unvalidated NaN silently corrupts GraphQL filter variables
- `autocomplete` API parsing: assert field count before destructuring semicolon-delimited strings
- Tile/proxy routes: validate path params as integers with bounds before forwarding to upstream
- Personal emails must not appear in User-Agent headers or any hardcoded string
- Attribution strings must match the actual data source (e.g. ESRI tiles must not credit Kartverket)
- Double `dynamic({ssr:false})` wrappers are redundant when the inner component already handles SSR

## Learned: ignore patterns

_(none yet)_
