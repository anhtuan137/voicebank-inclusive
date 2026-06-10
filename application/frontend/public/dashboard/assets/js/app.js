/* =====================================================================
 * VoiceBank Inclusive · VCB Admin Console — APP LOGIC v2
 * Toàn bộ dashboard từ window.VB (mock data):
 * - Font: Manrope (qua CSS)
 * - Icon: 2D SVG (không dùng emoji)
 * - Kênh: chỉ Bot
 * - State-driven: tất cả section cập nhật khi bộ lọc thay đổi
 * - KPI/số liệu tổng hợp từ state.tickets / state.conversations
 * - Đồng hồ GMT+7 thực
 * - Panel chi tiết: cố định chiều cao, cuộn bên trong
 * ===================================================================== */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  let VB = null;
  let ticketStatusMeta = {};
  let totalSessions = 186;

  /* ── 2D SVG icon library ── */
  const IC = {
    sessions: `<svg viewBox="0 0 24 24"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>`,
    bot:      `<svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M12 11V7m-4 0a4 4 0 0 1 8 0"/><circle cx="9" cy="16" r="1.2" fill="currentColor"/><circle cx="15" cy="16" r="1.2" fill="currentColor"/></svg>`,
    people:   `<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    smile:    `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9" stroke-width="3"/><line x1="15" y1="9" x2="15.01" y2="9" stroke-width="3"/></svg>`,
    shield:   `<svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>`,
    flag:     `<svg viewBox="0 0 24 24"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>`,
    clock:    `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    target:   `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
    warning:  `<svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17" stroke-width="3"/></svg>`,
    refresh:  `<svg viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`,
    access:   `<svg viewBox="0 0 24 24"><circle cx="12" cy="4" r="2"/><path d="M7 22l1.5-6L12 19l3.5-3L17 22"/><path d="M8 11a4 4 0 0 0 8 0"/><path d="M12 9v-3"/></svg>`,
    ticket:   `<svg viewBox="0 0 24 24"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/><line x1="9" y1="5" x2="9" y2="19" stroke-dasharray="4 3"/></svg>`,
    chart:    `<svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>`,
  };

  /* emoji → iconName map (để đọc dữ liệu JSON cũ có emoji) */
  const EMOJI_IC = {
    "🎧": "sessions", "🤖": "bot", "👥": "people", "😊": "smile",
    "▥": "sessions", "🎯": "target", "⚠": "warning", "◷": "clock",
    "🔁": "refresh", "♿": "access", "👤": "people", "🛡": "shield",
    "⚑": "flag", "🔊": "sessions"
  };

  /* ---------- State ---------- */
  let state = null;
  function buildState() {
    return {
      conversations: VB.conversations.map((c) => ({ ...c, channel: "bot" })), // normalise to bot
      tickets: VB.tickets.map((t) => ({ ...t })),
      escalations: VB.escalations.map((e) => ({ ...e })),
      activeConv: VB.conversations[0].id,
      activeTicket: VB.tickets[0].id,
      ticketFilter: "all",
      ticketSort: "newest",
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
      notes: {},
      monPage: 1,
      tkPage: 1,
      selectedTickets: new Set()
    };
  }

  /* ---------- Data load ---------- */

  const API_BASE = "http://localhost:18890/api/v1/dashboard";
  let _useApi = true;

  async function _fetchSection(name) {
    const res = await fetch(`${API_BASE}/${name}`, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status + " · " + name);
    return res.json();
  }

  async function loadData() {
    // Kiểm tra API có online không trước khi load
    try {
      const probe = await fetch("http://localhost:18890/health", {
        signal: AbortSignal.timeout(2000),
        cache: "no-store",
      });
      if (!probe.ok) throw new Error("API không phản hồi");
      console.info("[dashboard] API mode: mockapi OK");
    } catch (e) {
      throw new Error("Không kết nối được mockapi tại localhost:18890.\nHãy chạy: .venv/bin/python -m mockapi.server");
    }

    const files = ["config", "overview", "monitor", "tickets", "reports", "settings", "notifications"];
    const parts = {};
    await Promise.all(files.map(async (f) => { parts[f] = await _fetchSection(f); }));
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

  /* Gọi API tạo ticket (nếu đang dùng API mode) */
  async function apiCreateTicket(body) {
    if (!_useApi) return null;
    try {
      const res = await fetch(`${API_BASE}/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return res.ok ? res.json() : null;
    } catch { return null; }
  }

  /* Gọi API cập nhật ticket */
  async function apiUpdateTicket(id, patch) {
    if (!_useApi) return;
    try {
      await fetch(`${API_BASE}/tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
    } catch { /* silent */ }
  }

  function periodLabel(key) {
    const p = (VB.periods || []).find((x) => x.key === key);
    return p ? p.label : "7 ngày qua";
  }

  const PERIOD_DELTA_LABEL = { today: "hôm qua", "7d": "tuần trước", "30d": "tháng trước", quarter: "quý trước" };
  // Scale factors for each period relative to 7d baseline
  const PERIOD_SCALE = { today: 0.143, "7d": 1, "30d": 4.3, quarter: 13 };

  /* ---------- Toast ---------- */
  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
  }
  window.toast = toast;

  /* ---------- Dropdown / popover ---------- */
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
      `<button class="menu-item ${it.active ? "active" : ""}" data-i="${i}">${esc(it.label)}${it.active ? ' <span class="menu-check">✓</span>' : ""}</button>`).join("");
    const pop = popover(anchor, html, opts);
    pop.querySelectorAll(".menu-item").forEach((b) =>
      b.addEventListener("click", () => { const it = items[+b.dataset.i]; closePop(); onPick(it); }));
  }

  /* =====================================================================
   * Helpers — charts
   * ===================================================================== */
  function lineChart(series, opts) {
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
    const iconName = EMOJI_IC[k.icon] || k.iconName || "chart";
    const svg = IC[iconName] || IC.chart;
    return `<div class="card kpi"><div>
      <div class="kpi-label">${esc(k.label)}</div>
      <div class="kpi-value">${esc(k.value)}</div>
      <div class="delta ${k.dir}"><b>${esc(k.delta)}</b> ${esc(k.sub)}</div>
    </div><div class="kpi-icon ${k.iconCls || ""}">${svg}</div></div>`;
  }

  /* =====================================================================
   * TỔNG QUAN
   * ===================================================================== */
  const PERIOD_ESC_SCALE = { today: 0.143, "7d": 1, "30d": 4.3, quarter: 13 };

  function scaledEscalationReasons(period) {
    const s = PERIOD_ESC_SCALE[period] || 1;
    const base = VB.overview.escalationReasons;
    const maxVal = Math.round(base[0].value * s);
    return base.map((r) => {
      const v = Math.round(r.value * s);
      return { ...r, value: v, pct: Math.round((v / maxVal) * 78) };
    });
  }

  function scaledAccessibility(period) {
    // tỷ lệ % không thay đổi nhiều theo period, nhưng delta thay đổi
    const deltas = { today: ["↑ 0,3%", "↑ 0,2%", "↑ 0,5%"], "7d": ["↑ 2,1%", "↑ 1,3%", "↑ 3,4%"], "30d": ["↑ 3,8%", "↑ 2,9%", "↑ 5,2%"], quarter: ["↑ 6,4%", "↑ 5,1%", "↑ 8,7%"] };
    const d = deltas[period] || deltas["7d"];
    return VB.overview.accessibility.map((a, i) => ({ ...a, delta: d[i] || a.delta }));
  }

  function renderOverview() {
    const o = VB.overview;
    const p = o.byPeriod[state.period] || o.byPeriod["7d"];
    const d = PERIOD_DELTA_LABEL[state.period] || "kỳ trước";

    $("#ov-kpis").innerHTML = p.kpis.map(kpiCard).join("");

    const maxK = p.traffic.values.map((v) => v.toLocaleString("vi-VN", { maximumFractionDigits: 1 }) + "K");
    $("#ov-traffic").innerHTML = lineChart(
      [{ points: p.traffic.values, color: "#006b3f", fill: "url(#agOv)", dots: true }],
      { labels: p.traffic.labels, max: p.traffic.max, id: "Ov", valueLabels: maxK }
    );

    $("#ov-donut").style.background = donutCss(p.requestMix);
    $("#ov-legend").innerHTML = p.requestMix.map((r) =>
      `<div class="legend-row"><span class="dot" style="background:${r.color}"></span><span>${esc(r.label)}</span><b style="margin-left:auto">${r.pct.toString().replace(".", ",")}%</b></div>`).join("");

    // period-reactive: accessibility
    $("#ov-access").innerHTML = scaledAccessibility(state.period).map((a) =>
      `<div class="access-item"><div class="round">${esc(a.round)}</div><div><span>${esc(a.label)}</span><strong>${esc(a.value)}</strong></div><div class="delta up"><b>${esc(a.delta)}</b></div></div>`).join("");

    // period-reactive: escalation reasons
    $("#ov-reasons").innerHTML = scaledEscalationReasons(state.period).map((r) =>
      `<div class="bar-row"><span>${esc(r.label)}</span><div class="track"><div class="fill" style="width:${r.pct}%"></div></div><b>${r.value.toLocaleString("vi-VN")}</b></div>`).join("");

    renderAlerts();
  }

  function renderAlerts() {
    const q = state.alertSearch.trim().toLowerCase();
    const list = VB.overview.alerts.filter((a) =>
      !q || a.type.toLowerCase().includes(q) || a.content.toLowerCase().includes(q) ||
      a.level.toLowerCase().includes(q) || a.status.toLowerCase().includes(q));
    $("#ov-alerts").innerHTML = list.length ? list.map((a) =>
      `<tr><td>${esc(a.time)}</td><td><span class="badge ${a.levelClass}">${esc(a.level)}</span></td><td>${esc(a.type)}</td><td>${esc(a.content)}</td><td><span class="badge ${a.statusClass}">${esc(a.status)}</span></td></tr>`).join("")
      : `<tr><td colspan="5" class="empty">Không có cảnh báo khớp "${esc(state.alertSearch)}".</td></tr>`;
  }

  function applyPeriod(key) {
    if (!VB.overview.byPeriod[key] && key !== "today") key = "7d";
    state.period = key;
    syncPeriodLabels();
    renderOverview();
    renderTicketKpis();
    renderTicketWidgets();
    renderReports();
    toast("Đã áp dụng kỳ: " + periodLabel(key));
  }

  function syncPeriodLabels() {
    const lbl = periodLabel(state.period);
    $$(".js-daterange").forEach((b) => {
      // Only update non-whitespace text nodes (skip indentation nodes)
      [...b.childNodes].forEach((n) => {
        if (n.nodeType === 3 && n.nodeValue.trim()) n.nodeValue = " " + lbl + " ";
      });
    });
  }

  /* =====================================================================
   * GIÁM SÁT HỘI THOẠI
   * ===================================================================== */

  /* Tính toán KPI từ dữ liệu thực (filtered) */
  function computeMonitorKpis() {
    const convs = filteredConvs();
    const confAvg = convs.length
      ? Math.round(convs.reduce((s, c) => s + (c.intentConf || 90), 0) / convs.length)
      : 92;
    const needAction = convs.filter((c) => c.risk === "high").length;
    const d = state.priorityFilter !== "all" ? " (lọc)" : "";
    const activeSessions = state.priorityFilter === "all"
      ? totalSessions
      : Math.round(totalSessions * (state.priorityFilter === "high" ? 0.09 : state.priorityFilter === "medium" ? 0.28 : 0.63));
    return [
      { label: "Đang hoạt động", value: String(activeSessions), delta: "↑ 14,2%", sub: "so với 10 phút trước", dir: "up", iconName: "sessions" },
      { label: "Tỷ lệ bot hiểu đúng", value: confAvg + "%", delta: "↑ 3,6%", sub: "so với 1 giờ trước", dir: "up", iconName: "target" },
      { label: "Phiên cần can thiệp", value: String(needAction), delta: needAction > 2 ? "↑ " + needAction : "↓ 2", sub: "so với 10 phút trước", dir: needAction > 2 ? "up" : "down", iconName: "warning", iconCls: needAction > 2 ? "danger" : "" },
      { label: "Thời gian phản hồi TB", value: "3,2 giây", delta: "↓ 0,4 giây", sub: "so với 1 giờ trước", dir: "up", iconName: "clock" }
    ];
  }

  function renderMonitorKpis() {
    $("#mon-kpis").innerHTML = computeMonitorKpis().map(kpiCard).join("");
  }

  function convRow(c) {
    const st = VB.statusMeta[c.status], rk = VB.riskMeta[c.risk];
    const sel = c.id === state.activeConv ? "selected" : "";
    return `<tr class="${sel}" data-conv="${c.id}">
      <td><span class="row-status ${rk.dot}"></span>${esc(c.id)}<br><small>${esc(c.time)}</small></td>
      <td>${esc(c.customer)}<br><small>${esc(c.phone)}</small></td>
      <td><span class="badge green">Bot</span></td>
      <td>${esc(c.intent)}</td>
      <td><span class="badge ${st.cls}">${st.label}</span></td>
      <td><span class="badge ${rk.cls}">${rk.label}</span></td>
      <td class="rowact">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
      </td>
    </tr>`;
  }

  const MON_PAGE = 6;
  function filteredConvs() {
    const q = state.convSearch.trim().toLowerCase();
    return state.conversations.filter((c) =>
      (state.priorityFilter === "all" || c.risk === state.priorityFilter) &&
      (!q || c.id.toLowerCase().includes(q) || c.customer.toLowerCase().includes(q) ||
       c.phone.replace(/\s/g, "").includes(q.replace(/\s/g, "")) || c.intent.toLowerCase().includes(q)));
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
    $("#mon-shown").textContent = all.length
      ? `Hiển thị ${start + 1}-${start + list.length} / ${totalSessions} phiên`
      : "Không có phiên phù hợp";
    $$("#mon-tbody tr[data-conv]").forEach((tr) =>
      tr.addEventListener("click", () => selectConv(tr.dataset.conv)));
    renderPager("#mon-pager", pages, state.monPage, (p) => { state.monPage = p; renderConvList(); });
  }

  function selectConv(id) {
    state.activeConv = id;
    const c = state.conversations.find((x) => x.id === id);
    if (!c) return;
    $$("#mon-tbody tr").forEach((tr) => tr.classList.toggle("selected", tr.dataset.conv === id));
    const st = VB.statusMeta[c.status];
    $("#conv-head").innerHTML =
      `<div><b>${esc(c.id)}</b><br><small style="color:var(--muted)">Kênh: Bot · Bắt đầu: ${esc(c.time)} · Thời lượng: ${esc(c.duration)}</small></div>
       <span class="badge ${st.cls}">${st.label}</span>`;
    renderConvTab();
  }

  function renderConvTab() {
    const c = state.conversations.find((x) => x.id === state.activeConv);
    if (!c) return;
    $$("#conv-tabs .tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === state.convTab));
    const body = $("#conv-body");
    const rk = VB.riskMeta[c.risk];
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
      const cb = $("#conv-chat");
      if (cb) cb.scrollTop = cb.scrollHeight;
    } else if (state.convTab === "info") {
      body.innerHTML = infoPanel([
        ["Khách hàng", c.customer], ["Số điện thoại", c.phone], ["Kênh", "Bot"],
        ["Phân khúc", "Gen Z · Khách hàng trẻ"], ["Trạng thái thẻ", "Đang hoạt động"],
        ["Số dư khả dụng", "•••• 6789 · đã ẩn (che PII)"],
        ["Ý định hiện tại", c.intent + ` (${c.intentConf}%)`],
        ["Mức rủi ro", rk.label], ["Cảm xúc", `${c.mood} (${c.moodScore})`]
      ]);
    } else if (state.convTab === "history") {
      body.innerHTML = `<div class="timeline">` + VB.historyTemplate.map((h) =>
        `<div class="tl-item"><span class="tl-dot"></span><div><b>${esc(h.time)}</b><br><small>${esc(h.text)}</small></div></div>`).join("") + `</div>`;
    } else if (state.convTab === "notes") {
      const val = state.notes[c.id] || "";
      body.innerHTML = `<div class="small-panel"><b>Ghi chú nội bộ · ${esc(c.id)}</b>
        <textarea id="conv-note" class="note-area" placeholder="Nhập ghi chú cho phiên này...">${esc(val)}</textarea>
        <button class="btn primary" id="conv-note-save" style="margin-top:10px">Lưu ghi chú</button></div>`;
      $("#conv-note-save").addEventListener("click", () => {
        state.notes[c.id] = $("#conv-note").value;
        toast("Đã lưu ghi chú cho phiên " + c.id);
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

  function convAction(kind) {
    const c = state.conversations.find((x) => x.id === state.activeConv);
    if (!c) return;
    if (kind === "play") return toast("Đang phát bản ghi hội thoại " + c.id);
    if (kind === "takeover") {
      c.status = "takenover";
      renderConvList(); renderMonitorKpis(); selectConv(c.id);
      return toast("Đã tiếp quản hội thoại " + c.id);
    }
    if (kind === "ticket") {
      const newId = "TK-2025-" + String(++state.ticketSeq).padStart(5, "0");
      const prio = c.risk === "high" ? "Cao" : c.risk === "medium" ? "Trung bình" : "Thấp";
      const prioCls = c.risk === "high" ? "red" : c.risk === "medium" ? "orange" : "green";
      const newTicket = {
        id: newId, subject: c.intent, status: "new",
        customer: c.customer, phone: c.phone, channel: "Bot",
        priority: prio, priorityCls: prioCls,
        sla: "1h 00m", slaNote: "Còn 1h", slaCls: "green",
        assignee: "Chưa giao", createdAt: new Date().toLocaleDateString("vi-VN") + " (vừa tạo)",
        aiSummary: `Ticket từ phiên ${c.id}. Khách hàng ${c.customer} với ý định "${c.intent}", cảm xúc ${c.mood}.`,
        aiConf: c.intentConf,
        slaDetail: { state: "Còn 1h 00m", total: "1h 00m", pct: 5, deadline: "Còn 1 giờ" },
        actions: ["Tiếp nhận và phân công xử lý", "Xác minh thông tin khách hàng", "Liên hệ lại khách hàng"]
      };
      state.tickets.unshift(newTicket);
      // ghi vào DB nếu API online
      apiCreateTicket({
        subject: c.intent, customer: c.customer, phone: c.phone,
        priority: prio, priority_cls: prioCls,
        ai_summary: newTicket.aiSummary, ai_conf: c.intentConf,
        source_conv_id: c.id,
      });
      // cross-tab sync
      renderTicketKpis(); renderTicketFilters(); renderTicketTable(); selectTicket(newId); renderTicketWidgets();
      return toast("Đã tạo ticket " + newId + " từ phiên " + c.id);
    }
    if (kind === "flag") {
      c.risk = "high";
      renderConvList(); renderMonitorKpis(); selectConv(c.id);
      return toast("Đã đánh dấu rủi ro cao cho phiên " + c.id);
    }
  }

  /* =====================================================================
   * TICKET HỖ TRỢ
   * ===================================================================== */

  /* KPI tổng hợp từ state.tickets (không hardcode) */
  function renderTicketKpis() {
    const all = state.tickets;
    const open = all.filter((t) => t.status !== "closed");
    const slaOk = all.filter((t) => t.slaCls !== "red");
    const highPrio = all.filter((t) => t.priorityCls === "red");
    const slaRate = all.length ? (slaOk.length / all.length) * 100 : 92.6;

    const ps = PERIOD_SCALE[state.period] || 1;
    const d = PERIOD_DELTA_LABEL[state.period] || "kỳ trước";
    const openDisplay = ps > 1 ? Math.round(open.length * ps) : open.length;
    const highDisplay = ps > 1 ? Math.round(highPrio.length * ps) : highPrio.length;

    $("#tk-kpis").innerHTML = [
      { label: "Ticket mở", value: openDisplay.toLocaleString("vi-VN"), delta: "↑ 18,2%", sub: `so với ${d}`, dir: "up", iconName: "ticket" },
      { label: "SLA đúng hạn", value: slaRate.toFixed(1).replace(".", ",") + "%", delta: "↑ 3,8%", sub: `so với ${d}`, dir: "up", iconName: "shield" },
      { label: "Ticket ưu tiên cao", value: highDisplay.toLocaleString("vi-VN"), delta: "↑ 5,3%", sub: `so với ${d}`, dir: "up", iconName: "flag", iconCls: "danger" },
      { label: "Thời gian xử lý TB", value: "1h 42m", delta: "↓ 8m", sub: `so với ${d}`, dir: "down", iconName: "clock", iconCls: "warning" }
    ].map(kpiCard).join("");
  }

  /* count tickets by status from live state */
  function countByFilter(key) {
    if (key === "all") return state.tickets.length;
    return state.tickets.filter((t) => t.status === key).length;
  }

  function renderTicketFilters() {
    const SORT_LABELS = { newest: "Mới nhất", oldest: "Cũ nhất", priority: "Ưu tiên cao", sla: "SLA gần hết" };
    $("#tk-filters").innerHTML =
      VB.ticketFilters.map((f) =>
        `<button class="chip ${f.key === state.ticketFilter ? "active" : ""}" data-filter="${f.key}">${esc(f.label)} <b>${countByFilter(f.key)}</b></button>`
      ).join("") +
      `<button class="chip" style="margin-left:auto" id="tk-sort-btn">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="14" y2="12"/><line x1="4" y1="18" x2="10" y2="18"/></svg>
        Bộ lọc
      </button>
      <button class="chip" id="tk-sortorder-btn">
        ${esc(SORT_LABELS[state.ticketSort])}
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
      </button>`;

    $$("#tk-filters .chip[data-filter]").forEach((b) =>
      b.addEventListener("click", () => {
        state.ticketFilter = b.dataset.filter;
        state.tkPage = 1;
        renderTicketFilters(); renderTicketTable(); renderTicketWidgets();
      }));

    const sortBtn = $("#tk-sortorder-btn");
    if (sortBtn) {
      sortBtn.addEventListener("click", (e) => {
        const sorts = [
          { label: "Mới nhất", value: "newest" },
          { label: "Cũ nhất", value: "oldest" },
          { label: "Ưu tiên cao", value: "priority" },
          { label: "SLA gần hết", value: "sla" }
        ];
        menu(e.currentTarget, sorts.map((s) => ({ label: s.label, value: s.value, active: state.ticketSort === s.value })),
          (it) => { state.ticketSort = it.value; state.tkPage = 1; renderTicketFilters(); renderTicketTable(); });
      });
    }
  }

  const TK_PAGE = 6;
  function filteredTickets() {
    const q = state.ticketSearch.trim().toLowerCase();
    let result = state.tickets.filter((t) =>
      (state.ticketFilter === "all" || t.status === state.ticketFilter) &&
      (!q || t.id.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q) ||
       t.customer.toLowerCase().includes(q) || (t.phone || "").replace(/\s/g, "").includes(q.replace(/\s/g, ""))));

    // sorting
    const pMap = { red: 0, orange: 1, green: 2 };
    const sMap = { red: 0, orange: 1, green: 2 };
    if (state.ticketSort === "newest") result = [...result].sort((a, b) => b.id.localeCompare(a.id));
    else if (state.ticketSort === "oldest") result = [...result].sort((a, b) => a.id.localeCompare(b.id));
    else if (state.ticketSort === "priority") result = [...result].sort((a, b) => (pMap[a.priorityCls] || 2) - (pMap[b.priorityCls] || 2));
    else if (state.ticketSort === "sla") result = [...result].sort((a, b) => (sMap[a.slaCls] || 2) - (sMap[b.slaCls] || 2));
    return result;
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
      const slaCell = t.slaNote
        ? `${esc(t.sla)}<br><span style="color:var(--${t.slaCls === "red" ? "red" : t.slaCls === "orange" ? "orange" : "green-800"})">${esc(t.slaNote)}</span>`
        : esc(t.sla);
      const checked = state.selectedTickets.has(t.id);
      return `<tr class="${t.id === state.activeTicket ? "selected" : ""}" data-ticket="${t.id}">
        <td><span class="cbox ${checked ? "on" : ""}" data-check="${t.id}">${checked ? "☑" : "□"}</span></td>
        <td>${esc(t.id)}</td><td>${esc(t.subject)}</td>
        <td>${esc(t.customer)}<br><small>${esc(t.phone || "")}</small></td>
        <td><span class="badge green">${esc(t.channel || "Bot")}</span></td>
        <td><span class="badge ${t.priorityCls}">${esc(t.priority)}</span></td>
        <td>${slaCell}</td><td>${esc(t.assignee)}</td>
        <td><span class="badge ${st.cls}">${st.label}</span></td></tr>`;
    }).join("") : `<tr><td colspan="9" class="empty">Không có ticket phù hợp bộ lọc.</td></tr>`;

    const selN = state.selectedTickets.size;
    $("#tk-shown").innerHTML = all.length
      ? `Hiển thị ${start + 1}-${start + list.length} / ${state.tickets.length} ticket` +
        (selN ? ` · <b style="color:var(--green-800)">đã chọn ${selN}</b>` : "")
      : "Không có ticket phù hợp bộ lọc";

    $$("#tk-tbody tr[data-ticket]").forEach((tr) =>
      tr.addEventListener("click", (e) => { if (e.target.classList.contains("cbox")) return; selectTicket(tr.dataset.ticket); }));
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
      `<div><h2>${esc(t.id)} <span class="badge ${t.priorityCls}">${esc(t.priority)}</span></h2><h3 style="margin:6px 0 0">${esc(t.subject)}</h3></div>
       <span class="badge ${st.cls}">${st.label}</span>`;
    $("#tk-detail-meta").innerHTML = `${esc(t.customer)} · ${esc(t.phone || "")} · ${esc(t.channel || "Bot")}<br>Tạo lúc ${esc(t.createdAt)}`;
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
      const slaTextColor = (sd.state || "").includes("Quá") ? "var(--red)" : "var(--green-800)";
      body.innerHTML =
        `<div class="small-panel"><b>Tóm tắt AI</b><p style="line-height:1.55;margin:10px 0 0">${esc(t.aiSummary)}</p><small style="color:var(--muted)">Độ tin cậy: ${t.aiConf}%</small></div>
         <div class="small-panel" style="margin-top:12px"><b>SLA</b>
           <div style="display:flex;justify-content:space-between;margin-top:8px"><span style="color:${slaTextColor};font-weight:800">${esc(sd.state)}</span><span>${esc(sd.total)}</span></div>
           <div class="progress"><span style="width:${sd.pct}%;background:${slaColor}"></span></div>
           <small style="color:var(--muted)">Hạn SLA: ${esc(sd.deadline)}</small></div>
         <div class="small-panel" style="margin-top:12px"><b>Đề xuất hành động</b><p>${t.actions.map((a) => "✓ " + esc(a)).join("<br>")}</p></div>`;
    } else if (state.ticketTab === "thread") {
      const thread = VB.ticketThreads[t.id] || [];
      body.innerHTML = thread.length ? thread.map((m) => {
        const agent = m.who === "nv" ? "agent" : "";
        const av = m.who === "nv" ? "NV" : "KH";
        return `<div class="msg ${agent}"><div class="avatar" style="width:34px;height:34px">${av}</div>
          <div class="bubble"><small>${esc(m.name)} · ${esc(m.time)}</small>${esc(m.text)}</div></div>`;
      }).join("") : `<p class="empty">Chưa có trao đổi.</p>`;
    } else if (state.ticketTab === "customer") {
      body.innerHTML = infoPanel([
        ["Khách hàng", t.customer], ["Số điện thoại", t.phone || "—"], ["Kênh tiếp nhận", t.channel || "Bot"],
        ["Phân khúc", "Gen Z · Khách hàng trẻ"], ["Trạng thái thẻ", "Đang hoạt động"],
        ["Internet Banking", "Đã kích hoạt"], ["Số dư khả dụng", "•••• · đã ẩn (che PII)"],
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
    if (kind === "call") return toast("Đang gọi lại khách hàng " + t.customer);
    if (kind === "assign") {
      t.assignee = "Operator VCB";
      apiUpdateTicket(t.id, { assignee: "Operator VCB" });
      renderTicketTable(); selectTicket(t.id);
      return toast("Đã giao ticket " + t.id + " cho nhân viên");
    }
    if (kind === "email") return toast("Đã gửi email cập nhật cho " + t.customer);
    if (kind === "close") {
      t.status = "closed";
      apiUpdateTicket(t.id, { status: "closed" });
      renderTicketKpis(); renderTicketFilters(); renderTicketTable(); selectTicket(t.id); renderTicketWidgets();
      return toast("Đã đóng ticket " + t.id);
    }
  }

  /* Widgets tổng hợp từ filteredTickets (reactive) */
  function renderTicketWidgets() {
    const visible = filteredTickets();
    const total = visible.length || 1;

    // Channel distribution
    const chCount = {};
    visible.forEach((t) => { const k = t.channel || "Bot"; chCount[k] = (chCount[k] || 0) + 1; });
    const chColors = { "Bot": "#006b3f", "Ứng dụng": "#43aa52", "Call Center": "#2f80ed", "Email": "#f59e0b", "Khác": "#8b5cf6" };
    const chItems = Object.entries(chCount)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => ({ label: k, count: v, pct: Math.round((v / total) * 100), color: chColors[k] || "#94a3b8" }));

    if (chItems.length) {
      $("#tk-donut-channel").style.background = donutCss(chItems);
      $("#tk-channel-legend").innerHTML = chItems.map((c) =>
        `<div class="donut-legend-row"><span class="dot" style="background:${c.color}"></span>${esc(c.label)}<span>${c.pct}%</span></div>`).join("");
    } else {
      $("#tk-donut-channel").style.background = "#e0ebe3";
      $("#tk-channel-legend").innerHTML = `<div style="color:var(--muted);font-size:12px">Không có dữ liệu</div>`;
    }

    // SLA performance
    const slaOk = visible.filter((t) => t.slaCls !== "red").length;
    const slaFail = visible.length - slaOk;
    const slaOkPct = Math.round((slaOk / total) * 100);
    const slaFailPct = 100 - slaOkPct;
    $("#tk-donut-sla").style.background = donutCss([
      { pct: slaOkPct, color: "#006b3f" },
      { pct: slaFailPct, color: "#ef4444" }
    ]);
    $("#tk-sla-legend").innerHTML = [
      { label: "Đúng hạn", pct: slaOkPct, color: "#006b3f" },
      { label: "Quá hạn", pct: slaFailPct, color: "#ef4444" }
    ].map((c) => `<div class="donut-legend-row"><span class="dot" style="background:${c.color}"></span>${esc(c.label)}<span>${c.pct}%</span></div>`).join("");

    // Top topics
    const topicCount = {};
    visible.forEach((t) => { topicCount[t.subject] = (topicCount[t.subject] || 0) + 1; });
    const topTopics = Object.entries(topicCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const maxT = topTopics[0]?.[1] || 1;
    $("#tk-topics").innerHTML = topTopics.length
      ? topTopics.map(([label, value]) =>
          `<div class="bar-row" style="grid-template-columns:160px 1fr auto"><span>${esc(label)}</span><div class="track"><div class="fill" style="width:${Math.round((value / maxT) * 100)}%"></div></div><b>${value}</b></div>`
        ).join("")
      : `<p class="empty" style="padding:16px 0">Không có dữ liệu</p>`;
  }

  /* =====================================================================
   * BÁO CÁO
   * ===================================================================== */
  const PERIOD_HM_CFG = {
    today:   { cols: ["08h","10h","12h","14h","16h","18h","Tổng"], scale: 0.143 },
    "7d":    { cols: null, scale: 1 }, // dùng data gốc
    "30d":   { cols: ["Tuần 1","Tuần 2","Tuần 3","Tuần 4","Tuần 5","Tuần 6","Tổng"], scale: 4.3 },
    quarter: { cols: ["Tháng 4","Tháng 5","Tháng 6","Tổng"], scale: 13 }
  };

  function getHeatmapForPeriod(period) {
    const base = VB.reports.intentHeatmap;
    const cfg = PERIOD_HM_CFG[period] || PERIOD_HM_CFG["7d"];
    if (!cfg.cols) return base; // 7d dùng nguyên
    const nCols = cfg.cols.length - 1;
    const rows = base.rows.map((row) => {
      const scaledTotal = Math.round(row.total * cfg.scale);
      const vals = Array.from({ length: nCols }, (_, i) =>
        Math.round(scaledTotal / nCols * (0.9 + (i % 3) * 0.05)));
      return { name: row.name, values: vals, total: vals.reduce((a, b) => a + b, 0) };
    });
    return { cols: cfg.cols, rows };
  }

  function getAccessEffectForPeriod(period) {
    const base = VB.reports.accessEffect;
    const s = PERIOD_SCALE[period] || 1;
    return base.map((a) => {
      const rawNum = parseInt((a.users || "0").replace(/\./g, "").replace(",", ".")) || 0;
      const scaled = Math.round(rawNum * s);
      return { ...a, users: scaled.toLocaleString("vi-VN") };
    });
  }

  function getTargetKpisForPeriod(period) {
    const base = VB.reports.targetKpis;
    // Targets không đổi, chỉ slightly vary actual values for demo realism
    const variances = {
      today:   [87, 88, 4.6, 9.8, 34],
      "7d":    [87, 88.4, 4.6, 9.8, 34],
      "30d":   [86, 87.8, 4.5, 10.2, 33],
      quarter: [85, 87.1, 4.5, 10.5, 32]
    };
    const actuals = variances[period] || variances["7d"];
    const units = ["%", "%", "/5", "%", "%"];
    return base.map((k, i) => ({
      ...k,
      actual: actuals[i] ? (actuals[i] + (units[i] === "/5" ? " / 5" : units[i])) : k.actual,
      ok: k.ok
    }));
  }

  function renderReports() {
    const r = VB.reports;
    const p = r.byPeriod[state.period] || r.byPeriod["7d"];
    const d = PERIOD_DELTA_LABEL[state.period] || "kỳ trước";

    // KPIs
    $("#rp-kpis").innerHTML = p.kpis.map(kpiCard).join("");

    // User & session chart
    $("#rp-usersession").innerHTML = lineChart([
      { points: p.userSession.users, color: "#006b3f" },
      { points: p.userSession.sessions, color: "#2f80ed" }
    ], { labels: p.userSession.labels, max: p.userSession.max, yTicks: 3, id: "Us" });

    // Channel usage chart (Bot only — show single line)
    const cu = p.channelUsage;
    const W = 460, H = 280, gx = 35, gy = 30;
    const base2 = 218, inner = 390, n2 = cu.series.length;
    const slot = inner / n2, colW = Math.min(40, slot * 0.6);
    let bars = "";
    cu.series.forEach((col, i) => {
      const x = i * slot + (slot - colW) / 2;
      const v = col.reduce((s, c) => s + c, 0); // sum all as Bot total
      const h = (v / 245) * base2;
      bars += `<rect x="${x.toFixed(0)}" y="${(base2 - h).toFixed(0)}" width="${colW.toFixed(0)}" height="${h.toFixed(0)}" rx="3" fill="#006b3f" opacity="0.85"/>`;
    });
    $("#rp-channel-legend").innerHTML = `<span style="display:flex;align-items:center;gap:6px;font-size:13px"><span class="dot" style="background:#006b3f"></span>Bot (tổng phiên)</span>`;
    $("#rp-channel").innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><g transform="translate(${gx},${gy})">${bars}</g></svg>`;

    // Intent heatmap — period-reactive
    const hm = getHeatmapForPeriod(state.period);
    let head = "<tr><th>Ý định</th>" + hm.cols.map((c) => `<th>${esc(c)}</th>`).join("") + "</tr>";
    let rows2 = hm.rows.map((row) =>
      `<tr><td>${esc(row.name)}</td>` + row.values.map((v) => `<td>${v.toLocaleString("vi-VN")}</td>`).join("") +
      `<td>${row.total.toLocaleString("vi-VN")}</td></tr>`).join("");
    $("#rp-heatmap").innerHTML = `<thead>${head}</thead><tbody>${rows2}</tbody>`;

    // Access effect — period-reactive
    const accessData = getAccessEffectForPeriod(state.period);
    $("#rp-access").innerHTML =
      `<thead><tr><th>Tính năng trợ năng</th><th>Người dùng</th><th>Tỷ lệ sử dụng</th><th>Hài lòng</th><th>Xu hướng</th></tr></thead><tbody>` +
      accessData.map((a) => {
        const pts = a.spark.map((v, i) => `${(i * 100 / 7).toFixed(0)},${v}`).join(" ");
        return `<tr><td>${esc(a.feature)}</td><td>${esc(a.users)}</td><td>${esc(a.rate)}</td><td>${esc(a.csat)}</td>
          <td><svg class="spark" viewBox="0 0 100 30"><polyline points="${pts}" fill="none" stroke="#16823e" stroke-width="3"/></svg></td></tr>`;
      }).join("") + `</tbody>`;

    // KPI targets — period-reactive
    const targets = getTargetKpisForPeriod(state.period);
    $("#rp-targets").innerHTML = targets.map((k) =>
      `<div class="target-row"><span>${esc(k.metric)}</span><span class="t-target">${esc(k.target)}</span><b class="t-actual ${k.ok ? "ok" : "bad"}">${esc(k.actual)}</b><span class="t-badge ${k.ok ? "ok" : "bad"}">${k.ok ? "Đạt" : "Chưa đạt"}</span></div>`
    ).join("");

    // Insights
    $("#rp-insights").innerHTML = r.insights.map((ins) =>
      `<div class="insight"><div class="insight-icon">${esc(ins.icon)}</div><div><b>${esc(ins.title)}</b><p>${esc(ins.text)}</p></div></div>`).join("");
  }

  /* =====================================================================
   * CÀI ĐẶT
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
   * Navigation & wiring
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
    // Search
    $("#mon-search").addEventListener("input", (e) => {
      state.convSearch = e.target.value; state.monPage = 1;
      renderConvList(); renderMonitorKpis();
    });
    $("#tk-search").addEventListener("input", (e) => {
      state.ticketSearch = e.target.value; state.tkPage = 1;
      renderTicketTable(); renderTicketWidgets();
    });
    const ovs = $("#ov-search");
    if (ovs) ovs.addEventListener("input", (e) => { state.alertSearch = e.target.value; renderAlerts(); });

    // data-toast buttons
    $$("[data-toast]").forEach((b) => b.addEventListener("click", () => toast(b.dataset.toast)));

    // Đồng hồ thời gian thực GMT+7
    updateClock();

    // Conv tabs
    $$("#conv-tabs .tab").forEach((t) =>
      t.addEventListener("click", () => { state.convTab = t.dataset.tab; renderConvTab(); }));
    // Ticket tabs
    $$("#tk-tabs .tab").forEach((t) =>
      t.addEventListener("click", () => { state.ticketTab = t.dataset.tab; renderTicketTab(); }));

    // Bộ lọc Ưu tiên (Monitor)
    $("#mon-priority").addEventListener("click", (e) => {
      const opts = [["all", "Tất cả"], ["high", "Cao"], ["medium", "Trung bình"], ["low", "Thấp"]];
      menu(e.currentTarget,
        opts.map(([v, l]) => ({ label: l, value: v, active: state.priorityFilter === v })),
        (it) => {
          state.priorityFilter = it.value; state.monPage = 1;
          const lbl = $("#mon-priority-label");
          if (lbl) lbl.textContent = "Ưu tiên: " + it.label;
          renderConvList(); renderMonitorKpis();
        });
    });

    // Thông báo
    $$("[data-notif]").forEach((bell) => {
      bell.setAttribute("data-count", VB.notifications.length);
      bell.addEventListener("click", (e) => {
        e.stopPropagation();
        const html = `<div class="menu-head">Thông báo <span class="badge green">${VB.notifications.length} mới</span></div>` +
          VB.notifications.map((n) =>
            `<div class="notif-item"><span class="notif-ic">${esc(n.icon)}</span><div><b>${esc(n.title)}</b><small>${esc(n.time)}</small><p>${esc(n.text)}</p></div></div>`).join("") +
          `<button class="menu-foot" data-clearnotif>Đánh dấu tất cả đã đọc</button>`;
        const pop = popover(e.currentTarget, html, { align: "right", cls: "notif-pop" });
        pop.querySelector("[data-clearnotif]").addEventListener("click", () => {
          closePop();
          $$(".notif").forEach((n) => n.removeAttribute("data-count"));
          toast("Đã đánh dấu tất cả thông báo là đã đọc");
        });
      });
    });

    // Chọn kỳ thời gian
    const openPeriodMenu = (e) => {
      const items = VB.periods.map((p) => ({ label: p.label, value: p.key, active: state.period === p.key }));
      menu(e.currentTarget, items, (it) => applyPeriod(it.value));
    };
    $$(".js-daterange").forEach((b) => b.addEventListener("click", openPeriodMenu));
    $$(".mini-select").forEach((b) => b.addEventListener("click", openPeriodMenu));

    // Thu gọn chi tiết hội thoại
    $("#conv-collapse").addEventListener("click", () => {
      const c = $("#conv-collapsible");
      const collapsed = c.classList.toggle("collapsed");
      $("#conv-collapse").textContent = collapsed ? "+" : "−";
    });

    // Chọn tất cả ticket
    $("#tk-selectall").addEventListener("click", () => {
      const visible = filteredTickets().slice((state.tkPage - 1) * TK_PAGE, state.tkPage * TK_PAGE);
      const allOn = visible.length && visible.every((t) => state.selectedTickets.has(t.id));
      visible.forEach((t) => { if (allOn) state.selectedTickets.delete(t.id); else state.selectedTickets.add(t.id); });
      renderTicketTable();
      toast(allOn ? "Đã bỏ chọn" : `Đã chọn ${visible.length} ticket trên trang`);
    });

    // ⌘K focus search
    document.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const active = $(".page.active");
        const inp = active && active.querySelector(".search input");
        if (inp) inp.focus();
      }
      if (e.key === "Escape") { closePop(); $("#toast").classList.remove("show"); }
    });
  }

  /* Đồng hồ thực — GMT+7 Việt Nam */
  function updateClock() {
    function tick() {
      const now = new Date();
      // lấy giờ Việt Nam (Asia/Ho_Chi_Minh = UTC+7)
      const vnStr = now.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" });
      const vn = new Date(vnStr);
      const p = (n) => String(n).padStart(2, "0");
      const text = `${p(vn.getDate())}/${p(vn.getMonth() + 1)}/${vn.getFullYear()} ${p(vn.getHours())}:${p(vn.getMinutes())}:${p(vn.getSeconds())}`;
      const el = $("#mon-clock-text");
      if (el) el.textContent = text;
    }
    tick();
    setInterval(tick, 1000);
  }

  /* Mô phỏng real-time KPI dao động */
  function simulateRealtime() {
    setInterval(() => {
      totalSessions += Math.round(Math.sin(Date.now() / 9000) * 2);
      totalSessions = Math.max(175, Math.min(200, totalSessions));
      const kEl = $$("#mon-kpis .kpi-value")[0];
      if (kEl && state.priorityFilter === "all") kEl.textContent = String(totalSessions);
      const cnt = $("#mon-count");
      if (cnt) cnt.textContent = totalSessions + " phiên";
      const shown = $("#mon-shown");
      const rows = $$("#mon-tbody tr[data-conv]").length;
      if (shown && rows) shown.textContent = `Hiển thị 1-${rows} / ${totalSessions} phiên`;
    }, 4000);
  }

  /* =====================================================================
   * Bootstrap
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
  }

  function showLoadError(err) {
    const box = document.createElement("div");
    box.className = "load-error";
    box.innerHTML = `<div class="load-error-card">
      <h2>Không kết nối được database</h2>
      <p>${esc((err.message || err).replace(/\n/g, "<br>"))}</p>
      <div style="margin-top:16px;padding:14px 16px;background:#eef3ef;border-radius:10px;font-size:13px">
        <b>Khởi động mockapi:</b><br>
        <code>cd voicebank-inclusive</code><br>
        <code>.venv/bin/python -m mockapi.server</code>
      </div>
      <button onclick="location.reload()" style="margin-top:16px;padding:10px 20px;background:#006b3f;color:white;border:none;border-radius:10px;cursor:pointer;font-size:14px;font-weight:700">
        Thử lại
      </button>
    </div>`;
    document.body.appendChild(box);
  }

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
