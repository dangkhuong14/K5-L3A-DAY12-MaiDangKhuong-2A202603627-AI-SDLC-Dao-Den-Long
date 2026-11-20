# Theo dõi quyết định và bằng chứng

## Hiện trạng

Đã triển khai bản đầu trong game/, cài dependency, chạy 12/12 test đạt và build production thành công trên Windows. Dùng node:test qua tsx thay Vitest để giảm dependency. Chưa typecheck độc lập hoặc tương tác trình duyệt vì các công cụ tiếp theo lại bị chặn. Kết quả cụ thể ở [bản ghi kiểm chứng](verification/phase-1.md); các hàng NOT RUN phía dưới là mẫu truy vết ban đầu, không thay thế bản ghi cập nhật này.

## Quyết định kỹ thuật

| ID | Quyết định | Lý do | Trạng thái |
|---|---|---|---|
| D01 | TypeScript + Three.js + Vite; Node headless; Vitest | Web đa nền tảng, một core dùng chung, CLI không GPU | Đề xuất, chờ người làm chốt |
| D02 | Model low-poly bằng primitive trong code | Giảm thời gian học modeling, có nón lá/đèn dễ kiểm chứng | Đề xuất |
| D03 | Chưa thêm backend/AI API/physics engine | Không cần cho phạm vi hiện biết, giảm phụ thuộc | Đề xuất |

## Sổ giả định — điền trước khi triển khai luật tương ứng

| ID | Điểm chưa rõ | Quyết định và giá trị | Lý do | AC/test | Phase hiệu lực |
|---|---|---|---|---|---|
| A01 | Tuning gameplay | Chưa chốt | — | — | 1 |
| A02 | Thứ tự sự kiện cùng tick | Chưa chốt | — | E30 | 1 |
| A03 | Nạp từng phần, chọn đèn trong tầm | Chưa chốt | — | E24–25 | 1 |
| A04 | Tick 0 đã có trạng thái kết thúc | Chưa chốt | — | E20 | 1 |

## Truy vết kiểm chứng — mẫu, không phải kết quả

| Yêu cầu | Nguồn | AC/oracle | Lệnh hoặc thao tác | Bằng chứng | Commit/tag | Kết quả |
|---|---|---|---|---|---|---|
| Chuyển động/yaw | Phase 1 phần C | Công thức độc lập, N bước | Chưa có lệnh triển khai | Chưa có | Chưa có | NOT RUN |
| Tất định | Phase 1 phần E | Hai output giống byte | Hai process CLI cùng input | Chưa có | Chưa có | NOT RUN |
| Camera/jump/nón lá | PRD Phase 1 | Chơi thật và quan sát | Chưa có | Chưa có | Chưa có | NOT RUN |

Mỗi bằng chứng lưu input, lệnh nguyên văn, stdout/stderr, exit code, output gốc, kết quả so sánh và môi trường. Ghi đúng revision đã chạy; nếu chạy trước khi tạo tag thì đối chiếu tag với commit đó sau. Không sửa output để biến FAIL thành PASS.

## Nhật ký thay đổi qua phase

| Phase/ticket | Luật bị đổi | Test/config bị ảnh hưởng | Cách xử lý và lý do | Kết quả hồi quy |
|---|---|---|---|---|
| — | — | — | Chưa nhận ticket sau | NOT RUN |

## Nhật ký AI

| Phase/việc | Công cụ | Việc giao | Lỗi phát hiện và cách phát hiện | Token/chi phí thực tế hoặc ước tính | Cách tiết kiệm |
|---|---|---|---|---|---|
| Chuẩn bị | Trợ lý trong IDE | Đọc repo/phase1, soạn spec và đề xuất stack | Link và HTML chưa đọc được đầy đủ; dùng phase1.txt người làm cung cấp | Chưa có số đo; không tự bịa | Không sinh code trước khi đọc contract |

## Retro ngắn mỗi phase

- Đạt/chưa đạt, dựa vào bằng chứng nào?
- Phần cũ còn đúng không, test nào đã bị thay luật?
- AI sai ở đâu, phát hiện bằng gì, cần cải thiện harness nào?
- Token/chi phí lấy từ nguồn nào, nếu ước tính thì mức chắc chắn ra sao?
- Lần sau cắt bớt hoặc làm sớm việc gì?
