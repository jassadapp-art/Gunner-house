# Household Savings Tracker (ระบบติดตามเงินออมครัวเรือน / บัญชีกองกลาง 2 คน)

เว็บแอปพลิเคชัน Single Page Application (SPA) สไตล์ **Fintech Dashboard** สำหรับคู่รักหรือสมาชิก 2 คนที่ต้องการออมเงินร่วมกันเป็นก้อนเดียว (Shared Pool) แต่ยังคงจำแนกและติดตามสถิติการสมทบเงินของแต่ละคนได้อย่างชัดเจนและเป็นธรรม

![Theme](https://img.shields.io/badge/Theme-Fintech%20Dark-10b981?style=flat-square)
![Stack](https://img.shields.io/badge/Stack-React%20%7C%20TypeScript%20%7C%20TailwindCSS%20%7C%20Recharts-6366f1?style=flat-square)
![Storage](https://img.shields.io/badge/Storage-LocalStorage-06b6d4?style=flat-square)

---

## 🌟 ฟีเจอร์หลัก (Key Features)

### 1. Overview Dashboard (KPI Cards)
- **กองกลางสะสมทั้งหมด (Total Joint Savings)**: ยอดเงินรวมของทั้งสองคน พร้อมสัดส่วน % All-time
- **ยอดออมรวมเดือนนี้ (Saved This Month)**: ติดตามยอดที่เก็บได้ในงวดปัจจุบัน เทียบกับเป้าหมายรายเดือนรวม
- **ยอดสมทบแยกเดือนนี้ (Monthly Breakdown)**: แสดงยอดฝากของ Person A (สี Emerald) และ Person B (สี Indigo) แยกกันชัดเจน
- **ความคืบหน้าเป้าหมายรวม (% Total Household Goal)**: คำนวณความคืบหน้ารวมสู่เป้าหมายทุกเป้าหมาย พร้อมระบุยอดเงินที่ยังขาด

### 2. Contribution & Progress Analytics (ชาร์ตและกราฟ)
- **Contribution Ratio (Donut Chart)**: สัดส่วนการออมสะสม A vs B (เช่น 54% ต่อ 46%) พร้อมยอดเงินและตัวบอกสมดุล
- **Monthly Stacked Bar Chart**: กราฟแท่งซ้อน 2 สี แสดงแนวโน้มเงินออมย้อนหลังรายเดือน ชี้ให้เห็นว่าแต่ละงวดใครหยอดมาเท่าไหร่
- **Category Allocation**: การจัดสรรเงินกองกลางไปยังเป้าหมายหมวดหมู่ต่าง ๆ (เงินสำรองฉุกเฉิน, ท่องเที่ยว, เกษียณ, แต่งบ้าน)

### 3. Shared Goals & Milestones (เป้าหมายกองกลาง)
- การ์ดเป้าหมายพร้อม Progress Bar, ยอดสะสม, ยอดเป้าหมาย, และยอดคงเหลือ
- **Smart Forecast**: คาดการณ์จำนวนเดือนที่จะบรรลุเป้าหมายโดยอัตโนมัติ ตามอัตราการออมเฉลี่ยต่อเดือน
- ปุ่ม "หยอดเข้าเป้าหมายนี้" เพื่อระบุเงินเข้ากระปุกนั้นโดยตรง

### 4. Interactive Controls & Logging Form
- **บันทึกเงินออม (Logging Modal)**: เลือกว่าใครเป็นคนออม (สลับปุ่ม A / B สะดวก), วันที่, จำนวนเงิน, เป้าหมาย, หมวดหมู่, หมายเหตุ
- **Quick Add**: ปุ่มลัดหยอดเงินออมงวดด่วน (+1,000, +5,000, เงินเดือนออกประจำงวด)
- **Transaction History**: ตารางประวัติรายการ พร้อม Tag สี A/B, ระบบค้นหา (Search), กรองตามสมาชิก (Filter by Member), กรองตามเป้าหมาย (Filter by Goal), แก้ไข และลบรายการ

### 5. Profile & Data Management
- **ปรับแต่งสมาชิก**: ตั้งชื่อเต็ม, ชื่อเล่น, เปลี่ยน Emoji Avatar, กำหนดเป้าออมต่อเดือน
- **LocalStorage Persistence**: บันทึกข้อมูลอัตโนมัติ ไม่หายเมื่อรีเฟรชหน้าเว็บ
- **Mock Data 6 เดือน**: บรรจุข้อมูลจำลองย้อนหลัง 6 เดือนให้เห็นภาพ Dashboard สวยงามทันทีตั้งแต่เปิดใช้งาน
- **Backup & Restore**: ส่งออกข้อมูลเป็นไฟล์ JSON (Export) และนำเข้าข้อมูลสำรอง (Import) ได้อย่างปลอดภัย
- **Confetti Celebration**: แอนิเมชันพลุกระดาษเฉลิมฉลองเมื่อบรรลุเป้าหมาย

---

## 🚀 วิธีการติดตั้งและเปิดใช้งาน (Getting Started)

### 1. ติดตั้ง Dependencies
```bash
npm install
```

### 2. รันโหมด Development
```bash
npm run dev
```
เปิดบราวเซอร์ไปที่ `http://localhost:5173`

### 3. ตรวจสอบการ Build (Production)
```bash
npm run build
```

---

## 📁 โครงสร้างโปรเจกต์ (Project Architecture)

```
d:/Account/
├── src/
│   ├── types/
│   │   └── index.ts                 # Type definitions (Settings, Goals, Transactions)
│   ├── utils/
│   │   ├── formatters.ts           # แปลงสกุลเงิน THB, วันที่ไทย, % และคำนวณเดือนคงเหลือ
│   │   └── storage.ts              # จัดการ LocalStorage และฟังก์ชัน Export/Import/Reset
│   ├── data/
│   │   └── mockData.ts             # ข้อมูลจำลองย้อนหลัง 6 เดือน
│   ├── components/
│   │   ├── Navbar.tsx              # เมนูส่วนหัว, ปุ่มสลับ/เปิด Modal
│   │   ├── OverviewCards.tsx       # KPI Cards 4 การ์ดสรุปภาพรวม
│   │   ├── QuickAddBar.tsx         # แถบปุ่มลัดหยอดเงินออมงวดด่วน
│   │   ├── AnalyticsSection.tsx    # Donut Chart, Stacked Bar Chart, Category Allocation
│   │   ├── GoalsList.tsx           # การ์ดเป้าหมายกองกลางและพยากรณ์เวลาบรรลุ
│   │   ├── TransactionHistory.tsx  # ตารางประวัติการออม ค้นหาและกรองข้อมูล
│   │   ├── AddTransactionModal.tsx # Modal ฟอร์มบันทึกการออม (สลับ A/B)
│   │   ├── GoalModal.tsx           # Modal เพิ่ม/แก้ไขเป้าหมาย
│   │   └── SettingsModal.tsx       # Modal ตั้งค่าสมาชิก, ปรับชื่อ/Avatar, สำรองข้อมูล
│   ├── App.tsx                     # Main App Component
│   ├── main.tsx                    # React Entry Point
│   └── index.css                   # Tailwind Base + Custom Glassmorphism styles
├── index.html                      # หน้า HTML หลัก พร้อมฟอนต์ Google (Prompt & Inter)
├── tailwind.config.js              # กำหนดธีมสี Fintech, Emerald (Person A), Indigo (Person B)
└── package.json
```
