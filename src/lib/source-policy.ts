// Reviewed primary publisher material on 2026-11-25. A review is not a reuse license.
export const sourcePolicies = [
  {
    id: "sans",
    name: "SANS Internet Storm Center",
    minRefreshMinutes: 60,
    policyUrl: "https://isc.sans.edu/feeds_doc.html",
    attribution:
      "SANS Technology Institute, Internet Storm Center, https://isc.sans.edu",
    scope:
      "Hourly floor conservatively follows the static-data-feed guidance; its application to diary RSS is an app choice. Attribution retained; no resale or public republication is authorized by this app.",
  },
  {
    id: "krebs",
    name: "KrebsOnSecurity",
    minRefreshMinutes: 15,
    policyUrl: "https://krebsonsecurity.com/robots.txt",
    attribution: "© Krebs on Security — https://krebsonsecurity.com/",
    scope:
      "Publisher advertises RSS; robots requests a 35-second crawl delay. App uses 15 minutes. No broader reuse license or feed-specific quota was found; private RSS reading only.",
  },
  {
    id: "bleeping",
    name: "BleepingComputer",
    minRefreshMinutes: 15,
    policyUrl: "https://www.bleepingcomputer.com/terms-of-use/",
    attribution: "© Bleeping Computer LLC — https://www.bleepingcomputer.com/",
    scope:
      "Official RSS for personal, non-commercial reading. Terms restrict redistribution and require retained notices. No published feed quota found; app uses 15 minutes, above robots' one-second generic delay.",
  },
  {
    id: "cisa",
    name: "CISA KEV",
    minRefreshMinutes: 15,
    policyUrl: "https://github.com/cisagov/kev-data/blob/develop/LICENSE",
    attribution:
      "CISA Known Exploited Vulnerabilities catalog — https://www.cisa.gov/known-exploited-vulnerabilities-catalog",
    scope:
      "Official KEV data license is CC0; linked third-party material has its own terms. No endorsement or logo rights. No feed-specific numeric quota verified; 15 minutes is an app floor.",
  },
] as const;
export function feedMinimumMs(id: string) {
  return (
    (sourcePolicies.find((policy) => policy.id === id)?.minRefreshMinutes ??
      15) * 60000
  );
}
