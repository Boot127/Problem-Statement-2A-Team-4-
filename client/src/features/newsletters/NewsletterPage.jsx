import React, {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";
import {
  createNewsletter,
  deleteNewsletter,
  getNewsletters,
  reviewNewsletter,
  summarizeNewsletter,
  updateNewsletter,
  uploadNewsletterFile
} from "./newsletterApi.js";
import "./NewsletterPage.css";

const EMPTY_FORM = {
  title: "",
  country: "",
  source: "",
  published_date: "",
  status: "pending",
  notes: ""
};

export default function NewsletterPage() {
  const [newsletters, setNewsletters] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [filters, setFilters] = useState({
    search: "",
    country: "",
    status: ""
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const countries = useMemo(
    () => [...new Set(newsletters.map((item) => item.country))].sort(),
    [newsletters]
  );

  const loadNewsletters = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getNewsletters(filters);
      setNewsletters(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const timer = setTimeout(loadNewsletters, 250);
    return () => clearTimeout(timer);
  }, [loadNewsletters]);

  function handleFormChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleFilterChange(event) {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      if (editingId) {
        await updateNewsletter(editingId, form);
        setMessage("Newsletter updated successfully.");
      } else {
        await createNewsletter(form);
        setMessage("Newsletter created successfully.");
      }

      resetForm();
      await loadNewsletters();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(newsletter) {
    setEditingId(newsletter.id);
    setForm({
      title: newsletter.title || "",
      country: newsletter.country || "",
      source: newsletter.source || "",
      published_date: newsletter.published_date || "",
      status: newsletter.status || "pending",
      notes: newsletter.notes || ""
    });
    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(newsletter) {
    const confirmed = window.confirm(
      `Delete "${newsletter.title}"? This demo uses soft delete.`
    );

    if (!confirmed) return;

    try {
      setError("");
      setMessage("");
      await deleteNewsletter(newsletter.id);
      setMessage("Newsletter deleted successfully.");

      if (editingId === newsletter.id) {
        resetForm();
      }

      await loadNewsletters();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="page-shell">
      <header className="page-header">
        <p className="eyebrow">HR Consultancy Legal Update System</p>
        <h1>Newsletter Management</h1>
        <p>
          Create, view, update and soft-delete labour-law newsletters before
          they are sent for AI summarisation and legal-change review.
        </p>
      </header>

      <section className="card">
        <h2>{editingId ? "Edit newsletter" : "Add newsletter"}</h2>

        <form className="newsletter-form" onSubmit={handleSubmit}>
          <label>
            Title *
            <input
              name="title"
              value={form.title}
              onChange={handleFormChange}
              required
              maxLength="150"
              placeholder="e.g. Singapore Employment Act Update"
            />
          </label>

          <label>
            Country *
            <input
              name="country"
              value={form.country}
              onChange={handleFormChange}
              required
              maxLength="80"
              placeholder="e.g. Singapore"
            />
          </label>

          <label>
            Source
            <input
              name="source"
              value={form.source}
              onChange={handleFormChange}
              maxLength="150"
              placeholder="e.g. Ministry newsletter"
            />
          </label>

          <label>
            Published date
            <input
              type="date"
              name="published_date"
              value={form.published_date}
              onChange={handleFormChange}
            />
          </label>

          <label>
            Status
            <select
              name="status"
              value={form.status}
              onChange={handleFormChange}
            >
              <option value="pending">Pending review</option>
              <option value="reviewed">Reviewed</option>
              <option value="archived">Archived</option>
            </select>
          </label>

          <label className="full-width">
            Notes
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleFormChange}
              rows="4"
              maxLength="1000"
              placeholder="Add a short note about the possible legal change."
            />
          </label>

          <div className="form-actions full-width">
            <button className="primary-button" type="submit" disabled={saving}>
              {saving
                ? "Saving..."
                : editingId
                  ? "Update newsletter"
                  : "Create newsletter"}
            </button>

            {editingId && (
              <button type="button" className="secondary-button" onClick={resetForm}>
                Cancel edit
              </button>
            )}
          </div>
        </form>

        {message && <p className="success-message">{message}</p>}
        {error && <p className="error-message">{error}</p>}
      </section>

      <section className="card">
        <div className="list-heading">
          <div>
            <h2>Saved newsletters</h2>
            <p>{newsletters.length} record(s) shown</p>
          </div>
        </div>

        <div className="filters">
          <input
            aria-label="Search newsletters"
            name="search"
            value={filters.search}
            onChange={handleFilterChange}
            placeholder="Search title, source or notes"
          />

          <input
            aria-label="Filter by country"
            name="country"
            value={filters.country}
            onChange={handleFilterChange}
            list="country-options"
            placeholder="Filter country"
          />
          <datalist id="country-options">
            {countries.map((country) => (
              <option value={country} key={country} />
            ))}
          </datalist>

          <select
            aria-label="Filter by status"
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="reviewed">Reviewed</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {loading ? (
          <p>Loading newsletters...</p>
        ) : newsletters.length === 0 ? (
          <p className="empty-state">No newsletters match the current filters.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Country</th>
                  <th>Source</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>AI review</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {newsletters.map((newsletter) => (
                  <NewsletterRow
                    key={newsletter.id}
                    newsletter={newsletter}
                    onEdit={() => startEdit(newsletter)}
                    onDelete={() => handleDelete(newsletter)}
                    onChanged={loadNewsletters}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

/**
 * One newsletter row, including the AI workflow controls: attach the
 * source document, run AI summarisation/flagging on it, then confirm or
 * dismiss the detected update (confirming links it to a compliance area).
 */
function NewsletterRow({ newsletter, onEdit, onDelete, onChanged }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [complianceArea, setComplianceArea] = useState(
    newsletter.linked_compliance_area || ""
  );
  const [busy, setBusy] = useState(false);
  const [rowError, setRowError] = useState("");

  async function handleUpload() {
    if (!selectedFile) return;

    try {
      setBusy(true);
      setRowError("");
      await uploadNewsletterFile(newsletter.id, selectedFile);
      setSelectedFile(null);
      await onChanged();
    } catch (err) {
      setRowError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleSummarize() {
    try {
      setBusy(true);
      setRowError("");
      await summarizeNewsletter(newsletter.id);
      await onChanged();
    } catch (err) {
      setRowError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleReview(decision) {
    if (decision === "confirmed" && !complianceArea.trim()) {
      setRowError(
        "Enter the compliance area/record this update relates to before confirming."
      );
      return;
    }

    try {
      setBusy(true);
      setRowError("");
      await reviewNewsletter(newsletter.id, decision, complianceArea.trim());
      await onChanged();
    } catch (err) {
      setRowError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const decision = newsletter.review_decision;

  return (
    <tr>
      <td>
        <strong>{newsletter.title}</strong>
        {newsletter.notes && <small>{newsletter.notes}</small>}
      </td>
      <td>{newsletter.country}</td>
      <td>{newsletter.source || "—"}</td>
      <td>{newsletter.published_date || "—"}</td>
      <td>
        <span className={`status status-${newsletter.status}`}>
          {newsletter.status}
        </span>
      </td>
      <td className="ai-cell">
        {newsletter.file_name ? (
          <p className="file-name">📎 {newsletter.file_name}</p>
        ) : (
          <div className="upload-controls">
            <input
              type="file"
              accept=".pdf,.txt,.docx"
              aria-label={`Attach source file for ${newsletter.title}`}
              onChange={(event) =>
                setSelectedFile(event.target.files?.[0] || null)
              }
            />
            <button
              type="button"
              className="secondary-button small"
              disabled={!selectedFile || busy}
              onClick={handleUpload}
            >
              Attach
            </button>
          </div>
        )}

        {newsletter.ai_summary ? (
          <div className="ai-summary">
            <p>{newsletter.ai_summary}</p>

            {newsletter.ai_flagged ? (
              <span className="flag-badge flagged">
                ⚠ Possible legal change
              </span>
            ) : (
              <span className="flag-badge">No change detected</span>
            )}

            {newsletter.ai_flag_reason && (
              <small>{newsletter.ai_flag_reason}</small>
            )}

            {newsletter.ai_flagged && decision === "pending" && (
              <div className="review-controls">
                <input
                  type="text"
                  placeholder="Linked compliance area (e.g. Singapore – Statutory Benefits)"
                  value={complianceArea}
                  onChange={(event) => setComplianceArea(event.target.value)}
                />
                <div className="review-buttons">
                  <button
                    type="button"
                    className="primary-button small"
                    disabled={busy}
                    onClick={() => handleReview("confirmed")}
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    className="secondary-button small"
                    disabled={busy}
                    onClick={() => handleReview("dismissed")}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {decision === "confirmed" && (
              <span className="decision-badge confirmed">
                ✓ Confirmed — linked to {newsletter.linked_compliance_area}
              </span>
            )}

            {decision === "dismissed" && (
              <span className="decision-badge dismissed">✕ Dismissed</span>
            )}
          </div>
        ) : (
          <button
            type="button"
            className="link-button"
            disabled={busy}
            onClick={handleSummarize}
          >
            Run AI summary + flag
          </button>
        )}

        {rowError && <p className="error-message small">{rowError}</p>}
      </td>
      <td>
        <div className="row-actions">
          <button type="button" className="link-button" onClick={onEdit}>
            Edit
          </button>
          <button
            type="button"
            className="link-button danger"
            onClick={onDelete}
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}
