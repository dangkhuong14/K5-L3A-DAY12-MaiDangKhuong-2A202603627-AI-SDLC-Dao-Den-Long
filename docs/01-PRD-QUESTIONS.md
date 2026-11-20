# Câu hỏi PRD — hỏi đúng trước khi code

## Cập nhật sau khi đọc Phase 1

Đã nhận [phase1.txt](../phase1.txt). Các dòng “chờ Test Contract” trong bảng nháp dưới đây không còn là blocker chưa đọc: dùng đáp án sau để đối chiếu.

- Q01: người làm tự khai build_cmd/run_cmd/headless_cmd trong game.contract.json; máy chấm nối tham số đúng phần B. Chưa biết runtime cụ thể/mạng của máy chấm.
- Q02–03: schema scenario/inputs ở phần C–D, output JSONL ở phần E, file qua CLI --scenario/--inputs/--out. Không tự chọn JSON schema khác.
- Q04: 60 tick/s; state 0 trước input; input k sinh state/event k+1; time_left giảm số bước/60.
- Q05: cùng seed/scenario/inputs phải output giống hệt, gồm ID; tọa độ làm tròn 3 chữ số.
- Q06: game tạo mặc định, scenario override; Y-up, mét, XZ, khoảng cách ≤r. Đèn L1…L5; danh sách motes/shades có thể thay thế.
- Q07: lỗi nonzero và stderr; file inputs/scenario sai định dạng exit 2. Miền CLI bất thường và một số giá trị scenario cần làm rõ hoặc ghi giả định.
- Q08: macOS/Linux, web hoặc Docker được phép. Ngưỡng hiệu năng/runtime cụ thể chưa thấy trong Phase 1.
- Q09: yaw và vector chuẩn hóa được quy định phần C. Tốc độ, jump, biên đảo và collision còn tự chọn.
- Q10–13: khai tuning trung thực; luật chi tiết chưa đủ, cần giả định. Pulse, Bóng Mực gây mất máu và sợ đèn là bắt buộc.
- Q14–15: thắng all_lit, thua no_flames/dawn; dừng headless lúc kết thúc; có restart bản chơi. Ưu tiên đồng thời còn mở.
- Q16: thứ tự trong cùng bước chưa quy định, cần ghi rõ quyết định.
- Q17: camera thứ ba, jump, HUD cần thiết, Mây có nón lá treo đèn; phím và bố cục tự chọn.

Ưu tiên hỏi/chốt tiếp: các số tuning, nạp đèn từng phần, quy tắc mất tài nguyên, pulse và invuln, thứ tự sự kiện, các trạng thái kết thúc có sẵn ngay tại scenario tick 0.

---

## Bộ câu hỏi truy vết ban đầu

**P0:** chặn thiết kế hoặc khả năng chấm tự động. **P1:** cần chốt trước khi hoàn tất gameplay. **P2:** có thể hoãn.

Ưu tiên đọc tài liệu để tự điền đáp án, không hỏi lại thông tin đã có. Hỏi trợ giảng từng ý trong phase đã công bố. Nếu được trả lời “chưa quy định”, ghi một giả định hợp lý, không coi đó là yêu cầu chính thức.

## P0 — Test Contract và môi trường

