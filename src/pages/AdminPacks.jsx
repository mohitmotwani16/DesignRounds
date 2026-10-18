import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Check, Hammer, LoaderCircle, Pencil, RefreshCw, Archive, AlertTriangle } from "lucide-react";
import { api } from "../api.js";

// Admin review of Problem Packs (docs/design/problem-knowledge-service.md, section 5).
// A built pack lands as a draft; an admin reads it next to its guide, compares it with
// the published version, and publishes, rebuilds, retires or edits it.

const formatDate = (iso) => (iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "");
const STAGES = [["requirements", "Requirements"], ["high_level", "High-level design"], ["deep_dive", "Deep dive"], ["wrap_up", "Wrap-up"]];
const FILTERS = [["all", "All"], ["review", "Drafts to review"], ["published", "Published"], ["none", "No pack"]];
// What a pack's own content is, without its identity fields (the editable part).
const contentOf = ({ schemaVersion: _s, promptId: _p, version: _v, inputsFingerprint: _i, builder: _b, ...content }) => content;

export function PackAdmin() {
  const [selected, setSelected] = useState(null);
  return selected ? <PackReview promptId={selected} onBack={() => setSelected(null)} /> : <PackList onOpen={setSelected} />;
}

function PackList({ onOpen }) {
  const [filter, setFilter] = useState("review");
  const [state, setState] = useState({ status: "loading" });
  useEffect(() => {
    api.adminPacks().then((result) => setState({ status: "ready", ...result })).catch((error) => setState({ status: "error", error }));
  }, []);
  const matches = (pack) => filter === "all"
    || (filter === "review" && pack.drafts > 0)
    || (filter === "published" && pack.publishedVersion)
    || (filter === "none" && !pack.publishedVersion && !pack.drafts);
  const packs = state.packs?.filter(matches) ?? [];
  return (
    <>
      <p className="admin-intro">Problem Packs are the interviewer's private notes for each question. A question runs on the v3 interviewer only when it has a published pack.</p>
      <div className="admin-filters">
        {FILTERS.map(([id, label]) => <button key={id} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>)}
      </div>
      {state.status === "loading" && <p className="learn-loading"><LoaderCircle size={16} className="spin" /> Loading…</p>}
      {state.status === "error" && <p className="form-error">{state.error.message}</p>}
      {state.status === "ready" && (packs.length ? (
        <ul className="write-list">
          {packs.map((pack) => (
            <li key={pack.promptId}>
              <button className="pack-row" onClick={() => onOpen(pack.promptId)}>
                <span className="write-list-title">{pack.title}<small>{pack.track} · {pack.access}{pack.publishedVersion ? ` · published ${pack.publishedVersion}` : ""}</small></span>
                <span className="pack-badges">
                  {pack.drafts > 0 && <span className="pack-badge draft">{pack.drafts} draft{pack.drafts === 1 ? "" : "s"}</span>}
                  {pack.publishedVersion && <span className="pack-badge published">Published</span>}
                  {pack.job && pack.job.status !== "done" && <span className={`pack-badge job-${pack.job.status}`}>{pack.job.status}{pack.job.errorCode ? ` (${pack.job.errorCode})` : ""}</span>}
                </span>
                <span className="write-list-date">{formatDate(pack.lastBuiltAt)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : <p className="write-empty">Nothing here right now.</p>)}
    </>
  );
}

// Which agenda items a version adds, drops or changes compared with another.
function diffPacks(next, base) {
  if (!base) return null;
  const before = new Map(base.agenda.map((item) => [item.id, JSON.stringify(item)]));
  const after = new Map(next.agenda.map((item) => [item.id, JSON.stringify(item)]));
  return {
    added: [...after.keys()].filter((id) => !before.has(id)),
    removed: [...before.keys()].filter((id) => !after.has(id)),
    changed: [...after.keys()].filter((id) => before.has(id) && before.get(id) !== after.get(id)),
    opening: next.opening !== base.opening,
    clarifications: JSON.stringify(next.clarifications) !== JSON.stringify(base.clarifications),
  };
}

function PackReview({ promptId, onBack }) {
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState(null);
  const [version, setVersion] = useState(null);
  const [busy, setBusy] = useState("");
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    try {
      const result = await api.adminPack(promptId);
      setDetail(result);
      setVersion((current) => current && result.versions.some((entry) => entry.version === current) ? current : result.versions[0]?.version ?? null);
      return result;
    } catch (failure) {
      setError(failure);
      return null;
    }
  }, [promptId]);
  useEffect(() => { load(); }, [load]);

  async function act(name, fn) {
    setBusy(name);
    setError(null);
    try { await fn(); await load(); } catch (failure) { setError(failure); } finally { setBusy(""); }
  }

  async function build() {
    await act("build", () => api.buildPack(promptId));
    // Builds take a few minutes on a real model; poll until a new version appears.
    const before = detail?.versions.length ?? 0;
    for (let attempt = 0; attempt < 60; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 5_000));
      const result = await load();
      if (!result || result.versions.length > before) break;
    }
  }

  if (!detail) return error ? <p className="form-error">{error.message}</p> : <p className="learn-loading"><LoaderCircle size={16} className="spin" /> Loading…</p>;
  const current = detail.versions.find((entry) => entry.version === version);
  const published = detail.versions.find((entry) => entry.status === "published");
  const diff = current && published && current.version !== published.version ? diffPacks(current.pack, published.pack) : null;

  return (
    <div className="pack-review">
      <button className="pack-back" onClick={onBack}><ArrowLeft size={14} /> All questions</button>
      <header className="pack-head">
        <div>
          <h2>{detail.title}</h2>
          <p>{detail.publishedVersion ? `Published: ${detail.publishedVersion}` : "No published pack: this question uses the v2 interviewer."} · answer pool {detail.inputs.poolStatus}</p>
        </div>
        <button className="button button-outline button-small" disabled={Boolean(busy)} onClick={build}>
          {busy === "build" ? <LoaderCircle size={13} className="spin" /> : <Hammer size={13} />} {detail.versions.length ? "Rebuild" : "Build now"}
        </button>
      </header>
      {error && <p className="form-error">{error.message}</p>}

      {detail.versions.length > 0 && (
        <div className="pack-versions" role="tablist">
          {detail.versions.map((entry) => (
            <button key={entry.version} role="tab" aria-selected={entry.version === version} onClick={() => { setVersion(entry.version); setEditing(null); }}>
              <strong>{entry.version}</strong>
              <span className={`pack-badge ${entry.status}`}>{entry.status}</span>
              {entry.stale && <span className="pack-badge stale" title="Built from older inputs (brief, guide or pool changed since)">stale</span>}
              <small>{entry.builder} · {formatDate(entry.createdAt)}</small>
            </button>
          ))}
        </div>
      )}

      {current && (
        <>
          <div className="pack-actions">
            {current.status === "draft" && (
              <button className="button button-dark button-small" disabled={Boolean(busy)} onClick={() => act("publish", () => api.publishPack(promptId, current.version))}>
                {busy === "publish" ? <LoaderCircle size={13} className="spin" /> : <Check size={13} />} Publish
              </button>
            )}
            {current.status === "published" && (
              <button className="button button-outline button-small" disabled={Boolean(busy)} onClick={() => act("retire", () => api.retirePack(promptId, current.version))}>
                <Archive size={13} /> Retire
              </button>
            )}
            <button className="button button-outline button-small" disabled={Boolean(busy)} onClick={() => setEditing(editing ? null : JSON.stringify(contentOf(current.pack), null, 2))}>
              <Pencil size={13} /> {editing ? "Cancel edit" : "Edit as new draft"}
            </button>
          </div>

          {editing !== null && (
            <div className="pack-editor">
              <textarea value={editing} onChange={(event) => setEditing(event.target.value)} rows={24} spellCheck={false} aria-label="Pack JSON" />
              <button className="button button-dark button-small" disabled={Boolean(busy)} onClick={() => act("save", async () => {
                let pack;
                try { pack = JSON.parse(editing); } catch { throw new Error("That isn't valid JSON."); }
                const saved = await api.saveDraftPack(promptId, pack);
                setEditing(null);
                setVersion(saved.version);
              })}>{busy === "save" ? <LoaderCircle size={13} className="spin" /> : <Check size={13} />} Save draft</button>
            </div>
          )}

          <Validation validation={current.validation} />
          {diff && (
            <div className="pack-diff">
              <strong>Compared with the published {published.version}:</strong>
              {diff.added.length > 0 && <span>added {diff.added.join(", ")}</span>}
              {diff.removed.length > 0 && <span>removed {diff.removed.join(", ")}</span>}
              {diff.changed.length > 0 && <span>changed {diff.changed.join(", ")}</span>}
              {diff.opening && <span>new opening</span>}
              {diff.clarifications && <span>clarifications changed</span>}
              {!diff.added.length && !diff.removed.length && !diff.changed.length && !diff.opening && !diff.clarifications && <span>no agenda changes</span>}
            </div>
          )}
          <div className="pack-split">
            <PackView pack={current.pack} />
            <details className="pack-guide">
              <summary>Interviewer guide (input)</summary>
              <pre>{detail.inputs.guide ?? "(no guide)"}</pre>
            </details>
          </div>
        </>
      )}
      {!detail.versions.length && <p className="write-empty">No pack yet. Build one, or commit a hand-authored pack to server/content/packs/{promptId}.json.</p>}
      <button className="pack-refresh" onClick={load}><RefreshCw size={12} /> Refresh</button>
    </div>
  );
}

function Validation({ validation }) {
  const warnings = validation?.warnings ?? [];
  const conflicts = validation?.consistency?.conflicts ?? [];
  if (!warnings.length && !conflicts.length && validation?.consistency?.consistent !== false) return null;
  return (
    <div className="pack-validation" role="note">
      <AlertTriangle size={14} />
      <div>
        {conflicts.length > 0 && <><strong>Hidden facts that disagree with the guide</strong><ul>{conflicts.map((conflict) => <li key={conflict}>{conflict}</li>)}</ul></>}
        {warnings.length > 0 && <><strong>Builder warnings</strong><ul>{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></>}
      </div>
    </div>
  );
}

function PackView({ pack }) {
  return (
    <div className="pack-view">
      <section>
        <h3>Opening</h3>
        <p>{pack.opening}</p>
      </section>
      <section>
        <h3>Hidden facts ({pack.clarifications.length})</h3>
        <ul>{pack.clarifications.map((fact) => <li key={fact.id}><code>{fact.id}</code> {fact.answer} <small>({fact.topics.join(", ")})</small></li>)}</ul>
        <p className="pack-note">Anything else: {pack.clarificationPolicy}</p>
      </section>
      {STAGES.map(([stage, label]) => {
        const items = pack.agenda.filter((item) => item.stage === stage);
        if (!items.length) return null;
        return (
          <section key={stage}>
            <h3>{label} ({items.length}) · {Math.round((pack.pacing[stage] ?? 0) * 100)}% of the round</h3>
            {items.map((item) => (
              <details key={item.id} className="pack-item">
                <summary><code>{item.id}</code> {item.goal} <small>{item.dimension} · weight {item.weight}{item.required ? " · required" : ""}</small></summary>
                <dl>
                  <dt>Opener</dt><dd>{item.opener}</dd>
                  <dt>Strong</dt><dd>{item.evidence.strong}</dd>
                  <dt>Adequate</dt><dd>{item.evidence.adequate}</dd>
                  <dt>Weak</dt><dd>{item.evidence.weak}</dd>
                  <dt>Probes</dt><dd><ul>{item.probes.map((probe) => <li key={probe}>{probe}</li>)}</ul></dd>
                  <dt>Hints</dt><dd><ol>{item.hints.map((hint) => <li key={hint}>{hint}</li>)}</ol></dd>
                  {item.misconceptions.length > 0 && <><dt>Misconceptions</dt><dd><ul>{item.misconceptions.map((entry) => <li key={entry.id}><code>{entry.id}</code> {entry.pattern} <em>Challenge: {entry.challenge}</em></li>)}</ul></dd></>}
                  <dt>Move-on summary</dt><dd>{item.moveOnSummary}</dd>
                  <dt>Triggers</dt><dd>{[...item.triggers.componentKinds, ...item.triggers.keywords].join(", ") || "none"}</dd>
                  {item.learnTopics.length > 0 && <><dt>Learn</dt><dd>{item.learnTopics.join(", ")}</dd></>}
                </dl>
              </details>
            ))}
          </section>
        );
      })}
      {pack.curveballs.length > 0 && (
        <section>
          <h3>Curveballs</h3>
          <ul>{pack.curveballs.map((ball) => <li key={ball.id}><code>{ball.id}</code> after {ball.after}, opens {ball.agendaItemId}: {ball.prompt}</li>)}</ul>
        </section>
      )}
      {pack.alternatives.length > 0 && (
        <section>
          <h3>Valid alternatives</h3>
          <ul>{pack.alternatives.map((alt) => <li key={alt.choice}><strong>{alt.choice}</strong>: {alt.whenBetter}</li>)}</ul>
        </section>
      )}
      {pack.exemplars.length > 0 && (
        <section>
          <h3>Exemplars (review only)</h3>
          <ul>{pack.exemplars.map((exemplar) => <li key={exemplar.label}><strong>{exemplar.band}, {exemplar.label}</strong>: {exemplar.outline}</li>)}</ul>
        </section>
      )}
      {pack.vocabulary.length > 0 && <section><h3>Vocabulary</h3><p>{pack.vocabulary.join(", ")}</p></section>}
    </div>
  );
}
