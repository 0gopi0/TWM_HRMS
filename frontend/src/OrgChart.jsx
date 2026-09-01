import { useEffect, useMemo, useState } from "react";

/* ─── Helpers ─────────────────────────────────────────────────────────── */
function initialsFor(name) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "?";
}

function findNode(nodes, id) {
  if (!nodes) return null;
  for (const n of nodes) {
    if (n.id === id) return n;
    const found = findNode(n.reports || [], id);
    if (found) return found;
  }
  return null;
}

function findParent(nodes, id, parent = null) {
  if (!nodes) return null;
  for (const n of nodes) {
    if (n.id === id) return parent;
    const found = findParent(n.reports || [], id, n);
    if (found) return found;
  }
  return null;
}

const STATUS_META = {
  active: { label: "Clocked in", cls: "active" },
  inactive: { label: "Off the clock", cls: "inactive" },
  on_leave: { label: "On leave", cls: "on_leave" },
};

function Chevron({ collapsed }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(90deg)", transition: "transform 0.15s ease" }}
      aria-hidden="true"
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

/* ─── Node ────────────────────────────────────────────────────────────── */
function OrgNode({ node, youId, selected, collapsedIds, onSelect, onToggle }) {
  const isYou = node.id === youId;
  const hasChildren = node.reports?.length > 0;
  const collapsed = collapsedIds.has(node.id);

  return (
    <li className={`org-node${isYou ? " you" : ""}${selected ? " selected" : ""}`}>
      <div
        className="org-row"
        role="button"
        tabIndex={0}
        aria-expanded={hasChildren ? !collapsed : undefined}
        aria-pressed={selected}
        onClick={() => onSelect(node.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect(node.id);
          }
        }}
      >
        <span className="org-avatar" aria-hidden="true">
          {initialsFor(node.name)}
        </span>
        <span className="org-identity">
          <strong>{node.name}</strong>
          {node.roleLabel ? <span className="org-role">{node.roleLabel}</span> : null}
        </span>
        {node.status && STATUS_META[node.status] ? (
          <span className={`org-status org-status--${STATUS_META[node.status].cls}`}>{STATUS_META[node.status].label}</span>
        ) : null}
        {isYou ? <span className="org-you-dot" title="You" aria-label="You" /> : null}
        {hasChildren ? (
          <button
            type="button"
            className={`org-toggle${collapsed ? " collapsed" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.id);
            }}
            aria-label={collapsed ? "Expand" : "Collapse"}
            title={collapsed ? "Expand" : "Collapse"}
          >
            <Chevron collapsed={collapsed} />
          </button>
        ) : null}
      </div>
      {hasChildren && !collapsed ? (
        <ul className="org-branch">
          {node.reports.map((child) => (
            <OrgNode
              key={child.id}
              node={child}
              youId={youId}
              selected={child.id === selected}
              collapsedIds={collapsedIds}
              onSelect={onSelect}
              onToggle={onToggle}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/* ─── Detail inspector ────────────────────────────────────────────────── */
function OrgDetail({ node, parent, youId, onSelect }) {
  if (!node) return null;
  const isYou = node.id === youId;
  const direct = node.reports || [];

  return (
    <aside className="org-detail">
      <div className="org-detail-head">
        <span className={`org-avatar lg${isYou ? " you" : ""}`} aria-hidden="true">
          {initialsFor(node.name)}
        </span>
        <div>
          <h3>{node.name}</h3>
          <p>{node.roleLabel || "Team member"}</p>
        </div>
        {node.status && STATUS_META[node.status] ? (
          <span className={`org-status org-status--${STATUS_META[node.status].cls}`}>{STATUS_META[node.status].label}</span>
        ) : null}
      </div>

      {parent ? (
        <p className="org-detail-line">
          <span>Reports to</span> <strong>{parent.name}</strong>
        </p>
      ) : (
        <p className="org-detail-line">
          <span>Position</span> <strong>Top of the reporting line</strong>
        </p>
      )}

      <div className="org-detail-stat">
        <strong>{direct.length}</strong>
        <span>Direct {direct.length === 1 ? "report" : "reports"}</span>
      </div>

      {direct.length ? (
        <div className="org-detail-team">
          <p className="org-detail-team-label">Team</p>
          <ul>
            {direct.map((r) => (
              <li key={r.id}>
                <button type="button" className="org-detail-person" onClick={() => onSelect(r.id)}>
                  <span className="org-avatar sm" aria-hidden="true">
                    {initialsFor(r.name)}
                  </span>
                  <span>
                    <strong>{r.name}</strong>
                    <span className="org-role">{r.roleLabel}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="org-detail-empty">No direct reports.</p>
      )}
    </aside>
  );
}

/* ─── Chart ───────────────────────────────────────────────────────────── */
export function OrgChart({ tree, youId }) {
  const [selectedId, setSelectedId] = useState(null);
  const [collapsedIds, setCollapsedIds] = useState(() => new Set());

  // Default selection: the logged-in person, so they are highlighted as active.
  const activeId = selectedId ?? youId;
  const selectedNode = useMemo(() => findNode(tree, activeId), [tree, activeId]);
  const selectedParent = useMemo(() => findParent(tree, activeId), [tree, activeId]);

  function toggle(id) {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (!tree?.length) return <p className="muted">No reporting lines yet.</p>;

  return (
    <div className="org-layout">
      <div className="org-chart" aria-label="Organization chart">
        <ul className="org-branch org-roots">
          {tree.map((node) => (
            <OrgNode
              key={node.id}
              node={node}
              youId={youId}
              selected={node.id === activeId}
              collapsedIds={collapsedIds}
              onSelect={setSelectedId}
              onToggle={toggle}
            />
          ))}
        </ul>
      </div>
      <OrgDetail node={selectedNode} parent={selectedParent} youId={youId} onSelect={setSelectedId} />
    </div>
  );
}
