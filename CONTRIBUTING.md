# Contributing to ATOMburn

Thank you for helping improve ATOMburn. Contributions are welcome through
GitHub issues and pull requests.

## Before opening a pull request

- Keep production code and assets original or clearly licensed for reuse.
- Do not add copied source, binaries, fonts, artwork, or documentation without
  recording the exact source, version, license, and required notices.
- Do not add upstream application checkouts to this repository. Link to the
  official repository in `docs/QUELLEN.md` instead.
- Do not add GPL, AGPL, CC-NC, or unknown-license runtime material without an
  explicit license review.
- Run `pnpm lint`, `pnpm typecheck`, `pnpm test:unit`, and
  `pnpm licenses:generate` before submitting a change.

## Safety

ATOMburn can control a Class 4 laser. Software tests are not a substitute for
physical supervision, guarding, ventilation, or an accessible emergency stop.
Never use a pull request or automated test to bypass a safety gate.

## Licensing contributions

By submitting a contribution, you confirm that you have the right to submit
it and agree that it may be distributed under the MIT License in `LICENSE`.
Third-party material remains under its own license and must be identified in
`THIRD_PARTY_NOTICES.md`.
