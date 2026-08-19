/* ============================================================
   Classwork Hub — curator.js
   ระบบ AI Art Curator: หมุนเวียนคอนเทนต์ศิลปะดิจิทัลรายวัน (3-Day Rolling Window)
   - วันที่ 1 โพสต์
   - วันที่ 2 เพิ่มอีก 2 โพสต์
   - วันที่ 3 เพิ่มอีก 2 โพสต์
   - วันที่ 4 ลบโพสต์ของวันที่ 1 ออก แล้วโพสต์ของใหม่ 2 โพสต์ วนลูปไปเรื่อยๆ
   ============================================================ */
'use strict';

const DIGITAL_ART_CATALOG = [
  {
    type: 'inspiration',
    title: '🎨 ทฤษฎีสี 60-30-10: เคล็ดลับคุมโทนให้งาน Digital Art ดูโปร',
    author: 'AI Art Curator 🤖',
    authorAvatar: '🎨',
    text: 'การใช้สีในงานศิลปะดิจิทัลให้ลงตัว ลองใช้สูตร 60-30-10:\n• 60% สีหลัก (Dominant Color) เช่น สีพื้นหลังหรือบรรยากาศโดยรวม\n• 30% สีรอง (Secondary Color) เช่น ตัวละครหรือองค์ประกอบหลัก\n• 10% สีไฮไลต์ (Accent Color) สีที่ตัดกันเพื่อดึงดูดสายตาไปยังจุดเด่น (Focal Point)\n\nลองนำไปปรับใช้กับการลงสีภาพใน Photoshop หรือ Procreate ดูนะครับ!',
    image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1000&auto=format&fit=crop&q=80',
    videoUrl: null
  },
  {
    type: 'tutorial',
    title: '💡 3 Blending Modes ใน Photoshop ที่สายกราฟิกต้องใช้เป็นประจำ',
    author: 'AI Art Curator 🤖',
    authorAvatar: '💡',
    text: 'โหมดผสมเลเยอร์ (Layer Blending Modes) ที่ช่วยให้งานอาร์ตดูมีมิติ:\n1. Multiply: เหมาะสำหรับลงเงามืด (Shadows) และคัดลอกเส้นหมึก\n2. Screen: เหมาะสำหรับเอฟเฟกต์แสง ฟุ้งประกาย (Glow & Highlights)\n3. Overlay / Soft Light: เพิ่มมิติความเปรียบต่างของแสงเงาและปรับโทนสีโดยรวมให้กลมกลืน\n\n📌 ทดลองฝึก: สร้างเลเยอร์ใหม่ วาดแสงสีส้ม แล้วเปลี่ยนโหมดเป็น Screen ดูความแตกต่าง!',
    image: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=1000&auto=format&fit=crop&q=80',
    videoUrl: null
  },
  {
    type: 'video',
    title: '🎬 Speed Painting & Concept Art: เทคนิคการจัดแสงบรรยากาศ',
    author: 'AI Art Curator 🤖',
    authorAvatar: '🎬',
    text: 'ชมขั้นตอนการสร้างงาน Concept Art ตั้งแต่ร่างภาพขาวดำ (Thumbnail Sketch) ไปจนถึงการลงสีและจัดแสงแบบ Cinematic Lighting สังเกตการใช้แปรง Texture Brush เพื่อสร้างความสมจริงของพื้นผิว',
    image: null,
    videoUrl: 'https://www.youtube.com/watch?v=rgVPGPHyHbc'
  },
  {
    type: 'inspiration',
    title: '🌟 เทคนิค Rim Light: สร้างแสงขอบให้ตัวละครลอยเด่นจากฉากหลัง',
    author: 'AI Art Curator 🤖',
    authorAvatar: '🌟',
    text: 'Rim Light หรือ Kicker Light คือแสงที่ส่องมาจากด้านหลังของตัวแบบ (Backlight) ทำให้เกิดเส้นขอบสว่างรอบตัวละคร\n\n✨ ประโยชน์:\n• แยกตัวละครออกจากพื้นหลังที่มืด\n• เพิ่มความเท่ สไตล์ภาพยนตร์ไซไฟ/แฟนตาซี\n• วิธีทำง่ายๆ ใน Photopea/Photoshop: ใช้เลเยอร์โหมด Color Dodge หรือ Linear Dodge วาดขอบแสงบางๆ',
    image: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=1000&auto=format&fit=crop&q=80',
    videoUrl: null
  },
  {
    type: 'tutorial',
    title: '🤖 Prompt Engineering: สูตรสั่ง AI สร้างภาพแนว Cyberpunk & Concept Art',
    author: 'AI Art Curator 🤖',
    authorAvatar: '🤖',
    text: 'แจก Prompt โครงสร้างสำหรับสาย Concept Art:\n\n💬 "Futuristic cyberpunk temple in neo-bangkok, glowing neon lights, holographic art, dramatic rim lighting, cinematic 8k, unreal engine 5 render, concept art by syd mead"\n\n🔑 คำสำคัญที่ช่วยดึงคุณภาพ: cinematic lighting, depth of field, 8k octane render, atmospheric haze',
    image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1000&auto=format&fit=crop&q=80',
    videoUrl: null
  },
  {
    type: 'example',
    title: '🖼️ Showcase: Matte Painting & Environment Art ที่น่าทึ่ง',
    author: 'AI Art Curator 🤖',
    authorAvatar: '🖼️',
    text: 'Matte Painting คือการผสมผสานภาพถ่ายหลายๆ ภาพ (Photo Bashing) เข้ากับการวาดแบบ Digital Painting เพื่อสร้างฉากทัศน์เสมือนจริงที่ไม่มีอยู่จริง เช่น เมืองลอยฟ้า หรือวิหารโบราณในป่าลึก\n\n🔍 ข้อสังเกต: การควบคุม Atmospheric Perspective (ระยะความชัดลึกและความจางของหมอกในระยะไกล) ช่วยให้ภาพดูกว้างใหญ่สมจริงมากยิ่งขึ้น',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1000&auto=format&fit=crop&q=80',
    videoUrl: null
  },
  {
    type: 'tutorial',
    title: '📐 Rule of Thirds (กฎสามส่วน) ในการจัดองค์ประกอบภาพศิลปะ',
    author: 'AI Art Curator 🤖',
    authorAvatar: '📐',
    text: 'อย่าเพิ่งวางจุดสนใจไว้ตรงกลางเสมอไป! ลองแบ่งพื้นที่ภาพเป็นตาราง 3x3 แล้ววางตำแหน่งตัวละครหรือดวงตาไว้ที่ "จุดตัดเก้าช่อง"\n\nข้อดี:\n• ทำให้ภาพดูมีชีวิตชีวาและมีการเคลื่อนไหว (Dynamic)\n• มีพื้นที่ว่าง (Negative Space) ให้นำสายตาและสร้างเรื่องราว',
    image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1000&auto=format&fit=crop&q=80',
    videoUrl: null
  },
  {
    type: 'inspiration',
    title: '🎨 Color Palette ประจำวัน: Neon Noir Aesthetic',
    author: 'AI Art Curator 🤖',
    authorAvatar: '🎨',
    text: 'ชุดคู่สีแนะนำสำหรับงานอาร์ตแนว Cyberpunk และ Sci-Fi:\n• 🟣 Cyber Magenta (#FF007F)\n• 🔵 Deep Cyan (#00F0FF)\n• 🟡 Electric Amber (#FFDE59)\n• ⚫ Dark Charcoal Background (#121214)\n\nลองนำรหัสโค้ดสีเหล่านี้ไปสร้าง Color Swatches ในโปรแกรมวาดภาพดูนะครับ!',
    image: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=1000&auto=format&fit=crop&q=80',
    videoUrl: null
  },
  {
    type: 'tutorial',
    title: '🖌️ เทคนิคการไดคัทเส้นผมและขนสัตว์ใน Photopea / Photoshop',
    author: 'AI Art Curator 🤖',
    authorAvatar: '🖌️',
    text: 'ไดคัทเส้นผมให้เนียนแบบไม่แหว่ง:\n1. ใช้ Quick Selection Tool เลือกตัวแบบคร่าวๆ\n2. กดปุ่ม "Select and Mask" หรือ "Refine Edge"\n3. ใช้แปรง Refine Radius Tool ระบายบริเวณไรผม\n4. เลือก Output เป็น "New Layer with Layer Mask" และติ๊ก "Decontaminate Colors" เพื่อลบขอบสีพื้นหลังเดิมออก',
    image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1000&auto=format&fit=crop&q=80',
    videoUrl: null
  }
];

