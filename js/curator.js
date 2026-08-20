/* ============================================================
   Classwork Hub — curator.js
   ระบบ AI Art Curator: คอนเทนต์ศิลปะดิจิทัลพร้อมภาพประกอบ อินโฟกราฟิก ลิงก์ศึกษาต่อ และแหล่งอ้างอิงเครดิต
   - วันที่ 1 โพสต์
   - วันที่ 2 เพิ่มอีก 2 โพสต์
   - วันที่ 3 เพิ่มอีก 2 โพสต์
   - วันที่ 4 ลบโพสต์ของวันที่ 1 ออก แล้วโพสต์ของใหม่ 2 โพสต์ วนลูป 3-Day Rolling Window
   ============================================================ */
'use strict';

// -------------------------------------------------------------
// สร้างรูปภาพ Infographic / Diagram เฉพาะทางแบบ SVG คมชัด ตรงตามเนื้อหา
// -------------------------------------------------------------
function makeSvgDataUrl(svgString) {
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svgString.trim());
}

// 1. Infographic: ทฤษฎีสี 60-30-10
const SVG_COLOR_60_30_10 = makeSvgDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <rect width="800" height="450" fill="#18181B"/>
  <text x="400" y="55" fill="#FFFFFF" font-size="26" font-weight="bold" text-anchor="middle" font-family="sans-serif">ทฤษฎีสัดส่วนสี 60 - 30 - 10 ในงานออกแบบ</text>
  <text x="400" y="85" fill="#A1A1AA" font-size="16" text-anchor="middle" font-family="sans-serif">The 60-30-10 Color Rule for Visual Hierarchy</text>
  
  <!-- 60% Block -->
  <rect x="60" y="120" width="380" height="240" rx="10" fill="#3B82F6"/>
  <text x="250" y="210" fill="#FFFFFF" font-size="42" font-weight="900" text-anchor="middle" font-family="sans-serif">60%</text>
  <text x="250" y="250" fill="#FFFFFF" font-size="20" font-weight="bold" text-anchor="middle" font-family="sans-serif">สีหลัก (Dominant Color)</text>
  <text x="250" y="280" fill="#DBEAFE" font-size="14" text-anchor="middle" font-family="sans-serif">พื้นหลัง / บรรยากาศโดยรวม</text>

  <!-- 30% Block -->
  <rect x="460" y="120" width="180" height="240" rx="10" fill="#8B5CF6"/>
  <text x="550" y="210" fill="#FFFFFF" font-size="36" font-weight="900" text-anchor="middle" font-family="sans-serif">30%</text>
  <text x="550" y="250" fill="#FFFFFF" font-size="18" font-weight="bold" text-anchor="middle" font-family="sans-serif">สีรอง</text>
  <text x="550" y="280" fill="#EDE9FE" font-size="13" text-anchor="middle" font-family="sans-serif">ตัวละคร / องค์ประกอบ</text>

  <!-- 10% Block -->
  <rect x="660" y="120" width="80" height="240" rx="10" fill="#F59E0B"/>
  <text x="700" y="210" fill="#FFFFFF" font-size="26" font-weight="900" text-anchor="middle" font-family="sans-serif">10%</text>
  <text x="700" y="250" fill="#FFFFFF" font-size="14" font-weight="bold" text-anchor="middle" font-family="sans-serif">สีเน้น</text>
  <text x="700" y="280" fill="#FEF3C7" font-size="11" text-anchor="middle" font-family="sans-serif">จุดเด่น</text>
  
  <rect x="60" y="385" width="680" height="35" rx="6" fill="#27272A"/>
  <text x="400" y="408" fill="#E4E4E7" font-size="14" font-weight="bold" text-anchor="middle" font-family="sans-serif">💡 เคล็ดลับ: สีเน้น 10% ควรเป็นสีที่ตัดกับ 60% เพื่อดึงดูดสายตาทันที</text>
