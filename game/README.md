# Đảo Đèn Lồng — v1.0.0 (Phase 4, Ticket-04 "Bình minh", Contract v1.3)

Ba Đêm: **Đảo Bến → Đảo Cau → Đảo Chuông**. Phase 3 thêm dầu đèn: đèn sáng cạn dần, Bóng Mực hút dầu đèn yếu, thắng khi đủ 60% đèn còn sáng lúc bình minh. Túi đom đóm lớn dần theo số lần thắp. Có chế độ mù màu.
Phase 4 không đổi luật: thêm benchmark, soak test, bảng xếp hạng, dễ tiếp cận và bản desktop Electron ([../docs/09-PHASE-4-SPEC.md](../docs/09-PHASE-4-SPEC.md)).
Yêu cầu gốc: [../phase4.txt](../phase4.txt), [../phase3.txt](../phase3.txt) (Phase 3, thay một số luật cũ), [../phase2.txt](../phase2.txt), [../phase1.txt](../phase1.txt). Spec + acceptance criteria: [../docs/08-PHASE-3-SPEC.md](../docs/08-PHASE-3-SPEC.md) (Phase 2: [../docs/07-PHASE-2-SPEC.md](../docs/07-PHASE-2-SPEC.md)).
Quyết định thiết kế: [../docs/adr/ADR-003-den-can-dau.md](../docs/adr/ADR-003-den-can-dau.md). Thay đổi phá vỡ tương thích: [../CHANGELOG.md](../CHANGELOG.md).

## Cài và chạy (từ gốc repo)

```sh
npm install
npm run dev          # http://localhost:5173 — dùng game/index.html, không phải index.html gốc
npm test             # node:test qua tsx — Phase 1 regression + Phase 2 + Phase 3 scenarios
npm run build        # dist/
npm run --silent headless -- --seed 42 --night 1 --ticks 600 --out output.jsonl
npm run evidence:phase3   # tests + build + scenario headless → docs/proof/phase-3/<timestamp>/
npm start                 # bản desktop (Electron) — bảng xếp hạng lưu trên đĩa
npm run --silent bench -- --seed 42 --duration 30 --out bench.json
npm run --silent soak -- --seed 7 --nights 10 --out soak.json
npm start -- --export-leaderboard out.json
npm run evidence:phase4   # tests + build + headless v1.2 ≡ v1.3 + soak → docs/proof/phase-4/<timestamp>/
```

Headless nhận `--night 1|2|3`, `--scenario`, `--inputs`, `--snapshot-every`. Không render, không DOM, không wall clock.
`npm run evidence:phase2` vẫn còn để làm lịch sử, nhưng oracle của nó dùng luật Ticket-02 (đêm 300/330/360 s, thắng khi đủ đèn), nên sẽ FAIL với luật v1.2. Đó là thay đổi có chủ ý, xem CHANGELOG.

## Điều khiển

Phím mặc định dưới đây đổi được trong **Cài đặt → Đổi phím** (2 phím mỗi hành động, báo trùng, "Khôi phục mặc định"; lưu cùng cài đặt).

| Phím | Tác dụng |
|---|---|
| WASD / mũi tên | Chạy theo hướng camera (6 m/s; 7.2 m/s khi có Bùa Gió) |
| Space | Nhảy (chỉ khi chạm đất) |
| Shift | Lướt 14 m/s × 0.2 s, hồi 1.5 s (Bùa Gió: không hồi chiêu) |
| E | Đèn gần nhất trong 2 m: nạp để thắp (10), thắp lại (5) hoặc châm dầu cho đèn đang sáng chưa đầy |
| Q | Tỏa Sáng: 3 đom đóm, bán kính 5 m, hồi 3 s |
| Esc / P | Tạm dừng (Tiếp tục / Chơi lại Đêm / Cài đặt / Về menu) |
| Kéo chuột / lăn chuột | Xoay / zoom camera (độ nhạy chỉnh trong Cài đặt) |
| F3 | Hiện FPS |
| Enter | Nút chính trên màn hình menu / kết quả |

Cửa sổ mất focus thì game tự tạm dừng. Cài đặt lưu ở `localStorage`, khóa `dao-den-long.settings.v1`: âm lượng tổng / nhạc / hiệu ứng, độ nhạy chuột, hiện FPS, **chế độ mù màu**, phụ đề, giảm chuyển động, chữ lớn ×1.25, bảng phím.

## Kiến trúc