/**
 * คำนวณและดึงโพสต์ AI Curator ประจำวันตามระบบ Rolling Window 3 วัน
 * วันที่ 1: โพสต์
 * วันที่ 2: เพิ่มอีก 2 โพสต์
 * วันที่ 3: เพิ่มอีก 2 โพสต์
 * วันที่ 4: ลบวันที่ 1 ออก แล้วโพสต์ของใหม่ 2 โพสต์ วนลูปไปเรื่อยๆ
 */
function getCuratedRollingPosts() {
  const MS_PER_DAY = 86400000;
  const now = new Date();
  const currentEpochDay = Math.floor(now.getTime() / MS_PER_DAY);
  const postsPerDay = 2; // จำนวนโพสต์ต่อวัน (2 โพสต์ใหม่ทุกวัน)
  const totalCatalog = DIGITAL_ART_CATALOG.length;

  const rollingPosts = [];

  // สร้างโพสต์ของ 3 วันล่าสุด: วันนี้ (offset 0), เมื่อวาน (offset 1), 2 วันก่อน (offset 2)
  for (let offset = 0; offset < 3; offset++) {
    const dayIndex = currentEpochDay - offset;
    const dayDate = new Date(dayIndex * MS_PER_DAY + 12 * 3600000); // เที่ยงวันของวันนั้น
    const dayLabel = offset === 0 ? '✨ วันนี้' : (offset === 1 ? '📅 เมื่อวาน' : '📅 2 วันก่อน');

    // คำนวณ Index จาก Catalog แบบวนลูป (Deterministic Modulo)
    const baseCatalogIdx = Math.abs((dayIndex * postsPerDay) % totalCatalog);

    for (let pIdx = 0; pIdx < postsPerDay; pIdx++) {
      const itemIdx = (baseCatalogIdx + pIdx) % totalCatalog;
      const tpl = DIGITAL_ART_CATALOG[itemIdx];

      // สร้าง ID เฉพาะของโพสต์ประจำวันนั้น เพื่อให้การไลก์และคอมเมนต์ถูกบันทึกคงที่ตลอด 3 วัน
      const postId = `curated_${dayIndex}_${pIdx}`;

      // ดึงไลก์และคอมเมนต์ที่ผู้ใช้กดไว้ในเครื่องหรือระบบ
      const savedLikes = JSON.parse(localStorage.getItem('cwh_curated_likes_' + postId) || '[]');
      const savedComments = JSON.parse(localStorage.getItem('cwh_curated_cmts_' + postId) || '[]');

      rollingPosts.push({
        id: postId,
        type: tpl.type,
        title: tpl.title,
        author: tpl.author,
        authorAvatar: tpl.authorAvatar,
        text: `【${dayLabel}】\n` + tpl.text,
        image: tpl.image,
        videoUrl: tpl.videoUrl,
        videoFile: null,
        isCurated: true,
        curatedDayOffset: offset,
        createdAt: new Date(dayDate.getTime() + (pIdx + 1) * 3600000).toISOString(),
        likes: savedLikes,
        comments: savedComments
      });
    }
  }

  return rollingPosts;
}
