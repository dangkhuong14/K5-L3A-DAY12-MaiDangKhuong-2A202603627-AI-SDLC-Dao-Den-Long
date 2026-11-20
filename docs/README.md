# Bộ tài liệu chuẩn bị — Đảo Đèn Lồng

Dành cho người lần đầu làm game, ưu tiên hiểu yêu cầu và cách kiểm chứng trước khi viết code.

## Tình trạng hiện tại

- Đã đối chiếu README, GUIDE, CHECKPOINTS, RULES và RUBRIC trong repo.
- Đã đọc đầy đủ PRD-0 và Test Contract v1.0 từ [phase1.txt](../phase1.txt) do người làm bổ sung sau bản nháp đầu.
- Contract đã đủ rõ để đề xuất kiến trúc; các số tuning và luật gameplay còn mơ hồ cần chốt trước khi code. Các mục ghi “chờ contract” ở bản câu hỏi ban đầu được cập nhật bằng phần trả lời Phase 1 trong file đó.
- Chưa cài engine, dependency, tạo game hay chạy test. Các checklist dưới đây là kế hoạch, không phải bằng chứng đã đạt.

## Đọc theo thứ tự

| Tài liệu | Mục đích |
|---|---|
| [01-PRD-QUESTIONS.md](01-PRD-QUESTIONS.md) | Câu hỏi cần lấy đáp án từ PRD, Test Contract hoặc trợ giảng |
| [02-SPEC.md](02-SPEC.md) | Yêu cầu đã biết, phạm vi, mẫu tiêu chí nghiệm thu |
| [03-CONSTRAINTS.md](03-CONSTRAINTS.md) | Ràng buộc cứng và nguyên tắc thiết kế |
| [04-EDGE-CASES.md](04-EDGE-CASES.md) | Tình huống biên và kế hoạch kiểm chứng |
| [05-TOOLS-AND-PLAN.md](05-TOOLS-AND-PLAN.md) | Chọn công cụ và lộ trình cho người mới |
| [06-TRACKING.md](06-TRACKING.md) | Giả định, truy vết, thay đổi, bằng chứng và nhật ký AI |
| [07-PHASE-2-SPEC.md](07-PHASE-2-SPEC.md) | Spec Phase 2 (Ticket-02) với acceptance criteria cho từng tính năng mới |

## Việc cần làm ngay

1. Đọc phần cập nhật Phase 1 trong spec và bộ câu hỏi; nguồn là [phase1.txt](../phase1.txt).
2. Chốt tuning và những giả định còn mở, đặc biệt thứ tự sự kiện và cách tính điểm.
3. Xem [stack đề xuất](05-TOOLS-AND-PLAN.md): TypeScript + Three.js + Vite, Node.js headless, Vitest.
4. Sau khi người làm chốt, mới cài môi trường và triển khai từng lát nhỏ.

Không cần mở hoặc suy đoán nội dung phase chưa phát hành. Không commit/push/tag/Release chỉ vì có checklist trong bộ tài liệu này.

## Thuật ngữ ngắn

- **PRD:** mô tả sản phẩm phải làm gì.
- **Spec:** luật đủ rõ để lập trình và kiểm tra.
- **Acceptance criteria (AC):** điều kiện để kết luận một yêu cầu đạt.
- **Headless:** chạy logic không cần cửa sổ/đồ họa.
- **Test Contract:** giao ước chính xác để máy chấm đưa đầu vào và đọc đầu ra.
- **Regression / hồi quy:** kiểm tra phần cũ vẫn đúng sau khi sửa phần mới.
- **Seed:** giá trị khởi tạo dùng để tái lập ngẫu nhiên nếu contract quy định.

Tài liệu gốc của lab ở thư mục gốc vẫn là nguồn chính; bộ này không thay thế PRD hoặc Test Contract.
