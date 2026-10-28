const STATUS_ICONS = {
  Open: "circle-dot",
  "In Progress": "hammer",
  Resolved: "circle-check",
};
const URGENCY_ICONS = {
  Low: "arrow-down",
  Medium: "minus",
  High: "arrow-up",
  Emergency: "triangle-exclamation",
};

const slug = (text) => String(text).toLowerCase().replace(/\s+/g, "-");

const statusIcon = (status) => STATUS_ICONS[status] ?? "circle";
const urgencyIcon = (urgency) => URGENCY_ICONS[urgency] ?? "minus";

const formatDate = (value) =>
  new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const formatDateTime = (value) =>
  new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const displayName = (person) => person?.name || person?.email || "Unknown";

// True when two things point at the same database record (ids or populated documents)
const sameId = (a, b) =>
  Boolean(a && b) && String(a._id ?? a) === String(b._id ?? b);

// Builds a dashboard link that keeps the current filters and changes some of them
const filterLink = (filters, changes = {}) => {
  const params = new URLSearchParams();
  Object.entries({ ...filters, ...changes }).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const query = params.toString();
  return query ? `/dashboard?${query}` : "/dashboard";
};

module.exports = {
  slug,
  statusIcon,
  urgencyIcon,
  formatDate,
  formatDateTime,
  displayName,
  sameId,
  filterLink,
};
