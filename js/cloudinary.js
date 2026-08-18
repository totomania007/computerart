/* ============================================================
   Classwork Hub — cloudinary.js
   ระบบอัปโหลดรูปภาพ วิดีโอ และไฟล์เอกสารขึ้น Cloudinary Direct
   ============================================================ */
'use strict';

/**
 * อัปโหลดไฟล์ตรงไปยัง Cloudinary
 * @param {File} file - ไฟล์ที่ต้องการอัปโหลด
 * @param {function} onProgress - Callback อัปเดตสถานะ เช่น (percent) => ...
 * @returns {Promise<{name: string, url: string, type: string}>}
 */
async function uploadToCloudinary(file, onProgress = null) {
  if (!file) return null;

  const cfg = APP_CONFIG.cloudinary;
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', cfg.uploadPreset);
  formData.append('api_key', cfg.apiKey);

  // Show visual upload feedback
  toast(`☁️ กำลังอัปโหลดไฟล์ "${file.name}" ไปยัง Cloudinary...`);

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
          toast(`✅ อัปโหลด "${file.name}" ขึ้น Cloudinary สำเร็จ!`);
          resolve({
            name: file.name,
            dataUrl: secureUrl,
            url: secureUrl,
            type: file.type || res.resource_type || 'application/octet-stream'
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