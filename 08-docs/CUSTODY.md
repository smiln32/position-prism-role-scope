# Data custody — the per-engagement protocol

_Added 2026-07-17 (owner-approved; see DECISIONS.md). This is the operating
procedure for a service engagement: the operator runs Successor on their own
computer, delivers the results to the client, and keeps nothing readable.
Written for the operator; share the relevant parts with the client._

The promise being kept: **the client's knowledge ends up in the client's
hands, and nothing readable stays behind.**

## The protocol

1. **Before entering any client data: turn on "Protect this computer"**
   (home screen). Everything stored on this machine — including the app's
   automatic backup copy — is then encrypted from day one. The passphrase
   lives only in your head; a forgotten passphrase is unrecoverable by
   design (see SECURITY.md).

2. **Do the engagement.** Interviews, documents, structuring, reports.

3. **Export to the delivery drive(s):** the project file ("Export this
   project") and the generated documents. **Two copies** — two drives, or a
   drive plus a printed package. One drive is a single point of failure.

4. **Verify before you delete.** Restore the exported file on-screen
   ("Restore from a project file") and confirm it opens complete. Never
   delete against an unverified copy.

5. **Delete the project in the app** ("Delete from this computer…" on the
   project's card). The app names what is being deleted, warns that it
   removes the working copy AND its automatic backup, and stays disabled
   until you attest that a verified exported copy exists. This is
   deliberate friction — deleting against an unverified copy is how
   knowledge is lost for good.

## Honest limits

- **App-level deletion is not forensic erasure.** Browser storage may leave
  fragments on disk until overwritten. This is why step 1 is first: with
  the vault on, any residue is ciphertext, unreadable without the
  passphrase. Step 1 skipped = this guarantee gone.
- **The exported project file is plain text on purpose** (the owner must
  always be able to read their own knowledge; SECURITY.md). That makes the
  drive the weak point:
  - Either hand the drive to the client as **theirs to guard** on their
    premises — their data, their custody; or
  - Use an **encrypted drive** (BitLocker To Go, or a hardware-encrypted
    stick) and give the client the password separately from the drive.
  - For a paid engagement, prefer the encrypted drive.

## The keep-nothing question (engagement letter)

Whether the operator retains anything after delivery is a term of the
engagement letter, not a default:

- **Keep nothing** — the cleaner promise and the better sales line.
- **Keep an encrypted copy** — makes re-engagement easy ("update the
  bookkeeper's handbook next year"), but must be disclosed and agreed in
  writing before the engagement starts.

Either is legitimate. Deciding silently is not.
