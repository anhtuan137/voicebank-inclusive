"use client";
// Đánh giá phiên (1–5 sao) sau mỗi phiên tư vấn / thao tác nhờ Trợ lý An (§14 CSAT).
// Overlay trượt từ đáy, đặt absolute trong khung điện thoại. Tái dùng được cho mọi
// luồng: truyền `context` (vd "Thanh toán hoá đơn") + `onClose` gọi khi xong/bỏ qua.
import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { saveRating } from "@/lib/feedback";

const LABELS = ["", "Rất không hài lòng", "Chưa hài lòng", "Bình thường", "Hài lòng", "Tuyệt vời!"];

// Lý do nhanh thích ứng theo mức sao: thấp → điểm cần cải thiện, cao → điểm hài lòng.
function tagsFor(rating: number): string[] {
  if (rating <= 2) return ["Bot chưa hiểu ý", "Phản hồi chậm", "Thông tin chưa đúng", "Khó thao tác", "Muốn gặp nhân viên"];
  if (rating === 3) return ["Tạm ổn", "Cần rõ ràng hơn", "Phản hồi hơi chậm", "Giao diện ổn"];
  return ["Nhanh chóng", "Dễ hiểu", "Giọng nói tự nhiên", "Giải quyết đúng việc", "Thân thiện"];
}

export function SessionRating({
  context = "Trợ lý An",
  onClose,
}: {
  context?: string;
  onClose: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);

  const shown = hover || rating;

  // Đổi mức sao → bỏ các tag không còn phù hợp nhóm mới.
  function pick(n: number) {
    setRating(n);
    setTags((prev) => prev.filter((t) => tagsFor(n).includes(t)));
  }

  function toggleTag(t: string) {
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  function submit() {
    if (rating === 0) return;
    saveRating({ rating, tags, note: note.trim(), context });
    setDone(true);
  }

  // Tự đóng sau khi cảm ơn.
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(onClose, 1900);
    return () => clearTimeout(t);
  }, [done, onClose]);

  return (
    <div className="sr-backdrop" onClick={onClose}>
      <div className="sr-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="sr-handle" />

        {done ? (
          <div className="sr-thanks">
            <span className="sr-check">
              <Icon.checkCircle size={40} style={{ color: "var(--g600)" }} />
            </span>
            <h3>Cảm ơn bạn đã đánh giá!</h3>
            <p className="muted">Phản hồi giúp An phục vụ bạn tốt hơn mỗi ngày.</p>
            <div className="sr-stars sr-stars-sm" aria-hidden>
              {[1, 2, 3, 4, 5].map((n) => (
                <Icon.star key={n} size={22} fill={n <= rating ? "currentColor" : "none"}
                  style={{ color: n <= rating ? "#f6b21b" : "#d4ddd6" }} />
              ))}
            </div>
            <button className="sr-btn sr-btn-primary" onClick={onClose}>Xong</button>
          </div>
        ) : (
          <>
            <h3 className="sr-title">Bạn thấy phiên vừa rồi thế nào?</h3>
            <p className="sr-sub muted">Đánh giá phiên với <b>{context}</b></p>

            <div className="sr-stars" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  className="sr-star"
                  aria-label={`${n} sao`}
                  onMouseEnter={() => setHover(n)}
                  onClick={() => pick(n)}
                >
                  <Icon.star
                    size={40}
                    fill={n <= shown ? "currentColor" : "none"}
                    style={{ color: n <= shown ? "#f6b21b" : "#d4ddd6" }}
                  />
                </button>
              ))}
            </div>
            <div className="sr-label">{shown ? LABELS[shown] : "Chạm vào sao để chấm điểm"}</div>

            {rating > 0 && (
              <>
                <div className="sr-tags">
                  {tagsFor(rating).map((t) => (
                    <button
                      key={t}
                      className={`sr-tag${tags.includes(t) ? " on" : ""}`}
                      onClick={() => toggleTag(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <textarea
                  className="sr-note"
                  placeholder="Góp ý thêm cho An (không bắt buộc)…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                />
              </>
            )}

            <div className="sr-actions">
              <button className="sr-btn sr-btn-ghost" onClick={onClose}>Bỏ qua</button>
              <button className="sr-btn sr-btn-primary" onClick={submit} disabled={rating === 0}>
                Gửi đánh giá
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
