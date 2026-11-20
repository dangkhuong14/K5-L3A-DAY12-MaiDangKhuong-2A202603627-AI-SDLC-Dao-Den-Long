# Spec Phase 1 — contract đã đọc, tuning chưa chốt

## Cập nhật từ phase1.txt — ưu tiên hơn nội dung nháp phía dưới

Nguồn chính: [PRD-0 và Test Contract v1.0](../phase1.txt). Những mục OPEN/chờ contract bên dưới là dấu vết bản nháp trước khi nhận file; phần cập nhật này giải quyết chúng ở mức giao thức, chưa chốt các lựa chọn gameplay.

### Gameplay bắt buộc mới xác nhận

- Một màn Đêm 1 – Đảo Bến, đảo tròn, **5 đèn L1…L5**.
- Đi lại, **nhảy**, camera 3D góc nhìn thứ ba; Mây đội nón lá treo đèn nhỏ.
- Nhặt đom đóm, nạp ánh sáng vào đèn, Bóng Mực đuổi và chạm mất máu/flames.
- Pulse tốn ánh sáng để xua Bóng Mực; Bóng Mực sợ đèn.
- Thắp hết đèn thắng, hết flames thua; contract còn có kết thúc dawn khi hết giờ.
- Có score, HUD, chơi lại; đêm ấm/cổ tích, sắc vàng cam và tím đen, đảo sáng dần, không máu me.

### Contract đã chốt

| Nội dung | Quy tắc |
|---|---|
| Manifest | game.contract.json ở gốc; contract_version=1.0; build_cmd, run_cmd, headless_cmd và tuning đúng số đang dùng |
| CLI | --seed <int> --night 1 [--scenario <file.json>] [--inputs <file.json>] --ticks <int> --out <file.jsonl> [--snapshot-every <int>] |
| Timestep | 60 tick/s; snapshot 0 sau dựng scenario và trước input; input tick k tạo state/event tick k+1 |
| Dừng | Đủ N bước hoặc game kết thúc; thành công exit 0; lỗi nonzero ra stderr; file input/scenario sai định dạng exit 2 |
| Input | Mặc định đứng yên, yaw=0, nút false; trường vắng giữ giá trị cũ; frame tick tăng nghiêm ngặt; nút kích hoạt cạnh false→true |
| Move | Thành phần [-1,1], chuẩn hóa vector nếu dài hơn 1; biến đổi yaw đúng công thức contract |
| Không gian | Mét, Y-up, mặt đất Y=0; vị trí chân Mây, tâm shade, chân đèn; khoảng cách XZ, trong tầm là ≤r |
| Scenario | Override theo trường; lantern cập nhật theo ID; motes/shades thay danh sách; random flags tắt sinh tương ứng; dựng scenario không event/điểm |
| JSONL | Snapshot từ tick 0 theo chu kỳ mặc định 10; event ngay khi xảy ra; end luôn là dòng cuối |
| Schema | Giữ đúng trường và event payload của contract; state playing/won/lost; shade phải hỗ trợ stunned |
| Determinism | Cùng seed/scenario/inputs cho output giống hệt, kể cả ID; tọa độ làm tròn 3 chữ số; sim_tick=tick ở Phase 1 |

Schema JSON và công thức đầy đủ lấy trực tiếp từ phase1.txt, không dùng bảng tóm tắt này thay thế.

### Chưa chốt: số tuning và luật tự chọn

Cần duyệt player_speed, carry_capacity, lantern_cost, pickup_radius, interact_radius, pulse_cost/radius, night1_duration_s, flames, invuln_s, hit_drop_ratio, pulse_stun_s, pulse_push_m, pulse_cooldown_s, safe_radius, shade_speed, shade_hit_radius, fall_enabled và score.*. lantern_count_night1 bắt buộc bằng 5. Khái niệm không có phải khai null/false đúng hướng dẫn và giải thích; không dùng null để loại bỏ tính năng PRD bắt buộc.

Cũng cần chốt jump/gravity, kích thước đảo, bố trí/spawn, nạp một phần, chọn đèn khi nhiều đèn trong tầm, thứ tự xử lý sự kiện, ưu tiên kết thúc đồng thời, quy tắc rơi tài nguyên và điểm. Chưa tự đặt các giá trị này là yêu cầu giảng viên.

---

# Bản nháp nền và cấu trúc truy vết

## 1. Mục tiêu

Xây bản chơi được của **Đảo Đèn Lồng**: game 3D góc nhìn thứ ba; Mây gom đom đóm để thắp lại Đèn Lồng Lớn, né Bóng Mực trong sương đen. Nguồn: [README](../README.md), mục Dự án.

Ưu tiên: đúng yêu cầu → chấm được headless → có bằng chứng → chơi được → trang trí.

## 2. Phân loại thông tin

- **CONFIRMED:** có nguồn yêu cầu đã đọc.
- **OPEN:** thiếu thông tin, chưa được triển khai như luật đã xác nhận.
- **PROPOSED:** giải pháp/giả định đề xuất, có thể đổi sau khi đọc contract.
- **SUPERSEDED:** bị ticket mới thay thế, giữ dấu vết và lý do.

## 3. Yêu cầu đã xác nhận

