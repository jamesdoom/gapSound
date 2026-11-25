# Accessibility review

## Scope

The Phase 1 review covers the six implemented screens: Command Center, Threat Intelligence, CVE Watchtower, Daily Training, Research Notebook and Settings. `e2e/accessibility.spec.ts` runs axe with its default rules (no disabled rules or excluded regions) at 1280px and 320px widths. Every view is checked for horizontal page overflow. Keyboard tests cover the skip link, search shortcut, collapsed navigation names, heading focus and action feedback. Existing workflow tests cover forms and retention confirmation.

## Changes

- Fixed the hidden sidebar toggle: its former collapse class collided with a Tailwind utility.
- Navigation moves focus to the new page heading; the initial page does not steal focus.
- The skip link targets a focusable main landmark.
- Collapsed navigation retains explicit accessible names and announces expanded state on its control.
- The study progress bar has an accessible label and a minutes-based value description.
- Successful mutations announce short results through a persistent polite live region. Errors keep their alert semantics. The updating clock is not a live region.
- Keyboard focus has an explicit visible outline. Operational metadata and filter controls use scalable 14px-equivalent text instead of tiny labels.

## Limits

Automated scans cover only rendered fixture states in Chrome. They do not establish WCAG conformance. Real assistive-technology sessions with NVDA/VoiceOver, high-contrast/forced-colors mode, browser zoom and larger real-world datasets still need review. An element's accessible name and focus can be tested without proving that every screen reader announces it well. Database process-restart testing remains a separate backlog item. No authentication or security boundary was relaxed for accessibility testing.

Run `npm run build` then `npm run test:e2e`. Tests use port 3100 and a fresh temporary database; normal local development stays on port 3000. See README.md for browser installation and Chrome selection.
