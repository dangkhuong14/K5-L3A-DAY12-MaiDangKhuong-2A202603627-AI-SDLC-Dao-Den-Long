# Retro — Đảo Đèn Lồng, 4 phase (20/11/2026)

Làm một mình cùng Claude Code (desktop app, gói Pro) trong một ngày lab: Phase 1 từ ~14h40 tới 17h, Phase 2 tới 21h17, Phase 3 tới 22h34, Phase 4 tới ~23h30 (giờ +07). Số liệu dưới đây lấy từ lệnh đã chạy thật và từ transcript phiên làm việc; chỗ nào là ước tính thì ghi rõ.

## 1. Evaluation từng phase

| Phase | Yêu cầu đạt (bằng chứng) | Có hỏng phase trước? | Cần chỉnh / còn thiếu |
|---|---|---|---|
| 1 · PRD-0, v1.0 | Core tất định 60 tick/s, headless JSONL, web 3D chơi được. 12/12 test, build OK ([phase-1.md](verification/phase-1.md)) | — | Lúc nộp chưa typecheck và chưa chơi thử trên trình duyệt (bị chặn quyền công cụ, ghi NOT RUN). Lỗi Bóng dồn cục rồi biến mất khi bị xua phát hiện lúc chơi, sửa ở `5df1424`. |
| 2 · Ba hòn đảo, v1.1 | 3 Đêm, Gió Lạc, Bùa Gió, gió mạnh, tạm dừng, cài đặt. 37/37 test, typecheck strict, 9 scenario headless + oracle độc lập PASS ([phase-2.md](verification/phase-2.md)) | Không. Test Phase 1 vẫn chạy; test bị luật mới thay được sửa kèm lý do | Lần chạy evidence đầu FAIL 2 mục vì **oracle sai** (không phải game sai). Âm thanh chưa nghe bằng tai. |
| 3 · Đèn cạn dầu, v1.2 | Dầu, drain, thắp lại, túi lớn dần, thắng 60% lúc bình minh, mù màu. 48/48 test, 12 scenario + oracle PASS ([phase-3.md](verification/phase-3.md)) | Có thay đổi phá vỡ **có chủ ý** (B1–B11 trong CHANGELOG). 5 test v1.1 được thay kèm comment, 0 skip | `evidence:phase2` giờ FAIL là đúng dự kiến, đã ghi rõ. |
| 4 · Phát hành, v1.3 | Bench PASS trên GTX 1650: avg 221 FPS, 1% low 87.6, load 1.05 s ([bench.json](../bench.json)). Soak 10 Đêm 0 crash, RSS 55.9 → 60.4 MB ([soak.json](../soak.json)). Bảng xếp hạng, export, đổi phím, phụ đề, giảm chuyển động, chữ ×1.25. 57/57 test ([phase-4.md](verification/phase-4.md)) | Không. Headless v1.3 trùng byte với v1.2 (evidence so sha256 với commit `3ed8670`) | Trên GPU tích hợp UHD 630 thì 1% low ≈ 20 FPS (FAIL ngưỡng 30). Video demo, tag và Release do người làm tự làm. |

## 2. Làm với AI: cái gì hiệu quả, cái gì không

**Hiệu quả**

- Tách core thuần (không DOM, không đồng hồ) ngay từ Phase 1. Ba phase sau thêm luật mà headless vẫn tất định. Bench và soak cũng dùng lại core mà không cần mock.
- Bắt AI viết **oracle độc lập** trong script evidence (tính lại kết quả từ JSONL thay vì tin test của chính nó). Cách này bắt được 3 lần AI viết kỳ vọng sai.
- Ticket mới thì có quy ước "test cũ bị thay → sửa kèm comment, ghi CHANGELOG, không skip". Nhờ vậy Phase 3 đổi 11 luật mà vẫn giải thích được từng test.
- Chơi thật qua `window.__ddl` (advance, key, bench) và chụp màn hình. Cách này tìm ra lỗi mà test không thấy: cây che nhân vật, mũi tên đè chữ, badge "Shift trái" tràn ô, phụ đề che đồng hồ đếm.

**Không hiệu quả**

- Phase 1 mất nhiều lượt vì chế độ quyền công cụ chặn Bash giữa chừng. Kiểm chứng phải ghi NOT RUN.
- Tối ưu bench theo kiểu đoán. Gộp geometry rồi instancing chỉ đưa 1% low trên iGPU từ 25 lên ~20–34, không ổn định. Đo bằng profiler mới thấy bị giới hạn bởi GPU. Bật `force_high_performance_gpu` mới là thay đổi quyết định (1% low ~105). Nên đo trước rồi mới tối ưu.
- Viết patch lớn bằng script thay chuỗi gây lỗi escape regex hai lần. Sửa nhỏ bằng Edit an toàn hơn.

## 3. Những lần AI sai và cách phát hiện

