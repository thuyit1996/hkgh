c:\SCS\commic
├── src/ # code app React Native
│ ├── app/ # Expo Router — mỗi file là 1 màn
│ │ ├── _layout.tsx # Stack + SafeArea
│ │ ├── index.tsx # Onboarding
│ │ ├── home.tsx # Trang truyện (hero, CTA, chương mới)
│ │ ├── chapters.tsx # Danh sách chương + ô tìm kiếm
│ │ ├── read.tsx # Trình đọc (ảnh, prev/next nổi, immersive)
│ │ └── settings.tsx # Cài đặt (API base, phiên bản)
│ ├── api/
│ │ ├── chapters.ts # GET /api/chapters, /api/chapters/:n + fetchWithTimeout
│ ├── components/
│ │ ├── Skeleton.tsx # khối loading nhấp nháy
│ │ └── FadeInImage.tsx # ảnh trang truyện + skeleton + fade-in
│ ├── data/
│ │ └── mock.ts # metadata truyện + tên chương + ảnh bìa
│ ├── hooks/
│ │ └── useChapters.ts # fetch danh sách chương từ API
│ └── utils/
│ └── navigation.ts # goBackOrHome (chống lỗi GO_BACK)
│
├── server/ # backend Express
│ ├── src/
│ │ └── index.js # API + static images + request log
│ ├── images/ # dữ liệu truyện (tự nhận thư mục mới)
│ │ ├── ch-1/ 001..007.webp (7 trang)
│ │ ├── ch-2/ 1..6.webp (6 trang)
│ │ ├── ch-3/ 001..007.webp (7 trang)
│ │ └── ch-4/ 1..6.webp (6 trang)
│ ├── data/
│ ├── package.json
│ └── pnpm-lock.yaml
│
├── assets/ # icon, splash + ảnh mock
│ ├── comic/
│ │ ├── hero.png # ảnh bìa trang chủ
│ │ ├── onboarding-bg.png
│ │ ├── cover-1..5.png
│ │ ├── genre-1..4.png
│ │ ├── page-1.png
│ │ └── chap/ 0..6.webp # ảnh gốc bạn tải về
│ ├── icon.png
│ ├── splash-icon.png
│ ├── favicon.png
│ └── android-icon-*.png
│
├── android/ # (1189 file) sinh bởi expo prebuild — KHÔNG copy
├── node_modules/ # (không copy)
│
├── app.json # scheme "commic" + plugin expo-router
├── package.json # main: expo-router/entry + deps
├── tsconfig.json # paths @/* → src/*
├── babel.config.js # nativewind jsxImportSource
├── metro.config.js # withNativeWind
├── tailwind.config.js # màu brand / ink / surface
├── global.css # @tailwind base/components/utilities
├── nativewind-env.d.ts # type cho className
├── pnpm-lock.yaml
│
├── ui1.png / ui2.png # ảnh thiết kế bạn gửi
├── commic-source.md # dump toàn bộ source (24 file, 1738 dòng)
├── .prefs.xml # helper: debug_http_host cho emulator
├── .tools/adb37/ # adb riêng (máy này push bị lỗi)
├── .metro.log / .server.log # log tạm
├── .dump.py # script tạo commic-source.md
├── AGENTS.md
└── LICENSE