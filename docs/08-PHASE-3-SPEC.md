# Spec Phase 3 — Ticket-03 "Đèn cạn dầu" (Contract v1.2)

Nguồn: [phase3.txt](../phase3.txt). Ticket-03 thay các luật Ticket-02 được đánh dấu [THAY THẾ]. Các luật Ticket-02 khác vẫn giữ: [07-PHASE-2-SPEC.md](07-PHASE-2-SPEC.md).
Quyết định thiết kế: [adr/ADR-003-den-can-dau.md](adr/ADR-003-den-can-dau.md) · Breaking changes: [../CHANGELOG.md](../CHANGELOG.md) · Giả định: [../game/README.md](../game/README.md).

Cột "Kiểm chứng" ghi tên test trong `game/tests/phase3.test.ts` (P3), case trong `scripts/evidence-phase3.mjs` (EV) hoặc ảnh trong `docs/proof/phase-3/manual/`.

## F1. Nhiên liệu đèn

| AC | Tiêu chí nghiệm thu | Kiểm chứng |
|---|---|---|
| F1.1 | Vừa thắp hoặc thắp lại thì `fuel = 100`. Đèn sáng mất đúng 1/60 mỗi tick, lưu bằng số nguyên. Snapshot `fuel` có 1 chữ số thập phân; đèn tắt có `fuel: 0`. | P3 "fuel decays 1/s…", P3 "v1.2 snapshot…" |
| F1.2 | `fuel ≤ 0` ngay sau bước 2 thì đèn tắt, phát `lantern_out {lantern_id}`, `deposited = 0`, `ever_lit` vẫn là true. Ánh sáng môi trường giảm. | P3 "fuel decays…", EV `fuel-decay-out` |
| F1.3 | Châm dầu: `used = min(carried, ceil((100−fuel)/10))`, `fuel = min(100, fuel+10·used)`. Phát `refuel {lantern_id, amount, fuel}`, +5 mỗi đom đóm. | P3 "refuel…", EV `refuel` |
| F1.4 | Đèn đầy dầu (used = 0) không được chọn: không event, không điểm. Core có kiểm tra này. Trong gameplay, bước 2 trừ dầu trước bước 5 nên lúc tương tác không đèn sáng nào đầy đúng 100: đèn scenario `fuel: 100` còn 99.98 và nhận 1 đom đóm (giả định trong README). Mang 0 đom đóm thì không có event. | P3 "full-lantern rule…" |
| F1.5 | Thắp lại đèn `ever_lit` tốn 5 đom đóm, +40, `lantern_lit.relight: true`, `relit_count++`. Đèn chưa từng sáng tốn 10, +100, `relight: false`. | P3 "relight…", EV `relight` |
| F1.6 | Web: thanh dầu trên đèn sáng. Dầu < 30 thì đèn và thanh nhấp nháy 1 Hz. | ảnh 01 |

## F2. Bóng Mực hút dầu

| AC | Tiêu chí nghiệm thu | Kiểm chứng |
|---|---|---|
| F2.1 | Đèn có `fuel < 30` mất vùng an toàn. Đúng 30 thì vẫn còn. | P3 "fuel < 30 loses the safe zone (exactly 30 keeps it)…" |
| F2.2 | Chỉ Bóng `wander` chọn đèn yếu gần nhất (bằng nhau thì id nhỏ). Không có đèn yếu thì đi về đèn tắt gần nhất. Bóng `chase` không đổi mục tiêu. | P3 "fuel < 30…" |
| F2.3 | Cách đèn ≤ 2 m (XZ) thì vào `drain`, đứng yên, hút 5/60 mỗi tick. Nhiều Bóng thì cộng dồn, đèn vẫn tự hao. `fuel_drain` được ghi mỗi 60 tick hút. | P3 "drain: two shades stack…", EV `drain-stack` (đèn 10 dầu tắt ở tick 55) |
| F2.4 | `drain → chase` khi Mây trong 6 m. `drain → stunned` khi trúng Tỏa Sáng. `drain → wander` khi đèn tắt, được châm lên ≥ 30, hoặc Bóng cách đèn > 2 m. Hết choáng thì về `wander`. | P3 "drain: …", P3 "pulse: … stun always ends in wander" |
| F2.5 | Châm lên ≥ 30 khi có Bóng trong 6 m: Bóng bị đẩy ra mép trong tối đa 30 tick và không gây sát thương trong lúc đó. | P3 "refuel to >= 30 with shades inside 6 m…" |
| F2.6 | Web: Bóng `drain` quay về phía đèn, có sợi hút dầu và toast "Bóng Mực đang hút dầu". | ảnh 02 |

