"use client";
// eKYC khuôn mặt — camera thật (getUserMedia) + 2 bước nhận diện/liveness rồi
// autopass (mô phỏng kết quả backend). Dùng chung cho BillPay và chat Trợ lý An.
// `intro=false` để bỏ câu dẫn AnBlock khi nhúng trong thẻ chat (gọn hơn).
import { useState, useEffect, useRef } from "react";
import { AnBlock } from "./primitives";
import { Icon } from "./Icon";

export function FaceKyc({ onComplete, intro = true }: { onComplete: () => void; intro?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const doneRef = useRef(onComplete);
  doneRef.current = onComplete;

  const [ready, setReady] = useState(false);
  const [camError, setCamError] = useState(false);
  const [stage, setStage] = useState(0); // 0 nhận diện, 1 liveness, 2 xong

  // Mở camera trước (selfie). Dừng stream khi rời màn.
  useEffect(() => {
    let stream: MediaStream | null = null;
    let active = true;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        if (!active) { stream.getTracks().forEach((t) => t.stop()); return; }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setReady(true);
      } catch {
        setCamError(true); // từ chối / không có camera → vẫn autopass (mô phỏng)
      }
    })();
    return () => { active = false; stream?.getTracks().forEach((t) => t.stop()); };
  }, []);

  // Khi camera sẵn sàng (hoặc lỗi): tự chạy 2 bước quét rồi autopass.
  useEffect(() => {
    if (!ready && !camError) return;
    const t1 = setTimeout(() => setStage(1), 2000);
    const t2 = setTimeout(() => setStage(2), 4000);
    const t3 = setTimeout(() => doneRef.current(), 4900);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [ready, camError]);

  const statusText =
    stage >= 2 ? "Xác thực thành công" :
    stage === 1 ? "Kiểm tra chuyển động — hãy chớp mắt…" :
    camError ? "Không truy cập được camera — đang mô phỏng…" :
    !ready ? "Đang mở camera…" :
    "Đang nhận diện khuôn mặt…";

  return (
    <>
      {intro && (
        <AnBlock>
          Giao dịch cần <b>xác thực khuôn mặt</b>. Vui lòng nhìn thẳng vào camera.
        </AnBlock>
      )}

      <div style={{ textAlign: "center", padding: "16px 0 4px" }}>
        <div className={`cam-frame${stage >= 2 ? " ok" : ""}`}>
          {!camError ? (
            <video ref={videoRef} playsInline muted autoPlay />
          ) : (
            <div className="cam-fallback"><Icon.face size={72} style={{ color: "var(--g300)" }} /></div>
          )}
          <div className="cam-oval" />
          {stage < 2 && ready && <div className="cam-scanline" />}
          {stage >= 2 && (
            <div className="cam-check"><Icon.checkCircle size={56} style={{ color: "#fff" }} /></div>
          )}
        </div>

        <div className="tiny" style={{ marginTop: 12, fontWeight: 700, color: stage >= 2 ? "var(--g700)" : "var(--muted)" }}>
          {statusText}
        </div>

        <div className="stat-2 mt12">
          <div className="card stat">
            <div className="lbl">{stage >= 1 ? <Icon.checkCircle size={14} style={{ color: "var(--g600)" }} /> : <Icon.face size={14} />} Bước 1</div>
            <div className="val" style={{ fontSize: 13 }}>Nhận diện</div>
          </div>
          <div className="card stat">
            <div className="lbl">{stage >= 2 ? <Icon.checkCircle size={14} style={{ color: "var(--g600)" }} /> : <Icon.eye size={14} />} Bước 2</div>
            <div className="val" style={{ fontSize: 13 }}>Liveness</div>
          </div>
        </div>
      </div>
    </>
  );
}
