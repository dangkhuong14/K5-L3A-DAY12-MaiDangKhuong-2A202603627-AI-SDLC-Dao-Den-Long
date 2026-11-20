# Hướng dẫn tạo bằng chứng và nộp Phase 1

## 1. Hiện trạng đã kiểm tra

- Game đã được người làm commit tại 17ab70a. Chưa thấy tag phase-1.
- origin vẫn trỏ tới repo lab của lớp; không push bài vào remote đó.
- Lần chạy thành công gần nhất: 14/14 test và build đạt trên Windows. Không phải bằng chứng full playthrough, macOS/Linux hoặc test ẩn.
- Script evidence mới được thêm, **chưa chạy trong phiên này** vì công cụ quyền từ chối. Chỉ ghi PASS sau khi chạy và đọc kết quả thật.

## 2. Điền thông tin bài nộp

Sửa team trong game.contract.json thành `mssv-ho-ten` của chính mình. Không gửi key hay thông tin tài khoản. Thông tin team cần giống hồ sơ nộp theo hướng dẫn Coach.

Sau khi sửa team hoặc code, chạy lại bằng chứng trước khi commit/tag.

## 3. Bằng chứng tự động — một lệnh

Mở terminal tại gốc repo. Nếu chưa cài dependency, chạy npm ci trước.

```sh
npm run evidence
```

Script tạo một thư mục mới `docs/proof/phase-1/<thoi-diem-UTC>/`, không ghi đè lần cũ:

- environment.json: Node/OS, commit trước lần chạy, working tree.
- tests.stdout.txt, tests.stderr.txt: output test thật.
- build.stdout.txt, build.stderr.txt: output build thật.
- Các file scenario/inputs và output JSONL thực tế.
- Replay cùng seed hai process và SHA-256 để so sánh.
- results.json: exit code, assertion và trạng thái đạt/chưa đạt.

Mở results.json, chỉ kết luận toàn bộ kiểm tra tự động đạt nếu passed=true và không có mục lỗi. Nếu đỏ, giữ nguyên bằng chứng, sửa lỗi và chạy lại tạo thư mục khác. Script mới chưa được xác minh; nếu chính script lỗi thì báo lỗi script, không đổi expected để che lỗi gameplay.

### Những gì các scenario chứng minh

- light-five-lanterns: 50 đom đóm và 5 đèn đặt cùng vị trí để kiểm tra nạp nhiều lần, thắng ở bước 9 và điểm 1848. Đây là bài kiểm tra cô lập, **không phải chơi thắng bản đồ mặc định**.
- lose-by-shade: còn một flame, shade chạm, thua no_flames và dừng.
- lose-by-dawn: hết thời gian, thua dawn và dừng.
- pulse: giữ nút vẫn chỉ phát một pulse, đúng ID shade trúng.
- seeded-replay-a/b: bản đồ mặc định cùng seed và đầu vào cho output giống byte.

Script tự trả exit khác 0 khi lệnh/assertion thất bại. Không sửa các output bằng tay. File JSONL có thể lớn; xem dung lượng trước khi stage.

## 4. Bằng chứng chơi thật — cần bạn thực hiện

Chạy:

```sh
npm run dev
```

Mở địa chỉ Vite in ra. Quay màn hình hoặc lưu ảnh trong docs/proof/phase-1/manual/. Với Windows có thể dùng Snipping Tool hoặc OBS; giữ file gốc.

| Mục | Cần cho thấy |
|---|---|
| Cảnh ban đầu | Đảo 3D, Mây có nón lá/đèn, camera, HUD |
| Điều khiển | A trái/D phải, W/S, xoay camera, nhảy |
| Thu thập/nạp | Túi tăng, E giảm túi và tăng đèn, đèn sáng và môi trường sáng dần |
| Nguy hiểm | Shade đuổi, chạm giảm flame; pulse tốn tài nguyên và xua shade |
| Vùng an toàn | Shade không vào vùng đèn đã sáng |
| Kết thúc | Thắng cả 5 đèn hoặc thua hết flames; nút chơi lại reset đúng |
| Toàn màn | Thực sự chơi từ đầu tới thắng/thua trên bản đồ mặc định; ghi rõ cái nào đã thử |

Một ảnh tĩnh không chứng minh di chuyển hoặc restart; dùng clip cho hành vi. Có thể chia nhiều clip/ảnh cho Phase 1. Video MP4 dưới 5 phút là yêu cầu bàn giao cuối Phase 4; không cần Release v1.0.0 ngay Phase 1.

Tạo manual/checklist.md ghi ngày giờ, browser/OS, phiên bản code, thao tác, kết quả và đường dẫn file. Chưa thử thì ghi NOT RUN; không ghi PASS cho mọi dòng chỉ vì game mở được. Ghi cả lỗi còn tồn tại.

