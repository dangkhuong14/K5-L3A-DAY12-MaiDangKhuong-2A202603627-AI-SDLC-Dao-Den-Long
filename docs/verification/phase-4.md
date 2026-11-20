# Kiểm chứng Phase 4 — Ticket-04 "Bình minh: phát hành v1.0.0" (Contract v1.3)

Chạy ngày 20/11/2026 trên Windows 11 (10.0.26200), i7-9750H, 15.8 GB RAM, GTX 1650 + Intel UHD 630, Node 24.14.1, Electron 37.10.3 (Chromium 138). Chạy trên working tree chưa commit, nền là `3ed8670`. Không có số nào được ghi nếu lệnh chưa thực sự chạy.

## Tự động

Bằng chứng: `docs/proof/phase-4/2026-11-20T16-22-29-813Z/` → `results.json` `passed: true`.

| Lệnh / kiểm tra | Kết quả |
|---|---|
| `npm test` | 57/57 pass, 0 fail, 0 skipped (Phase 1–3 + 9 test Phase 4) |
| `npm run build` | OK. Cảnh báo chunk > 500 kB (Three.js), không lỗi |
| Typecheck strict `web.ts` (`tsc --noEmit --strict … game/src/web.ts`) | exit 0 |
| Headless v1.3 ≡ v1.2 | 7 cặp chạy (Đêm 1 600 tick, input ngẫu nhiên 6000 tick × 3 Đêm, full night × 3) bằng `game/src/headless.ts` hiện tại và bản `core.ts`/`headless.ts` của `3ed8670`: sha256 trùng cả 7. File > 1 MB bị xóa sau khi băm, `results.json` giữ hash và kích thước |
| Full Night 3 | 3.5 s (ngưỡng 30 s) |
| Contract | `contract_version "1.3"`, có `run_cmd`, `bench_cmd`, `soak_cmd` |
| `npm run --silent soak -- --seed 7 --nights 10 --out soak.json` | **PASS**: 10 Đêm, 0 crash, RSS 55.9 → 60.4 MB (≤ 1.2×), 2.2 s. Cả 10 Đêm thua `no_flames` (input ngẫu nhiên) |
| `npm run --silent bench -- --seed 42 --duration 30 --out bench.json` | **PASS**, exit 0: 6640 frame, avg 221.2 FPS, 1% low 87.6, p95 6.8 ms, load 1051 ms, peak 467.8 MB, 0 frame > 33 ms, GPU GTX 1650 (file `bench.json` ở gốc repo) |
| Bench trong evidence (lần chạy thứ hai) | PASS: avg 274.9, 1% low 111.1, load 2246 ms |
| `npm run evidence:phase3` | Mọi oracle luật Phase 3 PASS. Chỉ `oracle-contract-v1.2` FAIL vì contract giờ là 1.3 (dự kiến) → `docs/proof/phase-3/2026-11-20T16-24-16-223Z/` |
| Export bảng xếp hạng | `npm start -- --export-leaderboard ../lb-test.json` chạy từ `game/` ghi đúng vào gốc repo (`INIT_CWD`). Với userData thử có 4 mục: thứ tự Minh 900, Đức 500 (09:00), Lan 500 (10:00), Thủy_01 0 — đúng luật bằng điểm thì ai đạt trước đứng trên |

Lần chạy evidence đầu (`2026-11-20T16-20-13-728Z`) cũng ALL PASSED, nhưng thư mục nặng 67 MB vì JSONL snapshot từng tick. Đã xóa thư mục đó, sửa script để chỉ giữ hash cho file lớn, rồi chạy lại. Kết quả hai lần như nhau.

## Chơi thật (Electron, 1280×720) — ảnh trong [../screenshots](../screenshots/)

- Menu có nút "Bảng xếp hạng" (01).
- Cài đặt → Đổi phím: gán phím, gán trùng hiện "⚠ Trùng phím", "Khôi phục mặc định" trả về mặc định (03, 04). Badge hồi chiêu đổi theo phím đã gán.
- Chữ lớn ×1.25 không tràn khung.
- Bóng xuất hiện: phụ đề "[Tiếng rít] Bóng Mực Sx xuất hiện · cách N m" và mũi tên ở mép màn hình (07).
- 10 s cuối: đồng hồ đếm lớn, phụ đề không che (08).
- Thua → form tên (09). Tên 2 ký tự báo "Tên cần ít nhất 3 ký tự." Lưu "Thủy_01" vào `userData/leaderboard.json` rồi mở màn Bảng xếp hạng (11, dòng mới được tô).
- Cảnh bench: 200 Bóng, 100 đom đóm, L1–L3 sáng, camera bay vòng (12).
- Bản web tĩnh của Release (`release/dao-den-long-web-v1.0.0.zip`): giải nén ra thư mục tạm, `node serve-dist.mjs . 8090`, mở trong trình duyệt. Menu hiện đủ, vào Đêm 1 và chạy 400 tick, không lỗi console.

Lỗi tìm thấy khi chơi và đã sửa:

- Badge "Shift trái" tràn ô.
- Mũi tên đèn đè bảng phím tắt.
- Phụ đề che mũi tên Bóng và đồng hồ đếm.

## Giới hạn và NOT RUN

- **GPU tích hợp:** chạy bench trên Intel UHD 630 trước khi ép GPU rời được avg ≈ 115 nhưng 1% low ≈ 20, tức FAIL ngưỡng 30. Kết quả trên máy chấm phụ thuộc GPU của máy đó.
- **NOT RUN:** giảm chuyển động và tắt phụ đề chỉ kiểm qua code (`settings.reduce` chặn `flash()` và rung camera; `caption()` không hiện khi tắt phụ đề), chưa chụp ảnh riêng.
- **NOT RUN:** chạy trên macOS/Linux; clone sạch trên máy khác.
- Video demo v1.0.0: người làm tự quay (2:07, 1920×992, 147 MB), đặt tên `demo.mp4` để đính kèm Release; link ở đầu README.
- **NOT RUN, để người làm tự làm:** tag `phase-4`, GitHub Release `v1.0.0` (đính kèm zip + `demo.mp4`), push.