- `src/core.ts` — toàn bộ luật, thuần TypeScript: không Three.js, DOM, renderer hay wall clock. RNG mulberry32 tách luồng (motes, shades, drops, drifters, wind) theo seed. Dầu lưu bằng số nguyên đơn vị 1/60 (`FU = 60`, 100 dầu = 6000), nên không sai số dấu phẩy động, và mỗi tick trừ đúng 1 đơn vị.
- `src/headless.ts` — CLI JSONL, dùng chung core.
- `src/web.ts` — Three.js render + HUD/menu; mỗi frame tích lũy thời gian và gọi `step()` cố định 1/60 s (tối đa 8 tick/frame). Pause web đi qua input `pause` của core (cạnh lên một tick).
- `src/audio.ts` — WebAudio tổng hợp (không asset tải về): nhạc nền theo Đêm + hiệu ứng. Chỉ ở lớp web, không ảnh hưởng headless.
- Model 3D là primitive Three.js; không dùng index.html gốc hay asset tải về.

## Mô hình đèn (v1.2)

| Trạng thái | Điều kiện | Vùng an toàn | Tương tác E |
|---|---|---|---|
| Chưa thắp | `lit=false, ever_lit=false` | không | nạp tới 10 thì thắp (+100) |
| Đã tắt | `lit=false, ever_lit=true` | không | nạp tới 5 thì thắp lại (+40, `relit_count++`) |
| Yếu | `lit=true, fuel < 30` | **không** | châm dầu |
| Sáng | `lit=true, 30 ≤ fuel < 100` | có (6 m) | châm dầu |
| Đầy | `lit=true, fuel = 100` | có | không chọn được |

Thắp hoặc thắp lại thì `fuel = 100`. Đèn sáng mất 1 dầu/giây. Khi `fuel ≤ 0` đèn tắt (`lantern_out`), đặt `deposited = 0` và giữ `ever_lit`.
Châm dầu: `used = min(carried, ceil((100 − fuel)/10))`, `fuel = min(100, fuel + 10·used)`, +5 điểm mỗi đom đóm.

## Thứ tự xử lý trong một tick (Ticket-02, bổ sung Ticket-03)

1. Đọc input; xử lý `pause` trước (cạnh lên toggle). Nếu đang hoặc vừa tạm dừng: `tick` tăng rồi dừng ở đây. `sim_tick`, thời gian, hồi chiêu, dầu, spawn và TTL đứng yên; snapshot ghi `state: "paused"`.
2. Bộ đếm: thời gian, hồi chiêu dash/pulse, bất tử, choáng/recoil/spawning của Bóng, bùa, TTL đom đóm rơi, hồi bùa, flee của Gió Lạc, chờ hồi sinh.
   **2b (Ticket-03):** mỗi đèn sáng mất 1 đơn vị (1/60 dầu). Mỗi Bóng đang `drain` (xét theo id) hút thêm 5 đơn vị từ đèn của nó và phát `fuel_drain` mỗi 60 tick hút. Ngay sau đó, đèn có `fuel ≤ 0` tắt (`lantern_out`).
3. Di chuyển Mây (nhảy, lướt, bục nhảy, gió) → kiểm tra rơi (Y < −10).
4. Nhặt đom đóm (giới hạn theo `capacity`) và bùa.
5. Tương tác đèn (E, cạnh lên). Ứng viên là đèn chưa sáng, hoặc đèn sáng chưa đầy. Chọn đèn gần nhất; nếu bằng nhau thì id nhỏ hơn.
6. Vùng an toàn: chỉ đèn có `fuel ≥ 30`. Khi đèn vừa được thắp, hoặc vừa được châm từ dưới 30 lên ≥ 30, Bóng trong 6 m bị đẩy ra mép trong tối đa 30 tick. Lúc đó Bóng vô hại và chuyển về `wander`.
7. Tỏa Sáng (Q, cạnh lên): mục tiêu chốt tại tick này, xử lý theo id tăng dần. Bóng đang `drain` cho +15, Bóng khác cho +5.
8. Di chuyển Bóng Mực rồi Gió Lạc. Với Bóng `drain`: Mây trong 6 m thì chuyển `chase`. Nếu đèn tắt, được châm ≥ 30, hoặc Bóng cách đèn quá 2 m thì về `wander`. Còn lại Bóng đứng yên. Với Bóng `wander`: đi tới đèn yếu gần nhất, trong 2 m thì vào `drain`. Không có đèn yếu thì đi tới đèn chưa sáng gần nhất.
9. Chạm: Gió Lạc cướp trước (id tăng dần), rồi Bóng Mực gây hit (id tăng dần, tối đa 1 hit/tick). Bóng `drain` không gây hit.
10. Sinh đom đóm (tick 240, 480, …), Bóng Mực, Gió Lạc theo lịch. Thực thể mới chỉ tương tác từ tick sau.
11. Thắng/thua: hết Ngọn Lửa → `no_flames`, luôn ưu tiên kể cả tick cuối. Hết giờ mà số đèn sáng ≥ `ceil(0.6·n)` (3/5, 4/6, 5/7) → thắng `dawn_survived`; thiếu → thua `dawn`. **Thắp đủ mọi đèn không kết thúc Đêm sớm.**