</svg>
`);

// 2. Infographic: 3 Blending Modes
const SVG_BLENDING_MODES = makeSvgDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <rect width="800" height="450" fill="#0F172A"/>
  <text x="400" y="55" fill="#FFFFFF" font-size="26" font-weight="bold" text-anchor="middle" font-family="sans-serif">3 Layer Blending Modes ที่สายอาร์ตต้องรู้</text>
  
  <!-- Multiply -->
  <rect x="50" y="100" width="210" height="300" rx="12" fill="#1E293B" stroke="#475569" stroke-width="2"/>
  <rect x="70" y="120" width="170" height="100" rx="8" fill="#1E1B4B"/>
  <circle cx="155" cy="170" r="35" fill="#6366F1" opacity="0.6"/>
  <circle cx="135" cy="170" r="35" fill="#000000" opacity="0.8"/>
  <text x="155" y="255" fill="#38BDF8" font-size="20" font-weight="bold" text-anchor="middle" font-family="sans-serif">1. Multiply</text>
  <text x="155" y="285" fill="#F8FAFC" font-size="15" font-weight="bold" text-anchor="middle" font-family="sans-serif">โหมดลงเงามืด (Darken)</text>
  <text x="155" y="315" fill="#94A3B8" font-size="13" text-anchor="middle" font-family="sans-serif">• ตัดสีขาวออก</text>
  <text x="155" y="340" fill="#94A3B8" font-size="13" text-anchor="middle" font-family="sans-serif">• ใช้ลงเงาตัวละคร</text>
  <text x="155" y="365" fill="#94A3B8" font-size="13" text-anchor="middle" font-family="sans-serif">• คัดลอกเส้นหมึกภาพวาด</text>

  <!-- Screen -->
  <rect x="295" y="100" width="210" height="300" rx="12" fill="#1E293B" stroke="#475569" stroke-width="2"/>
  <rect x="315" y="120" width="170" height="100" rx="8" fill="#020617"/>
  <circle cx="385" cy="170" r="35" fill="#F59E0B" opacity="0.8"/>
  <circle cx="415" cy="170" r="35" fill="#EC4899" opacity="0.8"/>
  <text x="400" y="255" fill="#FCD34D" font-size="20" font-weight="bold" text-anchor="middle" font-family="sans-serif">2. Screen</text>
  <text x="400" y="285" fill="#F8FAFC" font-size="15" font-weight="bold" text-anchor="middle" font-family="sans-serif">โหมดเพิ่มแสง (Lighten)</text>
  <text x="400" y="315" fill="#94A3B8" font-size="13" text-anchor="middle" font-family="sans-serif">• ตัดสีดำออก</text>
  <text x="400" y="340" fill="#94A3B8" font-size="13" text-anchor="middle" font-family="sans-serif">• สร้างเอฟเฟกต์แสงเรือง</text>
  <text x="400" y="365" fill="#94A3B8" font-size="13" text-anchor="middle" font-family="sans-serif">• แสงเวทมนตร์ / นีออน</text>

  <!-- Overlay -->
  <rect x="540" y="100" width="210" height="300" rx="12" fill="#1E293B" stroke="#475569" stroke-width="2"/>
  <rect x="560" y="120" width="170" height="100" rx="8" fill="#334155"/>
  <circle cx="630" cy="170" r="35" fill="#3B82F6"/>
  <circle cx="660" cy="170" r="35" fill="#EF4444" opacity="0.7"/>
  <text x="645" y="255" fill="#A78BFA" font-size="20" font-weight="bold" text-anchor="middle" font-family="sans-serif">3. Overlay</text>
  <text x="645" y="285" fill="#F8FAFC" font-size="15" font-weight="bold" text-anchor="middle" font-family="sans-serif">โหมดมิติ (Contrast)</text>
  <text x="645" y="315" fill="#94A3B8" font-size="13" text-anchor="middle" font-family="sans-serif">• เพิ่มคอนทราสต์แสงเงา</text>
  <text x="645" y="340" fill="#94A3B8" font-size="13" text-anchor="middle" font-family="sans-serif">• เคลือบ Texture ลายน้ำ</text>
  <text x="645" y="365" fill="#94A3B8" font-size="13" text-anchor="middle" font-family="sans-serif">• ปรับโทนสีให้กลมกลืน</text>
</svg>
`);

// 3. Infographic: Rim Light
const SVG_RIM_LIGHT = makeSvgDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <rect width="800" height="450" fill="#09090B"/>
  <text x="400" y="55" fill="#FFFFFF" font-size="26" font-weight="bold" text-anchor="middle" font-family="sans-serif">เทคนิคการจัดแสงขอบ (Rim Light / Kicker)</text>
  
  <!-- Background Ambient -->
  <circle cx="280" cy="240" r="140" fill="#18181B"/>
  
  <!-- Silhouette Character with Bright Rim -->
  <path d="M 280 140 C 240 140 210 170 210 210 C 210 240 230 265 255 275 C 200 290 170 340 170 390 L 390 390 C 390 340 360 290 305 275 C 330 265 350 240 350 210 C 350 170 320 140 280 140 Z" fill="#27272A"/>
  
  <!-- Glowing Rim Light on Edge -->
  <path d="M 280 140 C 320 140 350 170 350 210 C 350 240 330 265 305 275 C 360 290 390 340 390 390" fill="none" stroke="#00F0FF" stroke-width="8" filter="drop-shadow(0 0 10px #00F0FF)"/>
  
  <!-- Backlight Source -->
  <circle cx="460" cy="180" r="25" fill="#00F0FF"/>
  <path d="M 460 180 L 350 210" stroke="#00F0FF" stroke-width="3" stroke-dasharray="6,4"/>
  <text x="495" y="185" fill="#00F0FF" font-size="16" font-weight="bold" font-family="sans-serif">แหล่งกำเนิดแสงด้านหลัง (Backlight)</text>

  <!-- Explanation Panel -->
  <rect x="460" y="230" width="300" height="150" rx="10" fill="#18181B" stroke="#27272A" stroke-width="2"/>
  <text x="480" y="265" fill="#FFFFFF" font-size="16" font-weight="bold" font-family="sans-serif">✨ ประโยชน์ของ Rim Light:</text>
  <text x="480" y="295" fill="#A1A1AA" font-size="14" font-family="sans-serif">1. ตัดตัวละครให้ลอยเด่นจากฉากหลัง</text>
  <text x="480" y="325" fill="#A1A1AA" font-size="14" font-family="sans-serif">2. สร้างมิติและความรู้สึกทรงพลัง/ไซไฟ</text>
  <text x="480" y="355" fill="#A1A1AA" font-size="14" font-family="sans-serif">3. ใช้โหมด Color Dodge วาดขอบแสง</text>
