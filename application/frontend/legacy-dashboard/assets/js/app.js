/* =====================================================================
 * VoiceBank Inclusive · VCB Admin Console — APP LOGIC
 * Render toàn bộ dashboard từ window.VB (mock data) và xử lý tương tác:
 * điều hướng, tìm kiếm, lọc, chọn phiên/ticket, hành động, mô phỏng real-time.
 * ===================================================================== */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* VB = toàn bộ dữ liệu nạp từ thư mục data/ (gán sau khi loadData() xong) */
  let VB = null;
  let ticketStatusMeta = {};
  let totalSessions = 186; // tổng phiên đang hoạt động (mô phỏng)

  /* ---------- Trạng thái runtime (mutate được khi thao tác) ---------- */
  let state = null;
  function buildState() {
    return {
      conversations: VB.conversations.map((c) => ({ ...c })),
      tickets: VB.tickets.map((t) => ({ ...t })),
      escalations: VB.escalations.map((e) => ({ ...e })),
      activeConv: VB.conversations[0].id,
      activeTicket: VB.tickets[0].id,
      ticketFilter: "all",
      convSearch: "",
      ticketSearch: "",
      alertSearch: "",
      period: "7d",
      security: VB.settings.security.map((s) => ({ ...s })),
      roles: VB.settings.roles.map((r) => ({ ...r })),
      ticketSeq: 6125,
      convTab: "chat",
      ticketTab: "summary",
      priorityFilter: "all",
      channelFilter: "all",
      notes: {},
      monPage: 1,
      tkPage: 1,
      selectedTickets: new Set()
    };
  }

  /* ---------- Nạp dữ liệu từ các file JSON trong data/ ---------- */
  async function loadData() {
    const files = ["config", "overview", "monitor", "tickets", "reports", "settings", "notifications"];
    const parts = {};
    await Promise.all(files.map(async (f) => {
      const res = await fetch("data/" + f + ".json", { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status + " · data/" + f + ".json");
      parts[f] = await res.json();
    }));
    return {
      periods: parts.config.periods,
      channelMeta: parts.config.channelMeta,
      statusMeta: parts.config.statusMeta,
      riskMeta: parts.config.riskMeta,
      ticketStatusMeta: parts.config.ticketStatusMeta,
      historyTemplate: parts.config.historyTemplate,
      overview: parts.overview,
      conversations: parts.monitor.conversations,
      monitorKpis: parts.monitor.monitorKpis,
      escalations: parts.monitor.escalations,
      tickets: parts.tickets.tickets,
      ticketFilters: parts.tickets.ticketFilters,
      ticketWidgets: parts.tickets.ticketWidgets,
      ticketThreads: parts.tickets.ticketThreads,
      reports: parts.reports,
      settings: parts.settings,
      notifications: parts.notifications.notifications
    };
  }

  function periodLabel(key) {
    const p = (VB.periods || []).find((x) => x.key === key);
    return p ? p.label : "7 ngày qua";
  }

  /* ---------- Toast ---------- */
  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2000);
  }
  window.toast = toast;

  /* ---------- Dropdown menu / popover dùng chung ---------- */
  let openPop = null;
  function closePop() { if (openPop) { openPop.remove(); openPop = null; document.removeEventListener("click", onDocClick, true); } }
  function onDocClick(e) { if (openPop && !openPop.contains(e.target) && e.target !== openPop._anchor) closePop(); }
  function popover(anchor, html, opts = {}) {
    closePop();
    const pop = document.createElement("div");
    pop.className = "menu-pop " + (opts.cls || "");
    pop.innerHTML = html;
    pop._anchor = anchor;
    document.body.appendChild(pop);
    const r = anchor.getBoundingClientRect();
    const w = pop.offsetWidth || 240;
    let left = opts.align === "right" ? r.right - w : r.left;
    left = Math.max(10, Math.min(left, window.innerWidth - w - 10));
    pop.style.left = left + window.scrollX + "px";
    pop.style.top = r.bottom + window.scrollY + 8 + "px";
    openPop = pop;
    setTimeout(() => document.addEventListener("click", onDocClick, true), 0);
    return pop;
  }
  function menu(anchor, items, onPick, opts = {}) {
    const html = items.map((it, i) =>
      `<button class="menu-item ${it.active ? "active" : ""}" data-i="${i}">${it.icon ? it.icon + " " : ""}${esc(it.label)}${it.active ? ' <span class="menu-check">✓</span>' : ""}</button>`).join("");
    const pop = popover(anchor, html, opts);
    pop.querySelectorAll(".menu-item").forEach((b) =>
      b.addEventListener("click", () => { const it = items[+b.dataset.i]; closePop(); onPick(it); }));
  }

  /* =====================================================================
   * Helpers vẽ biểu đồ từ dữ liệu
   * ===================================================================== */
  function lineChart(series, opts) {
    // series: [{points:[v...], color, fill}], opts:{labels,max,yTicks}
    const W = 620, H = 280, padL = 50, padR = 30, padT = 20, padB = 50;
    const max = opts.max;
    const n = opts.labels.length;
    const x = (i) => padL + (i * (W - padL - padR)) / (n - 1);
    const y = (v) => padT + (1 - v / max) * (H - padT - padB);
    let grid = "";
    const yTicks = opts.yTicks || 4;
    for (let i = 0; i <= yTicks; i++) {
      const gy = padT + (i * (H - padT - padB)) / yTicks;
      grid += `<line x1="${padL}" y1="${gy.toFixed(0)}" x2="${W - padR}" y2="${gy.toFixed(0)}"/>`;
    }
    let paths = "";
    series.forEach((s) => {
      const pts = s.points.map((v, i) => `${x(i).toFixed(0)},${y(v).toFixed(0)}`).join(" ");
      if (s.fill) {
        const area = `M${x(0).toFixed(0)} ${y(s.points[0]).toFixed(0)} ` +
          s.points.map((v, i) => `L${x(i).toFixed(0)} ${y(v).toFixed(0)}`).join(" ") +
          ` L${x(n - 1).toFixed(0)} ${(H - padB).toFixed(0)} L${x(0).toFixed(0)} ${(H - padB).toFixed(0)} Z`;
        paths += `<path d="${area}" fill="${s.fill}"/>`;
      }
      paths += `<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="4"/>`;
      if (s.dots) {
        paths += `<g fill="${s.color}" stroke="white" stroke-width="3">` +
          s.points.map((v, i) => `<circle cx="${x(i).toFixed(0)}" cy="${y(v).toFixed(0)}" r="6"/>`).join("") + `</g>`;
      }
    });
    let xlabels = opts.labels.map((l, i) => `<text x="${(x(i) - 18).toFixed(0)}" y="${H - 18}">${esc(l)}</text>`).join("");
    let valueLabels = "";
    if (opts.valueLabels) {
      valueLabels = `<g font-size="13" font-weight="800" fill="#1c2a22">` +
        series[0].points.map((v, i) => `<text x="${(x(i) - 16).toFixed(0)}" y="${(y(v) - 12).toFixed(0)}">${opts.valueLabels[i]}</text>`).join("") + `</g>`;
    }
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      <defs><linearGradient id="ag${opts.id || ""}" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#83ca55" stop-opacity=".30"/><stop offset="100%" stop-color="#83ca55" stop-opacity=".03"/></linearGradient></defs>
      <g stroke="#e4ebe5" stroke-width="1">${grid}</g>
      ${paths}
      <g font-size="13" fill="#63746b">${xlabels}</g>
      ${valueLabels}
    </svg>`;
  }

  function donutCss(items) {
    let acc = 0, stops = [];
    items.forEach((it) => { const from = acc; acc += it.pct; stops.push(`${it.color} ${from}% ${acc}%`); });
    return `conic-gradient(${stops.join(", ")})`;
  }

  function kpiCard(k) {
    return `<div class="card kpi"><div>
      <div class="kpi-label">${esc(k.label)}</div>
      <div class="kpi-value">${esc(k.value)}</div>
      <div class="delta ${k.dir}"><b>${esc(k.delta)}</b> ${esc(k.sub)}</div>
    </div><div class="kpi-icon ${k.iconCls || ""}">${k.icon}</div></div>`;
  }

  /* =====================================================================
   * TRANG: TỔNG QUAN
   * ===================================================================== */
  function renderOverview() {
    const o = VB.overview;
    const p = o.byPeriod[state.period] || o.byPeriod["7d"];
    $("#ov-kpis").innerHTML = p.kpis.map(kpiCard).join("");

    const maxK = p.traffic.values.map((v) => v.toLocaleString("vi-VN", { maximumFractionDigits: 1 }) + "K");
    $("#ov-traffic").innerHTML = lineChart(
      [{ points: p.traffic.values, color: "#006b3f", fill: "url(#agOv)", dots: true }],
      { labels: p.traffic.labels, max: p.traffic.max, id: "Ov", valueLabels: maxK }
    );

    $("#ov-donut").style.background = donutCss(p.requestMix);
    $("#ov-legend").innerHTML = p.requestMix.map((r) =>
      `<div class="legend-row"><span class="dot" style="background:${r.color}"></span><span>${esc(r.label)}</span><b style="margin-left:auto">${r.pct.toString().replace(".", ",")}%</b></div>`).join("");

    $("#ov-access").innerHTML = o.accessibility.map((a) =>
      `<div class="access-item"><div class="round">${a.round}</div><div><span>${esc(a.label)}</span><strong>${esc(a.value)}</strong></div><div class="delta up"><b>${esc(a.delta)}</b></div></div>`).join("");

    $("#ov-reasons").innerHTML = o.escalationReasons.map((r) =>
      `<div class="bar-row"><span>${esc(r.label)}</span><div class="track"><div class="fill" style="width:${r.pct}%"></div></div><b>${r.value.toLocaleString("vi-VN")}</b></div>`).join("");

    renderAlerts();
  }

  function renderAlerts() {
    const q = state.alertSearch.trim().toLowerCase();
    const list = VB.overview.alerts.filter((a) =>
      !q || a.type.toLowerCase().includes(q) || a.content.toLowerCase().includes(q) || a.level.toLowerCase().includes(q) || a.status.toLowerCase().includes(q));
    $("#ov-alerts").innerHTML = list.length ? list.map((a) =>
      `<tr><td>${esc(a.time)}</td><td><span class="badge ${a.levelClass}">${esc(a.level)}</span></td><td>${esc(a.type)}</td><td>${esc(a.content)}</td><td><span class="badge ${a.statusClass}">${esc(a.status)}</span></td></tr>`).join("")
      : `<tr><td colspan="5" class="empty">Không có cảnh báo khớp “${esc(state.alertSearch)}”.</td></tr>`;
  }

  /* Đổi kỳ thời gian (Hôm nay / 7 ngày / 30 ngày / Quý) — cập nhật KPI + biểu đồ */
  function applyPeriod(key) {
    if (!VB.overview.byPeriod[key] && key !== "today") key = "7d";
    state.period = key;
    syncPeriodLabels();
    renderOverview();
    renderReports();
    toast("📅 Đã áp dụng kỳ: " + periodLabel(key));
  }
  function syncPeriodLabels() {
    const lbl = periodLabel(state.period);
    $$(".js-daterange").forEach((b) => { b.textContent = "📅 " + lbl + "⌄"; });
    $$(".mini-select").forEach((b) => { b.textContent = lbl + "⌄"; });
  }

  /* =====================================================================
   * TRANG: GIÁM SÁT HỘI THOẠI
   * ===================================================================== */
  function renderMonitorKpis() {
    $("#mon-kpis").innerHTML = VB.monitorKpis.map(kpiCard).join("");
  }

  function convRow(c) {
    const ch = VB.channelMeta[c.channel], st = VB.statusMeta[c.status], rk = VB.riskMeta[c.risk];
    const sel = c.id === state.activeConv ? "selected" : "";
    return `<tr class="${sel}" data-conv="${c.id}">
      <td><span class="row-status ${rk.dot}"></span>${esc(c.id)}<br><small>${esc(c.time)}</small></td>
      <td>${esc(c.customer)}<br><small>${esc(c.phone)}</small></td>
      <td>${ch.icon} ${ch.label}</td>
      <td>${esc(c.intent)}</td>
      <td><span class="badge ${st.cls}">${st.label}</span></td>
      <td><span class="badge ${rk.cls}">${rk.label}</span></td>
      <td class="rowact" title="Xem chi tiết">👁 ⋯</td>
    </tr>`;
  }

  const MON_PAGE = 6;
  function filteredConvs() {
    const q = state.convSearch.trim().toLowerCase();
    return state.conversations.filter((c) =>
      (state.priorityFilter === "all" || c.risk === state.priorityFilter) &&
      (state.channelFilter === "all" || c.channel === state.channelFilter) &&
      (!q || c.id.toLowerCase().includes(q) || c.customer.toLowerCase().includes(q) || c.phone.replace(/\s/g, "").includes(q.replace(/\s/g, "")) || c.intent.toLowerCase().includes(q)));
  }
  function renderConvList() {
    const all = filteredConvs();
    const pages = Math.max(1, Math.ceil(all.length / MON_PAGE));
    if (state.monPage > pages) state.monPage = 1;
    const start = (state.monPage - 1) * MON_PAGE;
    const list = all.slice(start, start + MON_PAGE);
    const body = $("#mon-tbody");
    body.innerHTML = list.length ? list.map(convRow).join("") : `<tr><td colspan="7" class="empty">Không tìm thấy phiên phù hợp.</td></tr>`;
    $("#mon-count").textContent = totalSessions + " phiên";
    $("#mon-shown").textContent = all.length ? `Hiển thị ${start + 1}-${start + list.length} / ${totalSessions} phiên` : "Không có phiên phù hợp";
    $$("#mon-tbody tr[data-conv]").forEach((tr) =>
      tr.addEventListener("click", () => selectConv(tr.dataset.conv)));
    renderPager("#mon-pager", pages, state.monPage, (p) => { state.monPage = p; renderConvList(); });
  }

  function selectConv(id) {
    state.activeConv = id;
    const c = state.conversations.find((x) => x.id === id);
    if (!c) return;
    $$("#mon-tbody tr").forEach((tr) => tr.classList.toggle("selected", tr.dataset.conv === id));
    const ch = VB.channelMeta[c.channel], st = VB.statusMeta[c.status];
    $("#conv-head").innerHTML =
      `<div><b>${esc(c.id)}</b> ⧉<br><small style="color:var(--muted)">Kênh: ${ch.label} · Bắt đầu: ${esc(c.time)} · Thời lượng: ${esc(c.duration)}</small></div>
       <span class="badge ${st.cls}">${st.label}</span>`;
    renderConvTab();
  }

  function renderConvTab() {
    const c = state.conversations.find((x) => x.id === state.activeConv);
    if (!c) return;
    $$("#conv-tabs .tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === state.convTab));
    const body = $("#conv-body");
    const ch = VB.channelMeta[c.channel], rk = VB.riskMeta[c.risk];
    if (state.convTab === "chat") {
      const chat = c.transcript.map((m) => {
        const agent = m.who === "an" ? "agent" : "";
        const av = m.who === "an" ? "An" : "KH";
        return `<div class="msg ${agent}"><div class="avatar" style="width:34px;height:34px">${av}</div>
          <div class="bubble"><small>${esc(m.name)} · ${esc(m.time)}</small>${esc(m.text)}</div>
          <span class="badge ${m.moodCls}">${esc(m.mood)}</span></div>`;
      }).join("");
      body.innerHTML = `<div class="chat-box" id="conv-chat">${chat}</div>
        <div class="detail-grid">
          <div class="small-panel"><b>Ý định được phát hiện</b><br>${esc(c.intent)}<br><small>Độ tin cậy: ${c.intentConf}%</small><div class="progress"><span style="width:${c.intentConf}%"></span></div></div>
          <div class="small-panel"><b>Cảm xúc khách hàng</b><br>${esc(c.mood)}<br><small>Điểm cảm xúc: ${esc(c.moodScore)}</small><div class="progress"><span style="width:${c.moodPct}%"></span></div></div>
        </div>`;
      const cb = $("#conv-chat"); cb.scrollTop = cb.scrollHeight;
    } else if (state.convTab === "info") {
      body.innerHTML = infoPanel([
        ["Khách hàng", c.customer], ["Số điện thoại", c.phone], ["Kênh", ch.label],
        ["Phân khúc", "Gen Z · Khách hàng trẻ"], ["Trạng thái thẻ", "🟢 Đang hoạt động"],
        ["Số dư khả dụng", "•••• 6789 · đã ẩn (che PII)"], ["Ý định hiện tại", c.intent + ` (${c.intentConf}%)`],
        ["Mức rủi ro", rk.label], ["Cảm xúc", `${c.mood} (${c.moodScore})`]
      ]);
    } else if (state.convTab === "history") {
      body.innerHTML = `<div class="timeline">` + VB.historyTemplate.map((h) =>
        `<div class="tl-item"><span class="tl-dot"></span><div><b>${esc(h.time)}</b><br><small>${esc(h.text)}</small></div></div>`).join("") + `</div>`;
    } else if (state.convTab === "notes") {
      const val = state.notes[c.id] || "";
      body.innerHTML = `<div class="small-panel"><b>Ghi chú nội bộ · ${esc(c.id)}</b>
        <textarea id="conv-note" class="note-area" placeholder="Nhập ghi chú cho phiên này...">${esc(val)}</textarea>
        <button class="btn primary" id="conv-note-save" style="margin-top:10px">💾 Lưu ghi chú</button></div>`;
      $("#conv-note-save").addEventListener("click", () => {
        state.notes[c.id] = $("#conv-note").value;
        toast("💾 Đã lưu ghi chú cho phiên " + c.id);
      });
    }
  }

  function infoPanel(rows) {
    return `<div class="info-grid">` + rows.map((r) =>
      `<div class="info-row"><span>${esc(r[0])}</span><b>${esc(r[1])}</b></div>`).join("") + `</div>`;
  }

  function renderPager(sel, pages, current, onGo) {
    const wrap = $(sel);
    if (!wrap) return;
    const btn = (label, page, disabled, active) =>
      `<button class="pg ${active ? "active" : ""}" ${disabled ? "disabled" : ""} data-pg="${page}">${label}</button>`;
    let html = btn("‹", current - 1, current === 1, false);
    for (let p = 1; p <= pages; p++) html += btn(String(p), p, false, p === current);
    html += btn("›", current + 1, current === pages, false);
    wrap.innerHTML = html;
    wrap.querySelectorAll(".pg[data-pg]").forEach((b) =>
      b.addEventListener("click", () => { if (!b.disabled) onGo(+b.dataset.pg); }));
  }

  function renderEscQueue() {
    $("#mon-esc").innerHTML = state.escalations.map((e) =>
      `<tr><td>${esc(e.code)}</td><td>${esc(e.customer)}</td><td>${esc(e.reason)}</td>
       <td><span class="badge ${e.priorityCls}">${esc(e.priority)}</span></td>
       <td><span class="badge ${e.statusCls}">${esc(e.status)}</span></td><td>${esc(e.wait)}</td></tr>`).join("");
  }

  /* Hành động trên hội thoại đang chọn */
  function convAction(kind) {
    const c = state.conversations.find((x) => x.id === state.activeConv);
    if (!c) return;
    if (kind === "play") return toast("▶ Đang phát bản ghi hội thoại " + c.id);
    if (kind === "takeover") {
      c.status = "takenover";
      renderConvList(); selectConv(c.id);
      return toast("👤 Đã tiếp quản hội thoại " + c.id);
    }
    if (kind === "ticket") {
      const newId = "TK-2025-" + String(++state.ticketSeq).padStart(5, "0");
      state.tickets.unshift({
        id: newId, subject: c.intent, status: "new",
        customer: c.customer, phone: c.phone, channel: VB.channelMeta[c.channel].label,
        priority: c.risk === "high" ? "Cao" : c.risk === "medium" ? "Trung bình" : "Thấp",
        priorityCls: c.risk === "high" ? "red" : c.risk === "medium" ? "orange" : "green",
        sla: "1h 00m", slaNote: "Còn 1h", slaCls: "green",
        assignee: "Chưa giao", createdAt: "01/06/2025 10:45",
        aiSummary: `Ticket tạo từ phiên hội thoại ${c.id}. Khách hàng ${c.customer} với ý định “${c.intent}”, cảm xúc ${c.mood}.`,
        aiConf: c.intentConf,
        slaDetail: { state: "Còn 1h 00m", total: "1h 00m", pct: 5, deadline: "01/06/2025 11:45" },
        actions: ["Tiếp nhận và phân công xử lý", "Xác minh thông tin khách hàng", "Liên hệ lại khách hàng"]
      });
      state.activeTicket = newId;
      renderTicketFilters(); renderTicketTable(); selectTicket(newId);
      return toast("▣ Đã tạo ticket " + newId + " từ phiên " + c.id);
    }
    if (kind === "flag") {
      c.risk = "high";
      renderConvList(); selectConv(c.id);
      return toast("⚑ Đã đánh dấu rủi ro cao cho phiên " + c.id);
    }
  }

  /* =====================================================================
   * TRANG: TICKET HỖ TRỢ
   * (ticketStatusMeta được nạp từ data/config.json)
   * ===================================================================== */

  function renderTicketKpis() {
    $("#tk-kpis").innerHTML = [
      { label: "Ticket mở", value: "256", delta: "↑ 18,2%", sub: "so với tuần trước", dir: "up", icon: "👥" },
      { label: "SLA đúng hạn", value: "92,6%", delta: "↑ 3,8%", sub: "so với tuần trước", dir: "up", icon: "🛡" },
      { label: "Ticket ưu tiên cao", value: "38", delta: "↑ 5,3%", sub: "so với tuần trước", dir: "up", icon: "⚑", iconCls: "danger" },
      { label: "Thời gian xử lý trung bình", value: "1h 42m", delta: "↓ 8m", sub: "so với tuần trước", dir: "down", icon: "◷", iconCls: "warning" }
    ].map(kpiCard).join("");
  }

  function renderTicketFilters() {
    $("#tk-filters").innerHTML = VB.ticketFilters.map((f) =>
      `<button class="chip ${f.key === state.ticketFilter ? "active" : ""}" data-filter="${f.key}">${esc(f.label)} <b>${f.count}</b></button>`).join("") +
      `<button class="chip" style="margin-left:auto">☰ Bộ lọc</button><button class="chip">Mới nhất⌄</button>`;
    $$("#tk-filters .chip[data-filter]").forEach((b) =>
      b.addEventListener("click", () => { state.ticketFilter = b.dataset.filter; renderTicketFilters(); renderTicketTable(); }));
  }

  const TK_PAGE = 6;
  function filteredTickets() {
    const q = state.ticketSearch.trim().toLowerCase();
    return state.tickets.filter((t) =>
      (state.ticketFilter === "all" || t.status === state.ticketFilter) &&
      (!q || t.id.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q) || t.customer.toLowerCase().includes(q) || t.phone.replace(/\s/g, "").includes(q.replace(/\s/g, ""))));
  }
  function renderTicketTable() {
    const all = filteredTickets();
    const pages = Math.max(1, Math.ceil(all.length / TK_PAGE));
    if (state.tkPage > pages) state.tkPage = 1;
    const start = (state.tkPage - 1) * TK_PAGE;
    const list = all.slice(start, start + TK_PAGE);
    const body = $("#tk-tbody");
    body.innerHTML = list.length ? list.map((t) => {
      const st = ticketStatusMeta[t.status];
      const slaCell = t.slaNote ? `${esc(t.sla)}<br><span style="color:var(--${t.slaCls === "red" ? "red" : t.slaCls === "orange" ? "orange" : "green-800"})">${esc(t.slaNote)}</span>` : esc(t.sla);
      const checked = state.selectedTickets.has(t.id);
      return `<tr class="${t.id === state.activeTicket ? "selected" : ""}" data-ticket="${t.id}">
        <td><span class="cbox ${checked ? "on" : ""}" data-check="${t.id}">${checked ? "☑" : "□"}</span></td>
        <td>${esc(t.id)}</td><td>${esc(t.subject)}</td>
        <td>${esc(t.customer)}<br><small>${esc(t.phone)}</small></td>
        <td>${esc(t.channel)}</td>
        <td><span class="badge ${t.priorityCls}">${esc(t.priority)}</span></td>
        <td>${slaCell}</td><td>${esc(t.assignee)}</td>
        <td><span class="badge ${st.cls}">${st.label}</span></td></tr>`;
    }).join("") : `<tr><td colspan="9" class="empty">Không có ticket phù hợp bộ lọc.</td></tr>`;
    const selN = state.selectedTickets.size;
    $("#tk-shown").innerHTML = all.length
      ? `Hiển thị ${start + 1}-${start + list.length} / ${state.tickets.length} ticket` + (selN ? ` · <b style="color:var(--green-800)">đã chọn ${selN}</b>` : "")
      : "Không có ticket phù hợp bộ lọc";
    $$("#tk-tbody tr[data-ticket]").forEach((tr) =>
      tr.addEventListener("click", (e) => {
        if (e.target.classList.contains("cbox")) return;
        selectTicket(tr.dataset.ticket);
      }));
    $$("#tk-tbody .cbox[data-check]").forEach((cb) =>
      cb.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = cb.dataset.check;
        if (state.selectedTickets.has(id)) state.selectedTickets.delete(id); else state.selectedTickets.add(id);
        renderTicketTable();
      }));
    const sa = $("#tk-selectall");
    if (sa) sa.textContent = list.length && list.every((t) => state.selectedTickets.has(t.id)) ? "☑" : "□";
    renderPager("#tk-pager", pages, state.tkPage, (p) => { state.tkPage = p; renderTicketTable(); });
  }

  function selectTicket(id) {
    state.activeTicket = id;
    const t = state.tickets.find((x) => x.id === id);
    if (!t) return;
    $$("#tk-tbody tr").forEach((tr) => tr.classList.toggle("selected", tr.dataset.ticket === id));
    const st = ticketStatusMeta[t.status];
    $("#tk-detail-head").innerHTML =
      `<div><h2>${esc(t.id)} <span class="badge ${t.priorityCls}">${esc(t.priority)}</span></h2><h3 style="margin:6px 0 0">${esc(t.subject)}</h3></div><span class="badge ${st.cls}">${st.label}⌄</span>`;
    $("#tk-detail-meta").innerHTML = `${esc(t.customer)} · ${esc(t.phone)} · ${esc(t.channel)}<br>Tạo lúc ${esc(t.createdAt)}`;
    // cập nhật nhãn số trao đổi trên tab
    const threadTab = $('#tk-tabs .tab[data-tab="thread"]');
    if (threadTab) { const n = (VB.ticketThreads[t.id] || []).length; threadTab.textContent = "Trao đổi" + (n ? " " + n : ""); }
    renderTicketTab();
  }

  function renderTicketTab() {
    const t = state.tickets.find((x) => x.id === state.activeTicket);
    if (!t) return;
    $$("#tk-tabs .tab").forEach((el) => el.classList.toggle("active", el.dataset.tab === state.ticketTab));
    const body = $("#tk-body");
    if (state.ticketTab === "summary") {
      const sd = t.slaDetail;
      const slaColor = sd.pct >= 80 ? "linear-gradient(90deg,#f59e0b,#ef4444)" : "linear-gradient(90deg,#76c93e,#006b3f)";
      const slaTextColor = sd.state.includes("Quá hạn") ? "var(--red)" : "var(--green-800)";
      body.innerHTML =
        `<div class="small-panel"><b>✧ Tóm tắt AI</b><p style="line-height:1.55;margin:10px 0 0">${esc(t.aiSummary)}</p><small style="color:var(--muted)">Độ tin cậy: ${t.aiConf}%</small></div>
         <div class="small-panel" style="margin-top:12px"><b>SLA</b>
           <div style="display:flex;justify-content:space-between;margin-top:8px"><span style="color:${slaTextColor};font-weight:800">${esc(sd.state)}</span><span>${esc(sd.total)}</span></div>
           <div class="progress"><span style="width:${sd.pct}%;background:${slaColor}"></span></div>
           <small style="color:var(--muted)">Hạn SLA: ${esc(sd.deadline)}</small></div>
         <div class="small-panel" style="margin-top:12px"><b>Đề xuất hành động</b><p>${t.actions.map((a) => "✓ " + esc(a)).join("<br>")}</p></div>`;
    } else if (state.ticketTab === "thread") {
      const thread = VB.ticketThreads[t.id] || [];
      body.innerHTML = `<div class="chat-box" style="height:auto;max-height:430px;border:0;padding:0">` + (thread.length ? thread.map((m) => {
        const agent = m.who === "nv" ? "agent" : "";
        const av = m.who === "nv" ? "NV" : "KH";
        return `<div class="msg ${agent}"><div class="avatar" style="width:34px;height:34px">${av}</div>
          <div class="bubble"><small>${esc(m.name)} · ${esc(m.time)}</small>${esc(m.text)}</div></div>`;
      }).join("") : `<p class="empty">Chưa có trao đổi.</p>`) + `</div>`;
    } else if (state.ticketTab === "customer") {
      body.innerHTML = infoPanel([
        ["Khách hàng", t.customer], ["Số điện thoại", t.phone], ["Kênh tiếp nhận", t.channel],
        ["Phân khúc", "Gen Z · Khách hàng trẻ"], ["Trạng thái thẻ", "🟢 Đang hoạt động"],
        ["Internet Banking", "🟢 Đã kích hoạt"], ["Số dư khả dụng", "•••• · đã ẩn (che PII)"],
        ["Người phụ trách", t.assignee], ["Ngày tạo ticket", t.createdAt]
      ]);
    } else if (state.ticketTab === "history") {
      body.innerHTML = `<div class="timeline">` + VB.historyTemplate.map((h) =>
        `<div class="tl-item"><span class="tl-dot"></span><div><b>${esc(h.time)}</b><br><small>${esc(h.text)}</small></div></div>`).join("") + `</div>`;
    }
  }

  function ticketAction(kind) {
    const t = state.tickets.find((x) => x.id === state.activeTicket);
    if (!t) return;
    if (kind === "call") return toast("☎ Đang gọi lại khách hàng " + t.customer);
    if (kind === "assign") { t.assignee = "Operator VCB"; renderTicketTable(); selectTicket(t.id); return toast("👤 Đã giao ticket " + t.id + " cho nhân viên"); }
    if (kind === "email") return toast("✉ Đã gửi email cập nhật cho " + t.customer);
    if (kind === "close") { t.status = "closed"; renderTicketFilters(); renderTicketTable(); selectTicket(t.id); return toast("✓ Đã đóng ticket " + t.id); }
  }

  function renderTicketWidgets() {
    $("#tk-donut-channel").style.background = VB.ticketWidgets.byChannel.donut;
    $("#tk-donut-sla").style.background = VB.ticketWidgets.slaPerf.donut;
    $("#tk-topics").innerHTML = VB.ticketWidgets.topTopics.map((t) =>
      `<div class="bar-row" style="grid-template-columns:170px 1fr auto"><span>${esc(t.label)}</span><div class="track"><div class="fill" style="width:${t.pct}%"></div></div><b>${t.value}</b></div>`).join("");
  }

  /* =====================================================================
   * TRANG: BÁO CÁO
   * ===================================================================== */
  function renderReports() {
    const r = VB.reports;
    const p = r.byPeriod[state.period] || r.byPeriod["7d"];
    $("#rp-kpis").innerHTML = p.kpis.map(kpiCard).join("");

    $("#rp-usersession").innerHTML = lineChart([
      { points: p.userSession.users, color: "#006b3f" },
      { points: p.userSession.sessions, color: "#2f80ed" }
    ], { labels: p.userSession.labels, max: p.userSession.max, yTicks: 3, id: "Us" });

    // Biểu đồ cột chồng kênh sử dụng (tự dãn theo số cột của kỳ)
    const cu = p.channelUsage;
    const W = 460, H = 280, gx = 35, gy = 30;
    const base = 218, inner = 390, n = cu.series.length;
    const slot = inner / n, colW = Math.min(40, slot * 0.6);
    let bars = "";
    cu.series.forEach((col, i) => {
      const x = i * slot + (slot - colW) / 2;
      let yTop = base;
      col.forEach((v, j) => {
        const h = (v / 245) * base;
        yTop -= h;
        bars += `<rect x="${x.toFixed(0)}" y="${yTop.toFixed(0)}" width="${colW.toFixed(0)}" height="${h.toFixed(0)}" rx="3" fill="${cu.colors[j]}"/>`;
      });
    });
    $("#rp-channel-legend").innerHTML = cu.legend.map((l, i) =>
      `<span><span class="dot" style="background:${cu.colors[i]}"></span>${esc(l)}</span>`).join("");
    $("#rp-channel").innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><g transform="translate(${gx},${gy})">${bars}</g></svg>`;

    // Heatmap intent
    const hm = r.intentHeatmap;
    let head = "<tr><th>Ý định</th>" + hm.cols.map((c) => `<th>${esc(c)}</th>`).join("") + "</tr>";
    let rows = hm.rows.map((row) =>
      `<tr><td>${esc(row.name)}</td>` + row.values.map((v) => `<td>${v.toLocaleString("vi-VN")}</td>`).join("") + `<td>${row.total.toLocaleString("vi-VN")}</td></tr>`).join("");
    $("#rp-heatmap").innerHTML = `<thead>${head}</thead><tbody>${rows}</tbody>`;

    // Hiệu quả trợ năng
    $("#rp-access").innerHTML =
      `<thead><tr><th>Tính năng trợ năng</th><th>Người dùng</th><th>Tỷ lệ sử dụng</th><th>Hài lòng</th><th>Xu hướng</th></tr></thead><tbody>` +
      r.accessEffect.map((a) => {
        const pts = a.spark.map((v, i) => `${(i * 100 / 7).toFixed(0)},${v}`).join(" ");
        return `<tr><td>${esc(a.feature)}</td><td>${esc(a.users)}</td><td>${esc(a.rate)}</td><td>${esc(a.csat)}</td>
          <td><svg class="spark" viewBox="0 0 100 30"><polyline points="${pts}" fill="none" stroke="#16823e" stroke-width="3"/></svg></td></tr>`;
      }).join("") + `</tbody>`;

    // Bộ chỉ số mục tiêu (KPI)
    $("#rp-targets").innerHTML = r.targetKpis.map((k) =>
      `<div class="target-row"><span>${esc(k.metric)}</span><span class="t-target">${esc(k.target)}</span><b class="t-actual ${k.ok ? "ok" : "bad"}">${esc(k.actual)}</b><span class="t-badge ${k.ok ? "ok" : "bad"}">${k.ok ? "Đạt" : "Chưa đạt"}</span></div>`).join("");

    // Insights
    $("#rp-insights").innerHTML = r.insights.map((i) =>
      `<div class="insight"><div class="insight-icon">${i.icon}</div><div><b>${esc(i.title)}</b><p>${esc(i.text)}</p></div></div>`).join("");
  }

  /* =====================================================================
   * TRANG: CÀI ĐẶT
   * ===================================================================== */
  function renderSettings() {
    $("#st-roles").innerHTML = state.roles.map((r, i) => {
      const label = r.on ? r.state : "Tạm khóa";
      const cls = r.on ? r.cls : "red";
      return `<div class="access-item"><div><b>${esc(r.name)}</b><br><small>${esc(r.desc)}</small></div>
        <div style="display:flex;align-items:center;gap:10px"><span class="badge ${cls}">${esc(label)}</span>
        <button class="toggle ${r.on ? "on" : ""}" data-role="${i}" role="switch" aria-checked="${r.on}"><span class="knob"></span></button></div></div>`;
    }).join("");
    $("#st-security").innerHTML = state.security.map((s, i) =>
      `<div class="access-item"><div><b>${esc(s.name)}</b><br><small>${esc(s.desc)}</small></div>
        <button class="toggle ${s.on ? "on" : ""}" data-sec="${i}" role="switch" aria-checked="${s.on}"><span class="knob"></span></button></div>`).join("");
    $$("#st-security .toggle").forEach((b) =>
      b.addEventListener("click", () => {
        const i = +b.dataset.sec;
        state.security[i].on = !state.security[i].on;
        renderSettings();
        toast(`${state.security[i].on ? "Đã bật" : "Đã tắt"}: ${state.security[i].name}`);
      }));
    $$("#st-roles .toggle").forEach((b) =>
      b.addEventListener("click", () => {
        const i = +b.dataset.role;
        state.roles[i].on = !state.roles[i].on;
        renderSettings();
        toast(`Vai trò ${state.roles[i].name}: ${state.roles[i].on ? "đã kích hoạt" : "đã tạm khóa"}`);
      }));
  }

  /* =====================================================================
   * Điều hướng & wiring chung
   * ===================================================================== */
  function setupNav() {
    const navBtns = $$(".nav button");
    const pages = $$(".page");
    navBtns.forEach((btn) =>
      btn.addEventListener("click", () => {
        navBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        pages.forEach((p) => p.classList.remove("active"));
        $("#" + btn.dataset.page).classList.add("active");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }));
  }

  function setupActions() {
    // Hội thoại
    $("#conv-act-play").addEventListener("click", () => convAction("play"));
    $("#conv-act-takeover").addEventListener("click", () => convAction("takeover"));
    $("#conv-act-ticket").addEventListener("click", () => convAction("ticket"));
    $("#conv-act-flag").addEventListener("click", () => convAction("flag"));
    // Ticket
    $("#tk-act-call").addEventListener("click", () => ticketAction("call"));
    $("#tk-act-assign").addEventListener("click", () => ticketAction("assign"));
    $("#tk-act-email").addEventListener("click", () => ticketAction("email"));
    $("#tk-act-close").addEventListener("click", () => ticketAction("close"));
    // Tìm kiếm
    $("#mon-search").addEventListener("input", (e) => { state.convSearch = e.target.value; state.monPage = 1; renderConvList(); });
    $("#tk-search").addEventListener("input", (e) => { state.ticketSearch = e.target.value; state.tkPage = 1; renderTicketTable(); });
    $("#ov-search") && $("#ov-search").addEventListener("input", (e) => { state.alertSearch = e.target.value; renderAlerts(); });
    // Xuất báo cáo / nút data-toast
    $$("[data-toast]").forEach((b) => b.addEventListener("click", () => toast(b.dataset.toast)));
    // Đồng hồ thời gian thực ở Monitor
    $("#mon-clock") && updateClock();

    /* --- Tab chi tiết hội thoại --- */
    $$("#conv-tabs .tab").forEach((t) =>
      t.addEventListener("click", () => { state.convTab = t.dataset.tab; renderConvTab(); }));
    /* --- Tab chi tiết ticket --- */
    $$("#tk-tabs .tab").forEach((t) =>
      t.addEventListener("click", () => { state.ticketTab = t.dataset.tab; renderTicketTab(); }));

    /* --- Bộ lọc Ưu tiên / Kênh ở Giám sát --- */
    $("#mon-priority").addEventListener("click", (e) => {
      const opts = [["all", "Tất cả"], ["high", "Cao"], ["medium", "Trung bình"], ["low", "Thấp"]];
      menu(e.currentTarget, opts.map(([v, l]) => ({ label: l, value: v, active: state.priorityFilter === v })),
        (it) => { state.priorityFilter = it.value; state.monPage = 1; $("#mon-priority").innerHTML = "⚑ Ưu tiên: " + it.label + "⌄"; renderConvList(); });
    });
    $("#mon-channel").addEventListener("click", (e) => {
      const opts = [["all", "Tất cả"], ["chat", "Chat"], ["call", "Call"], ["zalo", "Zalo"], ["messenger", "Messenger"]];
      menu(e.currentTarget, opts.map(([v, l]) => ({ label: l, value: v, active: state.channelFilter === v })),
        (it) => { state.channelFilter = it.value; state.monPage = 1; $("#mon-channel").innerHTML = "👤 Kênh: " + it.label + "⌄"; renderConvList(); });
    });

    /* --- Chuông thông báo --- */
    $$("[data-notif]").forEach((bell) => {
      bell.setAttribute("data-count", VB.notifications.length);
      bell.addEventListener("click", (e) => {
        e.stopPropagation();
        const html = `<div class="menu-head">🔔 Thông báo <span class="badge green">${VB.notifications.length} mới</span></div>` +
          VB.notifications.map((n) =>
            `<div class="notif-item"><span class="notif-ic">${n.icon}</span><div><b>${esc(n.title)}</b><small>${esc(n.time)}</small><p>${esc(n.text)}</p></div></div>`).join("") +
          `<button class="menu-foot" data-clearnotif>Đánh dấu tất cả đã đọc</button>`;
        const pop = popover(e.currentTarget, html, { align: "right", cls: "notif-pop" });
        pop.querySelector("[data-clearnotif]").addEventListener("click", () => { closePop(); $$(".notif").forEach((n) => n.removeAttribute("data-count")); toast("✓ Đã đánh dấu tất cả thông báo là đã đọc"); });
      });
    });

    /* --- Chọn kỳ thời gian (date-range topbar + mini-select trên card) --- */
    const openPeriodMenu = (e) => {
      const items = VB.periods.map((p) => ({ label: p.label, value: p.key, active: state.period === p.key }));
      menu(e.currentTarget, items, (it) => applyPeriod(it.value));
    };
    $$(".js-daterange").forEach((b) => b.addEventListener("click", openPeriodMenu));
    $$(".mini-select").forEach((b) => b.addEventListener("click", openPeriodMenu));

    /* --- Thu gọn / mở rộng chi tiết hội thoại --- */
    $("#conv-collapse").addEventListener("click", () => {
      const c = $("#conv-collapsible");
      const collapsed = c.classList.toggle("collapsed");
      $("#conv-collapse").textContent = collapsed ? "+" : "−";
    });

    /* --- Chọn tất cả ticket (header) --- */
    $("#tk-selectall").addEventListener("click", () => {
      const visible = filteredTickets().slice((state.tkPage - 1) * TK_PAGE, (state.tkPage - 1) * TK_PAGE + TK_PAGE);
      const allOn = visible.length && visible.every((t) => state.selectedTickets.has(t.id));
      visible.forEach((t) => { if (allOn) state.selectedTickets.delete(t.id); else state.selectedTickets.add(t.id); });
      renderTicketTable();
      toast(allOn ? "Đã bỏ chọn" : `Đã chọn ${visible.length} ticket trên trang`);
    });

    /* --- Phím tắt ⌘K / Ctrl+K: focus ô tìm kiếm trang hiện tại --- */
    document.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const active = $(".page.active");
        const inp = active && active.querySelector(".search input");
        if (inp) inp.focus();
      }
    });
  }

  function updateClock() {
    // Đồng hồ demo tăng theo thời gian thực (bắt đầu từ mốc mô phỏng)
    let base = new Date(2025, 4, 26, 10, 42, 18);
    setInterval(() => {
      base = new Date(base.getTime() + 1000);
      const p = (n) => String(n).padStart(2, "0");
      const c = $("#mon-clock");
      if (c) c.textContent = `26/05/2025 ${p(base.getHours())}:${p(base.getMinutes())}:${p(base.getSeconds())}`;
    }, 1000);
  }

  /* Mô phỏng real-time: nhẹ nhàng dao động các KPI giám sát */
  function simulateRealtime() {
    setInterval(() => {
      totalSessions += Math.round(Math.sin(Date.now() / 9000) * 3);
      totalSessions = Math.max(170, Math.min(205, totalSessions));
      const kEl = $$("#mon-kpis .kpi-value")[0];
      if (kEl) kEl.textContent = String(totalSessions);
      const cnt = $("#mon-count");
      if (cnt) cnt.textContent = totalSessions + " phiên";
      const shown = $("#mon-shown");
      const rows = $$("#mon-tbody tr[data-conv]").length;
      if (shown) shown.textContent = `Hiển thị 1-${rows} / ${totalSessions} phiên`;
    }, 4000);
  }

  /* =====================================================================
   * Khởi tạo
   * ===================================================================== */
  function init() {
    state = buildState();
    ticketStatusMeta = VB.ticketStatusMeta;
    setupNav();
    syncPeriodLabels();
    renderOverview();
    renderMonitorKpis();
    renderConvList();
    selectConv(state.activeConv);
    renderEscQueue();
    renderTicketKpis();
    renderTicketFilters();
    renderTicketTable();
    selectTicket(state.activeTicket);
    renderTicketWidgets();
    renderReports();
    renderSettings();
    setupActions();
    simulateRealtime();
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") $("#toast").classList.remove("show"); });
  }

  /* Overlay báo lỗi nạp dữ liệu (thường do mở bằng file:// — cần chạy qua server) */
  function showLoadError(err) {
    const isFile = location.protocol === "file:";
    const box = document.createElement("div");
    box.className = "load-error";
    box.innerHTML = `<div class="load-error-card">
      <h2>⚠ Không nạp được dữ liệu</h2>
      ${isFile
        ? `<p>Trình duyệt chặn đọc file JSON khi mở trực tiếp bằng <code>file://</code>.<br>Hãy chạy qua một máy chủ cục bộ rồi mở <code>http://localhost:8080</code>:</p>
           <pre>cd vcb-admin-console
python3 -m http.server 8080</pre>`
        : `<p>Chi tiết: <code>${esc(err.message || err)}</code></p>`}
    </div>`;
    document.body.appendChild(box);
  }

  /* Bootstrap: nạp dữ liệu từ data/ rồi khởi tạo (chỉ chạy một lần) */
  let booted = false;
  function bootstrap() {
    if (booted) return;
    booted = true;
    loadData()
      .then((data) => { VB = data; init(); })
      .catch((err) => { console.error("loadData failed:", err); showLoadError(err); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bootstrap);
  else bootstrap();
})();
