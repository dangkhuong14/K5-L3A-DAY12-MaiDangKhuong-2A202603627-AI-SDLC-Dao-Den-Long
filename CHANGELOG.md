# Changelog — Đảo Đèn Lồng

## [Phase 3] Contract v1.2 — Ticket-03 "Đèn cạn dầu" (2026-11-20)

Quyết định thiết kế: [docs/adr/ADR-003-den-can-dau.md](docs/adr/ADR-003-den-can-dau.md). Spec: [docs/08-PHASE-3-SPEC.md](docs/08-PHASE-3-SPEC.md).

### ⚠ Thay đổi phá vỡ tương thích (breaking changes)

| # | Trước (v1.1, Ticket-02) | Sau (v1.2, Ticket-03) |
|---|---|---|
| B1 | `contract_version: "1.1"` | `"1.2"` |
| B2 | Đêm 1/2/3 dài 300/330/360 s | 240/270/300 s (`night{1,2,3}_duration_s`) |
| B3 | Thắng ngay khi mọi đèn sáng, `game_over.reason: "all_lit"` | Chỉ thắng lúc bình minh, khi số đèn đang sáng ≥ ceil(0.6·n). Lý do là `dawn_survived`. `all_lit` không còn được phát. |
| B4 | Hết giờ = thua `dawn` | Hết giờ mà số đèn sáng dưới ngưỡng = thua `dawn`. `no_flames` vẫn được xét trước. |
| B5 | +10 mỗi đom đóm nạp | +5 mỗi đom đóm (thắp, thắp lại, châm dầu) |
| B6 | Bonus thắng = floor(time_left)·2 + 50·Ngọn Lửa | Không còn thưởng thời gian. Bonus = Σ(50 + floor(fuel)) cho mỗi đèn sáng, cộng 50 cho mỗi Ngọn Lửa. Chỉ có khi thắng. |
| B7 | Đèn đã sáng không nhận đom đóm, E không chọn đèn sáng | E chọn đèn chưa sáng **hoặc** sáng chưa đầy dầu. Với đèn sáng, đom đóm thành dầu (`refuel`). |
| B8 | Đèn sáng mãi | Mất 1 dầu/giây. Hết dầu thì tắt (`lantern_out`, `deposited = 0`). Thắp lại tốn 5 đom đóm. |
| B9 | Bóng Mực không bao giờ vào vùng an toàn | Đèn có dầu < 30 mất vùng an toàn. Bóng có thêm trạng thái `drain`. |
| B10 | Túi đom đóm cố định 10 | `capacity = min(20, 10 + 2·successful_lights)` |
| B11 | Tỏa Sáng +5 mỗi Bóng | +5 mỗi Bóng, nhưng +15 nếu Bóng đó đang `drain` |

### Thêm vào contract

- Tuning: `fuel_max 100`, `fuel_decay_per_s 1.0`, `fuel_per_mote 10`, `relight_cost 5`, `win_ratio 0.6`, `drain_per_s 5`, `low_fuel_threshold 30`, `capacity_max 20`.
- Snapshot:
  - mỗi đèn thêm `fuel` (1 chữ số thập phân, đèn tắt là 0), `ever_lit` và `relit_count`;
  - `player.capacity`;
  - Bóng thêm `target_lantern_id`, và có thêm giá trị `state: "drain"`.
- Scenario:
  - đèn nhận `lit`, `fuel` (mặc định 100 nếu `lit`) và `ever_lit`;
  - `player.successful_lights`;
  - `shades[].target_lantern_id`;
  - `shades[].state_ticks_left` (mở rộng riêng để dựng Bóng đang choáng hoặc recoil).
- Sự kiện:
  - mới: `refuel {lantern_id, amount, fuel}`, `lantern_out {lantern_id}`, `fuel_drain {lantern_id, shade_id, fuel}` (mỗi 60 tick hút);
  - `lantern_lit` thêm `relight`.
- Thứ tự tick: bước 2b trừ dầu (hao, rồi bị hút theo id Bóng), sau đó tắt đèn có `fuel ≤ 0`. Bước 11 xét thắng/thua sau mọi cập nhật.

### Thêm vào web (không ảnh hưởng headless)

- Đèn:
  - thanh dầu trên đèn sáng;
  - đèn và thanh dầu nhấp nháy 1 Hz khi dầu < 30;
  - đèn tắt bị xẹp 20% và có giấy rách;
  - vòng vùng an toàn chỉ hiện khi đèn còn vùng.
- Bóng: sợi "hút dầu" nối Bóng với đèn.
- HUD:
  - "Cần k đèn sáng lúc bình minh · ⚠ n đèn yếu";
  - túi `carried/capacity` với 20 ô;
  - mũi tên ưu tiên chỉ đèn yếu.
- Toast: châm dầu, đèn tắt, Bóng hút dầu, thắp lại +40, túi lớn hơn.
- Âm thanh: châm dầu, đèn tắt, Bóng hút.
- Cài đặt "Bảng màu dễ phân biệt", được lưu: Bóng dùng #00B3FF, cảnh báo dùng #FFFFFF kèm ⚠. Thêm `window.__ddl.colorblind(on)`.

### Test bị thay (không skip âm thầm, mỗi chỗ có comment lý do trong file)

| File | Test cũ | Thay bằng | Lý do |
|---|---|---|---|
| `game/tests/core.test.ts` | `manifest … contract is v1.1` | `… v1.2` | B1 |
| `game/tests/core.test.ts` | `time_left_s` = 299 sau 1 s | 239 | B2 |
| `game/tests/core.test.ts` | `deposit … lights only once` (+10/mote, E lần hai không làm gì) | `… a lit lantern then takes motes only as fuel` (+5/mote, E lần hai thành `refuel`) | B5, B7 |
| `game/tests/core.test.ts` | `win stops subsequent steps, adds bonus once` (thắng ngay khi 5 đèn sáng, bonus thời gian) | `all lanterns lit no longer ends the night; dawn win …` | B3, B6 |
| `game/tests/phase2.test.ts` | `same-tick win beats dawn; no_flames beats all_lit; bonus = floor(time)*2 …` | `same-tick: lantern lit on the dawn tick counts for the 3/5 threshold; no_flames beats dawn_survived` | B3, B6. Giữ nguyên ý cũ về thứ tự cùng tick. |

Các test Phase 1–2 còn lại không đổi và vẫn đạt. Mới: `game/tests/phase3.test.ts` (11 test).

### Harness

- Mới: `npm run evidence:phase3` (`scripts/evidence-phase3.mjs`).
- `npm run evidence:phase2` được giữ làm lịch sử. Oracle của nó theo v1.1 nên **dự kiến FAIL** với v1.2.

## [Phase 2] Contract v1.1 — Ticket-02 "Ba hòn đảo"

Commit `c87bf44`: ba Đêm, Gió Lạc, Bùa Gió, gió mạnh Đêm 3, tạm dừng, cài đặt, âm thanh. Xem [docs/07-PHASE-2-SPEC.md](docs/07-PHASE-2-SPEC.md).

## [Phase 1] Contract v1.0

Gameplay cơ bản một Đêm. Xem [docs/02-SPEC.md](docs/02-SPEC.md).
