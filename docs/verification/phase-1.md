# Kiểm chứng Phase 1 — kết quả thực tế

## Phạm vi và môi trường

- Windows, Git Bash, Node.js 24.14.1, npm 8.5.3 (version thu được ở bước kiểm tra môi trường).
- Lệnh chạy từ gốc repo: `npm install && npm test && npm run build`.
- Mã chưa commit/tag. Kết quả này chỉ ứng với working tree tại lần chạy, không phải bằng chứng khớp tag phase-1.
- Bản ghi dưới đây tóm tắt output công cụ thực tế, không phải một file stdout thô đã được tự động capture.

## Cài dependency — PASS

```text
added 27 packages, and audited 28 packages in 14s
5 packages are looking for funding
found 0 vulnerabilities
```

npm tạo package-lock.json. 0 vulnerabilities là kết quả audit tại lần này, không phải bảo đảm an toàn tuyệt đối.

## Test — PASS: 12/12

Lệnh thực tế từ script: `tsx --test game/tests/*.test.ts`.

```text
✔ manifest tuning matches actual core
✔ 60 ticks move seven meters, snapshot0 before inputs
✔ yaw90 and diagonal normalization
✔ pickup radius inclusive, uses XZ, capacity
✔ deposit uses needed amount, lighting only once
✔ pulse costs once on held edge and stuns
✔ scenario initialization no score/events and partial lamp override
✔ multiple simultaneous contacts lose one flame during invulnerability
✔ win stops subsequent steps, adds bonus once
✔ dawn loss
✔ deterministic generated world
✔ CLI persistent frames, deterministic output, error code2
ℹ tests 12
ℹ suites 0
ℹ pass 12
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1038.4303
```

CLI integration test đã khởi chạy các process headless thực, so output hai lần, xác nhận input giữ trạng thái, end record và lỗi frame trùng exit 2. Các file tạm của test được tự dọn. Không lưu JSONL đó làm artifact. Không coi test hiện có là toàn bộ test ẩn hoặc full playthrough.

## Build web — PASS

```text
vite v7.3.8 building client environment for production...
✓ 8 modules transformed.
../dist/index.html                   0.37 kB │ gzip:   0.29 kB
../dist/assets/index-FUDdxSBd.css    1.98 kB │ gzip:   0.91 kB
../dist/assets/index-3I_3YOMI.js   497.13 kB │ gzip: 127.67 kB
✓ built in 1.72s
```

Cảnh báo: outDir nằm ngoài root game/, Vite không tự làm rỗng dist. Chưa thêm --emptyOutDir vì không cần xóa dữ liệu để kiểm chứng hiện tại.

## Chưa kiểm chứng — NOT RUN

- TypeScript typecheck độc lập: lời gọi công cụ bị chặn trước khi chạy. Vite build thành công không chứng minh typecheck đạt.
- Dev server, tương tác trình duyệt, camera, HUD, restart, screenshot: chưa chạy.
- Full playthrough thắng/thua bằng input thực tế, cân bằng tài nguyên và độ khó: chưa chạy.
- Chạy trên Linux/macOS hoặc clone sạch: chưa chạy.
- Benchmark và video: chưa thực hiện.

Sau khi lệnh cài/test/build được phép, các lời gọi Bash và diagnostics tiếp theo lại bị hệ thống từ chối với thông báo: “Auto mode is unavailable: its safety check does not run for this session”. Không có kết quả typecheck/browser để báo PASS/FAIL; cần chuyển permission mode trong giao diện trước khi tiếp tục.
