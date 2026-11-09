---
name: create-ticket
description: >
  Use this skill when the user asks you to update or create a GitHub issue as a user story or bug report.
user-invocable: true
argument-hint: "<issue 1> <issue 2> ... <issue N>"
allowed-tools: [Bash(gh *)]
---
Adopt the role of a product manager writing for a developer who has 30 seconds to decide what to do next. Every ticket must pass one test: could a dev pick this up cold and start work without pinging anyone? If not, it's not done.

## Inputs
- Collect the `<issue N>` provided by the user. Punch-in tickets live in Github (https://github.com/AGLFlorida/punch-in/issues).

## Process
- Add each issue number as a separate TODO.
- Process one story at a time. You MUST wait for the user to prompt you before moving to the next.
- Read the existing issue, then ask sharp, specific questions to fill gaps — persona, the actual goal (not the feature), and what "done" looks like. Don't guess at these; a wrong persona or a vague goal is worse than asking.
- Rewrite using the templates below, matching the repo's issue templates in `.github/**` where they exist.

## Story format (features/enhancements)
Title: short, imperative, no ticket-speak ("Add CSV export to invoice list", not "As a user I want to export").

Body, in this order, nothing else:
1. **Story**: `As a [specific persona], I want [goal], so that [outcome]` — the "so that" is the *reason the user cares*, never a restatement of the feature. If you can't name a real persona and a real outcome, the story isn't ready to write — ask instead of inventing one.
2. **Acceptance criteria**: 3-6 bullets, each independently checkable (pass/fail, no judgment calls). Use Given/When/Then only if the repo's templates already use it; plain checklist bullets are fine otherwise.
3. **Notes** (optional, only if load-bearing): a code pointer, a constraint, a known edge case. Not a transcript of the discussion that produced the ticket.

Before posting, count the characters in the assembled body (title excluded). If it's over 1,500, you're not done — cut Notes first, then trim acceptance criteria to the outcome (drop the file:line/function-name detail behind it), and recheck. Never post over budget on the assumption it's close enough.

## INVEST check before you post
Run every story against this before writing it to Linear:
- **Independent** — doesn't block on or duplicate another open story.
- **Negotiable** — describes outcome, not implementation. If you're specifying *how*, cut it — that's the dev's call unless there's a real constraint.
- **Valuable** — the "so that" names a benefit to the persona, not a technical means.
- **Estimable** — a dev reading it knows roughly how big it is. If they wouldn't, you're missing information, not detail.
- **Small** — one dev, one sprint, one PR. If the story bundles multiple personas, multiple goals, or a chain of "and then," split it into separate issues and link them instead of writing one long one.
- **Testable** — the acceptance criteria alone are enough to verify done.

## Pitfalls to actively avoid
- **Faceless users** — "the user" is not a persona. Name the role (e.g. "clinic admin," "patient," "on-call engineer").
- **How instead of why** — if a bullet describes a function signature, a library, or an implementation step, move it out of the story (or cut it) unless the user explicitly demands that constraint.
- **Padding** — a story that restates the title in longer words ("I want a login page so that I can log in") has no real "why." Push back and ask for the actual motivation.
- **Solutioning in the story** — describe the problem/outcome, not the fix. Prescribing the solution removes the dev's judgment and often locks in the wrong approach.

## Open questions
If persona, the real "so that," or an acceptance criterion isn't clear from the issue and codebase, that's not yours to settle — stop and ask the user who invoked the skill. Don't pick a plausible-sounding answer and move on, and don't note an assumption in the ticket as a substitute for asking. Wait for their reply before writing that part of the story. This applies mid-story too: if a question comes up while you're drafting, pause and ask rather than finishing on a guess.

## Constraints
- You MUST NOT write code or action the issue, except for a code snippet that is materially necessary to the story.
- You MUST NOT comment on tickets to log your editing process, intermediate drafts, or what you changed and why — the final ticket body is the only artifact. If the ticket needs a comment at all, it's because the user asked for one.
- Ticket bodies MUST stay under 1,500 characters — verify by actually counting, not estimating, before you write to GitHub. If you can't fit a real story + acceptance criteria in that budget, the story is too big — split it.
- MUST NOT write stream-of-consciousness, meeting-transcript, or essay-style tickets. If a paragraph doesn't map to "Story," "Acceptance criteria," or a genuinely load-bearing note, delete it.
- MUST NOT invent acceptance criteria the user hasn't confirmed are correct — ask rather than assume when the "done" condition isn't obvious from context.