</svg>
`);

// 4. Infographic: Rule of Thirds
const SVG_RULE_OF_THIRDS = makeSvgDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <rect width="800" height="450" fill="#1E1B4B"/>
  
  <!-- Artwork Background Canvas -->
  <rect x="80" y="80" width="640" height="320" rx="8" fill="#312E81"/>
  
  <!-- Horizon Line (at 1/3) -->
  <rect x="80" y="293" width="640" height="107" rx="0" fill="#4338CA"/>
  
  <!-- Sun / Moon at Intersection -->
  <circle cx="293" cy="186" r="45" fill="#F59E0B"/>
  
  <!-- Grid Lines (Rule of Thirds) -->
  <line x1="293" y1="80" x2="293" y2="400" stroke="#EF4444" stroke-width="3" stroke-dasharray="8,6"/>
  <line x1="506" y1="80" x2="506" y2="400" stroke="#EF4444" stroke-width="3" stroke-dasharray="8,6"/>
  <line x1="80" y1="186" x2="720" y2="186" stroke="#EF4444" stroke-width="3" stroke-dasharray="8,6"/>
  <line x1="80" y1="293" x2="720" y2="293" stroke="#EF4444" stroke-width="3" stroke-dasharray="8,6"/>
  
  <!-- 4 Intersection Points -->
  <circle cx="293" cy="186" r="9" fill="#EF4444" stroke="#FFFFFF" stroke-width="3"/>
  <circle cx="506" cy="186" r="9" fill="#EF4444" stroke="#FFFFFF" stroke-width="3"/>
  <circle cx="293" cy="293" r="9" fill="#EF4444" stroke="#FFFFFF" stroke-width="3"/>
  <circle cx="506" cy="293" r="9" fill="#EF4444" stroke="#FFFFFF" stroke-width="3"/>

  <text x="400" y="45" fill="#FFFFFF" font-size="24" font-weight="bold" text-anchor="middle" font-family="sans-serif">กฎสามส่วน (Rule of Thirds) &amp; จุดตัดเก้าช่อง</text>
  <text x="293" y="125" fill="#FEF08A" font-size="14" font-weight="bold" text-anchor="middle" font-family="sans-serif">★ วางจุดสนใจหลักตรงจุดตัด</text>
</svg>
`);

// 5. Infographic: Color Palette Neon Noir
const SVG_PALETTE_NEON_NOIR = makeSvgDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <rect width="800" height="450" fill="#121214"/>
  <text x="400" y="55" fill="#FFFFFF" font-size="26" font-weight="bold" text-anchor="middle" font-family="sans-serif">ชุดคู่สีประจำวัน: Neon Noir Aesthetic</text>
  
  <!-- Swatch 1 -->
  <rect x="70" y="100" width="145" height="230" rx="10" fill="#FF007F"/>
  <rect x="70" y="270" width="145" height="60" rx="10" fill="#000000" opacity="0.6"/>
  <text x="142" y="295" fill="#FFFFFF" font-size="15" font-weight="bold" text-anchor="middle" font-family="sans-serif">Cyber Magenta</text>
  <text x="142" y="320" fill="#FFD1E6" font-size="14" font-weight="bold" text-anchor="middle" font-family="monospace">#FF007F</text>

  <!-- Swatch 2 -->
  <rect x="235" y="100" width="145" height="230" rx="10" fill="#00F0FF"/>
  <rect x="235" y="270" width="145" height="60" rx="10" fill="#000000" opacity="0.6"/>
  <text x="307" y="295" fill="#FFFFFF" font-size="15" font-weight="bold" text-anchor="middle" font-family="sans-serif">Deep Cyan</text>
  <text x="307" y="320" fill="#CCFBFE" font-size="14" font-weight="bold" text-anchor="middle" font-family="monospace">#00F0FF</text>

  <!-- Swatch 3 -->
  <rect x="400" y="100" width="145" height="230" rx="10" fill="#FFDE59"/>
  <rect x="400" y="270" width="145" height="60" rx="10" fill="#000000" opacity="0.6"/>
  <text x="472" y="295" fill="#FFFFFF" font-size="15" font-weight="bold" text-anchor="middle" font-family="sans-serif">Electric Amber</text>
  <text x="472" y="320" fill="#FEF9C3" font-size="14" font-weight="bold" text-anchor="middle" font-family="monospace">#FFDE59</text>

  <!-- Swatch 4 -->
  <rect x="565" y="100" width="165" height="230" rx="10" fill="#2A2A32" stroke="#3F3F46" stroke-width="2"/>
  <rect x="565" y="270" width="165" height="60" rx="10" fill="#000000" opacity="0.6"/>
  <text x="647" y="295" fill="#FFFFFF" font-size="15" font-weight="bold" text-anchor="middle" font-family="sans-serif">Charcoal Base</text>
  <text x="647" y="320" fill="#E4E4E7" font-size="14" font-weight="bold" text-anchor="middle" font-family="monospace">#121214</text>

  <rect x="70" y="360" width="660" height="50" rx="8" fill="#1E1E24" stroke="#3F3F46" stroke-width="1.5"/>
  <text x="400" y="392" fill="#E4E4E7" font-size="15" font-weight="bold" text-anchor="middle" font-family="sans-serif">🎮 เหมาะสำหรับ: ผลงานแนว Cyberpunk, Futuristic UI, และภาพวาดไฟนีออนกลางคืน</text>
