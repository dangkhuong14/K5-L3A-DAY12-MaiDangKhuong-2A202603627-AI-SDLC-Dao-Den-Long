# Kiểm chứng Phase 2 (Ticket-02, Contract v1.1)

Ngày chạy: 2026-11-20, Windows 11, Node (xem `environment.json` trong thư mục proof). Chạy trên working tree, chưa commit.

## Tự động — `npm run evidence:phase2`

Thư mục: `docs/proof/phase-2/2026-11-20T13-21-06-823Z/` → `results.json` `passed: true`.

| Mục | Kết quả |
|---|---|
| `npm test` | 37/37 pass, 0 fail (Phase 1 `core`/`shades`/`keyboard` + 15 scenario Phase 2) |
| `npm run build` | exit 0 |
| Typecheck strict (`tsc --noEmit --strict` trên `game/src/*.ts`) | exit 0, không lỗi |
| Scenario headless + oracle độc lập | dash, drifter-steal, drifter-pulse-drop, wind-charm, strong-wind-night3, pause, night2-launch-pad, night3-pad-to-tier2, win-scoring — tất cả PASS |
| Đêm đầy đủ (seed 42) | Đêm 1: 18000 tick 1.1 s · Đêm 2: 19800 tick 1.9 s · Đêm 3: 21600 tick 2.2 s (gồm khởi động tsx); hai lần chạy giống hệt byte (sha256 trong thư mục) |
| Lệnh headless chuẩn `--seed 42 --night 1 --ticks 600` | exit 0, 65 dòng, dòng cuối `end` tick 600 |

Lần chạy trước `2026-11-20T13-20-20-561Z` có 2 FAIL do oracle sai (kỳ vọng Đêm 1/2 chạy đủ 21600 tick, trong khi chúng kết thúc đúng lúc bình minh 300/330 s). Đã sửa oracle, không sửa game; thư mục lỗi được giữ nguyên.

## Chơi thử trên trình duyệt (preview `game-dev`, 1280×720)

Pane preview bị ẩn nên `requestAnimationFrame` tạm dừng; tick được chạy qua `window.__ddl.advance` (cùng đường input của web), có dựng sẵn trạng thái để rút ngắn thời gian.

| Kiểm tra | Quan sát |
|---|---|
| Menu → Luyện tập Đêm 1 → giới thiệu → chơi | HUD đầy đủ: Ngọn Lửa, đồng hồ, đèn 0/5 + điểm, thanh 10 ô, vòng Lướt/Tỏa Sáng, phím tắt |
| Giữ A 125 tick tới M1 (12,0,0) | `carried` = 1 |
| Nạp đèn L1 (E) với 10 đom đóm | L1 sáng, điểm 200, vòng an toàn, toast, pill "Vùng an toàn", mũi tên "L2 · 28m" |
| Tỏa Sáng (Q) với Bóng ở 2.5 m | mang 5→2, điểm +5, Bóng `stunned`, bị đẩy lùi |
| P (keydown thật) | `mode: paused`, menu Tạm dừng 4 nút |
| Hết Ngọn Lửa | màn "Đêm còn dài…" với nút Chơi lại Đêm 1 |
| Đêm 2 | cầu tre hiển thị; bục nhảy phóng lên (Y tăng tới 4.8 m sau 36 tick) |
| Đêm 3, tick ≈1910 | gió hoạt động (dir 275°), pill gió, lá bay; tầng, tháp chuông, Bóng Mực, Gió Lạc hiển thị |
| Thắng Đêm 3 | màn Bình Minh, tổng điểm 974 |
| FPS `__ddl.bench(300)` Đêm 3, 1280×720, DPR 1.25 | **57 FPS** (render đồng bộ GPU) |
| Console errors | không có |

Lỗi tìm thấy khi chơi và đã sửa: cây đứng giữa camera và Mây che nhân vật (thêm thu nhỏ cây chắn tầm nhìn); mũi tên chỉ đèn đè lên bảng phím tắt ở góc dưới trái (giới hạn biên dưới).

## Chưa chạy / giới hạn

- FPS đo bằng render đồng bộ GPU trong pane ẩn, không phải vòng `requestAnimationFrame` thời gian thực; chưa đo trên máy khác.
- Chưa nghe thử âm thanh (môi trường tự động không có loa); chỉ xác nhận không lỗi console khi phát.
- Chưa thử macOS/Linux, chưa chơi trọn một Đêm bằng tay theo thời gian thực.
- `scripts/evidence.mjs` (Phase 1) được giữ nguyên làm harness lịch sử; oracle của nó viết theo số Phase 1 (pulse +20, túi 15) nên dự kiến không khớp số chuẩn v1.1; không chạy lại trong phiên này (NOT RUN) để không tạo thêm thư mục proof phase-1 — dùng `evidence:phase2`.
- Git: commit Phase 2 chứa CLAUDE.md, skill verify-game và bằng chứng; tag `phase-2` và push do người nộp tự làm.
