# 07 — Spec Phase 2: Ticket-02 "Ba hòn đảo" (Contract v1.1)

Nguồn: [phase2.txt](../phase2.txt). Phase 1 ([phase1.txt](../phase1.txt), [02-SPEC.md](02-SPEC.md)) vẫn là nền; mọi chỗ Ticket-02 ghi đè số liệu thì Ticket-02 thắng. Giả định chi tiết: [game/README.md](../game/README.md#giả-định-chỗ-ticket-02-không-nói-rõ).

Quy ước kiểm chứng: **[H]** = scenario headless trong `game/tests/*.test.ts` (chạy bằng `npm test`), **[W]** = kiểm tra trên bản web (`npm run dev`, debug hook `window.__ddl`), **[C]** = so sánh `game.contract.json` với `tuning` trong core.

## Phần 1–2 — Số liệu & bản đồ chuẩn (tóm tắt AC)

| # | Acceptance criteria | Kiểm chứng |
|---|---|---|
| 1.1 | `game.contract.json` có `contract_version: "1.1"` và tuning bằng đúng `tuning` của core, gồm `dash_*`, `night2_duration_s`, `night3_duration_s` | [C] `manifest tuning matches actual core and contract is v1.1` |
| 1.2 | 60 tick giữ phím đi đúng 6.0 m; nhảy đỉnh 7²/(2·20)=1.225 m; lướt 2.8 m trong 12 tick, hồi 90 tick tính từ lúc bắt đầu | [H] `60 ticks move six meters`, `jump`, `dash` |
| 1.3 | Tỏa Sáng: 3 đom đóm, 3D ≤ 5 m từ chân+0.8 m, choáng tick 1..120, đẩy 4 m trong 15 tick, hồi 180 tick, +5/Bóng | [H] `pulse: stun 120 ticks…`, `pulse uses 3D distance…` |
| 1.4 | Hit: −1 lửa, rơi floor(mang/2) đom đóm trên vành 1.5–2.5 m (TTL 480), bất tử 90, tối đa 1 hit/tick | [H] `multiple simultaneous contacts…`, `motes: … dropped TTL` |
| 1.5 | Rơi Y < −10: −1 lửa, mất hết đom đóm, chờ 60 tick, hồi sinh ở điểm xuất phát với bất tử 90; event `player_hit` có `lost` | [H] `fall off island` |
| 1.6 | Thứ tự trong tick đúng 11 bước; no_flames > all_lit > dawn | [H] `same-tick win beats dawn; no_flames beats all_lit…` |
| 2.1 | Đêm 1: đảo r=40, 5 đèn, 24 điểm đom đóm, 12 điểm Bóng r=37, 2 Bóng ở tick 300 rồi mỗi 480, tối đa 6 | [H] `spawn schedule night 1…` |
| 2.2 | Đêm 2: hai đảo r=28 + cầu tre; bục nhảy bay ≈1.4 s sang đảo kia; 6 đèn; Bóng mỗi 7 s, tối đa 8 | [H] `night 2 launch pad…; bridge is walkable` |
| 2.3 | Đêm 3: 3 tầng, vách đứng không leo, 2 dốc 30°/150°, bục (0,3,13) lên tầng 2, tháp chuông r=2 chặn, 7 đèn; Bóng 4.5 m/s mỗi 6 s, tối đa 10 | [H] `night 3: cliffs block…` |

## Phần 3 — Tính năng mới: acceptance criteria

### F1. Gió Lạc (Đêm 2 và 3)
- **AC1** Lịch sinh: khi `random_drifters` bật, sinh tại `sim_tick` 1200, 2400, … trên một điểm sương ngẫu nhiên; id `D1, D2, …`; tối đa 2 con chưa `removed`; Đêm 1 không có. — [H] `drifter schedule: D1 at tick 1200 on night 2…`
- **AC2** `idle` lượn 2 m/s; chuyển `chase` (7 m/s) khi Mây mang ≥ 5 và cách ≤ 15 m (XZ), mất điều kiện thì về `idle`. — [H] `drifter: chases at >=5 motes…`
- **AC3** Chạm XZ ≤ 1.2 m: cướp `min(3, mang)`, event `drifter_steal {drifter_id, amount, carried}`, chuyển `flee` 240 tick rồi `removed`; mỗi con chỉ cướp 1 lần; bất tử không ngăn; không mất lửa. — [H] `drifter: chases…`
- **AC4** Tỏa Sáng trúng con đang `chase` → `flee` không cướp; trúng con đang `flee` có đồ → thả toàn bộ thành đom đóm `dropped` tại chỗ, event `drifter_drop {drifter_id, amount}`, biến mất sau 120 tick. — [H] `drifter + pulse…`
- **AC5** Vùng an toàn của đèn không chặn Gió Lạc. Cướp xử lý trước hit của Bóng trong cùng tick. — [H] `drifter + pulse…`, `same-tick…`
- **AC6 (web)** Dải lụa màu #8FA3B8 bay uốn, âm thanh khi cướp/thả. — [W]

### F2. Bùa Gió
- **AC1** Vị trí: Đêm 2 (35,0,0) id C1; Đêm 3 (30,0,25) C1 và (−30,0,25) C2; scenario `charms` thay danh sách mặc định. — [H] `v1.1 snapshot shape…`, `wind charm…`
- **AC2** Nhặt theo luật đom đóm (XZ ≤ 1, chênh cao ≤ 1.5); event `charm_picked {charm_id, charm_ticks: 600}`; nhặt lại làm mới 600. — [H] `wind charm…`
- **AC3** Trong hiệu lực: chạy 7.2 m/s; lướt không hồi chiêu nhưng vẫn cần cạnh lên, nhấn khi đang lướt bị bỏ qua, lướt vẫn 14 m/s × 12 tick. — [H] `wind charm…`
- **AC4** Bùa xuất hiện lại sau 2700 tick (`available`, `respawn_s` trong snapshot). — [H] `wind charm…`
- **AC5 (web)** Lá bùa đỏ #C8102E viền vàng #F2C14E, pill trạng thái + đếm giây trên HUD. — [W]

### F3. Gió mạnh (Đêm 3)
- **AC1** Mỗi 1800 tick có cơn gió 300 tick, hướng theo RNG wind; báo trước 120 tick (`wind.warning`), snapshot `wind {active, dir_deg}`. — [H] `wind on night 3: warning at 1680…`
- **AC2** Khi gió hoạt động, Mây bị đẩy thêm 2 m/s theo `dir_deg`; `wind_enabled: false` tắt hẳn. — [H] `wind on night 3…`
- **AC3 (web)** Lá bay và tiếng gió trong 2 s báo trước; pill "Gió đang thổi". — [W] (ảnh chụp Đêm 3 tick ≈1900)

### F4. Chuỗi 3 Đêm
- **AC1** Menu chính → màn giới thiệu Đêm (tên đảo + lời Ông Đăng) → chơi → màn kết quả → Đêm kế tiếp. — [W]
- **AC2** Thắng Đêm 3 → màn Bình Minh với điểm từng Đêm và tổng điểm (tổng các Đêm đã thắng). — [W] (đã chụp)
- **AC3** Thua → nút "Chơi lại Đêm N" chơi lại đúng Đêm đó, Ngọn Lửa hồi đầy. — [W] (đã chụp màn thua)
- **AC4** Headless `--night 1|2|3` chạy đúng bản đồ; event `night_start {night}` ở tick 0. — [H] `v1.1 snapshot shape…`

### F5. Tạm dừng
- **AC1** Input `pause` cạnh lên toggle; khi dừng `tick` tăng nhưng `sim_tick`, thời gian, hồi chiêu, spawn, TTL đứng yên; snapshot `state: "paused"`; event `paused {}` / `resumed {}`. — [H] `pause: tick advances…`
- **AC2 (web)** Esc/P mở menu Tiếp tục / Chơi lại Đêm / Cài đặt / Về menu; mất focus tự dừng; logic dừng hoàn toàn. — [W] (đã chụp)

### F6. Cài đặt
- **AC1** Thanh trượt âm lượng tổng / nhạc / hiệu ứng và độ nhạy chuột; thay đổi áp dụng ngay. — [W]
- **AC2** Lưu `localStorage['dao-den-long.settings.v1']`, đọc lại khi mở game. — [W]

### F7. Âm thanh
- **AC1** Nhạc nền riêng mỗi Đêm; hiệu ứng cho nhặt, thắp đèn, tỏa sáng, bị đánh, nhảy, lướt, thắng, thua, Bóng Mực xuất hiện, đếm ngược 10 s cuối (tiếng khác ở giây cuối). — [W] (`game/src/audio.ts`)
- **AC2** Âm thanh chỉ ở lớp web; headless không đổi đầu ra. — [H] `deterministic full-night replay…`

### F8. HUD đầy đủ
- **AC1** Ngọn Lửa trên trái; đồng hồ mm:ss trên giữa, đỏ #FF5A5F và nhấp nháy khi ≤ 30 s; đèn k/n và điểm trên phải; thanh 10 ô dưới giữa; vòng hồi chiêu Lướt/Tỏa Sáng dưới phải. — [W] (đã chụp)
- **AC2** Nhắc "E — Nạp ánh sáng (x/10)" khi đứng trong 2 m của đèn chưa sáng. — [W]
- **AC3** Mũi tên tới đèn chưa sáng gần nhất khi nó ngoài màn hình, kèm id + khoảng cách. — [W] (đã chụp)
- **AC4** Bảng màu chuẩn (sai lệch ≤ 10%/kênh) cho các thành phần liệt kê; ánh sáng môi trường đích = 0.15 + 0.55 × sáng/tổng. — [W] (`C` trong `web.ts`, `__ddl.ambient`)

### F9. Contract v1.1
- **AC1** Snapshot có `night`, `wind`, `player.{vel, grounded, invuln, dash_cd_s, pulse_cd_s, charm_s}`, mảng `motes`, `drifters`, `charms`; Bóng dùng đúng tên trạng thái `spawning|wander|chase|recoil|stunned`. — [H] `v1.1 snapshot shape…`
- **AC2** Scenario nhận các trường mới (`invuln_ticks`, `dash_cd_ticks`, `pulse_cd_ticks`, `charm_ticks`, `shades[].state/state_ticks_left`, `drifters`, `charms`, `random_drifters`, `wind_enabled`). — [H] nhiều scenario trong `phase2.test.ts`
- **AC3** Một Đêm đầy đủ 21.600 tick chạy ≤ 30 s, hai lần chạy cho JSONL giống hệt byte. — [H] `deterministic full-night replay incl. generated ids…`

## Phi chức năng
- ≥ 30 FPS trung bình ở 1280×720 bản thường. — [W] `__ddl.bench(300)` ở Đêm 3.
- Phase 1 regression: toàn bộ `core.test.ts`, `shades.test.ts`, `keyboard.test.ts` đạt với số chuẩn mới.
