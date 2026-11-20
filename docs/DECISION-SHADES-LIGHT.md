# Quyết định: Bóng Mực tách đàn và tránh ánh sáng

## Nguồn và phạm vi

Yêu cầu bổ sung của người chơi trong cuộc trò chuyện: Bóng Mực đuổi theo rồi chồng lên nhau; bật sáng làm chúng trông như biến mất. Cần thấy chúng rút ra khỏi vùng sáng và không tiến vào vùng được bảo vệ.

**Đã hỏi và được người chơi chốt:** Q giữ vùng sáng 2 giây; Đèn Lồng Lớn đã thắp giữ vùng an toàn lâu dài. Đây là quyết định gameplay của bản triển khai, không phải ticket mới của giảng viên. Nếu phase sau có luật khác, cập nhật luật và test kèm lý do.

## Nguyên nhân trong bản trước

- Tất cả shade hướng thẳng tới cùng vị trí người chơi, không có lực tách hàng xóm, nên mesh có thể chồng lên nhau.
- Pulse cộng ngay 4m vào vị trí; đèn đưa shade ngay ra ngoài bán kính. Đây là dịch chuyển tức thời, không phải chuyển động rút lui.
- Code không xóa shade khi gặp sáng. Cảm giác biến mất có thể do chồng mesh hoặc nhảy vị trí; chưa xác minh nguyên nhân hình ảnh trực tiếp bằng trình duyệt.

## Các quyết định đã triển khai

| ID | Quyết định | Giá trị / cách kiểm tra |
|---|---|---|
| SL01 | Giữ từng shade, không tiêu diệt khi gặp sáng | Danh sách/ID không đổi khi Q hoặc thắp đèn |
| SL02 | Lực tách hàng xóm khi đuổi/rút lui | Khoảng tách mục tiêu 1.7m; đây là steering mềm, không phải collision cứng |
| SL03 | Q tạo vùng bảo vệ quanh Mây, đi theo Mây | Bán kính 7m, 2 giây = 120 tick; snapshot sau tick kích hoạt còn 120 tick |
| SL04 | Q vẫn tốn tài nguyên và kích hoạt theo cạnh nhấn | 3 đom đóm/lần; giữ Q không gia hạn hoặc trừ thêm |
| SL05 | Shade trong tầm lúc Q bị stun và đẩy dần | pulse_stun_s đổi từ 3 thành 2; pulse_push_m=4 là quãng đẩy cưỡng bức dần, không teleport; tốc độ rút lui tối đa 4.8m/s |
| SL06 | Shade trong vùng sáng rút ra ngoài, shade ngoài không được bước vào | Không xóa/ẩn; dùng retreat hoặc stunned; giới hạn bước di chuyển 4.8/60m |
| SL07 | Đèn lớn đã sáng bảo vệ lâu dài | safe_radius=6m; thêm đường viền hiển thị khi lit |
| SL08 | Không gây hit khi Mây được vùng sáng bảo vệ | Tránh việc đang rút lui vẫn gây mất máu trong vùng bảo vệ |
| SL09 | Số liệu và thứ tự phải tái lập | Steering đọc vị trí đầu bước của tất cả shade; hướng tách trùng điểm dùng chỉ số ổn định, không random/wall clock |

### Các chi tiết cần hiểu đúng