</svg>
`);

// 6. Infographic: Prompt Engineering Formula
const SVG_AI_PROMPT_FORMULA = makeSvgDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <rect width="800" height="450" fill="#0F172A"/>
  <text x="400" y="55" fill="#FFFFFF" font-size="26" font-weight="bold" text-anchor="middle" font-family="sans-serif">สูตรโครงสร้าง Prompt สำหรับสาย Digital Art</text>
  
  <!-- Step 1 -->
  <rect x="50" y="100" width="150" height="220" rx="10" fill="#3B82F6"/>
  <text x="125" y="140" fill="#FFFFFF" font-size="18" font-weight="bold" text-anchor="middle" font-family="sans-serif">1. ประธาน</text>
  <text x="125" y="165" fill="#DBEAFE" font-size="14" text-anchor="middle" font-family="sans-serif">(Subject)</text>
  <text x="125" y="220" fill="#FFFFFF" font-size="14" font-weight="bold" text-anchor="middle" font-family="sans-serif">Cyberpunk</text>
  <text x="125" y="245" fill="#FFFFFF" font-size="14" font-weight="bold" text-anchor="middle" font-family="sans-serif">Ancient Temple</text>
  <text x="125" y="270" fill="#FFFFFF" font-size="14" font-weight="bold" text-anchor="middle" font-family="sans-serif">in Neo Bangkok</text>

  <!-- Step 2 -->
  <rect x="230" y="100" width="150" height="220" rx="10" fill="#8B5CF6"/>
  <text x="305" y="140" fill="#FFFFFF" font-size="18" font-weight="bold" text-anchor="middle" font-family="sans-serif">2. สไตล์ศิลปะ</text>
  <text x="305" y="165" fill="#EDE9FE" font-size="14" text-anchor="middle" font-family="sans-serif">(Art Style)</text>
  <text x="305" y="220" fill="#FFFFFF" font-size="14" font-weight="bold" text-anchor="middle" font-family="sans-serif">Concept Art</text>
  <text x="305" y="245" fill="#FFFFFF" font-size="14" font-weight="bold" text-anchor="middle" font-family="sans-serif">Digital Painting</text>
  <text x="305" y="270" fill="#FFFFFF" font-size="14" font-weight="bold" text-anchor="middle" font-family="sans-serif">Matte Painting</text>

  <!-- Step 3 -->
  <rect x="410" y="100" width="150" height="220" rx="10" fill="#EC4899"/>
  <text x="485" y="140" fill="#FFFFFF" font-size="18" font-weight="bold" text-anchor="middle" font-family="sans-serif">3. แสง &amp; สี</text>
  <text x="485" y="165" fill="#FCE7F3" font-size="14" text-anchor="middle" font-family="sans-serif">(Lighting)</text>
  <text x="485" y="220" fill="#FFFFFF" font-size="14" font-weight="bold" text-anchor="middle" font-family="sans-serif">Dramatic</text>
  <text x="485" y="245" fill="#FFFFFF" font-size="14" font-weight="bold" text-anchor="middle" font-family="sans-serif">Rim Lighting</text>
  <text x="485" y="270" fill="#FFFFFF" font-size="14" font-weight="bold" text-anchor="middle" font-family="sans-serif">Glowing Neon</text>

  <!-- Step 4 -->
  <rect x="590" y="100" width="160" height="220" rx="10" fill="#10B981"/>
  <text x="670" y="140" fill="#FFFFFF" font-size="18" font-weight="bold" text-anchor="middle" font-family="sans-serif">4. คุณภาพ</text>
  <text x="670" y="165" fill="#D1FAE5" font-size="14" text-anchor="middle" font-family="sans-serif">(Engine/Quality)</text>
  <text x="670" y="220" fill="#FFFFFF" font-size="14" font-weight="bold" text-anchor="middle" font-family="sans-serif">Unreal Engine 5</text>
  <text x="670" y="245" fill="#FFFFFF" font-size="14" font-weight="bold" text-anchor="middle" font-family="sans-serif">8k Octane Render</text>
  <text x="670" y="270" fill="#FFFFFF" font-size="14" font-weight="bold" text-anchor="middle" font-family="sans-serif">Cinematic</text>

  <!-- Prompt Output Box -->
  <rect x="50" y="340" width="700" height="75" rx="8" fill="#1E293B" stroke="#475569" stroke-width="1.5"/>
  <text x="70" y="370" fill="#FCD34D" font-size="13" font-weight="bold" font-family="monospace">💬 Full Prompt:</text>
  <text x="70" y="395" fill="#FFFFFF" font-size="13" font-family="monospace">"Futuristic cyberpunk temple in neo-bangkok, dramatic rim lighting, glowing neon, 8k octane render"</text>
</svg>
`);

