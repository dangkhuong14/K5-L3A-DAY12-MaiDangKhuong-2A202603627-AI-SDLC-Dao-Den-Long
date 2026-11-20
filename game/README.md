# Đảo Đèn Lồng — Phase 1

## Trạng thái kiểm chứng

**Đã cài dependency; 12/12 test đạt và build production thành công trên Windows, Node 24.14.1.** npm audit báo 0 vulnerabilities tại lần cài. package-lock.json đã được npm tạo. Chi tiết: [bản ghi kiểm chứng](../docs/verification/phase-1.md).

Chưa chạy typecheck độc lập, chưa chơi thử bằng trình duyệt, chưa đo hiệu năng hoặc thử trên macOS/Linux: các công cụ tiếp theo bị hệ thống quyền chặn. Không có ảnh/video hay bằng chứng nghiệm thu visual. Đây chưa phải bản phát hành đã nghiệm thu đầy đủ.

File index.html ở gốc và các asset tải về của người làm không được sử dụng hoặc sửa. Model trong game được tạo bằng primitive Three.js, không dùng dịch vụ tạo 3D.

## Cài và chạy (từ gốc repo)

Yêu cầu Node.js LTS hiện đại phù hợp Vite 7 (Node 22.12+ hoặc Node 24); môi trường ghi nhận trước cài đặt là Node 24.14.1. Thực hiện:

```sh
npm install
npm run dev
```

Mở địa chỉ Vite in ra, thường http://localhost:5173. Bản game dùng game/index.html, không phải index.html gốc.

```sh
npm test
npm run build
```

Build web đã tạo trong dist/. npm test đạt 12/12; npm run build thành công với Vite 7.3.8. Vite cảnh báo outDir ở ngoài root game/ và sẽ không tự dọn thư mục đó; không phải lỗi build. npm run dev chưa được chạy trong phiên kiểm chứng. Test dùng node:test qua tsx, không phải Vitest như đề xuất ban đầu: giảm một dependency trong bản đầu, vẫn kiểm tra assertion thực và CLI process độc lập.

## Điều khiển

- WASD/phím mũi tên: di chuyển theo camera.
- Kéo chuột trên cảnh: xoay camera.
- Space: nhảy.
- E: nạp đom đóm vào đèn gần nhất chưa sáng.
- Q: tỏa sáng, tốn 3 đom đóm, xua/stun Bóng Mực trong 7m.
- Esc: tạm dừng; trở lại qua nút Tiếp tục.
- Sau thắng/thua: nút Chơi lại.

Chưa hỗ trợ điều khiển cảm ứng. Đèn sáng tạo vùng an toàn 6m. Túi chứa 15; mỗi đèn cần 10. Thắp cả 5 đèn trước bình minh và giữ ít nhất một ngọn lửa để chơi an toàn.

## Headless

```sh
npm run --silent headless -- --seed 42 --night 1 --ticks 600 --out output.jsonl
```

Có --scenario path.json, --inputs path.json, --snapshot-every N. Schema nguồn ở ../phase1.txt. Snapshot 0 trước input; fixed timestep 1/60; event bước k mang tick k+1; end ở dòng cuối. Không cần render/GPU. Manifest game.contract.json ở gốc; **team đang là placeholder, người nộp cần điền MSSV/họ tên**.

## Giả định gameplay của bản đầu

- Đảo bán kính 38m; tâm nhân vật chặn ở 37m, không rơi. Jump vận tốc đầu 8m/s, trọng lực 20m/s². Nhảy không tránh được hit vì khoảng cách luật đo XZ.
- Mặc định tạo 100 motes, 4 shades theo seed; không sinh thêm sau đó. Motes được nhặt tự động, theo thứ tự danh sách, một lần/con. Tắt random bằng scenario sẽ không có danh sách mặc định của loại tương ứng.
- Các giá trị tuning đúng như game.contract.json và core.ts; test đối chiếu hai bản.
- Thứ tự mỗi bước: giảm timer cooldown/invuln → di chuyển/nhảy → nhặt → nạp → pulse → shade di chuyển/hit → giảm thời gian và xét kết thúc.
- Nạp từng phần: tối đa phần đèn còn thiếu; phần dư ở túi. Chọn đèn chưa sáng gần nhất trong tầm, hòa khoảng cách chọn ID. Giữ E không nạp lặp: cần nhả/nhấn lại.
- Q tạo vùng sáng bán kính 7m đi theo Mây trong 2 giây (120 tick). Shade trúng lúc kích hoạt bị stun 2 giây, nhận lực đẩy dần 4m, không teleport; vùng sáng buộc shade rút lui và chặn bước đi từ ngoài vào. Giữ Q không gia hạn; lần nhả/nhấn mới sau cooldown 1s tốn thêm 3 đom đóm và đặt lại hạn. Chỉ cộng điểm cho shade trúng tại lần kích hoạt.
- Shade dùng lực tách mềm ở khoảng cách 1.7m để không chồng thành một khối; tốc độ rút lui tối đa 4.8m/s. Không xóa/ẩn shade khi gặp sáng. [Quyết định và hướng dẫn kiểm tra](../docs/DECISION-SHADES-LIGHT.md).
- Hit giảm 1 flame, invuln 2 giây; mất floor(carried × 0.25) đom đóm. Đom đóm rơi bị loại khỏi túi, không tạo lại dưới đất. Mỗi bước tối đa một hit do invuln.
- Đèn đã sáng giữ vùng an toàn 6m lâu dài. Shade bên trong rút ra liên tục; shade ngoài không bước vào. Mây trong vùng đèn/Q không nhận hit trong khi shade đang rút lui. Chưa dùng physics mesh để collision.
- Ưu tiên kết thúc cùng tick: all_lit/won → no_flames/lost → dawn/lost. Khi scenario đã đủ điều kiện kết thúc tại tick 0, giữ snapshot ban đầu playing, xét kết thúc ở bước đầu; ticks=0 không thực hiện bước đó. Đây là giả định cần đối chiếu nếu trợ giảng làm rõ khác.
- Dựng scenario không cộng điểm/event. Time override là thời lượng còn lại ban đầu và sau k bước giảm k/60.
- Restart dùng lại seed 12 như bản web đầu, reset toàn bộ game và input; góc camera được giữ.

## Điểm số

Nhặt +10/con, thắp đèn +100/đèn, pulse +20/shade trúng. Thắng thêm floor(time_left_s) × 2 + flames × 50. Thua không nhận bonus. Không cộng điểm khi scenario dựng sẵn trạng thái. Nạp chưa đủ để sáng không có điểm riêng.

## Test đã chạy — 12/12 đạt trên Windows

Manifest/config đồng nhất; 60 tick chuyển động; yaw/đường chéo; bán kính XZ và capacity; nạp phần thiếu; pulse cạnh nhấn; scenario không score; invuln nhiều shade; thắng/dừng; dawn; seed; CLI giữ input, output byte-identical hai process và file sai exit 2.

Còn phải bổ sung/kiểm tra: full playthrough thắng/thua bằng CLI và web, các input lỗi biên, camera thực tế, hiệu năng, khả năng thu đủ tài nguyên khi chơi thật, khả năng chạy clone sạch trên Linux/macOS. Test xanh nếu có cũng không thay cho chơi thật.

## Sáng tạo của tôi

Đề xuất thể hiện Mây bằng hình khối low-poly, nón lá gắn đèn nhỏ, biển mây và sao; vòng ánh sáng visual khi pulse; môi trường sáng dần theo số đèn. Không thêm thực thể gameplay ngoài contract. Chưa có ảnh/clip chứng minh vì chưa chạy.