- Đèn vừa thắp có thể bao trùm shade đang ở bên trong. Chúng cần thời gian đi ra; không thể vừa rút lui liên tục vừa ra ngoài ngay lập tức. Trong thời gian này người chơi trong vùng vẫn được bảo vệ.
- Nếu vùng Q di chuyển tới shade đang ở ngoài, shade có thể bị bao trùm rồi rút ra; “không vào vùng sáng” nghĩa là không tự bước từ ngoài vào, không phải teleport ra mỗi khi vùng sáng thay vị trí.
- Lực tách giúp tránh gộp đàn thông thường, không cam kết khoảng cách cứng 1.7m trong mọi cấu hình ép chật hoặc vùng sáng chồng lấn.
- Cooldown Q vẫn 1 giây. Nhả/nhấn lại sau cooldown và đủ tài nguyên sẽ tính lần Q mới, đặt lại hạn 2 giây; giữ nút không gia hạn.
- Điểm per_stun chỉ cộng cho shade trong tầm tại lần Q kích hoạt. Vùng tồn tại không phát thêm pulse event, không tự cộng điểm mỗi tick.
- Schema JSONL không thêm loại event hoặc trường bắt buộc mới. Shade vẫn có state stunned theo contract, thêm retreat là trạng thái được contract cho phép. Output vị trí thay đổi do luật di chuyển mới; không coi đây là thay đổi chỉ mang tính trang trí.

## Ảnh hưởng và các file liên quan

- game/src/core.ts: steering, pulseUntilTick, stun theo hạn tick; cấu hình phụ ở shadeBehavior.
- game.contract.json: pulse_stun_s=2 khớp số thực tế.
- game/src/web.ts: vòng Q đúng bán kính và thời hạn từ core, đi theo Mây; vòng biên đèn đã sáng; HUD đếm giây.
- game/tests/shades.test.ts: các test hồi quy mới.
- Bằng chứng cũ chỉ áp dụng bản cũ. Chạy lại npm run evidence trước khi tạo commit/tag mới. Không di chuyển tag phase-1 đã nộp sau hạn để thay code mới.

## Kiểm chứng tự động

Lần chạy sau thay đổi core: **20/20 test đạt**, npm run build thành công trên Windows. Thêm 6 test:

1. Q tồn tại đúng 120 tick, giữ nút không gia hạn; stun kết thúc đúng hạn.
2. Shade bị Q rút lui từng bước, giữ ID/số lượng, không teleport.
3. Thắp đèn khi shade ở gần: shade thoát dần, đèn còn bảo vệ sau 2 giây.
4. Shade ngoài không tiến vào vùng an toàn của đèn.
5. Bốn shade trùng vị trí tách ra; replay cùng input cho trạng thái giống nhau.
6. Shade bên ngoài Q không vào vùng; không tự trừ chi phí/cộng điểm lặp.

Đã chạy lại sau khi bổ sung vòng biên quanh đèn: 20/20 test đạt (825.5903ms), build Vite 7.3.8 thành công (1.63s), bundle index-BrmQExtl.js. Chưa có screenshot hoặc xác minh visual trực tiếp; các test không thay thế chơi thật.

## Hướng dẫn thử và quay bằng chứng

1. npm run dev, bắt đầu game; dẫn các shade đuổi một đoạn, quan sát còn phân biệt được từng con.
2. Nhặt ít nhất 3 đom đóm. Khi shade gần, nhấn Q một lần: túi giảm 3; vòng sáng bán kính 7m và HUD xuất hiện 2 giây.
3. Giữ Q: chỉ một lần kích hoạt. Quan sát shade chạy ra, không biến mất; di chuyển để kiểm tra vòng sáng đi theo Mây.
4. Đợi hết 2 giây: vòng biến mất, shade có thể đuổi lại. Sau cooldown có thể nhả/nhấn Q để kích hoạt mới nếu đủ tài nguyên.
5. Nạp đủ một đèn khi shade gần: vòng đèn bán kính 6m xuất hiện; shade rút lui, đứng ngoài biên. Đợi hơn 2 giây để chứng minh đèn vẫn bảo vệ.
6. Ra khỏi vùng đèn: shade tiếp tục đuổi; thử thua/chơi lại để kiểm tra reset vùng Q.
7. Lưu clip gốc, ghi kết quả từng mục PASS/FAIL/NOT RUN. Nếu còn thấy biến mất/chồng mesh, quay kèm góc camera và thao tác để phân biệt lỗi hiển thị với logic.

Chạy tự động: npm test; npm run build; npm run evidence. Không sửa output để che lỗi và không gắn tag/push khi chưa quyết định bàn giao.
