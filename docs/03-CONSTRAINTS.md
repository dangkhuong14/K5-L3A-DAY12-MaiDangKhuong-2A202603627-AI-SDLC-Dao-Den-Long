# Ràng buộc và nguyên tắc

## 1. Ràng buộc cứng từ repo

| Nội dung | Hệ quả thực tế | Nguồn |
|---|---|---|
| Game 3D, camera góc nhìn thứ ba | Không thay bằng game 2D để tiết kiệm thời gian | README |
| Chạy được trên macOS hoặc Linux | Chạy trên Windows của người làm chưa đủ chứng minh | README |
| Test Contract headless | Không cần cửa sổ/GPU để kiểm tra logic; giao thức phải đúng tài liệu | GUIDE §8 |
| Phase phát hành lần lượt | Không đoán hoặc tìm nội dung chưa công bố | RULES §11 |
| 4 giờ: 60/60/30/90 phút | Hết phase chuyển tiếp, ghi phần thiếu; mốc theo giờ lab thực tế, không theo ngày máy | README |
| Tag phase-1…phase-4; Release v1.0.0 | Lưu tiến trình và bằng chứng tương ứng | README, RULES |
| Bằng chứng thật | Không sửa output cho đẹp, không test luôn pass, không ghi đạt khi chưa chạy | RULES §5 |
| Giữ harness và lịch sử | Không xóa hướng dẫn/cấu hình đã dùng; không force-push làm mất lịch sử sau tag | RULES §7 |
| Asset có quyền sử dụng | Ưu tiên hình khối tự tạo; ghi nguồn/license trong CREDITS | RULES §8 |
| Không lộ bí mật/dữ liệu người khác | Không commit key, token, .env; kiểm tra trước public repo/video | RULES §9–10 |
| Video .mp4 dưới 5 phút | Có chơi thử và bằng chứng, xem được theo yêu cầu nộp | README, RUBRIC |

## 2. Ràng buộc kỹ thuật đề xuất, chưa phải Test Contract

- Tách core mô phỏng khỏi render ngay từ đầu.
- Mỗi đối tượng có ID ổn định nếu cần truy vết; cách cấp và xuất ID phải theo contract.
- Chỉ một nơi định nghĩa số gameplay. Mỗi số có đơn vị và nguồn hoặc mã giả định.
- Tính toán cùng luật cho headless và giao diện. Không mock kết quả headless.
- Nếu cần ngẫu nhiên tái lập: dùng PRNG có seed, không dùng nguồn ngẫu nhiên không kiểm soát trong core.
- Nếu cần tất định: không lấy `Date.now()`, FPS render hoặc thứ tự callback trình duyệt làm luật mô phỏng.
- Thiết kế thứ tự cập nhật rõ ràng, nhưng **contract được ưu tiên** nếu có quy định.
- Không hard-code đường dẫn ổ đĩa Windows, không phụ thuộc phân biệt hoa/thường sai, không dùng script chỉ chạy trên một shell cho lệnh chấm.
- Khóa dependency khi bắt đầu triển khai; ghi runtime thực tế đã kiểm thử. Không tuyên bố “Linux OK” chỉ vì build được trên Windows.
- Headless không tải asset từ CDN hoặc gọi dịch vụ ngoài lúc chấm. Bước cài dependency có cần mạng phải được mô tả và phù hợp môi trường chấm.
- stdout/stderr/exit code theo contract. Không tự thêm log, trường JSON, metadata hoặc timestamp vào output máy chấm.
- Không đặt ngưỡng FPS, RAM, thời gian chạy tùy ý rồi ghi đó là yêu cầu giảng viên. Chờ ticket/contract; số đo tự đặt phải gắn nhãn mục tiêu nội bộ.

## 3. Giữ scope cho người mới

- Một màn đủ yêu cầu, hình khối đơn giản, HUD đọc được, camera ổn định.
- Chưa thêm thư viện physics nếu collision đơn giản có thể đáp ứng PRD; quyết định lại nếu luật thật cần physics.
- Chưa cần Blender, backend, database hoặc dịch vụ AI trong game.
- Chỉ thêm hiệu ứng/âm thanh sau khi logic và contract đã có bằng chứng.
- Mỗi đợt giao AI: một hành vi + AC + cách kiểm chứng + file được phép sửa.

## 4. Khi yêu cầu mới mâu thuẫn luật cũ

1. Lưu nguồn ticket và phase hiệu lực.
2. Đánh dấu luật cũ SUPERSEDED, không xóa dấu vết.
3. Liệt kê test/config/UI bị ảnh hưởng.
4. Sửa hoặc bỏ test không còn đúng kèm lý do; giữ test còn hiệu lực.
5. Chạy lại toàn bộ kiểm chứng còn hiệu lực; lưu kết quả thật.

Nếu nguồn mâu thuẫn chưa rõ cách ưu tiên, hỏi giảng viên; không tự “chọn luật dễ qua test”. Theo GUIDE, lời giảng viên là cuối cùng.
