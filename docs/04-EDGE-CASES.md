# Tình huống biên — Phase 1

Nguồn: [phase1.txt](../phase1.txt), Test Contract v1.0. Đây là **test tự đề xuất**, không phải bộ test ẩn chính thức. Chưa có code/test được chạy.

Ký hiệu: **C** = kỳ vọng xác định từ contract; **A** = cần chốt giả định trước khi viết oracle. Với bán kính r, dùng r−ε, r, r+ε; kiểm tra trạng thái số chưa làm tròn, không dùng tọa độ đã làm tròn để quyết định gameplay.

## Contract và mô phỏng

| ID | Tình huống | Kỳ vọng / kiểm tra |
|---|---|---|
| E01 C | Scenario được dựng với tài nguyên và đèn lit sẵn | Snapshot tick 0 phản ánh scenario; không phát sự kiện hoặc cộng điểm do dựng scenario |
| E02 C | Input tick 0 | Không ảnh hưởng snapshot 0; sự kiện của bước đầu mang tick 1 |
| E03 C | Chạy N bước không kết thúc sớm | end.ticks=N, sim_tick=tick ở Phase 1; time_left giảm N/60 |
| E04 C | Không có inputs | Nhân vật không nhận di chuyển/nút; thế giới vẫn mô phỏng bình thường |
| E05 C | Frame sau chỉ đổi interact | move và cam_yaw giữ giá trị frame trước; không reset trường vắng mặt |
| E06 C | Giữ pulse/interact/jump=true nhiều tick | Chỉ kích hoạt ở cạnh false→true; muốn kích hoạt lại phải nhả rồi nhấn |
| E07 C | move=[1,1], yaw=0; yaw=90 với move=[0,1] | Đường chéo chuẩn hóa độ dài 1; yaw=90 đưa hướng +Z input thành +X thế giới |
| E08 C | Frame trùng/giảm tick, JSON hỏng, kiểu field sai | File inputs/scenario sai định dạng: exit 2, lỗi ra stderr; không im lặng bỏ qua |
| E09 C | Hai lần chạy cùng seed/scenario/inputs | So toàn bộ JSONL byte-for-byte, gồm ID và thứ tự event, không chỉ end.score |
| E10 C | Đặt snapshot-every, kết thúc ở tick không chia hết chu kỳ | Snapshot theo chu kỳ bắt đầu tick 0; dòng cuối luôn end. Không tự coi snapshot cuối ngoài chu kỳ là bắt buộc |
| E11 C | Chạy không DISPLAY/GPU, không tải asset | Headless vẫn hoạt động sau bước build/cài cần thiết |
| E12 C | Tọa độ output nhiều chữ số | Làm tròn 3 chữ số thập phân ở output, không làm tròn core mỗi tick |
| E13 A | ticks=0, ticks âm, snapshot-every=0, night khác 1 | Chốt miền giá trị/validation; ticks=0 nếu được hỗ trợ vẫn có snapshot 0 và end; không đoán mã lỗi cho CLI ngoài phần contract đã nói |

## Scenario và hình học

| ID | Tình huống | Kỳ vọng / kiểm tra |
|---|---|---|
| E14 C | random_motes=false, random_shades=false | Không tự sinh thêm loại tương ứng; shades được liệt kê hoạt động ngay |
| E15 C | motes=[], shades=[] | Thay danh sách bằng rỗng, không khôi phục mặc định |
| E16 C | Chỉ sửa L1 | L2…L5 giữ mặc định; đèn cập nhật theo ID, không thay cả danh sách |
| E17 C | Đom đóm ở cùng XZ nhưng khác Y hiển thị | Khoảng cách dùng mặt phẳng XZ, không cộng kích thước mesh |
| E18 C | Đúng bán kính nhặt/tương tác/pulse | Khoảng cách đúng r thuộc bên trong theo quy ước ≤r; kiểm tra thêm r±ε |
| E19 C | Đèn đặt lit=true sẵn | Không cộng điểm thắp đèn, không phát lantern_lit khi dựng scenario |
| E20 A | Cả 5 đèn lit sẵn hoặc flames=0 ở scenario | Chốt lúc đánh giá trạng thái kết thúc mà vẫn giữ quy tắc dựng scenario không phát sự kiện |
| E21 A | ID lạ/trùng; deposited âm/vượt cost; carried vượt capacity | Xác định dữ liệu nào là sai định dạng hoặc sai miền; không tự clamp âm thầm |

