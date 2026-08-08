import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createNewsletter,
  deleteNewsletter,
  getNewsletters,
  updateNewsletter
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
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {newsletters.map((newsletter) => (
                  <tr key={newsletter.id}>
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
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="link-button"
                          onClick={() => startEdit(newsletter)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="link-button danger"
                          onClick={() => handleDelete(newsletter)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

}
