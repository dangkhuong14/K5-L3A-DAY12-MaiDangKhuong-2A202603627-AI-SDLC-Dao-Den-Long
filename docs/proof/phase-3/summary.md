# Tóm tắt bằng chứng Phase 3 (Ticket-03 "Đèn cạn dầu", Contract v1.2)

- Spec + acceptance criteria: [docs/08-PHASE-3-SPEC.md](../../08-PHASE-3-SPEC.md)
- Quyết định thiết kế: [docs/adr/ADR-003-den-can-dau.md](../../adr/ADR-003-den-can-dau.md) · Breaking changes và test bị thay: [CHANGELOG.md](../../../CHANGELOG.md)
- Bản ghi kiểm chứng chi tiết: [docs/verification/phase-3.md](../../verification/phase-3.md)
- Giả định, thứ tự tick, điểm số: [game/README.md](../../../game/README.md) · tuning: [game.contract.json](../../../game.contract.json)

## Yêu cầu → bằng chứng → kết quả

| Yêu cầu Ticket-03 | Bằng chứng | Kết quả |
|---|---|---|
| 1. Nhiên liệu: hao 1/s, tắt khi hết, châm dầu, thắp lại 5 | P3 tests fuel/refuel/relight; EV `fuel-decay-out`, `refuel`, `relight`; ảnh 01, 03 | PASS |
| 2. Bóng Mực `drain`, đèn < 30 mất vùng an toàn | P3 tests safe-zone/drain/evacuate/pulse; EV `drain-stack`, `drain-pulse`; ảnh 02 | PASS |
| 3. Thắng lúc bình minh ≥ ceil(0.6·n), 240/270/300 s | EV `dawn-win-3of5/4of6/5of7`, `dawn-lose-2of5`, `no-flames-beats-dawn`, `all-lit-keeps-playing`; ảnh 06–08 | PASS |
| 4. Sức chứa 10 + 2·lights, tối đa 20 | P3 test relight/capacity; EV `capacity-max` | PASS |
| 5. Điểm mới | oracle điểm trong mọi EV case; bonus 489 ở ảnh 06 | PASS |
| 6. Chế độ mù màu | ảnh 04, 05a/05b; cài đặt lưu `localStorage` | PASS. Hình xẹp/rách của đèn tắt chưa có ảnh rõ. |
| 7. Contract v1.2 | test manifest; `oracle-contract-v1.2`; `oracle-headless-cli-v1.2-shape` | PASS |
| DoD: ADR | [ADR-003](../../adr/ADR-003-den-can-dau.md) | Có |
| DoD: test cũ cập nhật, không skip | 5 test thay có lý do; `skipped 0` | Có |
| DoD: changelog | [CHANGELOG.md](../../../CHANGELOG.md) | Có |
| Phase 1–2 không bị thay vẫn đạt | `npm test` | 48/48 pass, 0 fail, 0 skipped |
| Đêm đầy đủ ≤ 30 s, tất định | `full-night{1,2,3}-a/b` + sha256 | Đêm 1: 14400 tick 2.1 s · Đêm 2: 16200 tick 3.0 s · Đêm 3: 18000 tick 3.7 s (gồm khởi động tsx) |
| ≥ 30 FPS ở 1280×720 | `__ddl.bench` | Đêm 1: 62 · Đêm 3: 59 FPS |

Bằng chứng tự động: [2026-11-20T15-27-29-280Z/results.json](2026-11-20T15-27-29-280Z/results.json) (`passed: true`). Lần chạy trước được giữ nguyên.
Ảnh chơi thử: [manual/](manual/) (preview 1280×720).

## Lỗi AI thật và cách phát hiện

- Test do AI viết kỳ vọng Bóng tới đèn ở tick 60–70, thực tế là tick 121. AI đã quên rằng `wander` chỉ đi 1.5 m/s. Phát hiện vì test đỏ; sửa kỳ vọng theo tốc độ wander đã ghi trong giả định README, không đổi luật.
- Test "hết choáng về wander" bị đỏ vì Mây trong 12 m (thành `chase`), rồi đèn yếu ở gần (thành `drain`). Đã tách thành hai case đúng ticket. Đây là luật tương tác mà AI suy luận thiếu.
- Thanh dầu hiển thị quá nhỏ và bị che. Test không thấy được lỗi này, chỉ phát hiện khi chụp màn hình chơi thật.
- Luật "đèn đầy không được chọn" không bao giờ xảy ra trong gameplay, vì dầu bị trừ ở bước 2 trước tương tác ở bước 5. AI ban đầu đặt tên test như thể đã kiểm tra nhánh đó. Đã đổi tên test cho đúng và ghi giả định trong README.

## Token / chi phí

Công cụ: Claude Code (gói Pro). Không có số token chính xác theo phase. Phiên Phase 3 đã auto-compact ngữ cảnh 1 lần. Không có chi phí ngoài gói.

## Chưa kiểm tra

- Âm thanh mới bằng tai.
- Ảnh cận cảnh đèn xẹp/rách.
- FPS bằng vòng thời gian thực.
- Chơi trọn một Đêm bằng tay.
- macOS/Linux; clone sạch.

## Retro

- Hiệu quả: dầu dùng số nguyên 1/60 nên các mốc "đúng 30", "tắt ở tick 55/60" kiểm tra chính xác, không flaky.
- Lỗi: đổi luật cốt lõi làm 5 test cũ sai. Liệt kê ngay khi đọc ticket giúp không bỏ sót.
- Lần sau: viết bảng "luật bị thay → test bị ảnh hưởng" trước khi sửa core.
