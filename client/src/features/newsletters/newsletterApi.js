const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    },
    ...options
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const details = data?.errors?.join(" ") || data?.message;
    throw new Error(details || "Request failed.");
  }

  return data;
}

export function getNewsletters(filters = {}) {
  const query = new URLSearchParams();

  if (filters.search) query.set("search", filters.search);
  if (filters.country) query.set("country", filters.country);
  if (filters.status) query.set("status", filters.status);

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return request(`/newsletters${suffix}`);
}

export function createNewsletter(data) {
  return request("/newsletters", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export function updateNewsletter(id, data) {
  return request(`/newsletters/${id}`, {
    method: "PUT",
    body: JSON.stringify(data)
  });
}

export function deleteNewsletter(id) {
  return request(`/newsletters/${id}`, {
    method: "DELETE"
  });
}
