const API_BASE = "/api";

const els = {
  tbody: document.getElementById("ticketsTbody"),
  empty: document.getElementById("emptyState"),
  statusFilter: document.getElementById("statusFilter"),
  searchInput: document.getElementById("searchInput"),
  refreshBtn: document.getElementById("refreshBtn"),
  openNewTicketBtn: document.getElementById("openNewTicketBtn"),

  ticketModal: document.getElementById("ticketModal"),
  modalTitle: document.getElementById("ticketModalTitle"),

  ticketForm: document.getElementById("ticketForm"),
  formError: document.getElementById("formError"),

  updateSection: document.getElementById("updateSection"),
  ticketReadout: document.getElementById("ticketReadout"),
  notesList: document.getElementById("notesList"),
  updateTicketId: document.getElementById("updateTicketId"),
  updateStatus: document.getElementById("updateStatus"),
  updateNotes: document.getElementById("updateNotes"),
  saveUpdateBtn: document.getElementById("saveUpdateBtn"),
  updateError: document.getElementById("updateError"),
  toast: document.getElementById("toast"),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (isNaN(d)) return isoString;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusBadge(status) {
  const styles = {
    Open: "pill pill--open",
    "In Progress": "pill pill--progress",
    Closed: "pill pill--closed",
  };
  const cls = styles[status] || "pill";
  return `<span class="${cls}">${escapeHtml(status)}</span>`;
}

function show(el) { if (el) el.hidden = false; }
function hide(el) { if (el) el.hidden = true; }

function setError(el, msg) {
  if (!el) return;
  el.textContent = msg;
  show(el);
}

// ---------------------------------------------------------------------------
// Modal open/close, mode switching
// ---------------------------------------------------------------------------

function openCreateModal() {
  els.modalTitle.textContent = "New ticket";
  els.ticketForm.reset();
  hide(els.formError);
  show(els.ticketForm);
  hide(els.updateSection);

  els.ticketModal.hidden = false;
  const firstInput = els.ticketForm.querySelector('input[name="customer_name"]');
  if (firstInput) firstInput.focus();
}

function openUpdateModal() {
  els.modalTitle.textContent = "Ticket details";
  hide(els.ticketForm);
  hide(els.formError);
  hide(els.updateError);
  hide(els.toast);
  show(els.updateSection);

  els.ticketModal.hidden = false;
}

function closeModal() {
  els.ticketModal.hidden = true;
  hide(els.updateError);
  hide(els.toast);
}

function bindModalClose() {
  els.ticketModal.querySelectorAll("[data-close='true']").forEach((n) => {
    n.addEventListener("click", closeModal);
  });
  els.ticketModal.addEventListener("click", (e) => {
    if (e.target && e.target.classList && e.target.classList.contains("modal__overlay")) {
      closeModal();
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !els.ticketModal.hidden) closeModal();
  });
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function renderTickets(tickets) {
  els.tbody.innerHTML = "";

  if (!tickets || tickets.length === 0) {
    show(els.empty);
    return;
  }
  hide(els.empty);

  for (const t of tickets) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <div style="display:flex;flex-direction:column;gap:4px;">
          <div style="font-weight:700;">${escapeHtml(t.ticket_id)}</div>
        </div>
      </td>
      <td>
        <div style="display:flex;flex-direction:column;gap:2px;">
          <div style="font-weight:600;">${escapeHtml(t.customer_name || "")}</div>
        </div>
      </td>
      <td>${escapeHtml(t.subject || "")}</td>
      <td>${statusBadge(t.status || "Open")}</td>
      <td>${formatDate(t.created_at)}</td>
      <td>
        <div style="display:flex;gap:10px;align-items:center;">
          <button class="btn btn--primary" type="button" data-action="view" data-id="${escapeHtml(t.ticket_id)}">Details / Update</button>
        </div>
      </td>
    `;

    tr.querySelector('button[data-action="view"]').addEventListener("click", () => {
      loadTicketDetails(t.ticket_id);
    });

    els.tbody.appendChild(tr);
  }
}

function renderReadout(t) {
  els.ticketReadout.innerHTML = `
    <div class="ticket-readout__row">
      <span class="ticket-readout__label">Ticket</span>
      <strong>${escapeHtml(t.ticket_id)}</strong>
    </div>
    <div class="ticket-readout__row">
      <span class="ticket-readout__label">Subject</span>
      <span>${escapeHtml(t.subject)}</span>
    </div>
    <div class="ticket-readout__row">
      <span class="ticket-readout__label">Customer</span>
      <span>${escapeHtml(t.customer_name)} — ${escapeHtml(t.customer_email)}</span>
    </div>
    <div class="ticket-readout__row">
      <span class="ticket-readout__label">Created</span>
      <span>${formatDate(t.created_at)}</span>
    </div>
    <div class="ticket-readout__row">
      <span class="ticket-readout__label">Status</span>
      ${statusBadge(t.status)}
    </div>
    <div>
      <div class="ticket-readout__label" style="margin-bottom:6px;">Description</div>
      <div class="ticket-readout__desc">${escapeHtml(t.description || "(no description)")}</div>
    </div>
  `;

  const notes = t.notes || [];
  els.notesList.innerHTML = notes.length
    ? notes
        .slice()
        .reverse()
        .map(
          (n) => `
            <div class="note-item">
              <div>${escapeHtml(n.note_text)}</div>
              <div class="note-item__time">${formatDate(n.created_at)}</div>
            </div>`
        )
        .join("")
    : `<div class="notes-empty">No notes yet.</div>`;
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

async function fetchTickets() {
  const params = new URLSearchParams();
  if (els.statusFilter.value) params.set("status", els.statusFilter.value);
  if (els.searchInput.value.trim()) params.set("search", els.searchInput.value.trim());

  const res = await fetch(`${API_BASE}/tickets?${params.toString()}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) throw new Error(`Failed to load tickets (${res.status})`);
  return await res.json();
}

async function fetchTicketDetail(ticketId) {
  const res = await fetch(`${API_BASE}/tickets/${encodeURIComponent(ticketId)}`);
  if (!res.ok) throw new Error(`Failed to load ticket (${res.status})`);
  return await res.json();
}

async function submitCreate(payload) {
  const res = await fetch(`${API_BASE}/tickets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    throw new Error(detail?.detail ? JSON.stringify(detail.detail) : `Create failed (${res.status})`);
  }
  return await res.json();
}

async function submitUpdate(ticketId, payload) {
  const res = await fetch(`${API_BASE}/tickets/${encodeURIComponent(ticketId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    throw new Error(detail?.detail ? JSON.stringify(detail.detail) : `Update failed (${res.status})`);
  }
  return await res.json();
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

async function refresh() {
  els.refreshBtn.disabled = true;
  try {
    const tickets = await fetchTickets();
    renderTickets(tickets);
  } catch (e) {
    console.error(e);
  } finally {
    els.refreshBtn.disabled = false;
  }
}

async function loadTicketDetails(ticketId) {
  try {
    const t = await fetchTicketDetail(ticketId);
    openUpdateModal();
    renderReadout(t);
    els.updateTicketId.value = t.ticket_id;
    els.updateStatus.value = t.status || "Open";
    els.updateNotes.value = "";
  } catch (e) {
    console.error(e);
    openUpdateModal();
    setError(els.updateError, e.message || String(e));
  }
}

// ---------------------------------------------------------------------------
// Event bindings
// ---------------------------------------------------------------------------

els.ticketForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hide(els.formError);

  const form = new FormData(els.ticketForm);
  const payload = {
    customer_name: (form.get("customer_name") || "").trim(),
    customer_email: (form.get("customer_email") || "").trim(),
    subject: (form.get("subject") || "").trim(),
    description: (form.get("description") || "").trim(),
  };

  try {
    await submitCreate(payload);
    closeModal();
    await refresh();
  } catch (err) {
    setError(els.formError, err.message || String(err));
  }
});

els.saveUpdateBtn.addEventListener("click", async () => {
  hide(els.updateError);
  hide(els.toast);

  const ticketId = els.updateTicketId.value;
  if (!ticketId) {
    setError(els.updateError, "No ticket selected.");
    return;
  }

  const note = (els.updateNotes.value || "").trim();
  const payload = { status: els.updateStatus.value };
  if (note) payload.note = note; // matches backend's TicketUpdate schema (singular "note")

  try {
    await submitUpdate(ticketId, payload);
    const t = await fetchTicketDetail(ticketId);
    renderReadout(t);
    els.updateNotes.value = "";
    els.toast.textContent = "Ticket updated.";
    show(els.toast);
    await refresh();
  } catch (err) {
    setError(els.updateError, err.message || String(err));
  }
});

els.refreshBtn.addEventListener("click", refresh);
els.statusFilter.addEventListener("change", refresh);

let searchDebounce;
els.searchInput.addEventListener("input", () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(refresh, 300);
});

els.openNewTicketBtn.addEventListener("click", openCreateModal);

bindModalClose();
refresh();
