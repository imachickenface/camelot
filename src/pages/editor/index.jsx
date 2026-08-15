import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useCamelot, isOccupied } from '../../state/CamelotContext';
import { PixelPanel, PixelButton, PixelFrame, ArchHeader } from '../../components/ui';
import Portrait from '../../components/Portrait';
import StatusLamp from '../../components/StatusLamp';
import { Crown } from '../../components/emblems';
import './editor.css';

/** Empty draft shape — mirrors the editable subset of the agent schema. */
const emptyDraft = { name: '', role: '', description: '', personality: '', active: false, engine: 'cloud' };

/**
 * Seats whose Status toggle also drives a wandering inhabitant in the Village
 * (see VILLAGER_SPECS in src/pages/village/index.jsx — keep these in sync).
 * Active -> the villager is out and about; inactive -> asleep in their house.
 */
const VILLAGE_LINKED_SEATS = {
  'seat-01': "King Arthur's standing at the Round Table governs his behavior in the Village.",
  'seat-12': "Merlin's standing at the Round Table governs his behavior in the Village.",
};

/** Build a draft object from a stored agent record. */
function draftFromAgent(agent) {
  if (!agent) return { ...emptyDraft };
  return {
    name: agent.name || '',
    role: agent.role || '',
    description: agent.description || '',
    personality: agent.personality || '',
    active: Boolean(agent.active),
    engine: agent.engine === 'hermes' ? 'hermes' : 'cloud',
  };
}

/**
 * THE AGENT EDITOR — a scribe's chamber where each of the 12 Round Table seats
 * is named, portrayed and given purpose. Two columns: the seat roll (left) and
 * the illuminated manuscript form for the selected seat (right).
 */
