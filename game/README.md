# Đảo Đèn Lồng — Phase 2 (Ticket-02 "Ba hòn đảo", Contract v1.1)

Ba Đêm: **Đảo Bến → Đảo Cau → Đảo Chuông**, số liệu chuẩn Ticket-02, Gió Lạc, Bùa Gió, gió mạnh, chuỗi màn hình, tạm dừng, cài đặt, âm thanh tổng hợp, HUD đầy đủ.
Yêu cầu gốc: [../phase2.txt](../phase2.txt) (Phase 2), [../phase1.txt](../phase1.txt) (Phase 1, vẫn phải đạt). Spec + acceptance criteria: [../docs/07-PHASE-2-SPEC.md](../docs/07-PHASE-2-SPEC.md).

## Cài và chạy (từ gốc repo)

```sh
npm install
npm run dev          # http://localhost:5173 — dùng game/index.html, không phải index.html gốc
npm test             # node:test qua tsx — Phase 1 regression + Phase 2 scenarios
npm run build        # dist/
npm run --silent headless -- --seed 42 --night 1 --ticks 600 --out output.jsonl
npm run evidence:phase2   # tests + build + scenario headless → docs/proof/phase-2/<timestamp>/
```

Headless nhận `--night 1|2|3`, `--scenario`, `--inputs`, `--snapshot-every`. Không render, không DOM, không wall clock.

## Điều khiển

| Phím | Tác dụng |
|---|---|
| WASD / mũi tên | Chạy theo hướng camera (6 m/s; 7.2 m/s khi có Bùa Gió) |
| Space | Nhảy (chỉ khi chạm đất) |
| Shift | Lướt 14 m/s × 0.2 s, hồi 1.5 s (Bùa Gió: không hồi chiêu) |
| E | Nạp ánh sáng vào đèn chưa sáng gần nhất trong 2 m |
| Q | Tỏa Sáng: 3 đom đóm, bán kính 5 m, hồi 3 s |
| Esc / P | Tạm dừng (Tiếp tục / Chơi lại Đêm / Cài đặt / Về menu) |
| Kéo chuột / lăn chuột | Xoay / zoom camera (độ nhạy chỉnh trong Cài đặt) |
| F3 | Hiện FPS |
| Enter | Nút chính trên màn hình menu / kết quả |

Cửa sổ mất focus → tự tạm dừng. Cài đặt (âm lượng tổng / nhạc / hiệu ứng, độ nhạy chuột, hiện FPS) lưu ở `localStorage` khóa `dao-den-long.settings.v1`.

## Kiến trúc

- `src/core.ts` — toàn bộ luật, thuần TypeScript: không Three.js, DOM, renderer hay wall clock. RNG mulberry32 tách luồng (motes, shades, drops, drifters, wind) theo seed.
- `src/headless.ts` — CLI JSONL, dùng chung core.
- `src/web.ts` — Three.js render + HUD/menu; mỗi frame tích lũy thời gian và gọi `step()` cố định 1/60 s (tối đa 8 tick/frame). Pause web đi qua input `pause` của core (cạnh lên một tick).
- `src/audio.ts` — WebAudio tổng hợp (không asset tải về): nhạc nền theo Đêm + hiệu ứng. Chỉ ở lớp web, không ảnh hưởng headless.
- Model 3D là primitive Three.js; không dùng index.html gốc hay asset tải về.

## Thứ tự xử lý trong một tick (đúng Ticket-02)

1. Đọc input; xử lý `pause` trước (cạnh lên toggle). Nếu đang/vừa tạm dừng: `tick` tăng, dừng ở đây (`sim_tick`, thời gian, hồi chiêu, spawn, TTL đứng yên; snapshot `state: "paused"`).
2. Bộ đếm: thời gian, hồi chiêu dash/pulse, bất tử, choáng/recoil/spawning của Bóng, bùa, TTL đom đóm rơi, hồi bùa, flee của Gió Lạc, chờ hồi sinh.
3. Di chuyển Mây (nhảy, lướt, bục nhảy, gió) → kiểm tra rơi (Y < −10).
4. Nhặt đom đóm và bùa.
5. Tương tác đèn (E, cạnh lên).
6. Vùng an toàn (đẩy Bóng ra mép 6 m tối đa 30 tick).
7. Tỏa Sáng (Q, cạnh lên) — mục tiêu chốt tại tick này, xử lý theo id tăng dần.
8. Di chuyển Bóng Mực rồi Gió Lạc.
9. Chạm: Gió Lạc cướp trước (id tăng dần), rồi Bóng Mực gây hit (id tăng dần, tối đa 1 hit/tick).
10. Sinh đom đóm (tick 240, 480, …), Bóng Mực, Gió Lạc theo lịch — thực thể mới chỉ tương tác từ tick sau.
11. Thắng/thua: hết Ngọn Lửa → `no_flames` (luôn ưu tiên); còn sống và đủ đèn → thắng (kể cả đúng tick hết giờ); còn lại hết giờ → `dawn`.

