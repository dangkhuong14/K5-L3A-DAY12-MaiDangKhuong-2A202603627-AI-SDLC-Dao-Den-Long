# Spec Phase 4 — Ticket-04 "Bình minh: phát hành v1.0.0" (Contract v1.3)

Nguồn: [../phase4.txt](../phase4.txt). Luật gameplay Phase 1–3 giữ nguyên ([08-PHASE-3-SPEC.md](08-PHASE-3-SPEC.md)). Đầu ra headless không đổi so với v1.2 (AC-H1).

## Lệnh (contract v1.3)

| Khóa | Lệnh | Ghi chú |
|---|---|---|
| `run_cmd` | `npm start --` | Build web rồi mở bản Electron |
| `bench_cmd` | `npm run --silent bench --` | `… --seed 42 --duration 30 --out bench.json` |
| `soak_cmd` | `npm run --silent soak --` | `… --seed 7 --nights 10 --out soak.json` |
| `headless_cmd` | như v1.2 | Không đổi |

Đường dẫn `--out` tính theo thư mục người dùng chạy lệnh (`INIT_CWD` của npm).

## Acceptance criteria

| ID | Tiêu chí | Kiểm chứng |
|---|---|---|
| AC-B1 | Bench mở cửa sổ 1280×720 (content size, scale 1), không toàn màn hình, tắt vsync (`disable-gpu-vsync`, `disable-frame-rate-limit`) | `bench.json` → `resolution`, `renderer.viewport`, `vsync_off` |
| AC-B2 | Cảnh: Đêm 1, đúng 200 Bóng `wander` rải đều trên đảo theo seed, 100 đom đóm, L1–L3 sáng với fuel 100, Mây ở (0,0,0) | `phase4.test.ts` "bench scene …" |
| AC-B3 | Tắt sinh thêm, sát thương, nhặt đom đóm, hao dầu, kết thúc Đêm; Bóng vẫn đi theo luật wander | "bench via headless CLI …", "bench flag is off by default …" |
| AC-B4 | Camera tròn tâm O, r 30, Y 15, bắt đầu (30,15,0), ngược chiều kim đồng hồ nhìn từ trên, 15 s/vòng, không input | "bench camera orbit …" |
| AC-B5 | 3 s khởi động không đo, đo đúng `--duration` s, tự thoát mã 0 | Chạy lệnh, `frames`, exit code |
| AC-B6 | Công thức `avg_fps`, `p1_low_fps` (k = max(1, ceil(0.01N))), `frame_ms_p95`, `load_ms` (bắt đầu tiến trình → khung đầu), `peak_mem_mb` (đỉnh tổng working set mọi tiến trình Electron) | `electron/main.cjs`, `bench.json` |
| AC-S1 | Soak chạy 10 Đêm trong một tiến trình, Đêm 1→2→3 xoay vòng, Đêm thứ i (1-based) seed 7+i, input ngẫu nhiên theo seed (đổi hướng mỗi 30 tick; 5% nhảy, 3% lướt, 2% tỏa sáng, 10% tương tác) | "soak: seeded random input …" |
| AC-S2 | `soak.json` có `nights, crashes, results, mem_start_mb, mem_end_mb, duration_s`; đạt khi `crashes = 0` và `mem_end ≤ 1.2·mem_start` | "soak CLI writes soak.json …", chạy lệnh |
| AC-L1 | Sau thua (mọi Đêm) hoặc màn Bình Minh: form nhập tên một lần mỗi lượt; tên 3–12 ký tự `[A-Za-z0-9_]` + chữ Việt có dấu | "leaderboard: …", chơi thật (ảnh 09) |
| AC-L2 | Mục: `name, score` (tổng điểm Đêm đã thắng), `nights_won` 0–3, `achieved_at` ISO 8601 có múi giờ, `seed`; top 10, điểm giảm dần, bằng điểm thì ai đạt trước đứng trên | test + `npm start -- --export-leaderboard out.json` |
| AC-L3 | Lưu trên đĩa (Electron: `userData/leaderboard.json`; web: `localStorage`), còn sau khi mở lại; màn Bảng xếp hạng từ menu | Chơi thật (ảnh 06, 11) |
| AC-A1 | Đổi phím cho 4 hướng, nhảy, lướt, tương tác, tỏa sáng, tạm dừng (2 phím/hành động); báo trùng; "Khôi phục mặc định"; được lưu | "key bindings: …", ảnh 03–04 |
| AC-A2 | Phụ đề + chỉ báo: Bóng xuất hiện (kèm mũi tên mép màn hình), gió sắp thổi, 10 s cuối, đèn fuel < 30 | Chơi thật (ảnh 07, 08) |
| AC-A3 | Giảm chuyển động: tắt rung camera và chớp màn hình | `settings.reduce` trong `web.ts` |
| AC-A4 | Chữ UI ≥ 18 px ở 1280×720; tùy chọn chữ lớn ×1.25 | `style.css` (`--ui`), ảnh 05 |
| AC-D1 | Clone sạch → ≤ 3 lệnh → chơi; README, CHANGELOG 4 phase, CREDITS, LICENSE, retro | [../README.md](../README.md), [RETRO.md](RETRO.md) |
| AC-H1 | Headless byte-identical với v1.2 cho cùng input; full Night 3 ≤ 30 s | Test cũ + `npm run evidence:phase4` |

Giả định: [../game/README.md](../game/README.md#giả-định-phase-4).