| ID | Yêu cầu | Nguồn | Cách kiểm chứng dự kiến |
|---|---|---|---|
| R01 | Game 3D góc nhìn thứ ba | README, mục Dự án | Chơi thật và quay clip |
| R02 | Có Mây, đom đóm, Đèn Lồng Lớn, Bóng Mực, sương đen theo mô tả | README, mục Dự án | Chơi thật; logic chi tiết chờ PRD |
| R03 | Chạy được trên macOS hoặc Linux | README, mục Dự án | Clone sạch và chạy trên ít nhất một hệ đích, ghi rõ OS |
| R04 | Có chế độ headless tuân thủ Test Contract | README; GUIDE §8 | Kiểm thử CLI theo contract, hiện chưa có |
| R05 | Tiếp nhận yêu cầu qua 4 phase, có hồi quy | README; RUBRIC §5 | Test còn hiệu lực chạy lại từng phase |
| R06 | Bằng chứng thật khớp code/tag | RULES §5 | Lưu lệnh, input, output, mã commit và kết luận |
| R07 | Sáng tạo không phá lõi hoặc thay output headless | RUBRIC §5 | So sánh logic trước/sau; demo visual |

## 4. Phạm vi gameplay còn mở

| Nhóm | Cần bổ sung trước khi chốt |
|---|---|
| Di chuyển | Trục tọa độ, tốc độ, dt, đường chéo, collision, biên map |
| Thu thập | Khoảng cách, điều kiện nhặt, sức chứa, vòng đời đom đóm |
| Đèn | Chi phí, bán kính tương tác, điều kiện thắp, tác động |
| Nguy hiểm | Luật Bóng Mực và sương, sát thương nếu có |
| Kết thúc | Thắng, thua, ưu tiên sự kiện, restart |
| Headless | Lệnh, input, output, seed, tick, lỗi, ngưỡng hiệu năng |

**Chưa đặt số đèn, số đom đóm, HP, tốc độ, thời gian hoặc điều kiện thắng.** Những giá trị này phải lấy từ PRD hoặc được ghi là giả định.

## 5. Kiến trúc đề xuất (PROPOSED)

```text
Input bàn phím ──> adapter chơi thật ─┐
                                   ├─> core mô phỏng ─> trạng thái ─> render 3D/HUD
Input contract ───> adapter headless ┘                          └───> output contract
```

- Core không phụ thuộc DOM, WebGL, camera, âm thanh hoặc thời gian hệ thống.
- Một nguồn luật dùng chung cho chơi thật và headless; không làm một bộ luật riêng để “qua test”.
- Nếu contract yêu cầu tick cố định/seed, adapter và core phải tuân thủ chính xác; không tự chọn timestep thay contract.
- Cấu hình số tách khỏi render để dễ đổi qua các phase.
- Cấu trúc dự kiến nếu chọn TypeScript: `game/src/core/`, `game/src/web/`, `game/src/headless/`, `game/tests/`. Đây chưa phải các thư mục đã triển khai.

## 6. Mẫu AC cần điền từ PRD

Mỗi AC phải có: mã yêu cầu → nguồn/giả định → trạng thái đầu → hành động → kết quả chính xác → phương pháp kiểm chứng.

| AC mẫu | Given / When / Then | Trạng thái |
|---|---|---|
| AC-MOVE | Given trạng thái ban đầu và cấu hình hợp lệ; When nhận input di chuyển trong số tick xác định; Then vị trí đúng công thức/giới hạn theo PRD | OPEN: thiếu luật và giá trị |
| AC-COLLECT | Given một đom đóm đủ điều kiện; When Mây thu thập theo luật; Then tài nguyên tăng đúng và cùng đom đóm không được tính hai lần | PROPOSED: xác nhận luật nhặt trước |
| AC-LANTERN | Given đủ tài nguyên theo luật; When tương tác đèn hợp lệ; Then trạng thái đèn và tài nguyên đúng; lặp lại không phát sinh thay đổi trái luật | OPEN |
| AC-END | Given trạng thái sát ngưỡng kết thúc; When tick kích hoạt điều kiện; Then kết quả và trạng thái tiếp theo đúng PRD | OPEN |
| AC-CLI | Given scenario hợp lệ; When gọi đúng lệnh contract; Then exit code và output đúng schema, không cần màn hình | OPEN: thiếu contract |

Không đánh dấu các AC này là đạt khi chưa điền oracle (kết quả đúng) và chạy thật.

## 7. Ngoài phạm vi đề xuất ban đầu

Không thêm multiplayer, tài khoản, backend, mua vật phẩm, thế giới mở, crafting, procedural map hoặc asset phức tạp trừ khi PRD yêu cầu. Không học modeling 3D hoặc tự viết game engine trong bài lab 4 giờ.

## 8. Cổng trước khi code

- [ ] Có PRD-0 và Test Contract đầy đủ.
- [ ] P0 trong bộ câu hỏi đã giải quyết.
- [ ] Spec có các luật và số cần dùng, phân biệt nguồn với giả định.
- [ ] Chốt stack và lệnh smoke test theo contract.
- [ ] Có ít nhất một scenario nhỏ với kết quả mong đợi tính độc lập.
