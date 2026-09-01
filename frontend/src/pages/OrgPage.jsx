import { useEffect, useState } from "react";
import { useAuth } from "../auth.jsx";
import { api } from "../api.js";
import { OrgChart } from "../OrgChart.jsx";

export function OrgPage() {
  const { user } = useAuth();
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/v1/employees/org")
      .then((r) => setTree(r.tree || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Org chart</h1>
          <p className="page-sub">
            The full company tree. Leave approvals follow these reporting lines — your manager approves, then theirs, up to the owner.
          </p>
        </div>
      </div>
      <article className="card org-wrap">
        {error ? (
          <p className="error">{error}</p>
        ) : loading ? (
          <p className="muted">Loading org chart…</p>
        ) : (
          <OrgChart tree={tree} youId={user?.employee?.id} />
        )}
      </article>
    </div>
  );
}
