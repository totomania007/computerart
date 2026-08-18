# Run Doc — Classwork Hub (static site)

โปรเจกต์เป็นเว็บ static ธรรมดา (HTML + CSS + JS ธรรมดา ไม่มี build step, ไม่มี dependencies)

## วิธีรันเซิร์ฟเวอร์ (Preview)

ใช้ Python ที่ติดตั้งในเครื่อง (ตรวจด้วย `python --version`) รัน static server จากโปรเจกต์ root:

```
python -m http.server 8000 --bind 127.0.0.1
```

เปิด `http://127.0.0.1:8000/index.html`

เริ่มแบบ detached (Windows) — ใช้ PowerShell ตามนี้ แล้วจด pid ที่ได้:

```
powershell -NoProfile -Command "(Start-Process -FilePath 'python.exe' -ArgumentList '-m','http.server','8000','--bind','127.0.0.1' -WorkingDirectory 'D:\computer-art' -RedirectStandardOutput 'D:\computer-art\.freebuff\preview-08d43409-fa45-47d2-a610-b44687c7aac0.log' -RedirectStandardError 'D:\computer-art\.freebuff\preview-08d43409-fa45-47d2-a610-b44687c7aac0.log.err' -WindowStyle Hidden -PassThru).Id"
```

หมายเหตุ:
- stdout และ stderr ต้องไปคนละไฟล์ (`<log>` และ `<log>.err`)
- `python.exe` บนเครื่องนี้คือ LibreOffice python (`C:\Program Files\LibreOffice\program\python.exe`) ซึ่งเป็น launcher — pid จริงที่ bind พอร์ตคือ process `python-core-...\bin\python.exe` ลูก ใช้ pid จาก `netstat -ano | grep :8000 | grep LISTENING` เพื่อ register preview
- คำสั่ง SYNC อาจ timeout ที่ 30 วินาที แต่เซิร์ฟเวอร์ start สำเร็จ — ตรวจด้วย `netstat` / `curl http://127.0.0.1:8000/index.html` (ต้องได้ 200)
- ห้ามใช้ `register_preview replace:true` ขณะเซิร์ฟเวอร์รันอยู่ — มันจะหยุดเซิร์ฟเวอร์เก่า ถ้าจำเป็นต้อง replace ให้ restart เซิร์ฟเวอร์ก่อน

## โครงสร้าง (ระยะที่ 2: แยกไฟล์)

```
index.html          # skeleton — header, screens, modals, เชื่อม css/js
css/styles.css      # ดีไซน์ทั้งหมด
js/utils.js         # helpers + ไอคอน SVG
js/state.js         # data + localStorage + seed
js/feed.js          # ฟีด Facebook
js/assignments.js   # ใบงาน + รายละเอียด + ส่งงาน
js/grading.js       # ตรวจงาน
js/results.js       # ผลงานนักเรียน
js/modals.js        # ฟอร์มสร้างโพสต์/ใบงาน
js/main.js          # navigation + init (โหลดเป็นตัวสุดท้าย)
```

สำคัญ: ต้องเปิดผ่านเซิร์ฟเวอร์ HTTP ถึงจะโหลด css/js ได้ — htmlPath preview (เสิร์ฟแค่ไฟล์เดียว) ใช้ไม่ได้กับโครงสร้างแยกไฟล์
