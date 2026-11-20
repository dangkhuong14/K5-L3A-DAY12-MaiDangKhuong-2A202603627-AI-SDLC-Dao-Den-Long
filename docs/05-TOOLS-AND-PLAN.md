# Stack đề xuất cho người mới

## Quyết định đề xuất

**TypeScript + Three.js + Vite + Node.js + Vitest.** Phù hợp với bài 3D nhỏ, làm cùng AI, thời gian ngắn, cần bản web và CLI headless theo [Phase 1](../phase1.txt).

Đây là đề xuất, chưa cài package, chưa xác nhận version hay chạy thử môi trường. Chọn một Node.js LTS còn được hỗ trợ, ghi version cụ thể sau smoke test và khóa dependency. Không cần backend hoặc API AI trong game.

## Mỗi công cụ làm gì?

| Công cụ | Vai trò | Có cần ngay? |
|---|---|---|
| TypeScript | Viết luật có kiểu dữ liệu rõ, dùng chung trong trình duyệt và Node | Có |
| Three.js | Hiển thị cảnh 3D: mô hình, camera, vật liệu, ánh sáng, sương | Có |
| Vite | Chạy web khi phát triển, build bản web tĩnh | Có |
| Node.js + tsx | Chạy CLI TypeScript không cửa sổ; có thể thay tsx bằng mã đã biên dịch sau | Có |
| Vitest | Kiểm tra logic, ranh giới, tính tất định và output CLI | Có |
| Git | Lưu thay đổi và tag từng phase | Có, repo đã có |
| Blender | Dựng/sửa model và xuất GLB/glTF | Để sau |
| OBS Studio | Quay demo thành MP4 | Giai đoạn bàn giao |

Three.js là thư viện hiển thị, **không phải engine đầy đủ**: cần tự viết cập nhật thế giới, collision đơn giản, input, vòng đời và HUD. Trong bài nhỏ với AI hỗ trợ, đổi lại ta có core dễ chạy headless và ít phụ thuộc editor.

## Dựng Mây và thế giới bằng gì?

### Bản đầu: dựng bằng code Three.js

Không cần học Blender trước khi chơi được.

| Thành phần | Cách dựng đơn giản |
|---|---|
| Đảo tròn | Cylinder lớn, mặt trên Y=0; cảnh nền biển mây chỉ để hiển thị |
| Mây | Nhóm hình cầu/khối cho đầu, thân, tay chân; hình nón làm nón lá; đèn nhỏ treo trên nón |
| Đèn Lồng Lớn | Cột hình trụ, lồng đèn bằng khối đơn giản, vật liệu phát sáng khi lit |
| Đom đóm | Điểm/sphere nhỏ phát sáng; độ cao và nhấp nhô chỉ ở render |
| Bóng Mực | Cụm sphere tối, chuyển động nhẹ để tạo cảm giác sinh vật |
| Cây/đá/trang trí | Khối low-poly tự tạo, không đưa vào luật collision nếu chưa cần |
| Sương đen | Sương màu tím đen và lớp nền đơn giản; không tự thêm tác động gameplay |

Model hiển thị có thể cao, rộng, nhấp nhô; logic contract vẫn đo từ điểm quy ước và theo mặt phẳng XZ. Không dùng tâm mesh thay chân Mây để xuất player.pos.

**Ánh sáng:** dùng ambient/hemisphere nhẹ, một nguồn sáng chính, vật liệu emissive ở đèn; điều chỉnh không khí sáng dần theo số đèn đã thắp. Tránh bật nhiều nguồn sáng đổ bóng ngay từ đầu. Emissive làm model trông sáng nhưng không tự chiếu sáng vật thể khác; có thể phối hợp thay đổi ánh sáng nền và vài light chọn lọc. Đo thật trước khi thêm bloom/particle nặng.

### Sau khi lõi đúng: Blender hoặc asset có giấy phép

- Blender phù hợp khi muốn silhouette Mây đẹp hơn, model low-poly riêng hoặc animation phức tạp hơn. Xuất GLB/glTF, giữ scale mét và Y-up ở phía game; kiểm tra phép biến đổi sau import.
- Đừng thay model đồng thời với đổi luật. Model không nên quyết định bán kính nhặt/đánh theo kích thước mesh.
- Asset từ thư viện hoặc công cụ AI 3D: kiểm tra giấy phép từng asset, quyền tải/xuất và điều kiện tài khoản; ghi vào CREDITS. Không coi mọi asset miễn phí là CC0.
- Với lab 4 giờ: khuyến nghị bỏ qua modeling chi tiết, rigging và texture phức tạp.

