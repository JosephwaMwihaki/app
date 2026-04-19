const STORAGE_KEY = "catering_ops_suite_v1";

const defaultFields = [
  { key: "businessName", label: "Business Name", placeholder: "Your Catering Co." },
  { key: "businessPhone", label: "Business Phone", placeholder: "+1 (555) 000-0000" },
  { key: "businessEmail", label: "Business Email", placeholder: "team@caterco.com" },
  { key: "customerName", label: "Customer Name", placeholder: "Client full name" },
  { key: "customerPhone", label: "Customer Phone", placeholder: "+1 (555) 111-1111" },
  { key: "customerEmail", label: "Customer Email", placeholder: "client@email.com" },
  { key: "eventLocation", label: "Event Location", placeholder: "Venue address" }
];

const state = loadState();

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return {
      fields: [...defaultFields],
      values: {},
      menu: [],
      quote: { meta: null, items: [] },
      shoppingNotes: [],
      invoice: null
    };
  }
  return JSON.parse(raw);
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function currency(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value || 0);
}

function el(id) {
  return document.getElementById(id);
}

function renderSettingsForm() {
  const form = el("settings-form");
  form.innerHTML = "";

  state.fields.forEach((field) => {
    const wrapper = document.createElement("div");
    wrapper.className = "field";

    const label = document.createElement("label");
    label.htmlFor = field.key;
    label.textContent = field.label;

    const input = document.createElement("input");
    input.id = field.key;
    input.name = field.key;
    input.placeholder = field.placeholder || "";
    input.value = state.values[field.key] || "";

    wrapper.append(label, input);
    form.appendChild(wrapper);
  });

  renderCustomFieldsList();
}

function renderCustomFieldsList() {
  const list = el("custom-fields-list");
  list.innerHTML = "";

  state.fields
    .filter((f) => !defaultFields.some((d) => d.key === f.key))
    .forEach((field) => {
      const item = document.createElement("li");
      item.textContent = field.label;

      const btn = document.createElement("button");
      btn.className = "remove";
      btn.textContent = "Remove";
      btn.onclick = () => {
        state.fields = state.fields.filter((f) => f.key !== field.key);
        delete state.values[field.key];
        saveState();
        renderSettingsForm();
      };

      item.append(" ", btn);
      list.appendChild(item);
    });
}

function renderMenu() {
  const tbody = el("menu-items");
  const select = document.querySelector("#quote-item-form select[name='menuItem']");
  tbody.innerHTML = "";
  select.innerHTML = "";

  state.menu.forEach((item) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.name}</td>
      <td>${item.category}</td>
      <td>${currency(item.price)}</td>
      <td><button class="remove" data-id="${item.id}">Delete</button></td>
    `;
    tr.querySelector("button").onclick = () => {
      state.menu = state.menu.filter((m) => m.id !== item.id);
      state.quote.items = state.quote.items.filter((line) => line.menuId !== item.id);
      saveState();
      renderAll();
    };
    tbody.appendChild(tr);

    const opt = document.createElement("option");
    opt.value = item.id;
    opt.textContent = `${item.name} (${currency(item.price)})`;
    select.appendChild(opt);
  });
}

function quoteTotals() {
  const subtotal = state.quote.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const serviceFee = Number(state.quote.meta?.serviceFee || 0);
  const total = subtotal + serviceFee;
  return { subtotal, serviceFee, total };
}

function renderQuote() {
  const tbody = el("quote-items");
  tbody.innerHTML = "";

  state.quote.items.forEach((line) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${line.name}</td>
      <td>${line.quantity}</td>
      <td>${currency(line.price)}</td>
      <td>${currency(line.price * line.quantity)}</td>
      <td><button class="remove" data-id="${line.id}">Remove</button></td>
    `;
    tr.querySelector("button").onclick = () => {
      state.quote.items = state.quote.items.filter((l) => l.id !== line.id);
      saveState();
      renderAll();
    };
    tbody.appendChild(tr);
  });

  const totals = quoteTotals();
  el("quote-subtotal").textContent = currency(totals.subtotal);
  el("quote-fee").textContent = currency(totals.serviceFee);
  el("quote-total").textContent = currency(totals.total);
}

