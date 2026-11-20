# ADR-003 — Mô hình trạng thái đèn và luật thắng "Đèn cạn dầu"

- Trạng thái: **Chấp nhận** (2026-11-20)
- Nguồn: [phase3.txt](../../phase3.txt) (Ticket-03, Contract v1.2). Thay thế một phần các luật Ticket-02 trong [07-PHASE-2-SPEC.md](../07-PHASE-2-SPEC.md).
- Liên quan: [CHANGELOG.md](../../CHANGELOG.md), [08-PHASE-3-SPEC.md](../08-PHASE-3-SPEC.md), [game/README.md](../../game/README.md)

## Bối cảnh

Ở v1.1 đèn chỉ có hai trạng thái, `lit: false` và `lit: true`. Sáng rồi thì sáng mãi, và Đêm kết thúc thắng ngay khi mọi đèn đều sáng (`all_lit`). Playtest cho thấy người chơi giỏi thắp hết đèn trong khoảng 2 phút, nên cuối Đêm không còn căng thẳng. Ticket-03 cho đèn cạn dầu và tắt được. Mục tiêu đổi thành "giữ đủ đèn sáng tới bình minh".

## Quyết định

### 1. Đèn có thêm dầu, và trạng thái được suy ra từ ba trường

Mỗi đèn lưu: `lit`, `fuel` (số nguyên, đơn vị 1/60 dầu), `ever_lit`, `relit_count`, `deposited`. Các trạng thái logic được **suy ra**, không lưu thành một enum riêng. Nhờ vậy snapshot đúng nguyên dạng contract và không có trạng thái thừa có thể lệch nhau.

```
                 nạp đủ 10 (+100)                      fuel < 30
 [Chưa thắp] ───────────────────────▶ [Sáng] ─────────────────────▶ [Yếu]
 lit=false                           fuel ≥ 30, có vùng an toàn     không có vùng an toàn
 ever_lit=false                         ▲                            Bóng wander tìm tới → drain
                                        │  châm dầu lên ≥ 30          │
                                        └─────────────────────────────┤ (đẩy Bóng ra 30 tick)
                                                                      │ fuel ≤ 0 (bước 2b)
                 nạp đủ 5 (+40, relit_count++)                         ▼
 [Sáng] ◀──────────────────────────────────────────────────────── [Đã tắt]
                                                                  lit=false, ever_lit=true, deposited=0
```

- Thắp hoặc thắp lại đặt `fuel = 6000` (100 dầu).
- Bước 2b mỗi tick: mỗi đèn sáng `−1`. Mỗi Bóng `drain` (theo id) trừ thêm `−5`. Ngay sau đó, đèn có `fuel ≤ 0` thì tắt (`lantern_out`).
- Các hàm thuần trong `core.ts` dùng chung cho headless, test và web: `hasSafeZone` (sáng và `fuel ≥ 30·60`), `isWeak` (sáng và `fuel < 30·60`), `capacity`, `litNeeded`.
- **Vì sao dùng số nguyên 1/60:** tick 60 Hz, nên hao 1/giây đúng bằng 1 đơn vị mỗi tick. Bóng hút 5/giây là 5 đơn vị. Không có sai số số thực, nên so sánh "đúng 30" và "≤ 0" là chính xác và JSONL tất định. Chỉ làm tròn 1 chữ số thập phân khi xuất ra.

### 2. Bóng Mực có thêm trạng thái `drain`

`spawning | wander | chase | recoil | stunned | drain`.

- `wander → drain` khi cách đèn yếu mục tiêu ≤ 2 m (XZ).
- `drain → chase` khi Mây vào trong 6 m. `drain → stunned` khi trúng Tỏa Sáng (+15).
- `drain → wander` khi đèn tắt, được châm lên ≥ 30, hoặc Bóng cách đèn quá 2 m.
- Hết choáng thì luôn về `wander`.
- Bóng `drain` đứng yên và không gây hit. Ticket nói Bóng "đứng yên hút", nên một con vừa hút vừa đánh sẽ mâu thuẫn với luật đó.

Mục tiêu là `target_lantern_id`, luôn có trong snapshot (`null` nếu không có mục tiêu).

### 3. Luật thắng chỉ xét lúc bình minh

- Bỏ `all_lit`. Thắp đủ mọi đèn không kết thúc Đêm.
- Bước 11: hết Ngọn Lửa thì thua `no_flames` (luôn ưu tiên, kể cả tick cuối). Nếu hết giờ, đếm `lit` sau mọi cập nhật của tick đó, gồm cả đèn vừa tắt ở bước 2b và đèn vừa thắp ở bước 5. Đủ `ceil(0.6·n)` thì thắng `dawn_survived`, thiếu thì thua `dawn`.
- `litNeeded(n) = Math.ceil(0.6 * n)`, nên ngưỡng là 3/5, 4/6, 5/7. Có test ở cả ba Đêm.

### 4. Điểm và sức chứa

- Bỏ thưởng thời gian, vì giờ ai thắng cũng chơi hết giờ.
- Bonus bình minh tính trên dầu còn lại (`50 + floor(fuel)` mỗi đèn sáng), để thưởng việc giữ đèn khỏe tới cuối.
- `capacity = min(20, 10 + 2·successful_lights)`. Thắp lại cũng được tính, để thưởng việc cứu đèn.

## Phương án đã cân nhắc

| Phương án | Lý do không chọn |
|---|---|
| Enum `lantern.state = unlit/lit/weak/out` lưu riêng | Trùng với `lit`/`fuel`/`ever_lit` và dễ lệch nhau. Contract không có trường này. |
| Dầu là số thực, trừ 1/60 mỗi tick | Sai số tích lũy làm sai mốc "đúng 30" và "≤ 0". Ticket khuyên dùng số nguyên. |
| Bóng `drain` vẫn gây hit khi Mây chạm | Mâu thuẫn với "đứng yên hút". Mây trong 6 m đã khiến Bóng chuyển `chase` ở bước 8, nên hit vẫn xảy ra ở tick sau. |
| Giữ `all_lit` như một cách thắng sớm phụ | Ticket ghi rõ là "Không còn thắng sớm". |

## Hệ quả

- Test v1.1 phụ thuộc vào thời lượng 300 s, +10 mỗi đom đóm, `all_lit`, thưởng thời gian và "đèn sáng không nhận đom đóm" đã được thay, mỗi chỗ có comment lý do. Danh sách nằm trong CHANGELOG.
- `npm run evidence:phase2` (oracle v1.1) sẽ FAIL với luật mới. Script được giữ làm lịch sử. `evidence:phase3` là harness hiện hành.
- Web phải hiển thị được trạng thái mà không cần màu: thanh dầu, nhấp nháy 1 Hz khi yếu, đèn tắt bị xẹp 20% và có giấy rách, sợi "hút dầu" nối Bóng với đèn. Có chế độ mù màu.