// 7. Infographic: Hair Cutout / Refine Edge
const SVG_HAIR_CUTOUT = makeSvgDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <rect width="800" height="450" fill="#18181B"/>
  <text x="400" y="55" fill="#FFFFFF" font-size="26" font-weight="bold" text-anchor="middle" font-family="sans-serif">4 ขั้นตอนไดคัทเส้นผมให้เนียนกริบ (Refine Edge)</text>
  
  <!-- Step 1 -->
  <rect x="50" y="100" width="160" height="280" rx="10" fill="#27272A" stroke="#3F3F46" stroke-width="2"/>
  <circle cx="130" cy="150" r="30" fill="#6366F1"/>
  <text x="130" y="157" fill="#FFFFFF" font-size="22" font-weight="bold" text-anchor="middle" font-family="sans-serif">1</text>
  <text x="130" y="210" fill="#FFFFFF" font-size="16" font-weight="bold" text-anchor="middle" font-family="sans-serif">เลือกคร่าวๆ</text>
  <text x="130" y="240" fill="#A1A1AA" font-size="13" text-anchor="middle" font-family="sans-serif">ใช้ Quick Selection</text>
  <text x="130" y="265" fill="#A1A1AA" font-size="13" text-anchor="middle" font-family="sans-serif">หรือ Lasso Tool</text>
  <text x="130" y="290" fill="#A1A1AA" font-size="13" text-anchor="middle" font-family="sans-serif">เลือกตัวแบบหลัก</text>

  <!-- Step 2 -->
  <rect x="230" y="100" width="160" height="280" rx="10" fill="#27272A" stroke="#3F3F46" stroke-width="2"/>
  <circle cx="310" cy="150" r="30" fill="#EC4899"/>
  <text x="310" y="157" fill="#FFFFFF" font-size="22" font-weight="bold" text-anchor="middle" font-family="sans-serif">2</text>
  <text x="310" y="210" fill="#FFFFFF" font-size="16" font-weight="bold" text-anchor="middle" font-family="sans-serif">เข้าสู่โหมดปรับขอบ</text>
  <text x="310" y="240" fill="#A1A1AA" font-size="13" text-anchor="middle" font-family="sans-serif">กดปุ่ม</text>
  <text x="310" y="265" fill="#F472B6" font-size="13" font-weight="bold" text-anchor="middle" font-family="sans-serif">"Select and Mask"</text>
  <text x="310" y="290" fill="#A1A1AA" font-size="13" text-anchor="middle" font-family="sans-serif">หรือ Refine Edge</text>

  <!-- Step 3 -->
  <rect x="410" y="100" width="160" height="280" rx="10" fill="#27272A" stroke="#3F3F46" stroke-width="2"/>
  <circle cx="490" cy="150" r="30" fill="#F59E0B"/>
  <text x="490" y="157" fill="#FFFFFF" font-size="22" font-weight="bold" text-anchor="middle" font-family="sans-serif">3</text>
  <text x="490" y="210" fill="#FFFFFF" font-size="16" font-weight="bold" text-anchor="middle" font-family="sans-serif">ระบายเก็บไรผม</text>
  <text x="490" y="240" fill="#A1A1AA" font-size="13" text-anchor="middle" font-family="sans-serif">ใช้แปรง</text>
  <text x="490" y="265" fill="#FCD34D" font-size="13" font-weight="bold" text-anchor="middle" font-family="sans-serif">Refine Radius Tool</text>
  <text x="490" y="290" fill="#A1A1AA" font-size="13" text-anchor="middle" font-family="sans-serif">ระบายตามเส้นผม</text>

  <!-- Step 4 -->
  <rect x="590" y="100" width="160" height="280" rx="10" fill="#27272A" stroke="#3F3F46" stroke-width="2"/>
  <circle cx="670" cy="150" r="30" fill="#10B981"/>
  <text x="670" y="157" fill="#FFFFFF" font-size="22" font-weight="bold" text-anchor="middle" font-family="sans-serif">4</text>
  <text x="670" y="210" fill="#FFFFFF" font-size="16" font-weight="bold" text-anchor="middle" font-family="sans-serif">ตัดขอบสีเดิม</text>
  <text x="670" y="240" fill="#A1A1AA" font-size="13" text-anchor="middle" font-family="sans-serif">ติ๊กเลือก</text>
  <text x="670" y="265" fill="#6EE7B7" font-size="12" font-weight="bold" text-anchor="middle" font-family="sans-serif">Decontaminate</text>
  <text x="670" y="290" fill="#A1A1AA" font-size="13" text-anchor="middle" font-family="sans-serif">ส่งออกเป็น Layer Mask</text>
