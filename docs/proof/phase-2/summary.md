# Tóm tắt bằng chứng Phase 2 (Ticket-02 "Ba hòn đảo", Contract v1.1)

- Spec + acceptance criteria: [docs/07-PHASE-2-SPEC.md](../../07-PHASE-2-SPEC.md)
- Bản ghi kiểm chứng chi tiết: [docs/verification/phase-2.md](../../verification/phase-2.md)
- Giả định, thứ tự tick, điểm số: [game/README.md](../../../game/README.md) · tuning: [game.contract.json](../../../game.contract.json)

## Yêu cầu → bằng chứng → kết quả

| Yêu cầu Ticket-02 | Bằng chứng | Kết quả |
|---|---|---|
| Phần 1: số liệu chuẩn, contract v1.1 | `npm test` (test manifest + Phase 1 regression) | 37/37 PASS |
| Phần 2: bản đồ 3 Đêm | scenario `night2-launch-pad`, `night3-pad-to-tier2` + test cliff/ramp/tower; ảnh 10–13 | PASS |
| Gió Lạc | `drifter-steal`, `drifter-pulse-drop` + 3 test lịch/chase/pulse | PASS |
| Bùa Gió | `wind-charm` + test charm | PASS |
| Gió mạnh Đêm 3 | `strong-wind-night3`; ảnh 12 | PASS |
| Chuỗi 3 Đêm, màn Bình Minh | ảnh 01, 02, 09, 14 | PASS (chơi qua debug hook) |
| Tạm dừng | `pause` + ảnh 08 | PASS |
| Cài đặt, âm thanh | mã `web.ts`, `audio.ts`; không lỗi console | Chưa nghe thử (NOT RUN) |
| HUD đầy đủ | ảnh 05–07 | PASS |
| Đêm đầy đủ ≤ 30 s, tất định | `full-night{1,2,3}-a/b` + sha256 | 1.1 s / 1.9 s / 2.2 s, giống hệt byte |
| ≥ 30 FPS ở 1280×720 | `__ddl.bench(300)` Đêm 3 | 57 FPS (render đồng bộ GPU, pane ẩn) |

Bằng chứng tự động: [2026-11-20T13-21-06-823Z/results.json](2026-11-20T13-21-06-823Z/results.json) (`passed: true`). Lần chạy trước `2026-11-20T13-20-20-561Z` có 2 FAIL do oracle sai, được giữ nguyên.
Ảnh chơi thử: [manual/](manual/) (chụp từ trình duyệt preview, 1280×720).

## Lỗi AI thật và cách phát hiện

- Va chạm tiếp đất dùng so sánh số thực chặt → nhân vật không đáp đúng tầng; phát hiện bằng scenario Đêm 3, sửa thêm dung sai `1e-9`.
- Nhiều scenario test do AI viết đặt sai (hướng di chuyển, góc camera trên dốc, trạng thái Gió Lạc) → test đỏ; sửa test sau khi đối chiếu ticket, không đổi luật để test xanh.
- Cây chắn giữa camera và Mây che nhân vật; mũi tên chỉ đèn đè bảng phím tắt — chỉ thấy khi chụp màn hình chơi thật (ảnh 03, 04), đã sửa.
- Oracle evidence ban đầu sai thời lượng Đêm 1/2 → giữ thư mục FAIL, sửa oracle.

## Token / chi phí

Công cụ: Claude Code (gói Pro). Không có số token chính xác theo phase. Quan sát từ công cụ cuối phiên Phase 2: ngữ cảnh phiên ≈160k/200k token (đã auto-compact 1 lần, nên tổng token xử lý lớn hơn), dùng 12% giới hạn 5 giờ; không phát sinh chi phí ngoài gói. Cách tiết kiệm: debug hook `window.__ddl` thay cho chờ thời gian thực, sửa file bằng script ngắn, chụp màn hình thu nhỏ 0.6.

## Chưa kiểm tra

Âm thanh bằng tai; FPS bằng vòng thời gian thực; chơi trọn một Đêm bằng tay; macOS/Linux; clone sạch.

## Retro

- Hiệu quả: core tách khỏi render nên mọi tính năng mới có scenario headless trước khi làm UI.
- Lỗi: test xanh không phát hiện lỗi hiển thị (cây che, mũi tên đè) — cần chụp màn hình chơi thật sớm hơn.
- Lần sau: thêm debug hook và chơi thử bằng trình duyệt ngay từ lát đầu, không để cuối.