## Điểm số

+5 mỗi đom đóm nạp (thắp, thắp lại hay châm dầu) · +100 lần thắp đầu · +40 mỗi lần thắp lại · Tỏa Sáng: +5 mỗi Bóng, riêng Bóng đang hút dầu +15 · **chỉ khi thắng lúc bình minh**: mỗi đèn đang sáng `+50 + floor(fuel)`, mỗi Ngọn Lửa còn lại +50. Không còn thưởng thời gian. Thua không có bonus.
Tổng điểm hành trình = tổng điểm các Đêm đã thắng. Dựng scenario không sinh điểm hay event.

## Sức chứa túi

`capacity = min(20, 10 + 2 × successful_lights)`. Thắp lại cũng tính là thắp thành công; đèn sáng sẵn do scenario thì không tính. Mỗi Đêm reset. HUD hiện `carried/capacity`, với 20 ô (ô chưa mở mờ đi).

## Giả định (chỗ Ticket-02/03 không nói rõ)

- **Snapshot 0 và `night_start`:** snapshot tick 0 ghi trước mọi input; ngay sau đó là event `night_start {night}` ở tick 0. Dòng cuối là `{type:"end", ticks, sim_tick, state, score}`.
- **Đêm 3:** điểm xuất phát (0,0,−20) trên tầng 0 (Ticket không ghi), quay mặt về +Z. Đêm 2 xuất phát (0,0,0) đảo A.
- **Bóng Mực:** scenario không ghi `state` thì là `chase`. Bóng sinh theo lịch ở trạng thái `spawning` 1 tick, rồi chuyển `wander`/`chase`. `wander` lượn 1.5 m/s. Điểm sinh hợp lệ: cách Mây ≥ 15 m (XZ), không nằm trong vùng an toàn của đèn có vùng an toàn, không trùng điểm với Bóng khác sinh cùng tick. Hết điểm thì bỏ lượt. Id sinh mới bỏ qua id đã có trong scenario.
- **Ticket-03, `wander`:** không có đèn yếu thì Bóng đi tới đèn chưa sáng gần nhất. Khi đã tới trong 2 m, Bóng lượn sang các điểm ngẫu nhiên rồi chọn lại mục tiêu, để không đứng chết một chỗ.
- **Ticket-03, hết choáng:** Bóng hết `stunned` luôn về `wander`. Trong bước 8 cùng tick, Bóng có thể chuyển tiếp ngay (`chase` nếu Mây trong 12 m, hoặc `drain` nếu đang sát một đèn yếu).
- **Ticket-03, `drain`:** Bóng đứng yên, không gây hit. Lượng hút ở bước 2b áp cho Bóng đã ở `drain` từ tick trước. `fuel_drain.fuel` không âm (giá trị sau khi hút, 1 chữ số thập phân). Scenario `drain` không có `target_lantern_id` thì chọn đèn yếu gần nhất.
- **Ticket-03, scenario:** đèn `lit: true` không ghi `fuel` thì `fuel = 100`. `ever_lit` mặc định bằng `lit`. Đèn chưa sáng có `fuel = 0`. `target_lantern_id` luôn có trong snapshot (`null` nếu không có).
- **Ticket-03, đèn đầy:** dầu bị trừ ở bước 2, trước tương tác ở bước 5, nên lúc bấm E không đèn sáng nào đầy đúng 100. Đèn scenario `lit, fuel: 100` ở tick 1 còn 99.98, là ứng viên và nhận 1 đom đóm (`ceil(0.0167/10) = 1`). Core vẫn bỏ qua đèn có `fuel = 100` theo đúng ticket.
- **Ticket-03, `deposited`:** giữ nguyên khi đèn đang sáng (không dùng cho châm dầu), reset 0 khi đèn tắt.
- **Choáng:** tính bao gồm: tick 1..120 sau kích hoạt ở `stunned`, tick 121 trở lại. Đẩy 4 m chia đều 15 tick, dừng khi gặp vách/rìa đảo; trùng vị trí thì đẩy theo +X.
- **Tỏa Sáng 3D:** tâm = chân Mây + 0.8 m; khoảng cách 3D tới tâm Bóng (Y của Bóng) ≤ 5 m, bao gồm biên.
- **Gió Lạc:** `removed` vẫn nằm trong mảng snapshot (state `removed`) để id ổn định, nhưng không tính vào trần 2 con đang hoạt động. Điểm sương = điểm sinh Bóng của Đêm đó. `random_drifters: false` tắt lịch sinh.
- **Đom đóm:** điểm trống = điểm sinh không có đom đóm `random` nào đang đứng (theo chỉ số điểm), chọn ngẫu nhiên bằng RNG motes. Đom đóm rơi (hit/drifter_drop) không chiếm điểm sinh, TTL 480 tick, nhặt được từ tick sau.
- **Rơi:** khi đang chờ hồi sinh (60 tick), Mây không nhặt, không bị chạm, không bị cướp, input bị bỏ qua.
- **Lướt:** hướng = input di chuyển hiện tại, nếu đứng yên thì theo `facing`. Trên không giữ nguyên Y trong 12 tick. Đang bay bằng bục nhảy vẫn lướt được: lướt tạm thay vận tốc ngang, hết lướt thì trở lại vận tốc phóng.
- **Đèn trùng khoảng cách:** chọn id nhỏ hơn theo so sánh chuỗi tự nhiên (L2 < L10).
- **Web:** seed mỗi Đêm = `1000×night + 17×lượt_chơi_lại + 3` (headless dùng `--seed`). Ánh sáng môi trường `0.15 + 0.55 × đèn_sáng/tổng` được làm mượt khi hiển thị; giá trị đích đúng công thức (`__ddl.ambient`). Nhấp nháy 1 Hz khi dầu < 30: sáng 0.5 s, tắt 0.5 s.