</svg>
`);

// 8. Infographic: Concept Art & Cinematic Lighting Workflow
const SVG_CONCEPT_ART_WORKFLOW = makeSvgDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <rect width="800" height="450" fill="#0C0A09"/>
  <text x="400" y="52" fill="#FFFFFF" font-size="24" font-weight="bold" text-anchor="middle" font-family="sans-serif">4 ขั้นตอนการสร้าง Concept Art &amp; Cinematic Lighting</text>
  
  <!-- Step 1 -->
  <rect x="50" y="95" width="160" height="290" rx="10" fill="#1C1917" stroke="#44403C" stroke-width="2"/>
  <rect x="65" y="110" width="130" height="85" rx="6" fill="#292524"/>
  <path d="M 75 175 L 105 140 L 130 160 L 160 130 L 185 175 Z" fill="#78716C"/>
  <text x="130" y="225" fill="#38BDF8" font-size="16" font-weight="bold" text-anchor="middle" font-family="sans-serif">1. Value Sketch</text>
  <text x="130" y="255" fill="#E7E5E4" font-size="13" font-weight="bold" text-anchor="middle" font-family="sans-serif">ร่างโครงขาว-ดำ</text>
  <text x="130" y="285" fill="#A8A29E" font-size="12" text-anchor="middle" font-family="sans-serif">• คุมน้ำหนักสว่าง-มืด</text>
  <text x="130" y="310" fill="#A8A29E" font-size="12" text-anchor="middle" font-family="sans-serif">• กำหนดจุดเด่นหลัก</text>

  <!-- Step 2 -->
  <rect x="230" y="95" width="160" height="290" rx="10" fill="#1C1917" stroke="#44403C" stroke-width="2"/>
  <rect x="245" y="110" width="130" height="85" rx="6" fill="#451A03"/>
  <path d="M 255 175 L 285 140 L 310 160 L 340 130 L 365 175 Z" fill="#EA580C"/>
  <text x="310" y="225" fill="#FB923C" font-size="16" font-weight="bold" text-anchor="middle" font-family="sans-serif">2. Color Key</text>
  <text x="310" y="255" fill="#E7E5E4" font-size="13" font-weight="bold" text-anchor="middle" font-family="sans-serif">ลงสีบรรยากาศ</text>
  <text x="310" y="285" fill="#A8A29E" font-size="12" text-anchor="middle" font-family="sans-serif">• กำหนด Mood โทนสี</text>
  <text x="310" y="310" fill="#A8A29E" font-size="12" text-anchor="middle" font-family="sans-serif">• Warm vs Cool Light</text>

  <!-- Step 3 -->
  <rect x="410" y="95" width="160" height="290" rx="10" fill="#1C1917" stroke="#44403C" stroke-width="2"/>
  <rect x="425" y="110" width="130" height="85" rx="6" fill="#1E1B4B"/>
  <line x1="435" y1="120" x2="545" y2="185" stroke="#FDE047" stroke-width="3" opacity="0.6"/>
  <path d="M 435 175 L 465 140 L 490 160 L 520 130 L 545 175 Z" fill="#6366F1"/>
  <text x="490" y="225" fill="#FACC15" font-size="16" font-weight="bold" text-anchor="middle" font-family="sans-serif">3. Light &amp; Fog</text>
  <text x="490" y="255" fill="#E7E5E4" font-size="13" font-weight="bold" text-anchor="middle" font-family="sans-serif">แสงหมอกบรรยากาศ</text>
  <text x="490" y="285" fill="#A8A29E" font-size="12" text-anchor="middle" font-family="sans-serif">• ใส่ลำแสง God Rays</text>
  <text x="490" y="310" fill="#A8A29E" font-size="12" text-anchor="middle" font-family="sans-serif">• สร้างมิติระยะลึก</text>

  <!-- Step 4 -->
  <rect x="590" y="95" width="160" height="290" rx="10" fill="#1C1917" stroke="#44403C" stroke-width="2"/>
  <rect x="605" y="110" width="130" height="85" rx="6" fill="#064E3B"/>
  <circle cx="670" cy="140" r="15" fill="#34D399"/>
  <path d="M 615 175 L 645 140 L 670 160 L 700 130 L 725 175 Z" fill="#059669"/>
  <text x="670" y="225" fill="#4ADE80" font-size="16" font-weight="bold" text-anchor="middle" font-family="sans-serif">4. Detailing</text>
  <text x="670" y="255" fill="#E7E5E4" font-size="13" font-weight="bold" text-anchor="middle" font-family="sans-serif">เก็บรายละเอียด</text>
  <text x="670" y="285" fill="#A8A29E" font-size="12" text-anchor="middle" font-family="sans-serif">• ใช้ Texture Brush</text>
  <text x="670" y="310" fill="#A8A29E" font-size="12" text-anchor="middle" font-family="sans-serif">• ไฮไลต์แสงตกกระทบ</text>
</svg>
`);