| ID | Câu hỏi cần trả lời | Đáp án / nguồn |
|---|---|---|
| Q01 | Lệnh chính xác mà máy chấm gọi? Thư mục làm việc, tham số, cách cài/build? | Chờ Test Contract |
| Q02 | Input qua file, stdin hay CLI? Schema, trường bắt buộc/tùy chọn, giá trị mặc định, đơn vị? | Chờ Test Contract |
| Q03 | Output có những trường nào? Kiểu số, thứ tự mảng, độ chính xác, JSON/JSONL, dòng cuối hay nhiều dòng? stdout có được chứa log không? | Chờ Test Contract |
| Q04 | Tick, thời lượng mô phỏng, thời điểm áp dụng input và thời điểm lấy snapshot được định nghĩa thế nào? | Chờ Test Contract |
| Q05 | Có yêu cầu seed/tất định không? Cùng input cần bằng nhau tới mức nào, có dung sai không? | Chờ Test Contract |
| Q06 | Map và thực thể do input cấp hay game tạo? ID, thứ tự xử lý, tọa độ, đơn vị khoảng cách được quy định thế nào? | Chờ Test Contract |
| Q07 | Input sai/thiếu/ngoài miền xử lý ra sao? Exit code và kênh báo lỗi có được quy định không? | Chờ Test Contract |
| Q08 | Máy chấm dùng macOS hay Linux, runtime/version nào, có mạng và bước build không? Có giới hạn thời gian/bộ nhớ không? | Chờ tài liệu |

## P1 — Luật chơi và vòng đời

| ID | Câu hỏi cần trả lời | Khi chưa quy định |
|---|---|---|
| Q09 | Mây di chuyển theo trục thế giới hay camera? Tốc độ, chạy chéo, gia tốc, va chạm, biên map? | Ghi rõ quyết định, đưa số vào config |
| Q10 | Đom đóm được nhặt tự động hay bằng nút? Bán kính, số lượng, sức chứa, có hồi sinh không? | Không tự thêm cơ chế trước khi đọc PRD |
| Q11 | Thắp Đèn Lồng Lớn cần bao nhiêu đom đóm? Có trừ tài nguyên, góp từng phần, thắp lại được không? | Ghi luật trạng thái và tài nguyên |
| Q12 | Bóng Mực phát hiện/di chuyển/tấn công thế nào? Chạm liên tục có tính nhiều lần không? | Chưa tự thêm HP, cooldown hoặc AI truy đuổi |
| Q13 | Sương đen chỉ là hiệu ứng hay tác động tới luật? Đèn thay đổi vùng sương thế nào? | Tách visual và luật nếu có |
| Q14 | Điều kiện thắng/thua chính xác? Nếu cùng tick vừa đạt mục tiêu vừa trúng đòn thì ưu tiên gì? | Cần quyết định có test tương ứng |
| Q15 | Sau thắng/thua có ngừng mô phỏng không? Restart reset những gì? | Ghi vòng đời, không suy đoán |
| Q16 | Thứ tự nhặt, tương tác đèn, di chuyển địch, nhận sát thương trong cùng tick? | Ghi một thứ tự nhất quán nếu không quy định |
| Q17 | UI phải thể hiện gì, điều khiển nào bắt buộc, camera thứ ba cần hành vi nào? | Chỉ làm phần cần để chơi và nghiệm thu |

## P2 — Trải nghiệm và sáng tạo

- Có yêu cầu âm thanh, màn hình hướng dẫn, pause, hỗ trợ mobile hoặc lưu game không? Nếu không: mặc định ngoài phạm vi ban đầu, không coi là bắt buộc.
- Sáng tạo nhỏ nào chỉ tác động hình ảnh/âm thanh, không thêm thực thể hoặc thay đổi output headless?
- Người chơi cần nhận biết mục tiêu, đom đóm và vùng nguy hiểm bằng dấu hiệu nào ngoài màu sắc?

## Mẫu hỏi trợ giảng

> Trong Phase 1, đoạn [trích nguyên văn] chưa nói rõ [một điểm]. Trường hợp [input/trạng thái cụ thể] thì kết quả mong đợi là A hay B? Nếu chưa quy định, tôi sẽ chọn A và ghi là giả định. Cách hiểu này có mâu thuẫn yêu cầu đã công bố không?

## Điều kiện kết thúc làm rõ

- P0 có đáp án hoặc xác nhận rõ phần chưa quy định.
- Các con số gameplay có nguồn hoặc mã giả định.
- Từng luật chính có ít nhất một AC và một cách kiểm chứng.
- Không để AI tự đặt tên field, lệnh chấm hoặc output thay cho Test Contract.
