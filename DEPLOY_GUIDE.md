# 🚀 คู่มือการเชื่อมต่อ Cloudflare Pages + D1 Database

คู่มือนี้แนะนำขั้นตอนการนำโปรเจกต์นี้ขึ้น **Cloudflare Pages** และผูกเข้ากับฐานข้อมูล **Cloudflare D1** เพื่อใช้งานระบบแบบ Full-Stack ออนไลน์

---

## 📋 1. สร้างฐานข้อมูล Cloudflare D1

1. เข้าสู่ระบบ [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. ไปที่เมนู **Storage & Databases** $\to$ **D1 SQL Database**
3. กด **Create database**
   - **Database Name:** `computer-art-db` (หรือชื่อใดก็ได้)
4. เมื่อสร้างเสร็จแล้ว เข้าไปที่แท็บ **Console** ในฐานข้อมูล แล้วคัดลอกเนื้อหาทั้งหมดในไฟล์ [`schema.sql`](./schema.sql) มาวางและกด **Execute** เพื่อสร้างตารางข้อมูลเริ่มต้น

---

## 🌐 2. เชื่อมต่อ Git Repository เข้ากับ Cloudflare Pages

1. ไปที่เมนู **Compute (Workers & Pages)** $\to$ **Create application** $\to$ แท็บ **Pages**
2. เลือก **Connect to Git**
3. เลือก Repository: `totomania007/computerart` (Branch: `main`)
4. ตั้งค่า Build settings:
   - **Framework preset:** `None`
   - **Build command:** *(เว้นว่างไว้)*
   - **Build output directory:** `.` (หรือ root)
5. กด **Save and Deploy**

---

## 🔗 3. ผูกฐานข้อมูล D1 เข้ากับ Pages Functions

1. หลังจาก Deploy เสร็จแล้ว ไปที่หน้าโปรเจกต์ Pages ของคุณ $\to$ เมนู **Settings**
2. ไปที่แถบ **Functions**
3. เลื่อนลงมาที่หัวข้อ **D1 database bindings** แล้วกด **Add binding**
   - **Variable name:** `DB` *(ต้องตั้งเป็นตัวพิมพ์ใหญ่ `DB` เท่านั้น)*
   - **D1 Database:** เลือกฐานข้อมูล `computer-art-db` ที่สร้างไว้ในข้อ 1
4. ไปที่แท็บ **Deployments** แล้วกด **Retry deployment** หรือ Commit โค้ดใหม่ เพื่อให้ Cloudflare นำการตั้งค่า D1 ไปใช้งานจริง

---

## ☁️ 4. ตรวจสอบการทำงานของ Cloudinary

ระบบได้รับการตั้งค่าให้เชื่อมต่อกับ Cloudinary เรียบร้อยแล้ว:
- **Cloud Name:** `ogdfbbpw`
- **Upload Preset:** `computer_art` (Unsigned)
- รูปภาพและไฟล์ทั้งหมดที่อัปโหลดจะถูกส่งตรงไปเก็บที่ Cloudinary ทันที

---

## 🔒 5. รหัสผ่านครู (Teacher PIN)

- รหัสผ่านเข้าโหมดครู: **`1234`**