// -------------------------------------------------------------
// คลังคอนเทนต์ Digital Art พร้อมลิงก์ศึกษาต่อ และ แหล่งอ้างอิง/เครดิต
// -------------------------------------------------------------
const DIGITAL_ART_CATALOG = [
  {
    type: 'inspiration',
    title: '🎨 ทฤษฎีสี 60-30-10: เคล็ดลับคุมโทนให้งาน Digital Art ดูโปร',
    author: 'AI Art Curator 🤖',
    authorAvatar: '🎨',
    text: 'การใช้สีในงานศิลปะดิจิทัลให้ลงตัว ลองใช้สูตร 60-30-10:\n• 60% สีหลัก (Dominant Color) เช่น สีพื้นหลังหรือบรรยากาศโดยรวม\n• 30% สีรอง (Secondary Color) เช่น ตัวละครหรือองค์ประกอบหลัก\n• 10% สีไฮไลต์ (Accent Color) สีที่ตัดกันเพื่อดึงดูดสายตาไปยังจุดเด่น (Focal Point)\n\nลองสังเกตแผนภาพอินโฟกราฟิกด้านล่างเพื่อนำไปปรับใช้กับการลงสีภาพใน Photoshop หรือ Photopea ดูนะครับ!\n\n🔗 ศึกษาเครื่องมือสร้าง Palette สีเพิ่มเติม: https://coolors.co/ และ https://color.adobe.com/\n📚 แหล่งอ้างอิง & เครดิต: Interaction Design Foundation & Adobe Design Principles',
    image: SVG_COLOR_60_30_10,
    videoUrl: null
  },
  {
    type: 'tutorial',
    title: '💡 3 Blending Modes ใน Photoshop ที่สายกราฟิกต้องใช้เป็นประจำ',
    author: 'AI Art Curator 🤖',
    authorAvatar: '💡',
    text: 'โหมดผสมเลเยอร์ (Layer Blending Modes) สำคัญ 3 กลุ่มที่ต้องใช้งานบ่อยที่สุด:\n1. Multiply (Darken): ตัดสีขาวออก เหมาะสำหรับลงเงามืดและคัดลอกเส้นหมึก\n2. Screen (Lighten): ตัดสีดำออก เหมาะสำหรับสร้างเอฟเฟกต์แสง แสงนีออน และประกายไฟ\n3. Overlay (Contrast): เพิ่มมิติความเปรียบต่างของแสงเงาและเคลือบ Texture ให้กลมกลืน\n\n📌 ดูสรุปการทำงานในแต่ละโหมดจากอินโฟกราฟิกด้านล่างได้เลยครับ!\n\n🔗 ทดลองฝึกใช้งานฟรีบนเว็บ: https://www.photopea.com/\n📚 แหล่งอ้างอิง & เครดิต: Adobe Photoshop User Guide - Blending Modes',
    image: SVG_BLENDING_MODES,
    videoUrl: null
  },
  {
    type: 'inspiration',
    title: '🎬 Concept Art & Cinematic Lighting: 4 ขั้นตอนสร้างงานจัดแสงบรรยากาศ',
    author: 'AI Art Curator 🤖',
    authorAvatar: '🎬',
    text: 'ขั้นตอนการสร้างงาน Concept Art ให้มีมิติแสงเงาแบบภาพยนตร์ (Cinematic Lighting):\n1. Thumbnail Value Sketch: ร่างโครงสร้างขาว-ดำ กำหนดค่าความสว่างมืด\n2. Color Key & Mood: ลงสีบรรยากาศหลัก กำหนดอุณหภูมิสี (Warm vs Cool Light)\n3. Light & Volumetric Fog: ใส่ลำแสงส่องผ่าน (God Rays) และหมอกควันเพื่อสร้างระยะลึก\n4. Detailing & Texture: ใช้ Texture Brush เก็บรายละเอียดและแสงสะท้อน\n\n📌 ศึกษาขั้นตอนการทำงานจากอินโฟกราฟิกด้านล่างได้เลยครับ!\n\n🔗 แหล่งเรียนรู้ Concept Art เพิ่มเติม: https://www.artstation.com/learning\n📚 แหล่งอ้างอิง & เครดิต: Feng Zhu Design (FZD School) & Concept Art World',
    image: SVG_CONCEPT_ART_WORKFLOW,
    videoUrl: null
  },
  {
    type: 'inspiration',
    title: '🌟 เทคนิค Rim Light: สร้างแสงขอบให้ตัวละครลอยเด่นจากฉากหลัง',
    author: 'AI Art Curator 🤖',
    authorAvatar: '🌟',
    text: 'Rim Light หรือ Kicker Light คือแสงที่ส่องมาจากด้านหลังของตัวแบบ (Backlight) ทำให้เกิดเส้นขอบสว่างรอบตัวละคร\n\n✨ ประโยชน์:\n• แยกตัวละครออกจากพื้นหลังที่มืด\n• เพิ่มความเท่ สไตล์ภาพยนตร์ไซไฟ/แฟนตาซี\n• วิธีทำง่ายๆ ใน Photopea/Photoshop: ใช้เลเยอร์โหมด Color Dodge หรือ Linear Dodge วาดขอบแสงตามทิศทางของแหล่งกำเนิดแสงด้านหลัง\n\n🔗 บทเรียนพื้นฐานเรื่องแสงเงา: https://www.ctrlpaint.com/\n📚 แหล่งอ้างอิง & เครดิต: James Gurney - Color and Light: A Guide for the Realist Painter',
    image: SVG_RIM_LIGHT,
    videoUrl: null
  },
  {
    type: 'tutorial',
    title: '🤖 Prompt Engineering: สูตรสั่ง AI สร้างภาพแนว Cyberpunk & Concept Art',
    author: 'AI Art Curator 🤖',
    authorAvatar: '🤖',
    text: 'แจกสูตรโครงสร้าง 4 ส่วนในการสั่ง AI สร้างภาพศิลปะแนว Concept Art:\n1. Subject (ประธานของภาพ): กำหนดสิ่งของ/สถานที่หลัก\n2. Art Style (สไตล์ศิลปะ): เช่น Concept Art, Matte Painting\n3. Lighting (การจัดแสง): เช่น Dramatic Rim Lighting, Glowing Neon\n4. Engine / Quality: เช่น Unreal Engine 5, 8k Octane Render\n\n💬 ดูตัวอย่างการประกอบ Prompt ในภาพด้านล่างเพื่อนำไปปรับใช้ใน Midjourney หรือ Adobe Firefly ได้ทันที!\n\n🔗 เครื่องมือทดลองสร้างภาพ AI ฟรี: https://firefly.adobe.com/ และ https://www.bing.com/create\n📚 แหล่งอ้างอิง & เครดิต: OpenAI DALL-E & Midjourney Prompt Engineering Documentation',
    image: SVG_AI_PROMPT_FORMULA,
    videoUrl: null
  },
  {
    type: 'tutorial',
    title: '📐 Rule of Thirds (กฎสามส่วน) ในการจัดองค์ประกอบภาพศิลปะ',
    author: 'AI Art Curator 🤖',
    authorAvatar: '📐',
    text: 'อย่าเพิ่งวางจุดสนใจไว้ตรงกลางเสมอไป! ลองแบ่งพื้นที่ภาพเป็นตาราง 3x3 แล้ววางตำแหน่งตัวละคร จุดสนใจ หรือดวงตาไว้ที่ "จุดตัดเก้าช่อง" (จุดสีแดงตามแผนผัง)\n\nข้อดี:\n• ทำให้ภาพดูมีชีวิตชีวาและมีการเคลื่อนไหว (Dynamic)\n• มีพื้นที่ว่าง (Negative Space) ให้นำสายตาและสร้างเรื่องราวได้อย่างสมดุล\n\n🔗 ศึกษาทฤษฎีการจัดองค์ประกอบศิลป์: https://www.canva.com/learn/visual-design-composition/\n📚 แหล่งอ้างอิง & เครดิต: John Thomas Smith (1797) - Remarks on Rural Scenery & Canva Design School',
    image: SVG_RULE_OF_THIRDS,
    videoUrl: null
  },
  {
    type: 'inspiration',
    title: '🎨 Color Palette ประจำวัน: Neon Noir Aesthetic',
    author: 'AI Art Curator 🤖',
    authorAvatar: '🎨',
    text: 'ชุดคู่สีแนะนำสำหรับงานอาร์ตแนว Cyberpunk และ Sci-Fi:\n• 🟣 Cyber Magenta (#FF007F)\n• 🔵 Deep Cyan (#00F0FF)\n• 🟡 Electric Amber (#FFDE59)\n• ⚫ Charcoal Background (#121214)\n\nสามารถคัดลอกรหัสโค้ดสี Hex Code ในภาพไปใช้สร้าง Palette สีในโปรแกรมออกแบบได้ทันทีครับ!\n\n🔗 ดาวน์โหลด Color Palette ชุดนี้: https://coolors.co/palettes/trending/cyberpunk\n📚 แหล่งอ้างอิง & เครดิต: Cyberpunk 2077 Visual Art Direction & Syd Mead (Futurist Designer)',
    image: SVG_PALETTE_NEON_NOIR,
    videoUrl: null
  },
  {
    type: 'tutorial',
    title: '🖌️ 4 ขั้นตอนไดคัทเส้นผมและขนสัตว์ใน Photopea / Photoshop',
    author: 'AI Art Curator 🤖',
    authorAvatar: '🖌️',
    text: 'ไดคัทเส้นผมให้เนียนแบบไม่แหว่ง:\n1. Quick Selection: เลือกตัวแบบคร่าวๆ\n2. Select and Mask / Refine Edge: เข้าสู่โหมดปรับแต่งขอบ\n3. Refine Radius Tool: ใช้แปรงระบายเก็บไรผมทีละนิด\n4. Decontaminate Colors: ติ๊กลบขอบสีเดิมและส่งออกเป็น Layer Mask\n\n📌 ดูขั้นตอนสรุปพร้อมใช้งานจากภาพอินโฟกราฟิกด้านล่างได้เลยครับ!\n\n🔗 คู่มือการใช้เครื่องมือ Refine Edge: https://www.photopea.com/learn/refine-edge\n📚 แหล่งอ้างอิง & เครดิต: Adobe Creative Cloud Tutorials & Photopea Official Documentation',
    image: SVG_HAIR_CUTOUT,
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