| Lần | AI sai gì | Phát hiện bằng | Sửa harness |
|---|---|---|---|
| P1 | Bóng dồn vào một điểm rồi biến mất khi bị Tỏa Sáng | Chơi thử | Thêm test "coincident pursuers separate…" và ghi [DECISION-SHADES-LIGHT.md](DECISION-SHADES-LIGHT.md) |
| P2 | Oracle cho rằng Đêm 1/2 chạy đủ 21600 tick, trong khi Đêm kết thúc lúc bình minh | Evidence FAIL; đọc JSONL thấy `game_over` đúng ở 300/330 s | Giữ nguyên thư mục FAIL, sửa oracle, không sửa game; thêm vào CLAUDE.md: "never fabricate evidence" |
| P3 | Hai kỳ vọng test sai (thời điểm Bóng tới đèn; Bóng hết choáng lại chuyển ngay sang chase/drain) | Test đỏ, đối chiếu từng chữ trong ticket | Ghi giả định vào game/README.md trước khi sửa test |
| P4 | Muốn đặt `time_left_s` trực tiếp để chụp đếm ngược, nhưng core tính lại từ `simTick` | Ảnh chụp không có đồng hồ | Skill verify-game ghi rõ dùng `__ddl.game.simTick` |
| P4 | Đặt badge phím bằng tên đầy đủ ("Shift trái") làm tràn ô; phụ đề che mũi tên và đồng hồ | Ảnh chụp 1280×720 | Thêm bước chụp màn hình đổi phím/chữ lớn vào skill |
| P4 | Lần đầu nghĩ bench chậm vì CPU (vòng tách Bóng O(n²)) | Profiler theo khung: sim < 1 ms, render chiếm phần lớn | Giữ chế độ `?prof=1` / `DDL_PROF` trong bản build để đo lại |

Chưa thấy AI bịa yêu cầu ngoài ticket: CLAUDE.md cấm suy diễn phase chưa phát hành, và mỗi chỗ mơ hồ đều được ghi vào sổ giả định.

## 4. Harness giúp nhiều nhất

1. **CLAUDE.md**: thứ tự tick bắt buộc, đơn vị dầu, quy ước id, cấm commit/push khi chưa được yêu cầu, cấm bịa bằng chứng. File ngắn nhưng được đọc lại mỗi khi context bị nén, nên giữ được luật qua 4 phase.
2. **Skill `verify-game`**: một chỗ ghi đủ cổng kiểm chứng (test, build, headless, evidence, chơi thật qua `__ddl`). Không có skill này thì AI thường dừng ở "test xanh".
3. **Script `evidence:phaseN`**: tạo thư mục mới mỗi lần chạy, có oracle độc lập và sha256. Đây là bằng chứng không sửa tay được.
4. `.claude/launch.json` + `window.__ddl`: chơi thử tự động được ngay cả khi pane trình duyệt bị ẩn (rAF dừng).

Không dùng hook. Nếu làm lại, sẽ thêm hook chạy `npm test` sau mỗi lần sửa `core.ts`.

## 5. Token và chi phí

Nguồn: cộng trường `usage` trong transcript của Claude Code (`~/.claude/projects/…/*.jsonl`, mỗi message id tính một lần). Chia phase theo giờ commit. Số Phase 4 tính tới lúc viết retro, chưa gồm phần cuối.

| Phase | Lượt gọi model | Output token | Input mới (không cache) | Đọc từ cache | Ghi cache |
|---|---:|---:|---:|---:|---:|
| 1 | 167 | ~113 K | ~483 K | ~13.0 M | — |
| 2 | 131 | ~174 K | <1 K | ~13.0 M | ~516 K |
| 3 | 84 | ~112 K | <1 K | ~9.3 M | ~298 K |
| 4 | ≥108 | ≥101 K | <1 K | ≥12.4 M | ≥350 K |
| **Tổng** | **≥490** | **≥500 K** | **~485 K** | **≥47.7 M** | **≥1.16 M** |

- Chi phí: dùng gói Claude Pro (thuê bao), không trả theo token. Khi viết retro đã dùng 57% hạn mức 5 giờ và 87% hạn mức tuần. Không quy ra USD vì không có hóa đơn theo token.
- Gần như toàn bộ input là **đọc cache** (~98%). Prompt hệ thống, CLAUDE.md và các file lớn được cache, mỗi lượt chỉ trả phần mới.

**Cách đã tiết kiệm:**

- Đọc tài liệu theo đoạn (`sed -n`, `grep`) thay vì đọc cả file `web.ts` (~900 dòng).
- Sửa nhiều chỗ một lần bằng một script patch. Gom lệnh độc lập vào cùng một lượt.
- Chạy việc dài ở nền: evidence, bench, soak.
- Không dùng subagent: mỗi subagent phải đọc lại context từ đầu.
- Context tự nén 2 lần. Tóm tắt giữ đủ trạng thái để làm tiếp mà không đọc lại repo.

## 6. Nếu làm lại

- Viết `scripts/evidence-*.mjs` và oracle **trước** khi code tính năng (TDD theo ticket), thay vì sau.
- Đo hiệu năng sớm từ Phase 2, với cảnh nhiều Bóng và trên cả iGPU. Instancing nên là mặc định từ đầu, không phải sửa lúc phát hành.
- Thêm hook test sau mỗi lần sửa core. Thêm typecheck vào `npm test` để không phải nhớ cờ `tsc`.
- Commit nhỏ hơn theo từng tính năng. Mỗi phase hiện chỉ có 1–2 commit lớn, rubric Git chấm "commit nhỏ".
- Gắn tag ngay sau commit cuối mỗi phase. Tag Phase 2 và Phase 3 bị quên và phải gắn lại sau.
