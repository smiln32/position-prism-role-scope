<#
.SYNOPSIS
    Push the current branch AND record a reversible entry in 00-control/PUSH-LOG.md.

.DESCRIPTION
    Wraps `git push` so every push is documented and undoable:
      1. Reads where origin/<branch> points now (the BEFORE state).
      2. Plants a durable tag `prepush-<branch>-<stamp>` on that BEFORE commit
         (and pushes the tag) so those commits can never be garbage-collected.
      3. Pushes the branch with --force-with-lease (safe: refuses if the remote
         moved under you).
      4. Appends an entry to 00-control/PUSH-LOG.md with the commits that moved
         and the exact command to roll the push back.

    Fast-forward pushes (the normal case) and the first push of a new branch are
    both handled. Nothing here rewrites history on its own - rollback is always
    an explicit, logged command you run yourself.

    Note: this script is kept ASCII-only so Windows PowerShell 5.1 (which reads
    .ps1 as ANSI) parses it correctly. The Markdown it writes is UTF-8.

.PARAMETER Remote
    Remote name. Default: origin.

.PARAMETER Branch
    Branch to push. Default: the current branch.

.PARAMETER DryRun
    Show exactly what would happen - before/after SHAs, the commits, and the
    ledger entry - WITHOUT pushing, tagging, or writing anything.

.EXAMPLE
    ./push-log.ps1                 # push current branch, tag + log it
.EXAMPLE
    ./push-log.ps1 -DryRun         # preview only
.EXAMPLE
    ./push-log.ps1 -Branch master  # push a specific branch
#>
[CmdletBinding()]
param(
    [string]$Remote = 'origin',
    [string]$Branch,
    [switch]$DryRun
)

$root = $PSScriptRoot
if (-not $root) { $root = (Get-Location).Path }
Set-Location $root

# git writes progress to stderr; keep that from terminating the script, and
# read exit codes explicitly instead.
$ErrorActionPreference = 'Continue'

# No stderr redirect: in Windows PowerShell 5.1 `2>$null` on native git can
# swallow stdout as well. Read-only git commands below emit nothing on stderr
# (rev-parse uses --quiet), so plain invocation is correct. Push/tag exit codes
# are checked explicitly.
# Named Invoke-Git, not Git: PowerShell is case-insensitive, so a function
# named `Git` would shadow the `git` executable and recurse into itself.
function Invoke-Git { param([Parameter(ValueFromRemainingArguments = $true)][string[]]$a) (& git @a) }

# --- resolve branch -------------------------------------------------------
if (-not $Branch) { $Branch = (Invoke-Git rev-parse --abbrev-ref HEAD) -join '' }
if (-not $Branch -or $Branch -eq 'HEAD') {
    Write-Error 'Cannot determine a branch to push (detached HEAD?). Pass -Branch.'
    exit 1
}

$headSha  = (Invoke-Git rev-parse --short HEAD) -join ''
$headFull = (Invoke-Git rev-parse HEAD) -join ''

# --- where does the remote branch point right now? ------------------------
$remoteRef  = "$Remote/$Branch"
$beforeFull = (Invoke-Git rev-parse --verify --quiet "$remoteRef") -join ''
$isNew      = [string]::IsNullOrWhiteSpace($beforeFull)
$beforeSha  = if ($isNew) { '' } else { (Invoke-Git rev-parse --short $beforeFull) -join '' }

if (-not $isNew -and $beforeFull -eq $headFull) {
    Write-Host "Nothing to push: $remoteRef is already at $headSha."
    exit 0
}

# --- commits that will move ----------------------------------------------
$range = if ($isNew) { $headFull } else { "$beforeFull..$headFull" }
$commits = @(Invoke-Git log --oneline $range)

$stamp   = Get-Date -Format 'yyyy-MM-dd HH:mm'
$tagName = "prepush-$($Branch -replace '[^A-Za-z0-9]+','-')-$(Get-Date -Format 'yyyyMMdd-HHmmss')"

# --- build the ledger entry (arrow rendered as ASCII '->') ----------------
$commitLines = ($commits | ForEach-Object { "  - $_" }) -join "`n"
if (-not $commitLines) { $commitLines = '  - (none)' }

if ($isNew) {
    $beforeLine = "- $remoteRef BEFORE this push: (new branch - did not exist on $Remote)"
    $undo = "git push $Remote --delete $Branch"
    $localBack = "# nothing to reset to - the branch was new"
    $pushedDesc = "$headSha (new branch, $($commits.Count) commit(s))"
} else {
    $beforeLine = "- $remoteRef BEFORE this push: $beforeSha  (rollback anchor tag: $tagName)"
    $undo = "git push $Remote ${beforeSha}:$Branch --force-with-lease"
    $localBack = "git reset --hard $beforeSha"
    $pushedDesc = "$beforeSha..$headSha ($($commits.Count) commit(s))"
}

$entry = @"

## $stamp - $Branch -> $Remote

- Pushed: $pushedDesc
$commitLines
$beforeLine
- $remoteRef AFTER this push:  $headSha

**Undo this push (restore the remote):**
``````
$undo
``````
**Also move your local branch back (optional):**
``````
$localBack
``````
"@

# --- dry run: show and stop ----------------------------------------------
if ($DryRun) {
    Write-Host "DRY RUN - nothing pushed, tagged, or written.`n"
    Write-Host "Branch : $Branch  ->  $Remote"
    Write-Host "Before : $(if ($isNew) { '(new branch)' } else { $beforeSha })"
    Write-Host "After  : $headSha"
    Write-Host "Tag    : $(if ($isNew) { '(none - new branch)' } else { $tagName })"
    Write-Host "`n--- ledger entry that WOULD be appended ---$entry"
    exit 0
}

# --- 1. plant + push the rollback anchor tag ------------------------------
if (-not $isNew) {
    & git tag -a $tagName $beforeFull -m "State of $remoteRef before push on $stamp"
    & git push $Remote $tagName
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Could not push the anchor tag $tagName. It still exists locally; the push will proceed."
    }
}

# --- 2. push the branch (safe force) --------------------------------------
& git push --force-with-lease $Remote "${Branch}:$Branch"
if ($LASTEXITCODE -ne 0) {
    Write-Error "git push failed (exit $LASTEXITCODE). Nothing was logged. Resolve and retry."
    exit $LASTEXITCODE
}

# --- 3. append the ledger entry -------------------------------------------
$logPath = Join-Path $root '00-control/PUSH-LOG.md'
if (-not (Test-Path $logPath)) {
    Set-Content -Path $logPath -Value "# PUSH-LOG.md - Push Ledger`n" -Encoding utf8
}
Add-Content -Path $logPath -Value $entry -Encoding utf8

$pushedSummary = if ($isNew) { "new, $headSha" } else { "$beforeSha..$headSha" }
Write-Host "Pushed $Branch -> $Remote ($pushedSummary)."
Write-Host "Logged to 00-control/PUSH-LOG.md. Undo with:  $undo"
