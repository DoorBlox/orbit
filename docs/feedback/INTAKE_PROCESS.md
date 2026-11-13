# ORBIT owner feedback intake — one issue, one roadmap

**Authority:** This page describes the intake and triage workflow; the **only implementation roadmap** remains [`plans/ORBIT_POST_2_4_EXECUTION.md`](../../plans/ORBIT_POST_2_4_EXECUTION.md), with owner-facing status in [`docs/PROGRESS.md`](../PROGRESS.md). It does not add a parallel backlog or authorize a deployment.

## Owner workflow (no technical prompts)

1. Open [**New ORBIT feedback issue**](https://github.com/DoorBlox/orbit/issues/new?template=orbit-feedback.yml). Write what happens, what should happen, and add **redacted** screenshots/videos. It is fine to choose "Not sure" for priority; no reproduction script is required.
2. Copy the created issue link or number into the existing **ORBIT Command HQ** conversation and say "Triage this." The GitHub form does not automatically wake ChatGPT; this handoff is required until a separately implemented, verified automation exists.
3. If sharing feedback in a ChatGPT conversation instead, HQ can draft/create the GitHub issue from the supplied description. Do not assume ChatGPT image attachments automatically become GitHub attachments: explicitly attach safe images to the GitHub issue, or preserve a durable approved reference. Never publish private screenshots to a public repository.
4. Comment on the **same issue** with new evidence or corrections, rather than restarting the story in other worker chats.

## Command HQ processing contract

For each new owner issue, HQ must:

1. **Preserve original intent:** keep owner wording, visual references, must-preserve constraints, prior decisions and evidence links intact; identify current vs expected screenshots. Never reinterpret an aesthetic preference as only a test-count milestone.
2. **Deduplicate and classify:** link existing related issues and existing BP/FO/PJ/BR/SP work IDs; do not close or overwrite an earlier open report without recording why. Mark true incident severity if there is privacy breach, data loss or blocked authentication.
3. **Record an actionable triage comment** on the source issue, including:
   - **Work ID / roadmap anchor** (existing BP-xx/FO/PJ etc, or new named subtask under an existing workstream).
   - **Priority** (P0 safety/data, P1 broken core path, P2 significant visual/UX, P3 polish), with a concise reason and any escalation.
   - **Worker owner** (one primary W1 sync/database, W2 media/backup, W3 product UI/animation, W4 security/CI/release, W5 docs/stewardship, W6 independent QA) and explicit cross-lane dependencies.
   - **Reproduction** (exact screen/device/source, or NOT REPRODUCED); user-supplied screenshots/links; **actual vs expected**.
   - **Acceptance checklist** (observable function + persistence/reload + accessibility/reduced motion where relevant + independent automated evidence + owner visual signoff for subjective changes).
   - **Scope and no-change constraints**, privacy/safety risk, and release gates.
   - **Next testable action**, PR/evidence links and honest status: REPORTED / TRIAGED / READY / IN PROGRESS / SOURCE MERGED / PREVIEW VERIFIED / OWNER ACCEPTED / RELEASED. Never conflate SOURCE MERGED, Preview and Production.
4. **Route ownership:** post the issue contract in the relevant worker's existing GitHub thread/handoff or issue and ask the owner worker to execute test-first; no seventh engineering workstream. If W1/W2/W3/W4 change the same file, designate a single editor first.
5. **Reconcile the sole roadmap:** request W5 to append/update an existing work ID or clearly scoped subtask in `plans/ORBIT_POST_2_4_EXECUTION.md` and `docs/PROGRESS.md` through a separate reviewed W5-only documentation PR. HQ reviews its exact head and four required checks. A GitHub Project, if later created, is a visualization of this same canonical ledger, not another independent backlog.
6. **Verify closure:** W6/assigned worker provides test logs and Preview/device evidence, and the owner reviews subjective visual outcomes. Close the GitHub issue only when the explicitly listed criteria are satisfied; otherwise retain OPEN with the remaining gate. A merged PR does not close a visual issue by itself.
7. **Respect approval boundaries:** ordinary source/QA is delegated; hosted Auth/RLS/Storage/SQL, protected release/Production alias, billing, private deletion or publishing require their own approval and rollback evidence.

## Example: animated background button

- Owner report: "The existing animated background button doesn't do anything."
- Primary owner: **W3** (UI/animation); W6 checks browser/reduced-motion evidence. Related scope: spatial environment / BP-06/BP-07.
- First reproduce in current deployed 2.4 and current-source protected Preview, establish whether the toggle persists and what motion is actually visible. Do not silently assume user error or reduced-motion settings.
- Completion: clearly visible tasteful animation when enabled, stopped when disabled, works after reload, reduced-motion respected, interactive widgets smooth and unmoved, real browser evidence, **owner approves appearance**. New source alone is not closure.

## Privacy and operational limits

The repository is publicly readable. Issue screenshots must not disclose real journal contents, private image bytes, session links, API tokens, credentials, signed Storage URLs or personal details. Use dummy content/crops/blur. If proof requires private account data, keep it in a separately authorized owner-assisted protected review; record only safe PASS/FAIL and references on GitHub.

**No automatic inbox monitoring is configured.** Filing an issue records it durably; HQ will triage when called from the ORBIT command conversation or through an explicitly installed future automation.