## Giả định Phase 4

- **Bench, cảnh chuẩn:** `benchScenario(42)` trong core. 200 Bóng rải đều trên mặt đảo Đêm 1 theo xoắn ốc hướng dương (Vogel) với góc xoay và nhiễu nhỏ lấy từ RNG theo seed, bỏ điểm nằm trong vùng an toàn của L1–L3; 100 đom đóm ở điểm ngẫu nhiên đều trên đảo, cách nhau ≥ 0.8 m. Scenario có khóa mở rộng `bench: true` (mặc định tắt, gameplay không dùng) để tắt sinh thêm, sát thương, nhặt, hao dầu, hút dầu, gió và kết thúc Đêm. Bóng vẫn `wander` theo luật thường nhưng không chuyển `chase` (yêu cầu ghi "200 Bóng ở trạng thái wander").
- **Bench, hiển thị:** HUD vẫn hiện như lúc chơi; phụ đề, mũi tên và giảm chuyển động không đổi hình ảnh đo (không có sự kiện sinh Bóng). Sáng tạo chỉ ở lớp hình ảnh nên vẫn chạy, không thêm thực thể.
- **Bench, số đo:** `dt` là khoảng giữa hai `requestAnimationFrame` liên tiếp sau 3 s khởi động. `load_ms` = thời điểm khung đầu tiên của cảnh bench (`performance.timeOrigin + now`) trừ thời điểm tiến trình Electron chính bắt đầu (`Date.now() − process.uptime()`), nên gồm khởi động Electron, tải trang và dựng cảnh, không gồm `npm run build` chạy trước đó. `peak_mem_mb` = đỉnh tổng working set (RSS trên Windows) của mọi tiến trình Electron (main, GPU, renderer), lấy mẫu 250 ms.
- **Bench, GPU:** Electron chạy với `force_high_performance_gpu` để laptop đồ họa lai dùng GPU rời. GPU thực dùng ghi trong `bench.json → renderer.gpu`. Trên máy làm bài, GPU tích hợp Intel UHD 630 đạt avg ≈ 115 nhưng 1% low ≈ 20 (FAIL ngưỡng 30); GTX 1650 đạt PASS (số trong `bench.json`).
- **Bench, vsync:** tắt bằng `--disable-gpu-vsync --disable-frame-rate-limit`, cửa sổ 1280×720 nội dung, `force-device-scale-factor 1`.
- **Soak:** Đêm thứ i (1-based) seed `7 + i`, Đêm `((i−1) mod 3) + 1`; chạy tới khi kết thúc hoặc `duration·60 + 1` tick. Chạy với `node --expose-gc --max-semi-space-size=1`, đo RSS sau `gc()` để số phản ánh bộ nhớ giữ lại chứ không phải heap trẻ đang lớn. Lỗi trong một Đêm được bắt và tính là `crash`, soak vẫn chạy tiếp.
- **Bảng xếp hạng:** `score` = tổng điểm các Đêm **đã thắng** trong lượt chơi (chơi thử một Đêm: điểm Đêm đó nếu thắng, 0 nếu thua). `nights_won` = số Đêm đã thắng trong lượt. `seed` = seed của Đêm cuối của lượt (web dùng `1000×night + 17×lần_chơi_lại + 3`). `achieved_at` theo giờ máy, dạng `2026-11-20T23:05:12+07:00`. Form hiện một lần mỗi lượt, kể cả khi điểm 0; không nhập thì chỉ cần bấm Chơi lại / Về menu. Danh sách luôn cắt còn top 10 nên điểm thấp hơn hạng 10 không được giữ. Tên chuẩn hóa NFC, cho phép chữ Việt có dấu. Bằng điểm: `achieved_at` sớm hơn đứng trên; vẫn bằng thì giữ thứ tự lưu.
- **Đổi phím:** chuột vẫn xoay/zoom camera; F3 (FPS) và Enter (nút chính) không đổi được. Delete/Backspace khi đang gán thì xóa phím phụ.
- **Phụ đề:** tối đa 3 dòng cùng lúc, mỗi dòng 3.2–4 s, tắt được trong Cài đặt. "Gió sắp thổi" hiện khi core bật `wind.warning` (2 s trước mỗi đợt gió Đêm 3). "10 s cuối" là đồng hồ đếm lớn giữa màn hình. Đèn dầu < 30 báo mỗi lần tụt xuống dưới ngưỡng. Bóng xuất hiện kèm khoảng cách, mũi tên mép màn hình chỉ Bóng mới sinh trong 4 s. Thêm phụ đề cho đèn tắt và Gió Lạc cướp.
- **Hiển thị:** Bóng và đom đóm vẽ bằng instancing; mắt Bóng co giãn theo Y/Z (khoảng cách hai mắt giữ nguyên) thay vì cả ba trục như Phase 3.