function renderShopping() {
  const auto = el("shopping-auto");
  auto.innerHTML = "";
  state.quote.items.forEach((line) => {
    const li = document.createElement("li");
    li.textContent = `${line.quantity}x ${line.name}`;
    auto.appendChild(li);
  });

  const notes = el("shopping-notes");
  notes.innerHTML = "";
  state.shoppingNotes.forEach((note, index) => {
    const li = document.createElement("li");
    li.textContent = note;

    const btn = document.createElement("button");
    btn.className = "remove";
    btn.textContent = "Delete";
    btn.onclick = () => {
      state.shoppingNotes.splice(index, 1);
      saveState();
      renderShopping();
    };

    li.append(" ", btn);
    notes.appendChild(li);
  });
}

function renderInvoice() {
  const preview = el("invoice-preview");
  if (!state.invoice) {
    preview.classList.add("empty");
    preview.textContent = "No invoice created yet.";
    return;
  }

  const tpl = el("invoice-template").content.cloneNode(true);
  tpl.querySelector("[data-invoice-id]").textContent = state.invoice.invoiceId;
  tpl.querySelector("[data-issue-date]").textContent = state.invoice.issueDate;
  tpl.querySelector("[data-due-date]").textContent = state.invoice.dueDate;
  tpl.querySelector("[data-customer]").textContent = state.values.customerName || "-";
  tpl.querySelector("[data-business]").textContent = state.values.businessName || "-";

  const body = tpl.querySelector("[data-lines]");
  state.invoice.items.forEach((line) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${line.name}</td><td>${line.quantity}</td><td>${currency(line.price)}</td><td>${currency(line.price * line.quantity)}</td>`;
    body.appendChild(tr);
  });
  tpl.querySelector("[data-total]").textContent = currency(state.invoice.total);

  preview.classList.remove("empty");
  preview.innerHTML = "";
  preview.appendChild(tpl);
}

function renderAll() {
  renderSettingsForm();
  renderMenu();
  renderQuote();
  renderShopping();
  renderInvoice();
}

el("save-settings").onclick = () => {
  const data = new FormData(el("settings-form"));
  for (const [key, value] of data.entries()) {
    state.values[key] = value;
  }
  saveState();
};

el("menu-item-form").onsubmit = (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  state.menu.push({
    id: crypto.randomUUID(),
    name: fd.get("name").toString(),
    category: fd.get("category").toString(),
    price: Number(fd.get("price"))
  });
  e.target.reset();
  saveState();
  renderAll();
};

el("quote-meta").onsubmit = (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  state.quote.meta = {
    quoteId: fd.get("quoteId").toString(),
    eventDate: fd.get("eventDate").toString(),
    guests: Number(fd.get("guests")),
    serviceFee: Number(fd.get("serviceFee"))
  };
  saveState();
  renderQuote();
};

el("quote-item-form").onsubmit = (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const item = state.menu.find((m) => m.id === fd.get("menuItem"));
  if (!item) return;

  state.quote.items.push({
    id: crypto.randomUUID(),
    menuId: item.id,
    name: item.name,
    price: item.price,
    quantity: Number(fd.get("quantity"))
  });

  saveState();
  renderAll();
};

el("invoice-form").onsubmit = (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const source = fd.get("source");
  const items = source === "quote" ? [...state.quote.items] : [];
  const totals = quoteTotals();
  state.invoice = {
    invoiceId: fd.get("invoiceId").toString(),
    issueDate: fd.get("issueDate").toString(),
    dueDate: fd.get("dueDate").toString(),
    items,
    total: source === "quote" ? totals.total : 0
  };
  saveState();
  renderInvoice();
};

el("shopping-note-form").onsubmit = (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  state.shoppingNotes.push(fd.get("note").toString());
  e.target.reset();
  saveState();
  renderShopping();
};

el("custom-field-form").onsubmit = (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const key = fd.get("key").toString().trim();
  if (!key) return;

  if (state.fields.some((f) => f.key === key)) {
    alert("Field key already exists.");
    return;
  }

  state.fields.push({
    key,
    label: fd.get("label").toString().trim() || key,
    placeholder: fd.get("placeholder").toString().trim()
  });

  e.target.reset();
  saveState();
  renderSettingsForm();
};

el("reset-data").onclick = () => {
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
};

renderAll();
