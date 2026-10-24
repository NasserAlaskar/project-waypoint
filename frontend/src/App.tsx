import {
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ArrowDownUp,
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  ExternalLink,
  Filter,
  LayoutDashboard,
  LoaderCircle,
  MapPin,
  Menu,
  Plus,
  Search,
  Sparkles,
  Target,
  Trash2,
  X,
} from "lucide-react";
import {
  api,
  type Application,
  type ApplicationInput,
  type Dashboard,
  type Status,
  type WorkMode,
} from "./api";

const statuses: Status[] = ["Applied", "Screening", "Interview", "Offer", "Rejected"];
const statusStyles: Record<Status, string> = {
  Applied: "status-applied",
  Screening: "status-screening",
  Interview: "status-interview",
  Offer: "status-offer",
  Rejected: "status-rejected",
};

const emptyDashboard: Dashboard = {
  total: 0,
  interviews: 0,
  offers: 0,
  response_rate: 0,
  stage_counts: { Applied: 0, Screening: 0, Interview: 0, Offer: 0, Rejected: 0 },
};

const blankForm = (): ApplicationInput => ({
  company: "",
  role: "",
  location: "",
  work_mode: "Remote",
  status: "Applied",
  applied_on: new Date().toISOString().slice(0, 10),
  salary: "",
  job_url: "",
  notes: "",
});

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function App() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [dashboard, setDashboard] = useState<Dashboard>(emptyDashboard);
  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState("All applications");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<ApplicationInput>(blankForm);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const refresh = useCallback(async () => {
    setError("");
    try {
      const [rows, stats] = await Promise.all([
        api.listApplications(),
        api.getDashboard(),
      ]);
      setApplications(rows);
      setDashboard(stats);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not load your applications.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 2800);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const filteredApplications = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return applications.filter((application) => {
      const matchesStatus =
        activeStatus === "All applications" || application.status === activeStatus;
      const matchesSearch =
        !normalizedSearch ||
        `${application.company} ${application.role} ${application.location}`
          .toLowerCase()
          .includes(normalizedSearch);
      return matchesStatus && matchesSearch;
    });
  }, [activeStatus, applications, search]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      await api.createApplication(form);
      setModalOpen(false);
      setForm(blankForm());
      setNotice("Application added to your board");
      await refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(application: Application, status: Status) {
    try {
      await api.updateApplication(application.id, { status });
      setNotice(`${application.company} moved to ${status}`);
      await refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not update.");
    }
  }

  async function handleDelete(application: Application) {
    if (!window.confirm(`Remove ${application.company} from your application tracker?`))
      return;
    try {
      await api.deleteApplication(application.id);
      setNotice("Application removed");
      await refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not delete.");
    }
  }

  const stageItems: { label: Status; tone: string }[] = [
    { label: "Applied", tone: "stage-bar-applied" },
    { label: "Screening", tone: "stage-bar-screening" },
    { label: "Interview", tone: "stage-bar-interview" },
    { label: "Offer", tone: "stage-bar-offer" },
    { label: "Rejected", tone: "stage-bar-rejected" },
  ];

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? "sidebar-open" : ""}`}>
        <a className="brand" href="#" aria-label="Waypoint home">
          <span className="brand-mark"><Target size={19} strokeWidth={2.2} /></span>
          <span>waypoint<span className="brand-period">.</span></span>
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          <a className="nav-item nav-active" href="#dashboard" onClick={() => setMobileNavOpen(false)}>
            <LayoutDashboard size={18} /> Overview
          </a>
          <a className="nav-item" href="#applications" onClick={() => setMobileNavOpen(false)}>
            <BriefcaseBusiness size={18} /> Applications
            <span className="nav-count">{dashboard.total}</span>
          </a>
        </nav>
        <div className="sidebar-divider" />
        <div className="workspace-label">YOUR PIPELINE</div>
        <div className="pipeline-nav">
          {statuses.map((status) => (
            <button
              className={`pipeline-link ${activeStatus === status ? "pipeline-selected" : ""}`}
              key={status}
              onClick={() => {
                setActiveStatus(activeStatus === status ? "All applications" : status);
                document.querySelector("#applications")?.scrollIntoView({ behavior: "smooth" });
                setMobileNavOpen(false);
              }}
            >
              <span className={`pipeline-dot ${statusStyles[status]}`} />
              {status}
              <span className="pipeline-count">{dashboard.stage_counts[status]}</span>
            </button>
          ))}
        </div>
        <div className="sidebar-bottom">
          <div className="focus-card">
            <div className="focus-icon"><Sparkles size={16} /></div>
            <div className="focus-title">A little momentum</div>
            <p>Small, consistent steps add up. You’ve got this.</p>
            <div className="focus-progress"><span style={{ width: `${Math.min(dashboard.total * 8, 100)}%` }} /></div>
            <div className="focus-caption">{dashboard.total} steps on the board</div>
          </div>
          <button className="help-link"><CircleHelp size={16} /> Help & feedback</button>
          <div className="profile-row">
            <div className="avatar">Y</div>
            <div className="profile-copy"><strong>Your workspace</strong><span>Personal plan</span></div>
            <ChevronDown size={16} className="profile-chevron" />
          </div>
        </div>
      </aside>

      <main className="main-content" id="dashboard">
        <header className="topbar">
          <button
            className="mobile-menu icon-button"
            aria-label="Toggle navigation"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
          ><Menu size={19} /></button>
          <div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-slash">/</span><strong>Overview</strong></div>
          <div className="topbar-right">
            <span className="today-label"><CalendarDays size={15} /> {new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric" }).format(new Date())}</span>
            <button className="topbar-avatar" aria-label="Your profile">Y</button>
          </div>
        </header>

        <div className="page-wrap">
          <section className="welcome-row">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" /> YOUR CAREER, IN MOTION</div>
              <h1>Make your next move<span className="heading-period">.</span></h1>
              <p className="welcome-copy">A clearer view of your search, one opportunity at a time.</p>
            </div>
            <button className="primary-button" onClick={() => { setForm(blankForm()); setModalOpen(true); }}>
              <Plus size={17} strokeWidth={2.5} /> Add application
            </button>
          </section>

          {error && (
            <div className="error-banner" role="alert">
              <span>{error}</span><button onClick={() => void refresh()}>Try again</button>
            </div>
          )}

          <section className="stats-grid" aria-label="Job search overview">
            <StatCard icon={<BriefcaseBusiness size={17} />} label="Applications sent" value={dashboard.total} detail="Your search, at a glance" tone="stat-green" />
            <StatCard icon={<Clock3 size={17} />} label="In progress" value={dashboard.interviews} detail="Screenings & interviews" tone="stat-blue" />
            <StatCard icon={<ArrowUpRight size={17} />} label="Offers received" value={dashboard.offers} detail="The goal is getting closer" tone="stat-amber" />
            <StatCard icon={<Sparkles size={17} />} label="Response rate" value={`${dashboard.response_rate}%`} detail="Applications with a reply" tone="stat-purple" />
          </section>

          <section className="content-grid">
            <div className="panel pipeline-panel">
              <div className="panel-heading">
                <div><div className="section-kicker">THE BIG PICTURE</div><h2>Your pipeline</h2></div>
                <button className="text-button" onClick={() => { setActiveStatus("All applications"); document.querySelector("#applications")?.scrollIntoView({ behavior: "smooth" }); }}>View all <ArrowUpRight size={15} /></button>
              </div>
              <div className="pipeline-total"><strong>{dashboard.total}</strong><span>total opportunities</span></div>
              <div className="stage-bar" aria-label="Application stages">
                {stageItems.map(({ label, tone }) => {
                  const count = dashboard.stage_counts[label];
                  const width = dashboard.total ? Math.max((count / dashboard.total) * 100, count ? 4 : 0) : 0;
                  return <span key={label} className={tone} style={{ width: `${width}%` }} title={`${label}: ${count}`} />;
                })}
              </div>
              <div className="stage-legend">
                {stageItems.map(({ label, tone }) => (
                  <div className="legend-item" key={label}><span className={`legend-dot ${tone}`} /><span>{label}</span><strong>{dashboard.stage_counts[label]}</strong></div>
                ))}
              </div>
            </div>
            <div className="panel nudge-panel">
              <div className="nudge-orb orb-one" /><div className="nudge-orb orb-two" />
              <div className="nudge-top"><span className="nudge-icon"><Sparkles size={16} /></span><span className="nudge-tag">A MOMENT FOR YOU</span></div>
              <h2>Progress, not<br />perfection.</h2>
              <p>Every thoughtful application brings you closer to the right team. Keep showing up.</p>
              <div className="nudge-footer"><span>ONE STEP AT A TIME</span><ArrowUpRight size={15} /></div>
            </div>
          </section>

          <section className="applications-section" id="applications">
            <div className="applications-heading">
              <div><div className="section-kicker">THE DETAILS</div><h2>Your applications <span className="heading-count">{filteredApplications.length}</span></h2></div>
              <button className="primary-button add-mobile" onClick={() => { setForm(blankForm()); setModalOpen(true); }}><Plus size={16} /> Add application</button>
            </div>
            <div className="toolbar">
              <label className="search-field">
                <Search size={17} />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search roles, companies..." aria-label="Search applications" />
                {search && <button aria-label="Clear search" onClick={() => setSearch("")}><X size={14} /></button>}
              </label>
              <div className="filter-wrap">
                <Filter size={15} />
                <select value={activeStatus} onChange={(event) => setActiveStatus(event.target.value)} aria-label="Filter by status">
                  <option>All applications</option>
                  {statuses.map((status) => <option key={status}>{status}</option>)}
                </select>
                <ChevronDown size={14} className="filter-chevron" />
              </div>
              <span className="sort-label"><ArrowDownUp size={14} /> Recent first</span>
            </div>

            <div className="application-list">
              {loading ? (
                <div className="loading-state"><LoaderCircle className="spin" size={22} /><span>Finding your opportunities...</span></div>
              ) : filteredApplications.length ? (
                filteredApplications.map((application) => (
                  <ApplicationRow
                    key={application.id}
                    application={application}
                    onStatusChange={(status) => void handleStatusChange(application, status)}
                    onDelete={() => void handleDelete(application)}
                  />
                ))
              ) : (
                <div className="empty-state">
                  <span className="empty-icon"><Search size={19} /></span>
                  <strong>{applications.length ? "No matches this time" : "Your next opportunity starts here"}</strong>
                  <p>{applications.length ? "Try another search or change your filters." : "Add a role to start building your job-search pipeline."}</p>
                  {!applications.length && <button className="text-button" onClick={() => { setForm(blankForm()); setModalOpen(true); }}>Add your first application <ArrowUpRight size={15} /></button>}
                </div>
              )}
            </div>
            <div className="list-footer"><span>Showing <strong>{filteredApplications.length}</strong> of <strong>{applications.length}</strong> opportunities</span><span className="secure-note"><Check size={13} /> Your data stays yours</span></div>
          </section>

          <footer className="page-footer"><span>Made for the next chapter.</span><span>WAYPOINT <span className="brand-period">•</span> CAREER, WITH DIRECTION</span></footer>
        </div>
      </main>

      {notice && <div className="toast" role="status"><span className="toast-check"><Check size={14} /></span>{notice}</div>}
      {modalOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalOpen(false); }}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="modal-heading"><div><div className="section-kicker">A NEW POSSIBILITY</div><h2 id="modal-title">Add an application</h2></div><button className="icon-button" aria-label="Close dialog" onClick={() => setModalOpen(false)}><X size={19} /></button></div>
            <p className="modal-copy">Keep all the little details in one place.</p>
            <form onSubmit={(event) => void handleCreate(event)}>
              <div className="form-grid">
                <label className="form-field"><span>Company <b>*</b></span><input required maxLength={100} value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} placeholder="e.g. Acme Studio" autoFocus /></label>
                <label className="form-field"><span>Role <b>*</b></span><input required maxLength={120} value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} placeholder="e.g. Product Designer" /></label>
                <label className="form-field"><span>Location</span><input maxLength={100} value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="City, state or remote" /></label>
                <label className="form-field"><span>Work style</span><select value={form.work_mode} onChange={(event) => setForm({ ...form, work_mode: event.target.value as WorkMode })}><option>Remote</option><option>Hybrid</option><option>On-site</option></select></label>
                <label className="form-field"><span>Current stage</span><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as Status })}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
                <label className="form-field"><span>Date applied</span><input type="date" value={form.applied_on} onChange={(event) => setForm({ ...form, applied_on: event.target.value })} /></label>
                <label className="form-field"><span>Salary range</span><input maxLength={80} value={form.salary} onChange={(event) => setForm({ ...form, salary: event.target.value })} placeholder="e.g. $120k–$150k" /></label>
                <label className="form-field"><span>Job posting link</span><input type="url" maxLength={500} value={form.job_url} onChange={(event) => setForm({ ...form, job_url: event.target.value })} placeholder="https://" /></label>
                <label className="form-field form-field-wide"><span>Notes & next steps</span><textarea rows={3} maxLength={2000} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Interview prep, people to follow up with, or anything worth remembering..." /></label>
              </div>
              <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setModalOpen(false)}>Cancel</button><button className="primary-button" disabled={saving}>{saving ? <LoaderCircle size={16} className="spin" /> : <Plus size={16} />} {saving ? "Saving..." : "Add to my board"}</button></div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, detail, tone }: { icon: ReactNode; label: string; value: number | string; detail: string; tone: string }) {
  return <article className="stat-card"><div className="stat-top"><span className={`stat-icon ${tone}`}>{icon}</span><span className="stat-label">{label}</span><span className="stat-mini"><ArrowUpRight size={14} /></span></div><div className="stat-value">{value}</div><div className="stat-detail">{detail}</div></article>;
}

function ApplicationRow({ application, onStatusChange, onDelete }: { application: Application; onStatusChange: (status: Status) => void; onDelete: () => void }) {
  return (
    <article className="application-row">
      <div className={`company-logo logo-${application.company.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8)}`}>{application.company.slice(0, 1).toUpperCase()}</div>
      <div className="company-info"><div className="company-name">{application.company}{application.job_url && <a className="company-link" href={application.job_url} target="_blank" rel="noreferrer" aria-label={`Open ${application.company} job posting`}><ExternalLink size={12} /></a>}</div><div className="role-name">{application.role}</div></div>
      <div className="row-location"><MapPin size={14} /><span>{application.location || application.work_mode}</span></div>
      <div className="row-date"><CalendarDays size={14} /><span>{formatDate(application.applied_on)}</span></div>
      <div className="row-salary">{application.salary || <span className="salary-muted">Not listed</span>}</div>
      <div className="row-status"><span className={`status-pill ${statusStyles[application.status]}`}><span className="status-indicator" />{application.status}</span></div>
      <div className="row-actions">
        <label className="sr-only" htmlFor={`status-${application.id}`}>Change status for {application.company}</label>
        <span className="status-select">
          <ChevronDown size={13} aria-hidden="true" />
          <select id={`status-${application.id}`} value={application.status} onChange={(event) => onStatusChange(event.target.value as Status)} aria-label={`Change status for ${application.company}`}>
            {statuses.map((status) => <option key={status}>{status}</option>)}
          </select>
        </span>
        <button className="delete-button" aria-label={`Remove ${application.company}`} title="Remove application" onClick={onDelete}><Trash2 size={15} /></button>
      </div>
    </article>
  );
}

export default App;