## F3. Luật thắng mới

| AC | Tiêu chí nghiệm thu | Kiểm chứng |
|---|---|---|
| F3.1 | Đêm dài 240 / 270 / 300 s. | P3 "night durations 240 / 270 / 300 s…", EV `full-night{1,2,3}` |
| F3.2 | Thắng `dawn_survived` khi hết giờ, còn Ngọn Lửa và số đèn sáng ở tick cuối ≥ ceil(0.6·n): 3/5, 4/6, 5/7. | P3 "win at dawn needs…", EV `dawn-win-3of5/4of6/5of7` |
| F3.3 | Thiếu ngưỡng thì thua `dawn`. Thắp đủ mọi đèn không kết thúc Đêm. `all_lit` không còn được phát. | P3 "win at dawn…", EV `dawn-lose-2of5`, `all-lit-keeps-playing` |
| F3.4 | Hết Ngọn Lửa thì thua `no_flames` ngay, kể cả ở tick bình minh. Đèn vừa thắp ở tick cuối được tính; đèn vừa tắt ở tick cuối thì không. | phase2 "same-tick: lantern lit on the dawn tick…", P3 "win at dawn…", EV `no-flames-beats-dawn` |

## F4. Sức chứa tăng dần

| AC | Tiêu chí nghiệm thu | Kiểm chứng |
|---|---|---|
| F4.1 | `capacity = min(20, 10 + 2·successful_lights)`. Thắp lại có tính; đèn sáng sẵn từ scenario không tính. Reset mỗi Đêm. Nhặt đom đóm bị giới hạn theo `capacity`. | P3 "relight… capacity…", EV `capacity-max` |
| F4.2 | Snapshot `player.capacity`. HUD hiện `carried/capacity`. | P3 "v1.2 snapshot…", ảnh 03 |

## F5. Điểm mới

| AC | Tiêu chí nghiệm thu | Kiểm chứng |
|---|---|---|
| F5.1 | +5 mỗi đom đóm nạp (thắp, thắp lại, châm dầu). +100 khi thắp lần đầu, +40 khi thắp lại. | P3 refuel/relight, core "deposit…" |
| F5.2 | Tỏa Sáng: +5 mỗi Bóng, +15 nếu Bóng đang `drain`. | P3 "pulse…", EV `drain-pulse` |
| F5.3 | Chỉ khi thắng: mỗi đèn sáng +50 + floor(fuel), mỗi Ngọn Lửa +50. Không có thưởng thời gian. | core "all lanterns lit no longer ends…", EV `dawn-win-*`, ảnh 06 (489 = 89 + 110 + 140 + 150) |

## F6. Chế độ mù màu

| AC | Tiêu chí nghiệm thu | Kiểm chứng |
|---|---|---|
| F6.1 | Cài đặt "Bảng màu dễ phân biệt" được lưu trong `localStorage`. | chơi thử: bật ô trong Cài đặt → `localStorage` `dao-den-long.settings.v1` có `cb: true` |
| F6.2 | Viền và mắt Bóng đổi #7A3CFF → #00B3FF. | ảnh 05a / 05b |
| F6.3 | Cảnh báo UI đổi #FF5A5F → #FFFFFF, kèm ⚠. | ảnh 04 |
| F6.4 | Đèn tắt bị xẹp 20% và có giấy rách; đèn sắp hết dầu nhấp nháy. Áp dụng cả khi tắt chế độ mù màu. | mã `web.ts` (`LampView`), ảnh 01/03. Xem giới hạn trong verification. |

## F7. Contract v1.2

| AC | Tiêu chí nghiệm thu | Kiểm chứng |
|---|---|---|
| F7.1 | `game.contract.json` có `contract_version "1.2"` và tuning đúng bằng core, gồm 8 khóa mới và 3 thời lượng mới. | core "manifest tuning matches… v1.2" |
| F7.2 | Scenario nhận `lit`, `fuel`, `ever_lit`, `successful_lights`, `target_lantern_id`. Đèn `lit` không có `fuel` thì `fuel = 100`. | P3 "v1.2 snapshot…" |
| F7.3 | JSONL tất định, một Đêm đầy đủ ≤ 30 s. | P3 "night durations…", EV sha256 a/b |
| F7.4 | Test Phase 1–2 không bị thay vẫn đạt. Test bị thay có comment lý do. | `npm test`, CHANGELOG "Test bị thay" |
