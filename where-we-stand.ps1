<#
.SYNOPSIS
    Writes a fresh "Where we stand" snapshot to WHERE-WE-STAND.md at the repo root.

.DESCRIPTION
    Gathers live git state (branch, status, recent commits, local branches,
    ahead/behind vs origin) and pulls the current-stage line out of the control
    files, then renders a single Markdown snapshot for zero-context resume.

    This file is a *generated view* of the authoritative control docs in
    00-control/ (STATE.md, DECISIONS.md, the latest HANDOFF-*.md). It never
    replaces them - it points at them. Re-run it any time; it overwrites.

.PARAMETER RunTests
    Also run the app test suite and record the pass/fail summary. Slower.
    Requires Node on PATH (the script adds the standard Windows location).

.EXAMPLE
    ./where-we-stand.ps1
.EXAMPLE
    ./where-we-stand.ps1 -RunTests
#>
[CmdletBinding()]
param(
    [switch]$RunTests
)

$ErrorActionPreference = 'Stop'

# Repo root = the folder this script lives in.
$root = $PSScriptRoot
if (-not $root) { $root = (Get-Location).Path }
Set-Location $root

$outFile = Join-Path $root 'WHERE-WE-STAND.md'
$stamp   = Get-Date -Format 'yyyy-MM-dd HH:mm'

function Invoke-Git {
    param([string[]]$GitArgs)
    try { (& git @GitArgs 2>$null) } catch { @() }
}

# --- Live git state -------------------------------------------------------
$branch  = (Invoke-Git @('branch','--show-current')) -join ''
if (-not $branch) { $branch = '(detached HEAD)' }

$statusLines = Invoke-Git @('status','--short')
$status = if ($statusLines) { ($statusLines -join "`n") } else { '(clean working tree)' }

$commits = (Invoke-Git @('log','--oneline','-8')) -join "`n"

$localBranches = (Invoke-Git @('branch','--format=%(refname:short)')) -join "`n"

# Ahead/behind vs upstream, if one is set.
$tracking = ''
$upstream = (Invoke-Git @('rev-parse','--abbrev-ref','--symbolic-full-name','@{u}')) -join ''
if ($upstream) {
    $counts = (Invoke-Git @('rev-list','--left-right','--count','@{u}...HEAD')) -join ''
    if ($counts -match '(\d+)\s+(\d+)') {
        $tracking = "Tracking ``$upstream`` - behind $($Matches[1]), ahead $($Matches[2])."
    }
}

# --- Current stage, lifted from STATE.md ----------------------------------
$statePath = Join-Path $root '00-control/STATE.md'
$stageLine = '(STATE.md not found)'
$stateUpdated = ''
if (Test-Path $statePath) {
    $stateText = Get-Content $statePath -TotalCount 6
    $stageLine   = ($stateText | Where-Object { $_ -match '^Current stage:' }) -join ''
    $stateUpdated = ($stateText | Where-Object { $_ -match '^Last updated:' }) -join ''
}

# --- Latest handoff -------------------------------------------------------
$handoff = Get-ChildItem (Join-Path $root '00-control') -Filter 'HANDOFF-*.md' -ErrorAction SilentlyContinue |
    Sort-Object Name -Descending | Select-Object -First 1
$handoffName = if ($handoff) { "00-control/$($handoff.Name)" } else { '(none)' }

# --- Optional test run ----------------------------------------------------
$testSummary = '_Not run. Pass `-RunTests` to include the suite result._'
if ($RunTests) {
    $env:Path = 'C:\Program Files\nodejs;' + $env:Path
    $appDir = Join-Path $root 'app'
    Push-Location $appDir
    # npm writes progress to stderr; under the script-level 'Stop' preference
    # that native stderr would terminate the run. Relax it just for the test
    # call and read the exit code explicitly instead.
    $prevEAP = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $testOut = (& cmd /c 'npm test 2>&1') | Out-String
        # vitest's summary line: "Tests  172 passed | 1 skipped (173)"
        $line = ($testOut -split "`n" | Where-Object { $_ -match '^\s*Tests\s+\d' } | Select-Object -Last 1)
        if ($line) { $testSummary = "``$($line.Trim())``" }
        else { $testSummary = "_Ran, but the summary line was not found (exit $LASTEXITCODE)._" }
    } catch {
        $testSummary = "_Test run failed to start: $($_.Exception.Message)_"
    } finally {
        $ErrorActionPreference = $prevEAP
        Pop-Location
    }
}

# --- Render ---------------------------------------------------------------
$md = @"
# Where We Stand

_Generated $stamp by ``where-we-stand.ps1``. This is a snapshot view - the
authoritative record is ``00-control/STATE.md``, ``00-control/DECISIONS.md``, and
the latest handoff. Re-run the script to refresh._

## Build stage

- $stageLine
- $stateUpdated

## Git

- **Current branch:** ``$branch``
- $tracking

**Working tree:**

``````
$status
``````

**Recent commits:**

``````
$commits
``````

**Local branches:**

``````
$localBranches
``````

## Tests

$testSummary

## Where to read more (authoritative)

| For | Read |
|---|---|
| Operating rules (Layer 0) | ``CLAUDE.md`` |
| Task routing / stage map | ``CONTEXT.md`` |
| Current build state | ``00-control/STATE.md`` |
| Why anything is the way it is | ``00-control/DECISIONS.md`` |
| Latest session snapshot | ``$handoffName`` |
| What to pick up next | ``00-control/NEXT-STEPS.md`` |
| Prototype -> shippable plan | ``00-control/PATH-TO-SHIP.md`` |
| Product spec (source of truth) | ``00-control/MASTER-SPEC.md`` |

---

_Do not hand-edit: this file is overwritten on every run of ``where-we-stand.ps1``._
"@

Set-Content -Path $outFile -Value $md -Encoding utf8
Write-Host "Wrote $outFile ($stamp)"
