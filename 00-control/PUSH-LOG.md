# PUSH-LOG.md — Push Ledger

Every push to a remote is recorded here by `push-log.ps1` (repo root), newest
at the bottom. Each entry captures where `origin/<branch>` pointed **before**
the push, where it points **after**, the commits that moved, and the exact
command to put it back. A durable tag (`prepush-<branch>-<stamp>`) is planted on
the before-state so those commits are never garbage-collected — you can always
return to any prior push.

This is a ledger, not the source of truth for *why* — that stays in
`DECISIONS.md`. This file answers one question: **"how do I undo that push?"**

## How to roll back

**Undo the most recent push** (restore the remote branch to its before-state):

```
git push origin <BEFORE-SHA>:<branch> --force-with-lease
```

`--force-with-lease` refuses if someone else pushed in the meantime, so you
never clobber a teammate blindly. If the entry says the branch was **new**,
undo instead with:

```
git push origin --delete <branch>
```

**Also move your local branch back** (optional — only if you want your working
copy to match):

```
git reset --hard <BEFORE-SHA>
```

**Return to the state as of any earlier push:** reset/push to that entry's
AFTER-SHA (or its `prepush-…` tag). Every after-sha below is a safe anchor.

---

<!-- push-log.ps1 appends entries below this line -->