## Chế độ mù màu (web)

- Viền và mắt Bóng Mực: #7A3CFF → #00B3FF. Sợi "hút dầu" nối Bóng với đèn dùng cùng màu.
- Màu cảnh báo UI #FF5A5F → #FFFFFF, thêm biểu tượng ⚠ (toast nguy hiểm, đồng hồ, "đèn yếu", thanh dầu yếu).
- Gợi ý không dựa vào màu, áp cho mọi chế độ: đèn chưa sáng bị bẹp 20% và có giấy rách; đèn yếu nhấp nháy.

## Debug hook (chỉ web, để kiểm thử tự động)

`window.__ddl`: `game`, `mode`, `fps`, `ambient`, `benchResult` (khi mở `?bench=1`), `bench(n)` (render n frame đồng bộ GPU, trả FPS), `advance(n)` (chạy n tick qua đúng đường input web), `key(code, down)`, `colorblind(on)` (bật/tắt như ô trong Cài đặt).

## Sáng tạo của tôi

- Lời dẫn Ông Đăng và tên đảo cho từng Đêm; màn hình Bình Minh với điểm từng Đêm.
- Nhạc nền ngũ cung tổng hợp riêng cho mỗi Đêm, không file âm thanh. Phase 3 thêm âm châm dầu, đèn tắt, Bóng hút dầu.
- Hiệu ứng: sóng Tỏa Sáng, tia lửa khi thắp đèn, sao quay trên Bóng bị choáng, lá bay báo gió, rung camera khi bị đánh, vòng tiến độ nạp đèn.
- Phase 3: thanh dầu luôn quay về camera; sợi tím (mù màu: xanh) nối Bóng đang hút với đèn; ánh đèn mờ dần theo dầu; mũi tên ưu tiên chỉ đèn yếu kèm số dầu; HUD "cần k đèn sáng lúc bình minh".
- Cây đứng chắn giữa camera và Mây tự thu nhỏ để không che nhân vật.
- Không thêm thực thể gameplay ngoài Ticket, nên đầu ra headless không đổi vì phần hình ảnh.

## Trạng thái kiểm chứng

Phase 4: [../docs/verification/phase-4.md](../docs/verification/phase-4.md). 
Xem [../docs/verification/phase-3.md](../docs/verification/phase-3.md) và `docs/proof/phase-3/`. Không có bằng chứng nào được ghi nếu lệnh chưa thực sự chạy.
