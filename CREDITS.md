# Credits

## Nội dung

| Thành phần | Nguồn | Giấy phép / ghi chú |
|---|---|---|
| Ý tưởng game, nhân vật (Mây, Ông Đăng, Bóng Mực, Gió Lạc), bối cảnh, luật | Tài liệu lab Đảo Đèn Lồng (phase1.txt–phase4.txt) | Thuộc tác giả khóa học; không nằm trong LICENSE của repo |
| Model 3D (Mây, nón lá, đèn lồng, Bóng Mực, đảo, cây, mây biển) | Dựng bằng primitive Three.js trong `game/src/web.ts` | Code của bài, MIT |
| Texture (ánh sáng, đom đóm, hào quang) | Vẽ bằng Canvas 2D lúc chạy | Code của bài, MIT |
| Nhạc và hiệu ứng âm thanh | Tổng hợp lúc chạy bằng Web Audio API (`game/src/audio.ts`) | Không có file âm thanh, sample hay âm thanh do AI tạo |
| Font | Font hệ thống | Không tải font ngoài |
| Ảnh chụp màn hình trong docs/ | Chụp từ chính game | Code của bài |

Không dùng model Meshy/Kimi, asset tải về hay HTML tải về (thư mục `Đảo Đèn Lồng Lab_files` và `index.html` gốc là tài liệu lab, game không dùng).

## Thư viện và công cụ

| Tên | Vai trò | Giấy phép |
|---|---|---|
| [Three.js](https://threejs.org) r180 (gồm `BufferGeometryUtils` addon) | Render WebGL | MIT |
| [Electron](https://www.electronjs.org) 37 | Bản desktop: bench, bảng xếp hạng trên đĩa, lệnh export | MIT (Chromium kèm theo có giấy phép riêng, xem `LICENSES.chromium.html` trong bản phân phối Electron) |
| Vite 7, TypeScript 5.9, tsx 4, Node.js | Build, kiểm kiểu, chạy test và headless | MIT / Apache-2.0 (xem file license trong `node_modules`) |

## Công cụ AI

| Công cụ | Dùng cho | Nội dung do AI tạo |
|---|---|---|
| Claude Code (Claude, desktop app) | Đọc yêu cầu, viết spec/ADR, code core + web + Electron, test, script bằng chứng, tài liệu | Toàn bộ code và tài liệu được AI soạn theo yêu cầu của người làm, người làm duyệt và kiểm chứng. Không dùng AI tạo ảnh, model 3D, nhạc hay giọng nói. |
| Trợ giảng AI trên Lab board | Hỏi đáp yêu cầu từng phase | Không có nội dung đưa vào repo |
