"use client";
import { RetentionPanel } from "./retention-panel";
import { WatchlistPanel } from "./watchlist-panel";
import { ReviewPanel } from "./review-panel";
import { NotebookPanel } from "./notebook-panel";
import { BriefingPanel } from "./briefing-panel";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bookmark,
  Check,
  ChevronRight,
  Clock3,
  FileText,
  LayoutDashboard,
  Menu,
  Play,
  Radio,
  RefreshCw,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  Square,
  Target,
  X,
} from "lucide-react";
import { brand } from "@/lib/brand";
import type { workspace } from "@/services/workspace";
type Data = Awaited<ReturnType<typeof workspace>>;
const nav = [
  { title: "Command Center", icon: LayoutDashboard },
  { title: "Threat Intelligence", icon: Radio },
  { title: "CVE Watchtower", icon: ShieldAlert },
  { title: "Daily Training", icon: Target },
  { title: "Research Notebook", icon: FileText },
  { title: "Settings", icon: Settings },
];
const planned = [
  "ThreatLens",
  "Web Security Academy",
  "SOC Simulator",
  "VulnLab",
  "PhishGuard",
  "LLM Sentinel",
  "CyberRecall",
  "Analytics",
];
function localDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function stamp(value: string | null) {
  return value ? new Date(value).toLocaleString() : "Not available";
}
export function Dashboard() {
  const [page, setPage] = useState("Command Center");
  const previousPage = useRef(page);
  const [collapsed, setCollapsed] = useState(false);
  const [data, setData] = useState<Data>();
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("");
  const [category, setCategory] = useState("");
  const [saved, setSaved] = useState(false);
  const [watchlistId, setWatchlistId] = useState("");
  const [articlePage, setArticlePage] = useState(1);
  const [publishedFrom, setPublishedFrom] = useState("");
  const [publishedTo, setPublishedTo] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState<Date>();
  const trainingDay = localDay(now);
  const [announcement, setAnnouncement] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const loadVersion = useRef(0);
  const load = useCallback(async () => {
    const version = ++loadVersion.current;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: query,
        source,
        category,
        saved: String(saved),
        watchlist: watchlistId,
        day: trainingDay,
        page: String(articlePage),
        from: publishedFrom,
        to: publishedTo,
      });
      const response = await fetch(`/api/workspace?${params}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      if (version === loadVersion.current) {
        setData(body);
        setError("");
      }
    } catch (e) {
      if (version === loadVersion.current)
        setError(e instanceof Error ? e.message : "Could not load workspace");
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  }, [
    query,
    source,
    category,
    saved,
    articlePage,
    publishedFrom,
    publishedTo,
    watchlistId,
    trainingDay,
  ]);
  const mutate = useCallback(
    async (body: Record<string, unknown>) => {
      setPending(true);
      setError("");
      setAnnouncement("");
      try {
        const response = await fetch("/api/workspace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        await load();
        const messages: Record<string, string> = {
          refresh: "Source refresh finished. Check source status for results.",
          article: "Article updated.",
          task: "Study objective added.",
          "toggle-task": "Study objective updated.",
          start: "Study session started.",
          stop: "Study session stopped.",
          note: "Research note saved.",
          settings: "Preferences saved.",
        };
        setAnnouncement(messages[String(body.action)] ?? "Changes saved.");
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Action failed");
        return false;
      } finally {
        setPending(false);
      }
    },
    [load],
  );
  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 250);
    return () => clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    const updateClock = () => setNow(new Date());
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    function shortcut(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        search.current?.focus();
      }
    }
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  const interval = data?.settings?.refreshMinutes ?? 60;
  useEffect(() => {
    const timer = setInterval(() => {
      void mutate({ action: "refresh" });
    }, interval * 60000);
    return () => clearInterval(timer);
  }, [interval, mutate]);
  useEffect(() => {
    const refresh = () => {
      setNow(new Date());
      void load();
    };
    const visible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", visible);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [load]);
  const active = data?.sessions.find((s) => !s.endedAt);
  const studyMinutes = data?.studyMinutes ?? 0;
  const currentChecklist =
    !data?.trainingDay || data.trainingDay === trainingDay
      ? data?.checklist
      : [];
  const goal = (data?.settings?.weeklyHours ?? 15) * 60;
  const changePage = (title: string) => {
    setPage(title);
    setQuery("");
    setSource("");
    setCategory("");
    setSaved(false);
    setWatchlistId("");
    setArticlePage(1);
    setPublishedFrom("");
    setPublishedTo("");
    setAnnouncement("");
  };
  useEffect(() => {
    if (previousPage.current !== page) heading.current?.focus();
    previousPage.current = page;
  }, [page]);
  const feedPanel = (
    <section className="panel feed-panel" aria-busy={loading}>
      <div className="panel-heading">
        <div>
          <span className="eyebrow">INTELLIGENCE FEED</span>
          <h2>
            {page === "Command Center"
              ? "On your radar"
              : "Threat Intelligence"}
          </h2>
        </div>
        <span className="muted">{data?.counts.total ?? 0} stored articles</span>
      </div>
      <div className="filters">
        <select
          aria-label="Filter source"
          value={source}
          onChange={(e) => {
            setSource(e.target.value);
            setArticlePage(1);
          }}
        >
          <option value="">All sources</option>
          {data?.sources
            .filter((s) => s.id !== "cisa")
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
        </select>
        <select
          aria-label="Filter category"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setArticlePage(1);
          }}
        >
          <option value="">All categories</option>
          {[
            "Ransomware",
            "Phishing",
            "Malware",
            "Data breach",
            "Vulnerability",
            "AI security",
            "Threat intelligence",
          ].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <button
          aria-pressed={saved}
          className={saved ? "selected" : ""}
          onClick={() => {
            setSaved(!saved);
            setArticlePage(1);
          }}
        >
          <Bookmark size={15} /> Saved
        </button>
        <select
          aria-label="Filter watchlist"
          value={watchlistId}
          onChange={(event) => {
            setWatchlistId(event.target.value);
            setArticlePage(1);
          }}
        >
          <option value="">All watchlists</option>
          {data?.watchlists?.map((list) => (
            <option key={list.id} value={list.id}>
              {list.name}
            </option>
          ))}
        </select>
        <label className="date-filter">
          Published from (UTC)
          <input
            type="date"
            value={publishedFrom}
            max={publishedTo || undefined}
            onChange={(e) => {
              setPublishedFrom(e.target.value);
              setArticlePage(1);
            }}
          />
        </label>
        <label className="date-filter">
          Published through (UTC)
          <input
            type="date"
            value={publishedTo}
            min={publishedFrom || undefined}
            onChange={(e) => {
              setPublishedTo(e.target.value);
              setArticlePage(1);
            }}
          />
        </label>
        <button
          disabled={
            !source &&
            !category &&
            !saved &&
            !watchlistId &&
            !publishedFrom &&
            !publishedTo &&
            !query
          }
          onClick={() => {
            setSource("");
            setCategory("");
            setSaved(false);
            setWatchlistId("");
            setPublishedFrom("");
            setPublishedTo("");
            setQuery("");
            setArticlePage(1);
          }}
        >
          Clear filters
        </button>
        {page === "Threat Intelligence" && (
          <a className="manage-watchlists" href="#watchlists-title">
            Manage watchlists
          </a>
        )}
      </div>
      {(publishedFrom || publishedTo) && (
        <p className="small muted">
          Filters use publication dates in UTC, including both selected days.
          Articles without publication dates are excluded.
        </p>
      )}
      {!data?.items.length ? (
        <div className="empty">
          <Radio />
          <h3>No intelligence in this view yet</h3>
          <p>
            Refresh public sources to collect article metadata, or adjust your
            filters.
          </p>
          <button
            disabled={pending}
            onClick={() => void mutate({ action: "refresh" })}
          >
            Refresh sources
          </button>
        </div>
      ) : (
        data.items.map((item) => (
          <article
            className={`article ${item.read ? "is-read" : ""}`}
            key={item.id}
          >
            <div className="article-top">
              <span className="tag">{item.category}</span>
              <span>
                {data.sources.find((s) => s.id === item.sourceId)?.name}
              </span>
            </div>
            <h3>
              <a href={item.url} target="_blank" rel="noopener noreferrer">
                {item.title}
              </a>
            </h3>
            <p>
              {item.summary.slice(0, 230)}
              {item.summary.length > 230 ? "…" : ""}
            </p>
            {!!item.matchedTerms?.length && (
              <p className="small">
                Matched watchlist terms: {item.matchedTerms.join(" · ")}
              </p>
            )}
            {!!item.cveMentions?.length && (
              <div className="cve-mentions">
                <p className="small muted">
                  CVE mentions in source metadata; record existence and article
                  claims are not verified.
                </p>
                <ul>
                  {item.cveMentions.map((cve) => (
                    <li key={cve.id}>
                      <a
                        href={`https://www.cve.org/CVERecord?id=${cve.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {cve.id}
                      </a>
                      {cve.inKev && (
                        <span className="tag warning">
                          Listed in local CISA KEV
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="article-footer">
              <span title={`Ingested: ${stamp(item.ingestedAt)}`}>
                Published {stamp(item.publishedAt)}
              </span>
              <div>
                <button
                  aria-label={
                    item.bookmarked ? "Remove bookmark" : "Bookmark article"
                  }
                  aria-pressed={item.bookmarked}
                  disabled={pending}
                  onClick={() =>
                    void mutate({
                      action: "article",
                      id: item.id,
                      bookmarked: !item.bookmarked,
                    })
                  }
                >
                  <Bookmark
                    size={16}
                    fill={item.bookmarked ? "currentColor" : "none"}
                  />
                </button>
                <button
                  disabled={pending}
                  onClick={() =>
                    void mutate({
                      action: "article",
                      id: item.id,
                      read: !item.read,
                    })
                  }
                >
                  {item.read ? <Check size={14} /> : null}
                  {item.read ? "Read" : "Mark read"}
                </button>
              </div>
            </div>
          </article>
        ))
      )}
      {data?.pagination && (
        <nav className="pagination" aria-label="Article pages">
          <button
            disabled={loading || pending || data.pagination.page <= 1}
            onClick={() => {
              setLoading(true);
              setArticlePage(data.pagination.page - 1);
            }}
          >
            Previous articles
          </button>
          <span role="status" aria-live="polite">
            {data.pagination.from}–{data.pagination.to} of{" "}
            {data.pagination.total} matching articles · Page{" "}
            {data.pagination.page} of {data.pagination.totalPages}
          </span>
          <button
            disabled={
              loading ||
              pending ||
              data.pagination.page >= data.pagination.totalPages
            }
            onClick={() => {
              setLoading(true);
              setArticlePage(data.pagination.page + 1);
            }}
          >
            Next articles
          </button>
        </nav>
      )}
    </section>
  );
  const trainingPanel = (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">BUILD DEFENSIVE DISCIPLINE</span>
          <h2>Today’s training</h2>
        </div>
        <Target className="accent" size={20} />
      </div>
      <p className="muted">
        Your plan for{" "}
        {now?.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }) ?? "today"}
      </p>
      <div className="checklist">
        {!currentChecklist?.length && (
          <p className="muted">A focused session starts with one objective.</p>
        )}
        {currentChecklist?.map((task) => (
          <label key={task.id}>
            <input
              type="checkbox"
              checked={task.done}
              disabled={pending}
              onChange={(e) =>
                void mutate({
                  action: "toggle-task",
                  id: task.id,
                  done: e.target.checked,
                })
              }
            />
            <span className={task.done ? "done" : ""}>{task.title}</span>
          </label>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          void mutate({
            action: "task",
            title: new FormData(form).get("title"),
            day: localDay(),
          }).then((ok) => {
            if (ok) form.reset();
          });
        }}
      >
        <label className="sr-only" htmlFor="task-title">
          New study objective
        </label>
        <div className="input-row">
          <input
            id="task-title"
            name="title"
            placeholder="Add a study objective…"
            required
            maxLength={200}
          />
          <button type="submit" disabled={pending}>
            Add
          </button>
        </div>
      </form>
      <div className="session">
        <div>
          <Clock3 size={17} />
          <span>
            {active
              ? `${Math.max(0, Math.floor(((now?.getTime() ?? Date.parse(active.startedAt)) - Date.parse(active.startedAt)) / 60000))} min · Session active`
              : "Ready for a focused session?"}
          </span>
        </div>
        <button
          className="primary"
          disabled={pending}
          onClick={() =>
            void mutate(
              active ? { action: "stop", id: active.id } : { action: "start" },
            )
          }
        >
          {active ? <Square size={15} /> : <Play size={15} />}
          {active ? "Stop session" : "Start session"}
        </button>
      </div>
      {active && (
        <div>
          <p className="small muted">
            Unfinished session started {stamp(active.startedAt)}. It survives
            reloads, app restarts and midnight. Elapsed time includes time away;
            only completed time counts toward your goal.
          </p>
          <details key={active.id}>
            <summary>Recover a forgotten session</summary>
            <p>
              Record when you actually finished. This ends the existing session
              and preserves its start time.
            </p>
            <form
              className="stack"
              onSubmit={(event) => {
                event.preventDefault();
                const value = String(
                  new FormData(event.currentTarget).get("endedAt"),
                );
                const end = new Date(value);
                if (!Number.isFinite(end.getTime())) return;
                void mutate({
                  action: "stop",
                  id: active.id,
                  endedAt: end.toISOString(),
                });
              }}
            >
              <label>
                Actual session end (local time)
                <input
                  name="endedAt"
                  type="datetime-local"
                  step="any"
                  required
                  disabled={pending}
                />
              </label>
              <button disabled={pending}>Finish recovered session</button>
            </form>
          </details>
        </div>
      )}
      <div className="progress-label">
        <span>Last 7 days</span>
        <strong>
          {studyMinutes} / {goal} min
        </strong>
      </div>
      <progress
        aria-label="Completed study minutes toward weekly goal"
        aria-valuetext={`${studyMinutes} of ${goal} minutes`}
        value={studyMinutes}
        max={goal}
      />
      <p className="small muted">
        Completed time overlapping the last seven days. Weekly goal:{" "}
        {data?.settings?.weeklyHours ?? 15} hours.
      </p>
    </section>
  );
  return (
    <div className={`workspace ${collapsed ? "collapsed" : ""}`}>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <div className="brand">
          <Shield size={32} strokeWidth={1.6} />
          {!collapsed && (
            <div>
              {brand.wordmark}
              <span>DEFENSIVE INTELLIGENCE</span>
            </div>
          )}
        </div>
        <button
          className="nav-toggle"
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
          aria-expanded={!collapsed}
          aria-controls="main-navigation"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <Menu size={18} /> : <X size={18} />}
        </button>
        <div className="nav-label">WORKSPACE</div>
        <nav id="main-navigation" aria-label="Main navigation">
          {nav.map((item) => (
            <button
              key={item.title}
              aria-label={item.title}
              className={page === item.title ? "active" : ""}
              title={collapsed ? item.title : undefined}
              aria-current={page === item.title ? "page" : undefined}
              onClick={() => changePage(item.title)}
            >
              <item.icon size={19} />
              {!collapsed && item.title}
              {!collapsed && page === item.title && (
                <span className="nav-dot" />
              )}
            </button>
          ))}
        </nav>
        {!collapsed && (
          <>
            <div className="nav-label planned-label">ON THE ROADMAP</div>
            <div className="planned">
              {planned.map((name) => (
                <div key={name}>
                  <span>{name}</span>
                  <span className="small">Planned</span>
                </div>
              ))}
            </div>
            <div className="sidebar-foot">
              <Shield size={18} />
              <div>
                Local workspace<span>Single user · No AI required</span>
              </div>
            </div>
          </>
        )}
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <ChevronRight size={14} />
            <span>{page}</span>
          </div>
          <div className="search-box">
            <Search size={17} />
            <input
              ref={search}
              aria-label="Search workspace"
              placeholder="Search intelligence, CVEs, notes…"
              value={query}
              maxLength={200}
              onChange={(e) => {
                setQuery(e.target.value);
                setArticlePage(1);
              }}
            />
            <kbd>Ctrl K</kbd>
          </div>
          <span className="local-label">
            <Shield size={14} /> LOCAL ONLY
          </span>
        </header>
        <main id="main" tabIndex={-1}>
          <p
            className="sr-only"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {announcement}
          </p>
          <div className="page-heading">
            <div>
              <div className="eyebrow">YOUR DEFENSIVE ADVANTAGE</div>
              <h1 ref={heading} tabIndex={-1}>
                {page}
              </h1>
              <p>
                {page === "Command Center"
                  ? brand.tagline
                  : page === "Threat Intelligence"
                    ? "Signals that matter. Context you can act on."
                    : page === "CVE Watchtower"
                      ? "Known exploitation, with evidence from CISA."
                      : page === "Daily Training"
                        ? "Small, deliberate steps. Stronger defenses."
                        : page === "Research Notebook"
                          ? "Turn your investigations into lasting knowledge."
                          : "Make this workspace your own."}
              </p>
            </div>
            <div className="heading-actions">
              <span className="date">
                {now?.toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                }) ?? "Local time"}
                <small>{now?.toLocaleTimeString() ?? "—"}</small>
              </span>
              <button
                disabled={pending}
                onClick={() => void mutate({ action: "refresh" })}
              >
                <RefreshCw size={16} className={pending ? "spin" : ""} />
                {pending ? "Working…" : "Refresh sources"}
              </button>
            </div>
          </div>
          {error && (
            <div role="alert" className="error">
              {error}
              <button onClick={() => void load()}>Retry</button>
            </div>
          )}
          {loading && <p role="status">Loading your workspace…</p>}
          {page === "Command Center" && (
            <>
              <div className="metrics">
                <div>
                  <Radio />
                  <span>Intelligence collected</span>
                  <strong>{data?.counts.total ?? "—"}</strong>
                  <small>Persisted article metadata</small>
                </div>
                <div>
                  <ShieldAlert />
                  <span>Known exploited CVEs</span>
                  <strong>{data?.counts.kev ?? "—"}</strong>
                  <small>CISA catalog · Not your exposure</small>
                </div>
                <div>
                  <Bookmark />
                  <span>Saved investigations</span>
                  <strong>{data?.counts.bookmarks ?? "—"}</strong>
                  <small>Bookmarked intelligence</small>
                </div>
                <div>
                  <Clock3 />
                  <span>Study time · Last 7 days</span>
                  <strong>
                    {studyMinutes}
                    <em> min</em>
                  </strong>
                  <small>
                    {currentChecklist?.filter((t) => t.done).length ?? 0}{" "}
                    objectives completed today
                  </small>
                </div>
              </div>
              <BriefingPanel
                key={now ? now.toLocaleDateString() : "initial"}
                day={
                  now
                    ? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
                    : ""
                }
                onTraining={() => changePage("Daily Training")}
              />
              <div className="content-grid">
                <div>{feedPanel}</div>
                <div className="right-column">
                  {trainingPanel}
                  <section className="panel">
                    <span className="eyebrow">SOURCE STATUS</span>
                    <h2>Trust, with provenance</h2>
                    {!data?.sources.length && (
                      <p className="muted">Sources have not been refreshed.</p>
                    )}
                    {data?.sources.map((s) => (
                      <div className="source-status" key={s.id}>
                        <div>
                          <span
                            className={
                              s.error
                                ? "health-error"
                                : s.lastSuccess
                                  ? "health-ok"
                                  : "muted"
                            }
                          >
                            ●
                          </span>{" "}
                          {s.name}
                          <small>
                            {s.error ?? `Last success: ${stamp(s.lastSuccess)}`}
                          </small>
                          {s.error && s.nextAttemptAt && (
                            <small>
                              Retry eligible: {stamp(s.nextAttemptAt)} ·{" "}
                              {s.consecutiveFailures} consecutive failures
                            </small>
                          )}
                        </div>
                      </div>
                    ))}
                  </section>
                </div>
              </div>
            </>
          )}
          {page === "Threat Intelligence" && (
            <div className="intelligence-layout">
              {feedPanel}
              <WatchlistPanel
                lists={data?.watchlists ?? []}
                onChange={async (deletedId) => {
                  if (deletedId && watchlistId === deletedId) {
                    setWatchlistId("");
                    setArticlePage(1);
                  } else if (articlePage !== 1) {
                    setArticlePage(1);
                  } else await load();
                }}
              />
            </div>
          )}
          {page === "CVE Watchtower" && (
            <section className="panel">
              <div className="panel-heading">
                <h2>Known Exploited Vulnerabilities</h2>
                <span className="tag">CISA KEV</span>
              </div>
              <p className="muted">
                Search by CVE, vendor, or product above. Inclusion indicates
                evidence of exploitation; your specific exposure is unknown.
                CVSS and EPSS are not yet integrated.
              </p>
              {!data?.kevs.length && (
                <div className="empty">
                  <ShieldAlert />
                  <h3>No matching vulnerabilities</h3>
                  <p>
                    Refresh sources to ingest the CISA catalog, or change your
                    search.
                  </p>
                </div>
              )}
              {data?.kevs.map((v) => (
                <article className="article" key={v.id}>
                  <div className="article-top">
                    <a
                      className="accent mono"
                      target="_blank"
                      rel="noopener noreferrer"
                      href={`https://www.cve.org/CVERecord?id=${v.id}`}
                    >
                      {v.id}
                    </a>
                    <span className="tag warning">Known exploited</span>
                  </div>
                  <h3>{v.name}</h3>
                  <p>{v.description}</p>
                  <p>
                    <strong>Required action:</strong> {v.action}
                  </p>
                  <div className="small muted">
                    {v.vendor} · {v.product} · Added {v.addedAt} · CISA due date{" "}
                    {v.dueDate}
                  </div>
                  <p className="small muted">
                    CISA due dates apply to covered US federal agencies.
                    Ingested {stamp(v.ingestedAt)}.{" "}
                    <a
                      href="https://www.cisa.gov/known-exploited-vulnerabilities-catalog"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Original catalog
                    </a>
                  </p>
                </article>
              ))}
            </section>
          )}
          {page === "Daily Training" && (
            <div className="training-layout">
              <ReviewPanel day={trainingDay} />
              {trainingPanel}
              <section className="panel">
                <h2>Session history</h2>
                <p className="muted">
                  Up to 1,000 sessions: unfinished sessions first, then
                  completed sessions overlapping the last seven days.
                </p>
                {!data?.sessions.length && (
                  <p className="empty">Your first session starts here.</p>
                )}
                {data?.sessions.map((s) => (
                  <div className="source-status" key={s.id}>
                    {stamp(s.startedAt)}
                    <small>
                      {s.endedAt
                        ? `${Math.floor((Date.parse(s.endedAt) - Date.parse(s.startedAt)) / 60000)} minutes · Completed`
                        : "Active session"}
                    </small>
                  </div>
                ))}
              </section>
            </div>
          )}
          {page === "Research Notebook" && <NotebookPanel query={query} />}
          {page === "Settings" && (
            <section className="panel settings-panel">
              <h2>Workspace preferences</h2>
              <form
                key={`${data?.settings?.weeklyHours}-${data?.settings?.refreshMinutes}`}
                className="stack"
                onSubmit={(e) => {
                  e.preventDefault();
                  const values = new FormData(e.currentTarget);
                  void mutate({
                    action: "settings",
                    weeklyHours: Number(values.get("hours")),
                    refreshMinutes: Number(values.get("refresh")),
                  });
                }}
              >
                <label>
                  Weekly study goal (hours)
                  <input
                    name="hours"
                    type="number"
                    min={1}
                    max={100}
                    required
                    defaultValue={data?.settings?.weeklyHours ?? 15}
                  />
                </label>
                <label>
                  Automatic refresh interval (minutes)
                  <input
                    name="refresh"
                    type="number"
                    min={15}
                    max={1440}
                    required
                    defaultValue={data?.settings?.refreshMinutes ?? 60}
                  />
                </label>
                <p className="muted">
                  Refresh runs while this workspace is open. Each source has a
                  minimum 15-minute cooldown, including failed attempts.
                </p>
                <button className="primary" disabled={pending}>
                  Save preferences
                </button>
              </form>
              <hr />
              <RetentionPanel onChange={load} />
              <hr />
              <h3>Local by design</h3>
              <p className="muted">
                No AI provider is connected. Data stays in your local SQLite
                database. Sources receive network requests only when refreshing.
                This application must remain bound to localhost.
              </p>
            </section>
          )}
          <footer>
            <span>
              <Shield size={13} />
              {brand.name} · Personal defensive intelligence
            </span>
            <span>Source-backed data. Human-led decisions.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
