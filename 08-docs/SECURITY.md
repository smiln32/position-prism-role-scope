# Security — passphrase protection (data at rest)

_Added 2026-07-13 with the data-at-rest encryption feature. See
`DECISIONS.md` 2026-07-13 for the design decision and rationale._

## What it protects

Everything you enter in Successor is stored **on your own computer**, in the
browser's local storage. By default it is stored as plain text, which means
anyone who can open your browser profile — on a shared or stolen machine, or
through the browser's developer tools — could read it.

Turning on **passphrase protection** encrypts your projects on disk. While the
app is locked, the stored data is unreadable ciphertext; only your passphrase
can unlock it.

## How it works (plain version)

- You choose a passphrase. From it, the app derives an encryption key using a
  deliberately slow calculation (PBKDF2, 250,000 rounds), which makes guessing
  passphrases expensive.
- Each project is sealed with AES-GCM, a standard authenticated cipher. If the
  ciphertext is tampered with, or the wrong passphrase is used, it refuses to
  open rather than returning garbage.
- Your passphrase is **never saved anywhere** — not to the disk, not to the
  project file, nowhere. It lives only in memory while the app is open. This is
  the same rule the product applies to everything sensitive (Successor never
  stores credentials).
- The only things written to disk alongside your encrypted projects are a
  random *salt* and the encryption settings. Neither is secret.

## Honest limits

- **This protects data at rest.** Once you have unlocked the app, it is working
  with your data in plain text in memory — it has to, in order to show it to
  you. Protection is about someone getting at the stored files or the browser
  profile while the app is locked, not about a session you have already opened.
- **A forgotten passphrase cannot be recovered.** There is no backdoor and no
  reset code — that is what makes the protection real. Keep an **exported
  project file** as a backup (Export lives on each project screen). Exports are
  plain text on purpose, so they are your recovery copy; store them somewhere
  you trust.
- If you are locked out, the unlock screen can save an *encrypted* backup of the
  current data (openable only with the original passphrase) and then clear this
  computer so you can start over from a plaintext export. Nothing is destroyed
  outright.
- The key derivation is a solid browser-grade defense, not a hardware security
  module. For most owners protecting a personal machine it is the right level;
  a determined, well-resourced attacker with unlimited time is out of scope.

## Turning it on and off

- **On:** Home screen → "Protect this computer" → choose a passphrase (entered
  twice) and confirm you understand it cannot be recovered.
- **Lock now:** Home screen → "Lock now". The app asks for the passphrase next
  time it opens.
- **Off:** Home screen → "Remove protection". Your projects are written back as
  plain text on this computer.