## 5. Ghi chú phase ngắn

Tạo docs/proof/phase-1/summary.md với:

- Yêu cầu → test/ảnh/clip → kết quả; link thư mục evidence cụ thể.
- Giả định: link game/README.md, tuning: game.contract.json.
- Lỗi AI thật: A/D đảo do trục ngang camera; người chơi phát hiện; đã sửa adapter, thêm regression test 5 góc yaw.
- Token/chi phí: dùng số thống kê từ công cụ nếu có; nếu ước tính thì nêu cách ước tính. Không tự bịa số.
- Phần chưa kiểm tra: Linux/macOS, clone sạch, full playthrough nếu chưa làm.
- Retro 3 dòng: điều hiệu quả, lỗi/cách phát hiện, lần sau làm gì sớm hơn.

Commit chứa mã gameplay là nguồn được chạy. Nếu chỉ thêm output/ghi chú sau khi chạy, nói rõ sự khác biệt; nếu sửa gameplay/config sau đó phải chạy lại. Tag cuối phải chứa đúng source đã kiểm chứng.

## 6. Tạo repo cá nhân trên GitHub

Trên GitHub: New repository → tên đúng mẫu → Public. Nếu định push lịch sử local hiện có, để repo mới rỗng, không tạo README/.gitignore/license tự động.

Tên: `K5-<L3A hoặc L3B>-DAY12-<HoVaTen>-<MSSV>-AI-SDLC-Dao-Den-Long`.

Cấu hình một lần, sau khi kiểm tra remote:

```sh
git remote -v
git remote rename origin upstream
git remote add origin <URL-REPO-CA-NHAN>
git switch -c phase-1-submission
```

Nếu origin đã trỏ đúng hoặc upstream/branch đã có thì không chạy lại nguyên xi. URL-REPO-CA-NHAN là placeholder phải thay. main hiện tại có commit game, branch mới sẽ giữ commit đó.

## 7. Kiểm tra dữ liệu trước khi public

Commit 17ab70a đã chứa index.html và thư mục HTML/JS tải từ lab board. Các file này không được game sử dụng. Kiểm tra token, dữ liệu cá nhân và quyền phân phối của chúng trước khi đưa toàn bộ lịch sử lên repo public. Không dán nội dung nghi có secret vào chat công khai.

Không dùng git add . một cách máy móc. Chỉ xóa file khỏi working tree/commit mới không xóa bản cũ trong lịch sử. Nếu phát hiện secret thật: thu hồi trước, rồi xử lý lịch sử với hướng dẫn riêng trước khi public. Không force-push hoặc viết lại lịch sử sau khi có tag để che lỗi.

Các file cần stage thường gồm README.md, package.json/lock, game.contract.json, game/, scripts/, docs/, CLAUDE.md, CREDITS.md và .gitignore. Nhiều file đã commit; chỉ stage phần thay đổi thực tế. Không stage node_modules, .env, dist hoặc HTML tải về mới không cần thiết.

## 8. Commit rồi tag và push

Kiểm tra:

```sh
git status --short
git diff
git diff --cached --stat
```

Stage các file thay đổi cụ thể, ví dụ:

```sh
git add README.md game.contract.json package.json scripts/evidence.mjs docs/NOP-PHASE-1.md
```

Stage thêm output/checklist thực tế nếu đã tạo và đã kiểm tra dữ liệu. Kiểm tra git diff --cached rồi commit, không tạo commit rỗng:

```sh
git commit -m "Complete Phase 1 submission and verification evidence"
git tag -a phase-1 -m "Phase 1: Dao Den Long"
git push -u origin phase-1-submission
git push origin phase-1
```

Nếu tag đã tồn tại, dừng để kiểm tra nó trỏ commit nào; không xóa/gắn lại hoặc force-push theo thói quen. Không cần Release v1.0.0 tại bước này.

## 9. Kiểm tra cuối và nộp

```sh
git show --stat phase-1
git ls-remote --tags origin phase-1
```

- Trên GitHub chọn tag phase-1, xác nhận có mã game, manifest, README và bằng chứng.
- Mở repo ở cửa sổ ẩn danh để kiểm tra public.
- Nếu còn thời gian, clone repo cá nhân sang thư mục mới, checkout phase-1, npm ci, npm test và npm run dev. Trên Windows chỉ chứng minh clone sạch Windows; cần thử Linux/macOS riêng để xác nhận nền tảng đích.
- Gửi link repo cá nhân theo LMS/Coach, kèm link /tree/phase-1 nếu cần chỉ rõ mốc.
- Hạn tag phase-1: trước mốc 1h buổi lab. Nếu hết phase, tag đúng trạng thái thật và ghi phần thiếu; không sửa ngày giờ/tag để giả kịp hạn.