## Gameplay: kỳ vọng phụ thuộc tuning/giả định

| ID | Tình huống | Luật cần chốt rồi kiểm tra |
|---|---|---|
| E22 A | Túi còn 1 chỗ, nhiều đom đóm cùng bán kính | Không vượt capacity; thứ tự chọn xác định; con không nhặt còn tồn tại theo luật |
| E23 A | Không có ánh sáng, nhấn tương tác đèn | Không tạo tài nguyên từ không khí; quy định event deposit amount=0 có phát không |
| E24 A | Túi nhiều hơn phần đèn còn thiếu | Quy định nạp một phần hay toàn bộ; trừ đúng số thực nạp; không mất phần dư trái luật |
| E25 A | Tương tác đèn đã sáng, hoặc hai đèn cùng trong tầm | Không cộng điểm lặp trái luật; quy tắc chọn đèn phải ổn định |
| E26 A | Pulse thiếu/đủ đúng cost; giữ nút; cooldown nếu có | Không âm tài nguyên; cạnh nhấn đúng; event và stun đúng luật đã chọn |
| E27 A | Pulse trúng nhiều shade, shade đang stunned | Thứ tự stunned_ids xác định; quy định stun làm mới hay không, push và điểm lặp |
| E28 A | Hai shade chạm cùng tick, chạm liên tục | Quy định invuln, mất flames và rơi tài nguyên; không dựa FPS render |
| E29 A | Shade ở rìa vùng an toàn của đèn | Dùng safe_radius đã khai; quy định cách đẩy/không cho vào, tránh dao động vô hạn |
| E30 A | Tick cuối vừa thắp đèn cuối, vừa hết giờ hoặc mất flame cuối | Một thứ tự giải quyết rõ; không phát cả won và lost |
| E31 A | Nhảy qua mote/shade; rơi khỏi đảo | Giữ quy ước đo XZ; luật nhảy và rơi phải công bố; không tự dùng khoảng cách 3D thay contract |
| E32 C/A | Hết đèn/máu/thời gian | all_lit/won, no_flames/lost, dawn/lost theo loại kết thúc; chốt ưu tiên đồng thời và ngưỡng chính xác |
| E33 A | Restart sau thắng/thua | Không còn input giữ, score/đèn/stun/timer/tài nguyên cũ; seed reset theo quyết định đã ghi |

## Chất lượng kiểm thử

- Với movement, tự tính vị trí bằng tốc độ × N/60, chọn scenario không bị vật cản hoặc sự kiện khác can thiệp.
- Với score, tự lập bảng sự kiện và số điểm; không lấy chính hàm tính điểm làm expected.
- Test determinism phải chạy CLI hai process độc lập, không chỉ gọi hai lần trên cùng object.
- Kiểm tra output bằng parser/schema và assertion hành vi; test “file tồn tại” chưa đủ.
- Thử làm sai có chủ đích một luật khi phát triển test để biết test có bắt được không; hoàn tác thay đổi trước bàn giao.
- Sau mỗi phase, chạy lại test còn hiệu lực; test bị thay luật phải có lý do trong nhật ký.
- Kiểm chứng visual riêng: nón lá có đèn, camera thứ ba, jump, HUD, sắc ấm/tím, đảo sáng dần, restart. Headless xanh không chứng minh các mục này.