export default function AgentEditor() {
  const { agents, tabs, addTab, updateAgent, uploadPortrait, setAgentActive, runAgentTask } = useCamelot();
  const [sp, setSp] = useSearchParams();
  const navigate = useNavigate();

  // ---- Seat selection, deep-linked via ?seat=seat-03 ----
  const requestedSeat = sp.get('seat');
  const validSeatIds = useMemo(() => new Set(agents.map((a) => a.id)), [agents]);
  const [selectedId, setSelectedId] = useState(requestedSeat || 'seat-01');

  // Re-sync selection whenever the URL's ?seat= param changes (e.g. a link from
  // the Hub or Village). Falls back to seat-01 if the param is missing/invalid.
  useEffect(() => {
    if (requestedSeat && validSeatIds.has(requestedSeat)) {
      setSelectedId(requestedSeat);
    } else if (!requestedSeat && validSeatIds.size) {
      setSelectedId('seat-01');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedSeat, validSeatIds]);

  const selectSeat = useCallback(
    (id) => {
      setSelectedId(id);
      setSp((prev) => {
        const next = new URLSearchParams(prev);
        next.set('seat', id);
        return next;
      });
    },
    [setSp],
  );

  const selected = agents.find((a) => a.id === selectedId) || null;

  // ---- Local draft state for the selected seat's form ----
  const [draft, setDraft] = useState(() => draftFromAgent(selected));
  // The freshly-picked File awaiting Save, plus an object URL for live preview.
  const [stagedFile, setStagedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const fileInputRef = useRef(null);

  // ---- Merlin-only: casting a script beat into a clip via Higgsfield ----
  const [castPrompt, setCastPrompt] = useState('');
  const [casting, setCasting] = useState(false);
  const [castError, setCastError] = useState(null);
  const [castResult, setCastResult] = useState(null);

  // ---- Sir Scout-only: riding out for candidate ideas from Reddit ----
  const [scoutInput, setScoutInput] = useState('');
  const [scouting, setScouting] = useState(false);
  const [scoutError, setScoutError] = useState(null);
  const [scoutResult, setScoutResult] = useState(null);

  // ---- Hermes-only: unrestricted free-form task, local + full tool access ----
  const [scriptIdea, setScriptIdea] = useState('');
  const [scoutCandidates, setScoutCandidates] = useState([]);
  const [scripting, setScripting] = useState(false);
  const [scriptError, setScriptError] = useState(null);
  const [scriptResult, setScriptResult] = useState(null);

  // ---- Percival-only: fact-checking a script ----
  const [factCheckInput, setFactCheckInput] = useState('');
  const [hagridScript, setHagridScript] = useState('');
  const [factChecking, setFactChecking] = useState(false);
  const [factCheckError, setFactCheckError] = useState(null);
  const [factCheckResult, setFactCheckResult] = useState(null);

  // ---- Miku-only: voiceover + music ----
  const [mikuInput, setMikuInput] = useState('');
  const [mikuBusy, setMikuBusy] = useState(false);
  const [mikuError, setMikuError] = useState(null);
  const [mikuResult, setMikuResult] = useState(null);

  // ---- Teto-only: sound effects / foley ----
  const [tetoInput, setTetoInput] = useState('');
  const [tetoing, setTetoing] = useState(false);
  const [tetoError, setTetoError] = useState(null);
  const [tetoResult, setTetoResult] = useState(null);

  // ---- The Mighty Crab-only: QA pass over the pipeline's latest assets ----
  const [crabBusy, setCrabBusy] = useState(false);
  const [crabError, setCrabError] = useState(null);
  const [crabResult, setCrabResult] = useState(null);

  // ---- Arthur-only ("The Manager"): read-only summary of the dev pipeline ----
  // Orchestration itself runs outside this app (a scheduled Claude Code session,
  // see docs/MANAGER-RUNBOOK.md) — there's nothing to trigger from here anymore,
  // just a status view of what that session has been doing.
  const [managerProjects, setManagerProjects] = useState([]);

  // Load the seat's stored values into the draft whenever the SELECTED SEAT changes
  // (not on every agent mutation — that would clobber in-progress edits). Also clears
  // any staged (unsaved) portrait pick from the previous seat.
  useEffect(() => {
    setDraft(draftFromAgent(selected));
    setStagedFile(null);
    setJustSaved(false);
    setCastPrompt('');
    setCastError(null);
    setCastResult(null);
    setScoutInput('');
    setScoutError(null);
    setScoutResult(null);
    setScriptIdea('');
    setScriptError(null);
    setScriptResult(null);
    setFactCheckInput('');
    setFactCheckError(null);
    setFactCheckResult(null);
    setMikuInput('');
    setMikuError(null);
    setMikuResult(null);
    setTetoInput('');
    setTetoError(null);
    setTetoResult(null);
    setCrabError(null);
    setCrabResult(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // Arthur-only: load the manager's project list for the status summary below.
  useEffect(() => {
    if (selectedId !== 'seat-01') {
      setManagerProjects([]);
      return;
    }
    let alive = true;
    fetch('/api/data/projects')
      .then((res) => (res.ok ? res.json() : { projects: [] }))
      .then((data) => {
        if (alive) setManagerProjects(Array.isArray(data.projects) ? data.projects : []);
      })
      .catch(() => {
        if (alive) setManagerProjects([]);
      });
    return () => {
      alive = false;
    };
  }, [selectedId]);

  // Hermes-only: load Sir Scout's most recent candidates for the "pull an idea" dropdown.
  useEffect(() => {
    if (selectedId !== 'seat-07') {
      setScoutCandidates([]);
      return;
    }
    let alive = true;
    fetch('/api/data/pipeline')
      .then((res) => (res.ok ? res.json() : { scout: null }))
      .then((data) => {
        if (alive) setScoutCandidates((data.scout && data.scout.candidates) || []);
      })
      .catch(() => {
        if (alive) setScoutCandidates([]);
      });
    return () => {
      alive = false;
    };
  }, [selectedId]);

  // Percival-only: load Hermes's most recent script to prefill the fact-check box
  // (only set if Hermes's last run happened to be a script draft — free-form tasks
  // won't have a .script field, and that's fine, the prefill button just won't show).
  useEffect(() => {
    if (selectedId !== 'seat-02') {
      setHagridScript('');
      return;
    }
    let alive = true;
    fetch('/api/data/pipeline')
      .then((res) => (res.ok ? res.json() : { hermes: null }))
      .then((data) => {
        if (alive) setHagridScript((data.hermes && data.hermes.script) || '');
      })
      .catch(() => {
        if (alive) setHagridScript('');
      });
    return () => {
      alive = false;
    };
  }, [selectedId]);

  // Revoke the staged preview's object URL whenever it's replaced or unmounted.
  useEffect(() => {
    if (!stagedFile) {
      setPreviewUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(stagedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [stagedFile]);

  const handleFieldChange = (field) => (e) => {
    setDraft((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleFileSelect = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) setStagedFile(file);
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      // Persist the text fields — updateAgent recomputes `occupied` from `name`.
      updateAgent(selected.id, {
        name: draft.name,
        role: draft.role,
        description: draft.description,
        personality: draft.personality,
        ...(selected.id !== 'seat-01' ? { engine: draft.engine } : {}),
      });
      // Persist a freshly-picked portrait, if any.
      if (stagedFile) {
        await uploadPortrait(selected.id, stagedFile);
        setStagedFile(null);
      }
      // Persist the active toggle (drives Arthur in the Village for seat-01).
      setAgentActive(selected.id, draft.active);
      setJustSaved(true);
      window.setTimeout(() => setJustSaved(false), 900);
    } finally {
      setSaving(false);
    }
  };

  const handleCast = async () => {
    if (!selected || !castPrompt.trim()) return;
    setCasting(true);
    setCastError(null);
    setCastResult(null);
    try {
      const result = await runAgentTask(selected.id, castPrompt.trim());
      setCastResult(result);
    } catch (err) {
      setCastError(err.message || 'casting failed');
    } finally {
      setCasting(false);
    }
  };

  const handleScout = async () => {
    if (!selected) return;
    setScouting(true);
    setScoutError(null);
    setScoutResult(null);
    try {
      const result = await runAgentTask(selected.id, scoutInput.trim());
      setScoutResult(result);
    } catch (err) {
      setScoutError(err.message || 'scout run failed');
    } finally {
      setScouting(false);
    }
  };

  const handleDraftScript = async () => {
    if (!selected || !scriptIdea.trim()) return;
    setScripting(true);
    setScriptError(null);
    setScriptResult(null);
    try {
      const result = await runAgentTask(selected.id, scriptIdea.trim());
      setScriptResult(result);
    } catch (err) {
      setScriptError(err.message || 'draft failed');
    } finally {
      setScripting(false);
    }
  };

  // Local Hermes calls can take minutes — lets you cut one short instead of waiting
  // out the full server-side timeout. Only meaningful when engine is "hermes"; the
  // cloud path resolves quickly enough that this isn't needed there.
  const handleStopHermesTask = async () => {
    try {
      await fetch('/api/hermes/stop', { method: 'POST' });
    } catch {
      // best-effort
    }
  };

  // Open Hermes's standing chat Hall — reuse the existing one if it's already been
  // created, rather than spawning a duplicate every time this is clicked.
  const handleOpenHermesHall = () => {
    const existing = tabs.find((t) => t.contentRef === 'hermes-chat');
    const id = existing ? existing.id : addTab('Hermes', 'hermes-chat');
    navigate(`/tab/${id}`);
  };

  const handleFactCheck = async () => {
    if (!selected || !factCheckInput.trim()) return;
    setFactChecking(true);
    setFactCheckError(null);
    setFactCheckResult(null);
    try {
      const result = await runAgentTask(selected.id, factCheckInput.trim());
      setFactCheckResult(result);
    } catch (err) {
      setFactCheckError(err.message || 'fact-check failed');
    } finally {
      setFactChecking(false);
    }
  };

  const handleMiku = async (mode) => {
    if (!selected || !mikuInput.trim()) return;
    setMikuBusy(true);
    setMikuError(null);
    setMikuResult(null);
    try {
      const result = await runAgentTask(selected.id, JSON.stringify({ mode, text: mikuInput.trim() }));
      setMikuResult(result);
    } catch (err) {
      setMikuError(err.message || 'generation failed');
    } finally {
      setMikuBusy(false);
    }
  };

  const handleTeto = async () => {
    if (!selected || !tetoInput.trim()) return;
    setTetoing(true);
    setTetoError(null);
    setTetoResult(null);
    try {
      const result = await runAgentTask(selected.id, tetoInput.trim());
      setTetoResult(result);
    } catch (err) {
      setTetoError(err.message || 'generation failed');
    } finally {
      setTetoing(false);
    }
  };

  const handleCrabCheck = async () => {
    if (!selected) return;
    setCrabBusy(true);
    setCrabError(null);
    setCrabResult(null);
    try {
      const result = await runAgentTask(selected.id, '');
      setCrabResult(result);
    } catch (err) {
      setCrabError(err.message || 'QA run failed');
    } finally {
      setCrabBusy(false);
    }
  };

  const handleRevert = () => {
    setDraft(draftFromAgent(selected));
    setStagedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!selected) {
    return (
      <div className="page">
        <PixelPanel style={{ padding: 32, textAlign: 'center' }}>
          <h2>Scribe&rsquo;s Chamber</h2>
          <p className="font-body">The seat rolls have not yet been drawn up.</p>
        </PixelPanel>
      </div>
    );
  }

  return (
    <div className="page editor-page">
      <ArchHeader className="editor-title">
        <span className="font-title">The Scribe&rsquo;s Chamber</span>
      </ArchHeader>

      <div className="editor-layout">
        {/* ---------------- LEFT: the seat roll ---------------- */}
        <PixelPanel raised className="editor-roll">
          <h3 className="editor-roll__heading font-label t-gold">Seats of the Table</h3>
          <ul className="editor-roll__list">
            {agents.map((a) => {
              const occupied = isOccupied(a);
              const isSelected = a.id === selectedId;
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    className={`editor-seat-row${isSelected ? ' is-selected' : ''}`}
                    onClick={() => selectSeat(a.id)}
                    aria-current={isSelected ? 'true' : undefined}
                  >
                    <Portrait agent={a} size={40} />
                    <span className="editor-seat-row__info">
                      <span className={`editor-seat-row__name font-title${occupied ? '' : ' t-ghost'}`}>
                        {occupied ? a.name : 'Vacant Seat'}
                      </span>
                      <span className="editor-seat-row__meta font-label t-ghost">
                        SEAT {String(a.seat).padStart(2, '0')}
                      </span>
                    </span>
                    {occupied && <StatusLamp active={a.active} showLabel={false} size={14} />}
                  </button>
                </li>
              );
            })}
          </ul>
        </PixelPanel>

        {/* ---------------- RIGHT: the illuminated form ---------------- */}
        <PixelPanel raised className="editor-form-panel">
          <div className="editor-form__head">
            <span className="font-label t-ghost">
              SEAT {String(selected.seat).padStart(2, '0')} &middot; {selected.id}
            </span>
            <StatusLamp active={draft.active} size={16} />
          </div>

          <div className="editor-form__body">
            {/* ---- Portrait: picker + live preview in the gold frame ---- */}
            <div className="editor-portrait-row">
              <PixelFrame vacant={!isOccupied(selected) && !previewUrl} className="editor-portrait-frame">
                {previewUrl ? (
                  <img src={previewUrl} alt="Staged portrait preview" style={{ imageRendering: 'pixelated' }} />
                ) : (
                  <Portrait agent={selected} size={96} />
                )}
              </PixelFrame>
              <div className="editor-portrait-controls">
                <label className="font-label t-gold editor-field-label" htmlFor="editor-portrait-input">
                  Portrait
                </label>
                <input
                  id="editor-portrait-input"
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/gif"
                  onChange={handleFileSelect}
                  className="editor-file-input"
                />
                <p className="font-body t-ghost editor-hint">
                  PNG, JPEG or GIF. The chosen image is only inked into the archive once you press
                  the seal below.
                </p>
              </div>
            </div>

            <hr className="rune-divider" />

            {/* ---- Name (with blackletter live preview) ---- */}
            <div className="editor-field">
              <label className="font-label t-gold editor-field-label" htmlFor="editor-name-input">
                Name
              </label>
              <div className="editor-name-preview font-title" aria-hidden="true">
                {draft.name.trim() || 'Unnamed Seat'}
              </div>
              <input
                id="editor-name-input"
                type="text"
                className="editor-input font-body"
                placeholder="e.g., Sir Kay"
                value={draft.name}
                onChange={handleFieldChange('name')}
                maxLength={48}
              />
            </div>

            {/* ---- Role / title ---- */}
            <div className="editor-field">
              <label className="font-label t-gold editor-field-label" htmlFor="editor-role-input">
                Role / Title
              </label>
              <input
                id="editor-role-input"
                type="text"
                className="editor-input font-body"
                placeholder="Content Scout"
                value={draft.role}
                onChange={handleFieldChange('role')}
                maxLength={64}
              />
            </div>

            {/* ---- Description ---- */}
            <div className="editor-field">
              <label className="font-label t-gold editor-field-label" htmlFor="editor-desc-input">
                Description
              </label>
              <textarea
                id="editor-desc-input"
                className="editor-textarea font-body"
                placeholder="What does this agent do?"
                rows={3}
                value={draft.description}
                onChange={handleFieldChange('description')}
              />
            </div>

            {/* ---- Personality ---- */}
            <div className="editor-field">
              <label className="font-label t-gold editor-field-label" htmlFor="editor-personality-input">
                Personality
              </label>
              <textarea
                id="editor-personality-input"
                className="editor-textarea font-body"
                placeholder="e.g., Blunt, allergic to vague briefs, will refuse weak ideas…"
                rows={3}
                value={draft.personality}
                onChange={handleFieldChange('personality')}
              />
            </div>

            {/* ---- Status toggle ---- */}
            <div className="editor-field editor-status-field">
              <span className="font-label t-gold editor-field-label">Status</span>
              <button
                type="button"
                className={`editor-status-toggle${draft.active ? ' is-active' : ''}`}
                role="switch"
                aria-checked={draft.active}
                onClick={() => setDraft((prev) => ({ ...prev, active: !prev.active }))}
              >
                <span className="editor-status-toggle__knob">
                  <Crown size={14} />
                </span>
                <span className="editor-status-toggle__label font-label">
                  {draft.active ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </button>
              {VILLAGE_LINKED_SEATS[selected.id] && (
                <p className="font-body t-ghost editor-hint">
                  {VILLAGE_LINKED_SEATS[selected.id]}
                </p>
              )}
            </div>

            {/* ---- Engine (which backend this seat's tasks run through) ---- */}
            {selected.id !== 'seat-01' && (
              <div className="editor-field">
                <label className="font-label t-gold editor-field-label" htmlFor="editor-engine-input">
                  Engine
                </label>
                <select
                  id="editor-engine-input"
                  className="editor-input font-body"
                  value={draft.engine}
                  onChange={handleFieldChange('engine')}
                >
                  <option value="cloud">Cloud (Anthropic / ElevenLabs / Higgsfield)</option>
                  <option value="hermes">Local (Hermes Agent)</option>
                </select>
                {draft.engine === 'hermes' && (
                  <p className="font-body t-ghost editor-hint">
                    Runs on this machine via the local Hermes Agent, not the cloud APIs above —
                    free, but slower, and (for seat-07 specifically) unrestricted tool access.
                  </p>
                )}
              </div>
            )}

            {/* HOOK: agent task execution — a future pipeline runner/tester mounts here,
                reading the saved agent record (name/role/description/personality) for this seat. */}
            {selected.id === 'seat-01' && (
              <div className="editor-field">
                <hr className="rune-divider" />
                <label className="font-label t-gold editor-field-label">The Manager</label>
                <p className="font-body t-ghost editor-hint">
                  Arthur no longer runs a fixed pipeline from a button here — he oversees the
                  software-dev pipeline as a scheduled Claude Code session, conceiving small
                  product ideas, planning them step by step, and reviewing what Hermes builds.
                  See <code>docs/MANAGER-RUNBOOK.md</code> for what each wake-up does.
                </p>
                {managerProjects.length === 0 ? (
                  <p className="font-body t-ghost editor-hint">No projects yet.</p>
                ) : (
                  <ul className="editor-scout-results">
                    {managerProjects.map((p) => (
                      <li key={p.id} className="font-body">
                        <span className={p.status === 'complete' ? 't-gold' : p.status === 'blocked' ? 't-crimson' : 't-pale'}>
                          [{p.status}]
                        </span>{' '}
                        {p.name} <span className="t-ghost">— {(p.plan?.steps || []).filter((s) => s.status === 'complete').length}/{(p.plan?.steps || []).length} steps</span>
                      </li>
                    ))}
                  </ul>
                )}
                <PixelButton type="button" variant="ghost" size="sm" onClick={() => navigate('/')}>
                  See Projects on the Round Table →
                </PixelButton>
              </div>
            )}

            {selected.id === 'seat-12' && (
              <div className="editor-field">
                <hr className="rune-divider" />
                <label className="font-label t-gold editor-field-label" htmlFor="editor-cast-input">
                  Cast a Clip
                </label>
                <textarea
                  id="editor-cast-input"
                  className="editor-textarea font-body"
                  placeholder="A script beat for Merlin to turn into a clip…"
                  rows={2}
                  value={castPrompt}
                  onChange={(e) => setCastPrompt(e.target.value)}
                  disabled={casting}
                />
                <PixelButton type="button" onClick={handleCast} disabled={casting || !castPrompt.trim()}>
                  {casting ? 'Casting… (this can take a minute or two)' : 'Cast'}
                </PixelButton>
                {castError && <p className="font-body editor-hint" style={{ color: 'var(--crimson-bright)' }}>{castError}</p>}
                {castResult && castResult.videoUrl && (
                  <video
                    src={castResult.videoUrl}
                    controls
                    style={{ width: '100%', maxWidth: 320 }}
                  />
                )}
              </div>
            )}

            {selected.id === 'seat-06' && (
              <div className="editor-field">
                <hr className="rune-divider" />
                <label className="font-label t-gold editor-field-label" htmlFor="editor-scout-input">
                  Scout for Ideas
                </label>
                <input
                  id="editor-scout-input"
                  type="text"
                  className="editor-input font-body"
                  placeholder="Subreddits to ride out to, comma-separated (leave blank for the default list)"
                  value={scoutInput}
                  onChange={(e) => setScoutInput(e.target.value)}
                  disabled={scouting}
                />
                <PixelButton type="button" onClick={handleScout} disabled={scouting}>
                  {scouting ? 'Riding out…' : 'Scout'}
                </PixelButton>
                {scoutError && (
                  <p className="font-body editor-hint" style={{ color: 'var(--crimson-bright)' }}>
                    {scoutError}
                  </p>
                )}
                {scoutResult && scoutResult.errors && scoutResult.errors.length > 0 && (
                  <p className="font-body editor-hint" style={{ color: 'var(--crimson-bright)' }}>
                    {scoutResult.errors.join(' · ')}
                  </p>
                )}
                {scoutResult && scoutResult.candidates && scoutResult.candidates.length > 0 && (
                  <ul className="editor-scout-results">
                    {scoutResult.candidates.slice(0, 15).map((c) => (
                      <li key={c.sourceUrl} className="font-body">
                        <a href={c.sourceUrl} target="_blank" rel="noreferrer" className="t-pale">
                          {c.title}
                        </a>{' '}
                        <span className="t-ghost">— r/{c.subreddit} · #{c.rank}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {scoutResult && scoutResult.candidates && scoutResult.candidates.length === 0 && (
                  <p className="font-body t-ghost editor-hint">No candidates came back this ride.</p>
                )}
              </div>
            )}

            {selected.id === 'seat-07' && (
              <div className="editor-field">
                <hr className="rune-divider" />
                <label className="font-label t-gold editor-field-label" htmlFor="editor-script-input">
                  Give Hermes a Task
                </label>
                <p className="font-body t-ghost editor-hint">
                  Unrestricted — runs on the local machine with full shell/file/browser/MCP access, same as
                  running Hermes yourself in a terminal. Anything goes: draft a script, answer a question,
                  do something with a file. No approval prompts; every action he takes is auto-approved.
                </p>
                <PixelButton type="button" variant="ghost" size="sm" onClick={handleOpenHermesHall}>
                  Open Hermes&rsquo;s Chat Hall →
                </PixelButton>
                <p className="font-body t-ghost editor-hint">
                  For a one-off task, use the box below. For a standing conversation Hermes remembers
                  across messages, use the Hall instead.
                </p>
                {scoutCandidates.length > 0 && (
                  <select
                    className="editor-input font-body"
                    value=""
                    onChange={(e) => {
                      if (e.target.value) setScriptIdea(`Write a narration script and shot list for: ${e.target.value}`);
                    }}
                    disabled={scripting}
                  >
                    <option value="">— pull an idea from Sir Scout —</option>
                    {scoutCandidates.slice(0, 15).map((c) => (
                      <option key={c.sourceUrl} value={c.title}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                )}
                <textarea
                  id="editor-script-input"
                  className="editor-textarea font-body"
                  placeholder="Anything — draft a script, check a file, run a command…"
                  rows={2}
                  value={scriptIdea}
                  onChange={(e) => setScriptIdea(e.target.value)}
                  disabled={scripting}
                />
                {scripting ? (
                  <PixelButton type="button" variant="crimson" onClick={handleStopHermesTask}>
                    Stop
                  </PixelButton>
                ) : (
                  <PixelButton type="button" onClick={handleDraftScript} disabled={!scriptIdea.trim()}>
                    Send
                  </PixelButton>
                )}
                {scriptError && (
                  <p className="font-body editor-hint" style={{ color: 'var(--crimson-bright)' }}>
                    {scriptError}
                  </p>
                )}
                {scriptResult && scriptResult.result && (
                  <p className="font-body t-pale editor-hint" style={{ whiteSpace: 'pre-wrap' }}>
                    {scriptResult.result}
                  </p>
                )}
              </div>
            )}

            {selected.id === 'seat-02' && (
              <div className="editor-field">
                <hr className="rune-divider" />
                <label className="font-label t-gold editor-field-label" htmlFor="editor-factcheck-input">
                  Fact-Check a Script
                </label>
                {hagridScript && !factCheckInput && (
                  <PixelButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFactCheckInput(hagridScript)}
                  >
                    Pull Hermes&rsquo;s latest script
                  </PixelButton>
                )}
                <textarea
                  id="editor-factcheck-input"
                  className="editor-textarea font-body"
                  placeholder="Paste a script to verify its claims…"
                  rows={4}
                  value={factCheckInput}
                  onChange={(e) => setFactCheckInput(e.target.value)}
                  disabled={factChecking}
                />
                <PixelButton
                  type="button"
                  onClick={handleFactCheck}
                  disabled={factChecking || !factCheckInput.trim()}
                >
                  {factChecking ? 'Riding out to verify…' : 'Fact-Check'}
                </PixelButton>
                {factCheckError && (
                  <p className="font-body editor-hint" style={{ color: 'var(--crimson-bright)' }}>
                    {factCheckError}
                  </p>
                )}
                {factCheckResult && factCheckResult.claims && factCheckResult.claims.length > 0 && (
                  <ul className="editor-scout-results">
                    {factCheckResult.claims.map((c, i) => (
                      <li key={i} className="font-body">
                        <span
                          className={
                            c.verdict === 'confirmed'
                              ? 't-gold'
                              : c.verdict === 'disputed'
                                ? 't-crimson'
                                : 't-ghost'
                          }
                        >
                          [{c.verdict}]
                        </span>{' '}
                        {c.claim} — <span className="t-ghost">{c.note}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {factCheckResult && factCheckResult.claims && factCheckResult.claims.length === 0 && (
                  <p className="font-body t-ghost editor-hint">No checkable claims found.</p>
                )}
              </div>
            )}

            {selected.id === 'seat-03' && (
              <div className="editor-field">
                <hr className="rune-divider" />
                <label className="font-label t-gold editor-field-label" htmlFor="editor-miku-input">
                  Sing It
                </label>
                <textarea
                  id="editor-miku-input"
                  className="editor-textarea font-body"
                  placeholder="A line of script to voice, or a mood/style to compose music for…"
                  rows={2}
                  value={mikuInput}
                  onChange={(e) => setMikuInput(e.target.value)}
                  disabled={mikuBusy}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <PixelButton type="button" onClick={() => handleMiku('voice')} disabled={mikuBusy || !mikuInput.trim()}>
                    {mikuBusy ? 'Singing…' : 'Voiceover'}
                  </PixelButton>
                  <PixelButton
                    type="button"
                    variant="ghost"
                    onClick={() => handleMiku('music')}
                    disabled={mikuBusy || !mikuInput.trim()}
                  >
                    Compose Music
                  </PixelButton>
                </div>
                {mikuError && (
                  <p className="font-body editor-hint" style={{ color: 'var(--crimson-bright)' }}>
                    {mikuError}
                  </p>
                )}
                {mikuResult && mikuResult.audioUrl && (
                  <audio src={mikuResult.audioUrl} controls style={{ width: '100%' }} />
                )}
              </div>
            )}

            {selected.id === 'seat-04' && (
              <div className="editor-field">
                <hr className="rune-divider" />
                <label className="font-label t-gold editor-field-label" htmlFor="editor-teto-input">
                  Conjure a Sound
                </label>
                <textarea
                  id="editor-teto-input"
                  className="editor-textarea font-body"
                  placeholder="A sound to conjure, e.g. footsteps on gravel, a door creaking…"
                  rows={2}
                  value={tetoInput}
                  onChange={(e) => setTetoInput(e.target.value)}
                  disabled={tetoing}
                />
                <PixelButton type="button" onClick={handleTeto} disabled={tetoing || !tetoInput.trim()}>
                  {tetoing ? 'Conjuring…' : 'Conjure'}
                </PixelButton>
                {tetoError && (
                  <p className="font-body editor-hint" style={{ color: 'var(--crimson-bright)' }}>
                    {tetoError}
                  </p>
                )}
                {tetoResult && tetoResult.audioUrl && (
                  <audio src={tetoResult.audioUrl} controls style={{ width: '100%' }} />
                )}
              </div>
            )}

            {selected.id === 'seat-05' && (
              <div className="editor-field">
                <hr className="rune-divider" />
                <label className="font-label t-gold editor-field-label">Inspect the Work</label>
                <p className="font-body t-ghost editor-hint">
                  Pinches Merlin&rsquo;s, Miku&rsquo;s, and Teto&rsquo;s latest work from the pipeline
                  — checks every asset is reachable, and gives Merlin&rsquo;s still frame a visual
                  once-over.
                </p>
                <PixelButton type="button" onClick={handleCrabCheck} disabled={crabBusy}>
                  {crabBusy ? 'Pinching…' : 'Run QA'}
                </PixelButton>
                {crabError && (
                  <p className="font-body editor-hint" style={{ color: 'var(--crimson-bright)' }}>
                    {crabError}
                  </p>
                )}
                {crabResult && crabResult.assets && crabResult.assets.length > 0 && (
                  <ul className="editor-scout-results">
                    {crabResult.assets.map((a) => (
                      <li key={a.label} className="font-body">
                        <span className={a.reachable ? 't-gold' : 't-crimson'}>
                          [{a.reachable ? 'ok' : 'broken'}]
                        </span>{' '}
                        {a.label} {a.status ? `(${a.status})` : ''}
                        {a.error ? ` — ${a.error}` : ''}
                      </li>
                    ))}
                  </ul>
                )}
                {crabResult && crabResult.assets && crabResult.assets.length === 0 && (
                  <p className="font-body t-ghost editor-hint">Nothing generated yet to check.</p>
                )}
                {crabResult && crabResult.visual && (
                  <p className="font-body t-pale editor-hint">
                    <span className={crabResult.visual.orientationOk && crabResult.visual.renderOk && crabResult.visual.matchesPrompt ? 't-gold' : 't-crimson'}>
                      [visual]
                    </span>{' '}
                    {crabResult.visual.note}
                  </p>
                )}
              </div>
            )}

            {/* ---- Actions: wax-seal Save + Revert ---- */}
            <div className="editor-actions">
              <PixelButton type="button" variant="ghost" onClick={handleRevert} disabled={saving}>
                Revert
              </PixelButton>
              <button
                type="button"
                className={`editor-wax-seal${justSaved ? ' is-pressed' : ''}`}
                onClick={handleSave}
                disabled={saving}
                aria-label="Save agent"
              >
                <span className="editor-wax-seal__blob" />
                <Crown size={22} className="editor-wax-seal__crown" />
                <span className="editor-wax-seal__text font-label">
                  {saving ? 'SEALING…' : 'SAVE'}
                </span>
              </button>
            </div>
          </div>
        </PixelPanel>
      </div>
    </div>
  );
}