## Có dùng Kimi được không?

**Có, ở vai trò trợ lý AI**, ví dụ phân tích PRD, đề xuất bố cục đảo, viết code TypeScript, tạo test hoặc review diff. Kimi không thay thế Three.js/Node.js và không tự đảm bảo game đúng contract.

Cách dùng ít rủi ro:

1. Giao một việc nhỏ kèm đoạn contract liên quan, kiểu dữ liệu và AC.
2. Yêu cầu trả patch/code và test; không chấp nhận chỉ câu “đã chạy”.
3. Chạy test và game ở máy của bạn, đọc output thật.
4. Nếu dùng nhiều trợ lý, tránh cùng sửa một file một lúc; giữ một bản spec làm nguồn chung.
5. Không cần gọi Kimi API trong game. Điều đó thêm key, chi phí, mạng và tính không tất định không phục vụ yêu cầu.

Chưa xác minh tính năng, model, giá hoặc khả năng tích hợp IDE hiện tại của Kimi trong phiên này. Nếu muốn tạo model 3D từ AI, cần một công cụ chuyên xuất mesh/GLB; đừng mặc định Kimi có chức năng đó. Không gửi key hay dữ liệu riêng tư lên dịch vụ ngoài.

## Vì sao không chọn stack khác làm mặc định?

| Lựa chọn | Khi nên dùng | Đánh đổi trong lab này |
|---|---|---|
| Godot + GDScript | Muốn học làm game lâu dài, thích editor kéo thả, scene và collision tích hợp | Có thể headless, nhưng vẫn phải tự làm adapter CLI/JSONL và giữ logic không phụ thuộc render; bản web cần quy trình export |
| Unity + C# | Đã quen Unity hoặc dự án lâu dài cần hệ sinh thái đó | Với người chưa từng làm game: thời gian cài, học editor/build và cấu hình headless là chi phí lớn |
| Three.js + TypeScript | Bài nhỏ, web, AI sửa code, contract CLI quan trọng | Cần tự lập trình gameplay; đây là lựa chọn đề xuất |

Không học đồng thời Three.js, Godot và Unity trong bài này. Nếu mục tiêu chuyển sang học nghề làm game thay vì hoàn thành lab nhanh, có thể chọn Godot ngay từ đầu, không ghép hai engine.

## Kiến trúc tối thiểu dự kiến

```text
core/       state, config, RNG, step(state, input), events
web/        bàn phím, vòng lặp thời gian, Three.js, camera, HUD
headless/   parse CLI, validate file, dựng scenario, JSONL, exit code
tests/      unit, scenario tự tính kết quả, CLI, determinism
```

- Core không import Three.js/DOM/Node I/O.
- Web gom thời gian thực để gọi step cố định 1/60 giây; render có thể nội suy riêng.
- Headless gọi step trong vòng lặp nhanh, không chờ thời gian thực.
- Cùng config cấp cho gameplay và game.contract.json, tránh hai bản tuning lệch nhau.
- Dùng DOM/CSS cho HUD là đủ; chưa cần React, React Three Fiber, physics engine hoặc ECS.

## Thứ tự triển khai sau khi chốt spec

1. **Smoke test môi trường:** một cảnh 3D trong web, một CLI chạy không cần màn hình. Chưa làm asset.
2. **Contract trước:** config, schema, tick 0, frame giữ trạng thái, chuyển động và end record; test kết quả tự tính.
3. **Lát gameplay đầu:** nhặt → nạp đèn → thắng, cùng logic trên web/headless.
4. **Nguy hiểm:** Bóng Mực đuổi, chạm mất flames, pulse, thua; thêm jump, HUD và restart theo phạm vi Phase 1.
5. **Kiểm chứng:** ranh giới, replay hai lần byte-identical, CLI lỗi, run trên macOS/Linux hoặc môi trường đích phù hợp.
6. **Trang trí:** nón lá, lồng đèn, palette ấm/tím, ánh sáng tăng dần; chưa thêm cơ chế ngoài lõi.
7. **Bàn giao:** hướng dẫn tối đa 3 lệnh, điểm số/giả định, bằng chứng, tag theo yêu cầu khi người làm quyết định phát hành.

Đây là thứ tự ưu tiên, không phải cam kết rằng mọi bước đã làm hoặc chắc chắn vừa 60 phút. Khi thiếu thời gian, cắt trang trí trước, ghi trung thực phần chưa hoàn thành.