## Điểm số

+10 mỗi đom đóm nạp · +100 mỗi đèn thắp · +5 mỗi Bóng Mực trúng Tỏa Sáng (mỗi con mỗi lần, kể cả đang choáng) · khi thắng: `floor(giây còn lại) × 2 + 50 × Ngọn Lửa còn lại`. Thua không có bonus. Tổng điểm hành trình = tổng điểm các Đêm đã thắng (chơi lại Đêm thua không cộng điểm lượt thua). Dựng scenario không sinh điểm hay event.

## Giả định (chỗ Ticket-02 không nói rõ)

- **Snapshot 0 và `night_start`:** snapshot tick 0 ghi trước mọi input; ngay sau đó là event `night_start {night}` ở tick 0. Dòng cuối là `{type:"end", ticks, sim_tick, state, score}`.
- **Đêm 3:** điểm xuất phát (0,0,−20) trên tầng 0 (Ticket không ghi), quay mặt về +Z. Đêm 2 xuất phát (0,0,0) đảo A.
- **Bóng Mực:** scenario không ghi `state` → `chase`. Bóng sinh theo lịch ở trạng thái `spawning` 1 tick rồi chuyển `wander`/`chase`. `wander` lượn 1.5 m/s tới điểm ngẫu nhiên trên đảo. Điểm sinh hợp lệ: cách Mây ≥ 15 m (XZ), không nằm trong vùng an toàn của đèn đã sáng, không trùng điểm với Bóng khác sinh cùng tick; hết điểm thì bỏ lượt. Id sinh mới bỏ qua id đã có trong scenario.
- **Choáng:** tính bao gồm: tick 1..120 sau kích hoạt ở `stunned`, tick 121 trở lại. Đẩy 4 m chia đều 15 tick, dừng khi gặp vách/rìa đảo; trùng vị trí đẩy theo +X.
- **Tỏa Sáng 3D:** tâm = chân Mây + 0.8 m, khoảng cách 3D tới tâm Bóng (Y của Bóng) ≤ 5 m, bao gồm biên.
- **Gió Lạc:** `removed` vẫn nằm trong mảng snapshot (state `removed`) để id ổn định; không tính vào trần 2 con đang hoạt động. Điểm sương = điểm sinh Bóng của Đêm đó. `random_drifters: false` tắt lịch sinh.
- **Đom đóm:** điểm trống = điểm sinh không có đom đóm `random` nào đang đứng (theo chỉ số điểm); chọn ngẫu nhiên bằng RNG motes. Đom đóm rơi (hit/drifter_drop) không chiếm điểm sinh, TTL 480 tick, nhặt được từ tick sau.
- **Rơi:** khi đang chờ hồi sinh (60 tick) Mây không nhặt, không bị chạm, không bị cướp, input bị bỏ qua.
- **Lướt:** hướng = input di chuyển hiện tại, nếu đứng yên thì `facing`; trên không giữ nguyên Y trong 12 tick; bục nhảy đang bay vẫn lướt được (lướt tạm thay vận tốc ngang, hết lướt trở lại vận tốc phóng).
- **Đèn trùng khoảng cách:** chọn id nhỏ hơn theo so sánh chuỗi tự nhiên (L2 < L10).
- **Web:** seed mỗi Đêm = `1000×night + 17×lượt_chơi_lại + 3` (headless dùng `--seed`). Ánh sáng môi trường `0.15 + 0.55 × đèn_sáng/tổng` được làm mượt khi hiển thị; giá trị đích đúng công thức (`__ddl.ambient`).

## Debug hook (chỉ web, để kiểm thử tự động)

`window.__ddl`: `game`, `mode`, `fps`, `ambient`, `bench(n)` (render n frame đồng bộ GPU, trả FPS), `advance(n)` (chạy n tick qua đúng đường input web), `key(code, down)`.

## Sáng tạo của tôi

- Lời dẫn Ông Đăng và tên đảo cho từng Đêm; màn hình Bình Minh với điểm từng Đêm.
- Nhạc nền ngũ cung tổng hợp riêng cho mỗi Đêm, không file âm thanh.
- Hiệu ứng: sóng Tỏa Sáng, tia lửa khi thắp đèn, sao quay trên Bóng bị choáng, lá bay báo gió, rung camera khi bị đánh, vòng tiến độ nạp đèn.
- Cây đứng chắn giữa camera và Mây tự thu nhỏ để không che nhân vật.
- Không thêm thực thể gameplay ngoài Ticket → đầu ra headless không đổi.

## Trạng thái kiểm chứng

Xem phần báo cáo cuối phiên và `docs/proof/phase-2/`. Không có bằng chứng nào được ghi nếu lệnh chưa thực sự chạy.
