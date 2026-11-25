# Accessibility and persistence review

Reviewed November 25, 2026. Phase 1 scope is the six implemented screens: Command Center, Threat Intelligence, CVE Watchtower, Daily Training, Research Notebook and Settings. Passing automation or reviewing screenshots is not a WCAG conformance certification.

## Completed automated checks

- The normal Chrome matrix uses 1280, 640 and 320 CSS-pixel widths, default axe rules with no excluded regions and page-overflow checks. Narrow navigation is also checked for internal horizontal overflow. A desktop 1280-pixel baseline narrowed to 640/320 exercises the layout associated with 200%/400% zoom, but this is **not an executed native browser-zoom session**. See [W3C reflow guidance](https://www.w3.org/WAI/WCAG22/Understanding/reflow).
- Forced-colors emulation runs all six screens at 1280 and 320, verifies the media query, keyboard focus outline, default axe rules and no horizontal page overflow. Chromium emulation is **not a Windows contrast-theme test**. See [Playwright media emulation](https://playwright.dev/docs/api/class-page#page-emulate-media).
- Keyboard coverage includes skip link, search shortcut, navigation heading focus, collapsed names/current-page semantics, form success feedback/focus retention and collapsed-desktop-to-mobile navigation labels.
- The clock is not a live region. Forms retain explicit names, progress has a minutes-based description, successes use polite status regions and errors use alerts. These assertions do not prove spoken output in a particular screen reader.

## Changes from this review

Forced-colors checks flagged the primary button's author color against the forced background. Explicit system colors now govern controls, fields, links, disabled states and focus. Active navigation gets a border/font-weight cue; no forced-color-adjust override disables the user's palette. Keyboard-mode focus tests use keyboard input before checking :focus-visible.

Agent visual inspection of captured emulation images exposed clipped neighboring navigation labels in the old horizontally scrolling mobile strip. Mobile navigation now wraps into two columns, including when the desktop sidebar had been collapsed. Native accessible names/current state are retained. The primary-button/control boundaries and focus ring were inspected in captured dark forced-color images; this is image review rather than a native desktop assistive-technology pass.

## Full application restart test

The normal browser suite now includes e2e/restart.spec.ts. It seeds a new temporary SQLite database, starts an actual production Next.js child process on 127.0.0.1:3101, performs same-origin writes and stops that process. It verifies the endpoint stops responding before launching a new PID against the same file. It then verifies:

- Article bookmark/read flags, completed daily objective and both preferences.
- The same unfinished study session and the stored source retry deadline.
- Edited notebook body, revision and normalized tag index.
- Watchlist/terms, scheduled review, saved vulnerability and cached CVE metadata.
- Identical saved briefing contents and identity.

After completing the session/review and archiving the briefing, it performs another whole-server restart and checks those completed/archived states and snapshot contents again. This tests application-process persistence after committed writes, not machine power loss, mid-transaction crashes, backup recovery or all possible datasets. Test-owned children and ports are cleaned up; the user's port 3000/database are not used. The regular suite still uses its separate fixture server on 3100. Browser fixtures place a provider cooldown on new CVE lookups to avoid accidental live queries.

## Native manual checks still pending

Windows Computer Use was initialized and the available apps inspected. Standard NVDA installation paths were absent. Before any app input or screen-reader launch, the helper stopped because it could not confidently determine the current browser URL for policy enforcement. Its exact outcome was: “Computer Use has been stopped for this turn because it could not determine the current browser URL on Windows with enough confidence to enforce policy.” No further Windows app input was issued, following the [Computer Use skill](C:/Users/Brian/.codex/plugins/cache/openai-bundled/computer-use/26.1120.50957/skills/computer-use/SKILL.md) and its [interruption guidance](C:/Users/Brian/.codex/plugins/cache/openai-bundled/computer-use/26.1120.50957/docs/guidance.md).

Consequently, **screen-reader spoken output, native browser zoom and native Windows contrast-theme operation have not been signed off**. Accessibility-tree/axe checks and headless image review must not be relabeled as these manual checks. GS-002 stays in progress.

## Isolated manual review kit

In the VS Code terminal:

    npm run build
    npm run test:a11y:manual

Open http://127.0.0.1:3102. The script creates synthetic data in a new temporary directory, overrides data/port only within that process, uses the existing loopback trust boundary, sets feed and provider cooldowns two days ahead and sets automatic refresh to 24 hours. It does not touch your personal database or change desktop/browser settings. Stop with Ctrl+C. Cooldowns are a review-session safeguard, not a permanent offline mode. The kit was smoke-tested: refresh left feed attempt times unchanged, a new CVE lookup returned 429 before networking, and preferences showed 1440 minutes.

Record browser/Windows/screen-reader versions, viewport/DPI, chosen contrast theme, actual announcement text and pass/fail observations for:

1. Enable an already-installed screen reader yourself. Tab to Skip to content and enter the main landmark; traverse headings/navigation and verify names/current-page/expanded states. Use the reader's normal browse/form modes. Microsoft's [Narrator command reference](https://support.microsoft.com/en-gb/accessibility/windows/narrator/appendix-b-narrator-keyboard-commands-and-touch-gestures) documents heading navigation and Speech Recap where supported.
2. In Daily Training, add a synthetic objective from the keyboard and check that its success is spoken without losing input focus. Check the minutes-based progress announcement, checkbox state and unfinished-session recovery controls.
3. In Notebook, verify title/tags/body labels, preview/summary expansion, note editing, success/conflict/error speech and link names. In Watchtower, check UNKNOWN/state labels, CVE details expansion and a blocked lookup error. Verify the timer does not produce continuous announcements.
4. Use the browser's actual zoom control at 200% and 400% across all six screens. Verify text and controls can be read/reached without content loss or two-dimensional scrolling; reset to the original zoom afterward. Also check open details, long titles/URLs and populated forms.
5. With a native Windows contrast theme, check active/current navigation, focused/disabled buttons, links, input borders, checkbox state and progress in light and dark variants. Restore the prior theme afterward.

No credentials, privileged installation, public deployment or security relaxation is required. Record any actual barrier instead of marking an unchecked item passed. Backup/restore and final release security review remain separate tasks.
