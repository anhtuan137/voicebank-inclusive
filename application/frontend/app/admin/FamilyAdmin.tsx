"use client";
// Tab "An tâm Gia đình" (/admin) — port React của legacy-dashboard.
// Quản lý liên kết giám hộ (FAMILY_LINK) + cảnh báo gia đình.
//
// Bất biến nghiệp vụ (§7.5) được phản ánh trong UI:
//  • BR-FAM-01: liên kết chỉ active khi cha mẹ đồng ý ĐỒNG THỜI giọng nói + eKYC;
//    admin KHÔNG có nút kích hoạt thay cha mẹ.
//  • BR-FAM-02: không nút nào cho phép guardian/admin thao tác tiền của dependent.
//  • BR-FAM-04: cha mẹ thu hồi bất kỳ lúc nào → ngừng mọi thông báo.
//  • BR-FAM-05: số dư mặc định ẩn, chỉ bật khi cha mẹ opt-in.
//  • BR-FAM-06: trần 4 guardian / dependent.
import { useMemo, useState } from "react";
import {
  FAMILY_MAX_GUARDIANS,
  familyAlerts,
  familyFilters,
  familyKpis,
  familyLinks as seedLinks,
} from "./familyData";
import type { FamilyLink, FamilyStatus } from "./types";

const STATUS_META: Record<FamilyStatus, { label: string; cls: string }> = {
  active: { label: "Đang hoạt động", cls: "green" },
  pending: { label: "Chờ cha mẹ đồng ý", cls: "orange" },
  revoked: { label: "Đã thu hồi", cls: "gray" },
};

