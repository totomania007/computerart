/* ============================================================
   Classwork Hub — cloudinary.js
   ระบบบีบอัดรูปภาพอัจฉริยะ (Client-side Compression) + ตรวจสอบขนาดไม่เกิน 5 MB
   และอัปโหลดตรงขึ้น Cloudinary Direct
   ============================================================ */
'use strict';

const MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * ฟังก์ชันช่วยแปลงขนาดไบต์เป็นข้อความอ่านง่าย
 */
function formatBytes(bytes, decimals = 1) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * บีบอัดรูปภาพฝั่งเบราว์เซอร์ก่อนอัปโหลด
 * ปรับความละเอียดสูงสุดไม่เกิน 1920px และความคมชัด 82% (คุณภาพสวยงามระดับ HD แต่ขนาดลดลง 70-90%)
 * @param {File} file - ไฟล์รูปภาพต้นฉบับ
 * @param {number} maxDimension - ขนาดด้านที่ยาวที่สุด (default: 1920)
 * @param {number} quality - คุณภาพ JPEG/WebP (default: 0.82)
 * @returns {Promise<File>} - ไฟล์รูปภาพที่บีบอัดแล้ว
 */
async function compressImage(file, maxDimension = 1920, quality = 0.82) {
  if (!file || !file.type.startsWith('image/')) return file;
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') return file; // ข้าม GIF/SVG เพื่อรักษาแอนิเมชันและเวกเตอร์

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // คำนวณอัตราส่วนย่อขนาดถ้าใหญ่กว่า maxDimension
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // วาดภาพลง Canvas
        ctx.drawImage(img, 0, 0, width, height);

        // แปลงเป็น Blob (JPEG/WebP)
        const outputType = 'image/jpeg';
        canvas.toBlob((blob) => {
          if (!blob) {
            resolve(file);
            return;
          }

          // ถ้าบีบอัดแล้วขนาดเล็กลง ให้ใช้ไฟล์ใหม่
          if (blob.size < file.size) {
            const originalName = file.name.replace(/\.[^/.]+$/, '');
            const compressedFile = new File([blob], `${originalName}.jpg`, {
              type: outputType,
              lastModified: Date.now()
            });

            console.log(`📉 บีบอัดภาพ "${file.name}" จาก ${formatBytes(file.size)} เหลือ ${formatBytes(compressedFile.size)}`);
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        }, outputType, quality);
      };

      img.onerror = () => resolve(file);
      img.src = e.target.result;
    };

    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

/**
 * อัปโหลดไฟล์ตรงไปยัง Cloudinary (พร้อมบีบอัดรูปภาพและตรวจขนาดไม่เกิน 5 MB)
 * @param {File} rawFile - ไฟล์ที่ต้องการอัปโหลด
 * @param {function} onProgress - Callback อัปเดตสถานะ เช่น (percent) => ...
 * @returns {Promise<{name: string, url: string, type: string}>}
 */
async function uploadToCloudinary(rawFile, onProgress = null) {
  if (!rawFile) return null;

  let fileToUpload = rawFile;

  // 1. ถ้าเป็นรูปภาพ ให้ทำการบีบอัดก่อนเสมอ
  if (rawFile.type && rawFile.type.startsWith('image/')) {
    toast(`⚡ กำลังปรับแต่งและบีบอัดรูปภาพ "${rawFile.name}"...`);
    try {
      const compressed = await compressImage(rawFile, 1920, 0.82);
      if (compressed && compressed.size < rawFile.size) {
        toast(`📉 บีบอัดรูปภาพ: ${formatBytes(rawFile.size)} ➔ ${formatBytes(compressed.size)}`);
        fileToUpload = compressed;
      }
    } catch (e) {
      console.warn('Image compression error, proceeding with original:', e);
    }
  }

  // 2. ตรวจสอบขนาดไฟล์หลังการบีบอัด (ต้องไม่เกิน 5 MB)
  if (fileToUpload.size > MAX_UPLOAD_SIZE) {
    const errorMsg = `❌ ไฟล์ "${fileToUpload.name}" (${formatBytes(fileToUpload.size)}) เกินขนาดที่กำหนด 5 MB กรุณาเลือกไฟล์ใหม่`;
    toast(errorMsg);
    throw new Error(errorMsg);
  }

  const cfg = APP_CONFIG.cloudinary;
  const formData = new FormData();
  formData.append('file', fileToUpload);
  formData.append('upload_preset', cfg.uploadPreset);
  formData.append('api_key', cfg.apiKey);

  toast(`☁️ กำลังอัปโหลด "${fileToUpload.name}" (${formatBytes(fileToUpload.size)}) ไปยัง Cloudinary...`);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', cfg.uploadUrl, true);

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          const secureUrl = res.secure_url || res.url;
          toast(`✅ อัปโหลด "${fileToUpload.name}" สำเร็จ!`);
          resolve({
            name: rawFile.name,
            dataUrl: secureUrl,
            url: secureUrl,
            type: fileToUpload.type || res.resource_type || 'application/octet-stream',
            size: fileToUpload.size
          });
        } catch (e) {
          reject(new Error('Cloudinary response parse failed: ' + e.message));
        }
      } else {
        let errDesc = 'Upload failed with status ' + xhr.status;
        try {
          const errRes = JSON.parse(xhr.responseText);
          if (errRes.error && errRes.error.message) errDesc = errRes.error.message;
        } catch (_) {}
        toast(`❌ อัปโหลด Cloudinary ไม่สำเร็จ: ${errDesc}`);
        reject(new Error(errDesc));
      }
    };

    xhr.onerror = () => {
      toast('❌ ไม่สามารถเชื่อมต่อกับ Cloudinary ได้');
      reject(new Error('Network error connecting to Cloudinary'));
    };

    xhr.send(formData);
  });
}