# Kiểm chứng Phase 3 (Ticket-03 "Đèn cạn dầu", Contract v1.2)

Ngày chạy: 2026-11-20, Windows 11, Node (xem `environment.json` trong thư mục proof). Chạy trên working tree, chưa commit.

## Tự động — `npm run evidence:phase3`

Thư mục: `docs/proof/phase-3/2026-11-20T15-27-29-280Z/` → `results.json` `passed: true`.

| Mục | Kết quả |
|---|---|
| `npm test` | 48/48 pass, 0 fail, 0 skipped (Phase 1 `core`/`shades`/`keyboard`, Phase 2, và 11 test Phase 3) |
| `npm run build` | exit 0 |
| Typecheck strict (`tsc --noEmit --strict` trên `game/src/*.ts`) | exit 0 |
| Contract | `contract_version "1.2"`, tuning trùng core (oracle `oracle-contract-v1.2` và test manifest) |
| Lệnh headless chuẩn `--seed 42 --night 1 --ticks 600` | exit 0, dạng snapshot v1.2: `fuel`, `ever_lit`, `relit_count`, `capacity`, `target_lantern_id` |
| Scenario + oracle độc lập | fuel-decay-out (tắt ở tick 60), refuel, relight (+40, `relight: true`), capacity-max (20), drain-stack (2 Bóng, tắt ở tick 55), drain-pulse (+15), dawn-win 3/5 · 4/6 · 5/7, dawn-lose 2/5, no-flames trước dawn, all-lit vẫn chơi tiếp. Tất cả PASS. |
| Đêm đầy đủ (seed 42, không input) | Đêm 1: 14400 tick 2.1 s · Đêm 2: 16200 tick 3.0 s · Đêm 3: 18000 tick 3.7 s (gồm khởi động tsx). Hai lần chạy giống hệt byte (sha256 trong thư mục). Không input thì không đèn nào sáng, nên không có sự kiện dầu và kết thúc thua `dawn`. |

Lần chạy trước `2026-11-20T15-22-36-510Z` (cũng PASS, trước khi đổi tên một test) được giữ nguyên trong `docs/proof/phase-3/`.

## Test bị thay

5 test v1.1 bị luật mới làm sai. Mỗi test được thay và có comment lý do ngay trong file. Bảng đầy đủ ở [CHANGELOG.md](../../CHANGELOG.md#test-bị-thay-không-skip-âm-thầm-mỗi-chỗ-có-comment-lý-do-trong-file). Không có test nào bị `skip`/`todo` (kết quả: `skipped 0`, `todo 0`).

## Chơi thử trên trình duyệt (preview `game-dev`, 1280×720)

Tick được chạy qua `window.__ddl.advance` (cùng đường input của web). Có dựng sẵn trạng thái qua `__ddl.game` để rút ngắn thời gian.

| Kiểm tra | Quan sát | Ảnh |
|---|---|---|
| Đêm 1 bắt đầu | đồng hồ 4:00, HUD "Cần 3 đèn sáng lúc bình minh", túi `0/10` | 01 |
| Thắp đèn | túi lên 12, thanh dầu trên đèn. Dầu < 30 thì thanh đỏ, nhấp nháy, mất vòng an toàn và có cảnh báo "đèn yếu" | 01 |
| Bóng Mực hút dầu | Bóng `drain` đứng sát đèn yếu, có sợi nối, dầu giảm 6/giây, toast "Bóng Mực đang hút dầu" | 02 |
| Đèn tắt và thắp lại | toast `lantern_out`; thắp lại L3 bằng 5 đom đóm được +40; prompt "Châm dầu" ở đèn sáng chưa đầy | 03 |
| Chế độ mù màu | ô Cài đặt được lưu. Cảnh báo dùng #FFFFFF kèm ⚠. Viền Bóng #00B3FF, so với #7A3CFF ở chế độ thường | 04, 05a, 05b |
| Thắng bình minh | 3/5 đèn sáng, màn "Bình minh!", bonus 489 = (50+39) + (50+60) + (50+90) + 3·50 | 06 |
| Thua | hết Ngọn Lửa → màn thua `no_flames` | 07 |
| Giới thiệu Đêm 2 / 3 | 4:30 "cần 4/6"; 5:00 "cần 5/7" | 08 |
| FPS `__ddl.bench` ở 1280×720 | Đêm 1: 62 FPS · Đêm 3: 59 FPS (render đồng bộ GPU) | — |
| Console errors | không có | — |

Lỗi tìm thấy khi chơi và đã sửa:

- Thanh dầu ban đầu quá nhỏ và bị cây hoặc toast che. Đã phóng to, tắt `depthTest` và nâng cao hơn.

Lỗi tìm thấy trong test và đã sửa:

- Hai kỳ vọng do AI viết sai. Lỗi nằm ở kỳ vọng của test, không phải ở game:
  - thời điểm Bóng tới đèn (tốc độ wander 1.5 m/s);
  - Bóng hết choáng lại bị Mây hoặc đèn yếu ở gần kéo sang `chase` hay `drain`.
- Đã sửa cả hai test theo đúng ticket.

## Chưa chạy / giới hạn (NOT RUN)

- Âm thanh mới (châm dầu, đèn tắt, Bóng hút) chưa nghe thử bằng tai. Chỉ xác nhận không có lỗi console.
- Hình dạng xẹp 20% và giấy rách của đèn tắt có trong mã (`LampView`). Ở 1280×720 chi tiết này nhỏ, ảnh chụp chưa đủ rõ để làm bằng chứng riêng.
- FPS đo bằng render đồng bộ GPU qua `bench`, không phải vòng `requestAnimationFrame` thời gian thực. Chưa đo trên máy khác.
- Chưa chơi trọn một Đêm 240–300 s bằng tay theo thời gian thực. Chưa thử macOS/Linux hay clone sạch.
- `npm run evidence:phase2` không chạy lại: oracle v1.1 sẽ FAIL theo thiết kế (CHANGELOG). Thư mục proof phase-2 cũ giữ nguyên.
- Git: chưa commit. Tag `phase-3` và push do người nộp tự làm.