export default function FamilyAdmin({ toast }: { toast: (msg: string) => void }) {
  const [links, setLinks] = useState<FamilyLink[]>(() => seedLinks.map((l) => ({ ...l })));
  const [filter, setFilter] = useState<"all" | FamilyStatus>("all");
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string>(seedLinks[0].id);

  const counts = useMemo(() => {
    const m: Record<string, number> = { all: links.length };
    for (const l of links) m[l.status] = (m[l.status] || 0) + 1;
    return m;
  }, [links]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const norm = (s: string) => s.replace(/\s/g, "");
    return links.filter(
      (l) =>
        (filter === "all" || l.status === filter) &&
        (!q ||
          l.id.toLowerCase().includes(q) ||
          l.guardian.toLowerCase().includes(q) ||
          l.dependent.toLowerCase().includes(q) ||
          norm(l.guardianPhone).includes(norm(q)) ||
          norm(l.dependentPhone).includes(norm(q))),
    );
  }, [links, filter, search]);

  const active = links.find((l) => l.id === activeId) ?? null;
  const activeCount = links.filter((l) => l.status === "active").length;

  function mutate(id: string, patch: (l: FamilyLink) => FamilyLink) {
    setLinks((prev) => prev.map((l) => (l.id === id ? patch({ ...l }) : l)));
  }

  function toggleBalance(l: FamilyLink) {
    const next = !l.showBalance;
    mutate(l.id, (x) => ({ ...x, showBalance: next }));
    toast(next ? "Đã bật hiển thị số dư (opt-in cha mẹ)" : "Đã ẩn số dư với người trẻ");
  }

  function endLink(l: FamilyLink, kind: "cancel" | "revoke") {
    mutate(l.id, (x) => ({
      ...x,
      status: "revoked",
      showBalance: false,
      dependentGuardians: Math.max(0, x.dependentGuardians - 1),
      revokedAt: x.revokedAt ?? "01/06/2025 10:45",
    }));
    toast(
      kind === "cancel"
        ? `✕ Đã hủy yêu cầu liên kết ${l.id}`
        : `⛔ Đã thu hồi liên kết ${l.id} · người trẻ ngừng nhận mọi thông báo`,
    );
  }

  return (
    <>
      <div className="topbar">
        <div className="title">
          <h1>An tâm Gia đình</h1>
          <p>Quản lý liên kết giám hộ &amp; cảnh báo gia đình — &ldquo;nhận cảnh báo, không nhận quyền&rdquo;.</p>
        </div>
        <div className="tools">
          <div className="control">
            🔎
            <input
              placeholder="Tìm theo tên, SĐT, mã liên kết..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="control">📅 26/05/2025 - 01/06/2025⌄</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid4">
        {familyKpis.map((k) => (
          <div className="card kpi" key={k.label}>
            <div>
              <div className="kpi-label">{k.label}</div>
              <div className="kpi-value">{k.value}</div>
              <div className={`delta ${k.dir}`}>
                <b>{k.delta}</b> {k.sub}
              </div>
            </div>
            <div className={`kpi-icon ${k.iconCls ?? ""}`}>{k.icon}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="filter-row">
        {familyFilters.map((f) => (
          <button
            key={f.key}
            className={`chip ${f.key === filter ? "active" : ""}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label} <b>{counts[f.key] ?? 0}</b>
          </button>
        ))}
      </div>

      <div className="family-layout">
        {/* Bảng liên kết */}
        <div className="card">
          <div className="card-head">
            <h2>
              Liên kết gia đình <span className="badge green">{activeCount} đang hoạt động</span>
            </h2>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Mã liên kết</th>
                  <th>Người trẻ (guardian)</th>
                  <th>Cha mẹ (dependent)</th>
                  <th>Đồng thuận</th>
                  <th>Số dư</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td className="empty" colSpan={6}>
                      Không có liên kết phù hợp.
                    </td>
                  </tr>
                ) : (
                  filtered.map((l) => {
                    const st = STATUS_META[l.status];
                    return (
                      <tr
                        key={l.id}
                        className={l.id === activeId ? "selected" : ""}
                        onClick={() => setActiveId(l.id)}
                      >
                        <td>
                          {l.id}
                          <br />
                          <small>{l.createdAt}</small>
                        </td>
                        <td>
                          {l.guardian}
                          <br />
                          <small>
                            {l.guardianRel} · {l.guardianPhone}
                          </small>
                        </td>
                        <td>
                          {l.dependent}
                          <br />
                          <small>
                            {l.dependentRel} · {l.dependentPhone}
                          </small>
                        </td>
                        <td>
                          <ConsentBadge link={l} />
                        </td>
                        <td>
                          {l.showBalance ? (
                            <span className="badge blue">Hiện (opt-in)</span>
                          ) : (
                            <span className="badge gray">Ẩn</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${st.cls}`}>{st.label}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="footer">
            <span>
              {filtered.length
                ? `Hiển thị ${filtered.length} / ${links.length} liên kết`
                : "Không có liên kết phù hợp"}
            </span>
          </div>
        </div>

        {/* Panel chi tiết */}
        <div className="card">
          {active && <LinkDetail link={active} onToggleBalance={toggleBalance} onEnd={endLink} toast={toast} />}
        </div>
      </div>

      {/* Cảnh báo gia đình */}
      <div className="card" style={{ marginTop: 16 }}>
        <h2>
          Cảnh báo gia đình gần đây{" "}
          <small style={{ color: "var(--muted)", fontWeight: 600 }}>
            (đẩy đồng thời cho cha mẹ &amp; người trẻ — BR-FAM-07)
          </small>
        </h2>
        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table>
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Tài khoản cha mẹ</th>
                <th>Loại cảnh báo</th>
                <th>Mức độ</th>
                <th>Đẩy tới</th>
                <th>Độ trễ</th>
                <th>Trạng thái đọc</th>
              </tr>
            </thead>
            <tbody>
              {familyAlerts.map((a, i) => (
                <tr key={i} style={{ cursor: "default" }}>
                  <td>{a.time}</td>
                  <td>{a.dependent}</td>
                  <td>{a.type}</td>
                  <td>
                    <span className={`badge ${a.levelClass}`}>{a.level}</span>
                  </td>
                  <td>{a.channels}</td>
                  <td>{a.latency}</td>
                  <td>
                    <span className={`badge ${a.readClass}`}>{a.read}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function ConsentBadge({ link: l }: { link: FamilyLink }) {
  if (l.status === "revoked") return <span className="badge gray">Đã rút lại</span>;
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      <span className={`badge ${l.voiceOk ? "green" : "gray"}`}>{l.voiceOk ? "✓" : "○"} Giọng nói</span>
      <span className={`badge ${l.ekycOk ? "green" : "gray"}`}>{l.ekycOk ? "✓" : "○"} eKYC</span>
    </div>
  );
}

function LinkDetail({
  link: l,
  onToggleBalance,
  onEnd,
  toast,
}: {
  link: FamilyLink;
  onToggleBalance: (l: FamilyLink) => void;
  onEnd: (l: FamilyLink, kind: "cancel" | "revoke") => void;
  toast: (msg: string) => void;
}) {
  const st = STATUS_META[l.status];
  return (
    <>
      <div className="card-head">
        <div>
          <h2>
            {l.id} <span className={`badge ${st.cls}`}>{st.label}</span>
          </h2>
          <h3 style={{ margin: "6px 0 0", fontSize: 15 }}>
            {l.guardian} → {l.dependent}
          </h3>
        </div>
      </div>
      <div style={{ color: "var(--muted)", marginBottom: 12, fontSize: 13 }}>
        Người trẻ: {l.guardianRel} · {l.guardianPhone}
        <br />
        Cha mẹ: {l.dependentRel} · {l.dependentPhone}
      </div>

      <div className="small-panel">
        <b>🔐 Đồng thuận hai phía (BR-FAM-01)</b>
        <p>
          Liên kết chỉ kích hoạt khi cha mẹ đồng ý <b>đồng thời</b> bằng <b>giọng nói + eKYC</b> (liveness + so
          khớp). Admin không thể bỏ qua hoặc xác nhận thay cha mẹ.
        </p>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <span className={`badge ${l.voiceOk ? "green" : "orange"}`}>
            {l.voiceOk ? "✓ Giọng nói đạt" : "○ Chờ giọng nói"}
          </span>
          <span className={`badge ${l.ekycOk ? "green" : "orange"}`}>{l.ekycOk ? "✓ eKYC đạt" : "○ Chờ eKYC"}</span>
        </div>
      </div>

      <div className="info-grid" style={{ marginTop: 12 }}>
        {l.status === "active" && (
          <>
            <div className="info-row">
              <span>Bản ghi CONSENT</span>
              <b>{l.consentId} · scope=family_link</b>
            </div>
            <div className="info-row">
              <span>Đồng ý lúc (granted_at)</span>
              <b>{l.grantedAt}</b>
            </div>
          </>
        )}
        {l.status === "revoked" && (
          <>
            <div className="info-row">
              <span>Bản ghi CONSENT</span>
              <b>{l.consentId} · status=revoked</b>
            </div>
            <div className="info-row">
              <span>Thu hồi lúc</span>
              <b>{l.revokedAt ?? "—"}</b>
            </div>
          </>
        )}
        {l.status === "pending" && (
          <div className="info-row">
            <span>Bản ghi CONSENT</span>
            <b style={{ color: "var(--muted)" }}>Chưa có — chờ cha mẹ đồng ý</b>
          </div>
        )}
        <div className="info-row">
          <span>Guardian / dependent (BR-FAM-06)</span>
          <b>
            {l.dependentGuardians}/{FAMILY_MAX_GUARDIANS} người trẻ
          </b>
        </div>
        <div className="info-row">
          <span>Cảnh báo 7 ngày</span>
          <b>{l.alerts7d}</b>
        </div>
        <div className="info-row">
          <span>Quyền giao dịch của người trẻ</span>
          <b style={{ color: "var(--red)" }}>Không (chỉ nhận cảnh báo — BR-FAM-02)</b>
        </div>
      </div>

      <div className="access-item" style={{ marginTop: 12 }}>
        <div>
          <b>Cho người trẻ xem số dư</b>
          <br />
          <small>Mặc định tắt; chỉ bật khi cha mẹ chủ động opt-in (BR-FAM-05)</small>
        </div>
        <button
          className={`toggle ${l.showBalance ? "on" : ""}`}
          disabled={l.status !== "active"}
          role="switch"
          aria-checked={l.showBalance}
          onClick={() => onToggleBalance(l)}
        >
          <span className="knob" />
        </button>
      </div>

      {/* Hành động — không nút nào cho phép thao tác tiền của dependent (BR-FAM-02) */}
      <div className="actions">
        {l.status === "pending" && (
          <>
            <button
              className="btn primary"
              onClick={() => toast(`🔁 Đã gửi lại yêu cầu đồng ý sang máy cha mẹ ${l.dependent}`)}
            >
              🔁 Gửi lại yêu cầu đồng ý
            </button>
            <button className="btn red" onClick={() => onEnd(l, "cancel")}>
              ✕ Hủy yêu cầu liên kết
            </button>
          </>
        )}
        {l.status === "active" && (
          <>
            <button className="btn" onClick={() => toast(`📜 Mở nhật ký kiểm toán liên kết ${l.id}`)}>
              📜 Xem nhật ký kiểm toán
            </button>
            <button className="btn red" onClick={() => onEnd(l, "revoke")}>
              ⛔ Thu hồi liên kết (BR-FAM-04)
            </button>
          </>
        )}
        {l.status === "revoked" && (
          <button className="btn" onClick={() => toast(`📜 Mở nhật ký kiểm toán liên kết ${l.id}`)}>
            📜 Xem nhật ký kiểm toán
          </button>
        )}
      </div>
    </>
  );
}
