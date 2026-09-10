# ⚡ AlightFree

<div align="center">

# ALIGHT<span style="color:#f59e0b">FREE</span>

### ReyCloud System

**Alight Motion Generator • AI Tools • Downloader • Anime • AI Chat • Admin System**

<br>

[![GitHub](https://img.shields.io/badge/GitHub-ReyCloud-181717?style=for-the-badge&logo=github)](https://github.com/reyclouddev-ops/amfree)
[![Repository](https://img.shields.io/badge/Repository-amfree-black?style=for-the-badge&logo=github)](https://github.com/reyclouddev-ops/amfree)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?style=for-the-badge&logo=vercel)](https://vercel.com/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![JavaScript](https://img.shields.io/badge/JavaScript-CommonJS-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

<br>

[🌐 Live Demo](https://amfree-delta.vercel.app/)

</div>

---

# 📖 About

**AlightFree** adalah project web **ReyCloud System** yang menggabungkan berbagai tools dan layanan digital dalam satu dashboard.

Project ini dibuat menggunakan frontend HTML/CSS/JavaScript dan backend API berbasis Node.js yang dapat dijalankan menggunakan environment serverless seperti Vercel.

AlightFree memiliki beberapa bagian utama seperti:

- 🚀 Alight Motion Generator
- 🔑 Key Generator & Key Checker
- 🤖 Rayleigh AI Chat
- ✨ AI Upscale Tools
- 🖼️ Image Tools
- 📥 Media Downloader
- ⛩️ Anime Hub
- 🛡️ Admin Control Panel
- 📊 Management System
- 🔌 REST API

Repository:

https://github.com/reyclouddev-ops/amfree

Live Website:

https://amfree-delta.vercel.app/

---

# ✨ Features

## 🚀 Alight Motion Generator

AlightFree memiliki halaman generator yang dapat diakses melalui:

```text
/amgen
```

Halaman generator menjadi salah satu bagian utama dari sistem AlightFree.

Backend generator berada pada:

```text
/api/amgen.js
```

Project juga memiliki sistem generator otomatis:

```text
/api/amgen_auto.js
```

---

# 🔑 Key System

AlightFree memiliki sistem untuk mengelola dan memeriksa key.

API yang tersedia antara lain:

```text
/api/checkkey.js
/api/generatorkey.js
/api/liskeys.js
```

### Check Key

Digunakan untuk melakukan pengecekan informasi key.

Frontend:

```text
/usercek/
```

API:

```text
/api/checkkey.js
```

### Generate Key

Backend:

```text
/api/generatorkey.js
```

### List Keys

Backend:

```text
/api/liskeys.js
```

---

# 🤖 Rayleigh AI Chat

AI Chat tersedia melalui:

```text
/chatai
```

Backend:

```text
/api/chat.js
```

Sistem ini menyediakan interface chat berbasis web yang terhubung dengan backend API.

Fitur:

- 💬 Chat interface
- 🤖 AI response
- 🔌 API integration
- 📱 Responsive interface
- ⚡ Fast request
- 🌙 Modern UI

---

# ✨ AI Tools

AlightFree menyediakan berbagai AI/image tools.

Frontend:

```text
/tools
```

Backend API:

```text
/api/imagen.js
/api/removebg.js
/api/upscale.js
/api/wink.js
/api/react.js
```

Tools dapat digunakan sebagai bagian dari platform ReyCloud untuk pemrosesan media dan image-related services.

---

# 🖼️ Image Tools

Beberapa API image processing tersedia di folder:

```text
/api
```

### Image Generation

```text
/api/imagen.js
```

### Remove Background

```text
/api/removebg.js
```

### Image Upscale

```text
/api/upscale.js
```

### Wink

```text
/api/wink.js
```

### React

```text
/api/react.js
```

---

# 📥 Media Downloader

Downloader tersedia melalui:

```text
/downloader
```

API downloader yang tersedia:

```text
/api/igdl.js
/api/tiktok.js
```

### Instagram Downloader

```text
/api/igdl.js
```

### TikTok Downloader

```text
/api/tiktok.js
```

Downloader menggunakan backend API untuk memproses request dari frontend.

---

# ⛩️ Anime Hub

Anime Hub tersedia melalui:

```text
/nontonanime
```

Backend:

```text
/api/anime.js
```

Anime API digunakan sebagai penghubung antara halaman frontend dengan service anime.

---

# 🛡️ Admin Control Panel

Admin Control Panel tersedia melalui:

```text
/admins/
```

Frontend admin:

```text
/admins/index.html
```

Authentication admin menggunakan library:

```text
/lib/authadmin.js
```

Sistem admin digunakan untuk mengelola fitur yang membutuhkan akses administrator.

---

# 🔐 Authentication

Authentication library berada di:

```text
/lib/auth.js
```

Authentication untuk admin:

```text
/lib/authadmin.js
```

Authentication digunakan untuk membatasi akses terhadap fitur tertentu.

---

# 💳 QRIS

Project menyediakan asset QRIS:

```text
/lib/qris.png
```

Asset dapat digunakan oleh halaman atau sistem pembayaran yang terhubung dengan project.

Backend QRIS:

```text
/api/qris.js
```

---

# 📡 API

Seluruh backend API berada pada folder:

```text
api/
```

API yang tersedia pada repository:

```text
api/
├── amgen.js
├── amgen_auto.js
├── anime.js
├── bulk-am.js
├── chat.js
├── checkkey.js
├── generatorkey.js
├── igdl.js
├── imagen.js
├── liskeys.js
├── qris.js
├── react.js
├── removebg.js
├── tiktok.js
├── upscale.js
└── wink.js
```

---

# 📂 Project Structure

Struktur repository saat ini:

```text
amfree/
│
├── admins/
│   └── index.html
│
├── amgen/
│   └── index.html
│
├── api/
│   ├── amgen.js
│   ├── amgen_auto.js
│   ├── anime.js
│   ├── bulk-am.js
│   ├── chat.js
│   ├── checkkey.js
│   ├── generatorkey.js
│   ├── igdl.js
│   ├── imagen.js
│   ├── liskeys.js
│   ├── qris.js
│   ├── react.js
│   ├── removebg.js
│   ├── tiktok.js
│   ├── upscale.js
│   └── wink.js
│
├── chatai/
│   └── index.html
│
├── downloader/
│   └── index.html
│
├── lib/
│   ├── auth.js
│   ├── authadmin.js
│   └── qris.png
│
├── nontonanime/
│   └── index.html
│
├── tools/
│   └── index.html
│
├── usercek/
│   └── index.html
│
├── index.html
├── package.json
└── README.md
```

---

# 🧩 Directory Documentation

## `admins/`

Berisi halaman Admin Control Panel.

```text
admins/index.html
```

Digunakan untuk halaman administrasi.

---

## `amgen/`

Berisi frontend Alight Motion Generator.

```text
amgen/index.html
```

---

## `api/`

Folder backend/serverless API.

```text
api/
```

Semua endpoint backend utama project berada di sini.

---

## `chatai/`

Berisi frontend Rayleigh AI Chat.

```text
chatai/index.html
```

---

## `downloader/`

Berisi frontend Media Downloader.

```text
downloader/index.html
```

---

## `lib/`

Berisi library dan asset internal.

```text
lib/
├── auth.js
├── authadmin.js
└── qris.png
```

---

## `nontonanime/`

Berisi frontend Anime Hub.

```text
nontonanime/index.html
```

---

## `tools/`

Berisi frontend AI Upscale Tools dan tools lainnya.

```text
tools/index.html
```

---

## `usercek/`

Berisi frontend untuk pengecekan key.

```text
usercek/index.html
```

---

# 🛠️ Technologies

Project menggunakan teknologi berikut:

| Technology | Usage |
|---|---|
| HTML5 | Struktur halaman |
| CSS3 | Styling |
| JavaScript | Frontend logic |
| Node.js | Backend runtime |
| CommonJS | Backend module system |
| Axios | HTTP request |
| Cheerio | HTML parsing |
| Crypto-JS | Cryptographic utilities |
| Form Data | Multipart request |
| Tough Cookie | Cookie handling |
| Axios Cookie Jar | Cookie session |
| Undici | HTTP client |
| Mongoose | MongoDB database |
| Tailwind CSS | UI styling |
| Vercel | Deployment |

---

# 📦 Dependencies

Dependencies yang digunakan project berasal dari `package.json`.

```json
{
  "name": "reycloud-am-generator",
  "version": "2.0.0",
  "type": "commonjs",
  "description": "Alight Motion Premium Generator, Tools, Rayleigh AI & NontonAnime on Vercel",
  "main": "api/amgen.js"
}
```

Dependencies:

```text
axios
axios-cookiejar-support
cheerio
crypto-js
form-data
mongoose
tough-cookie
undici
```

---

# 💻 Requirements

Untuk menjalankan project secara lokal, siapkan:

```text
Node.js
npm
Git
```

Disarankan:

```text
Node.js 18+
```

Cek Node.js:

```bash
node -v
```

Cek npm:

```bash
npm -v
```

Cek Git:

```bash
git --version
```

---

# 🚀 Installation

## 1. Clone Repository

```bash
git clone https://github.com/reyclouddev-ops/amfree.git
```

## 2. Masuk Directory

```bash
cd amfree
```

## 3. Install Dependencies

```bash
npm install
```

## 4. Jalankan Project

Project ini menggunakan struktur API/serverless dan dapat dijalankan menggunakan environment yang sesuai dengan konfigurasi deployment.

Untuk deployment Vercel, repository dapat langsung di-import ke Vercel.

---

# ☁️ Deploy to Vercel

AlightFree menggunakan struktur yang cocok untuk deployment pada Vercel.

## Cara Deploy

### 1. Buka Vercel

Buka:

https://vercel.com/

### 2. Import Repository

Pilih repository:

```text
reyclouddev-ops/amfree
```

### 3. Configure Project

Pastikan repository menggunakan branch:

```text
main
```

### 4. Environment Variables

Jika API tertentu membutuhkan credential, masukkan melalui:

```text
Vercel
→ Project
→ Settings
→ Environment Variables
```

### 5. Deploy

Klik:

```text
Deploy
```

Setelah selesai, Vercel akan memberikan URL deployment.

---

# 🌐 Live Demo

Live deployment yang terdaftar pada repository:

https://amfree-delta.vercel.app/

---

# ⚙️ Environment Variables

Jika konfigurasi API membutuhkan credential, gunakan environment variable.

Contoh:

```env
API_KEY=
DATABASE_URL=
MONGODB_URI=
JWT_SECRET=
TOKEN=
SECRET=
```

Nama variable harus disesuaikan dengan source code API yang digunakan.

Jangan memasukkan credential asli ke repository publik.

---

# 🔒 Security

Jangan menyimpan data sensitif secara langsung pada source code.

Hindari memasukkan:

```text
API Key
Database Password
Database URI
JWT Secret
Private Token
Session Cookie
Admin Credential
```

Gunakan environment variables.

Contoh `.gitignore`:

```gitignore
node_modules/
.env
.env.local
.env.production
*.log
```

---

# 🗄️ MongoDB

Project memiliki dependency:

```text
mongoose
```

yang memungkinkan penggunaan MongoDB pada backend.

Jika database digunakan, connection string sebaiknya disimpan sebagai environment variable.

Contoh:

```env
MONGODB_URI=your_mongodb_connection_string
```

Jangan publish connection string database ke repository publik.

---

# 🔐 Authentication

Library authentication:

```text
lib/auth.js
```

Authentication admin:

```text
lib/authadmin.js
```

Gunakan authentication dan authorization pada backend untuk endpoint yang membutuhkan akses khusus.

Jangan hanya mengandalkan proteksi frontend.

---

# 🛡️ Admin Security

Untuk endpoint admin, disarankan menggunakan:

```text
Authentication
Authorization
Role Validation
Input Validation
Rate Limiting
Secure Session
```

Flow:

```text
Client
   │
   ▼
Authentication
   │
   ▼
Authorization
   │
   ├── Allowed
   │
   └── Denied
```

---

# 📱 Responsive Design

Frontend AlightFree dibuat agar dapat digunakan pada:

```text
📱 Android
📱 iPhone
📱 Tablet
💻 Laptop
🖥️ Desktop
```

Dashboard menggunakan layout responsive agar tampilan dapat menyesuaikan ukuran layar.

---

# 🎨 Main Dashboard

File utama:

```text
index.html
```

Dashboard utama memiliki:

- ⚡ AlightFree branding
- 🌙 Theme switcher
- 📱 Responsive layout
- 🔽 Navigation dropdown
- 🚀 Generator navigation
- 🔍 Key checker
- 🛡️ Admin panel
- ✨ AI tools
- 📥 Downloader
- 🤖 AI Chat
- ⛩️ Anime Hub
- 📅 Date information
- 🕐 Time information

---

# 🧭 Navigation

Menu utama yang tersedia pada dashboard:

```text
🚀 Generator Amgen
🔍 Cek Masa Aktif Key
🛡️ Admin Control Panel
✨ AI Upscale Tools
📥 Media Downloader
🤖 Rayleigh AI Chat
⛩️ Nonton Anime
```

Route:

```text
/amgen
/usercek/
/admins/
/tools
/downloader
/chatai
/nontonanime
```

---

# 🌙 Theme System

Dashboard memiliki sistem pergantian tema.

Tombol theme terdapat pada:

```text
index.html
```

Fungsi JavaScript:

```javascript
toggleTheme()
```

Icon theme menggunakan:

```text
🌙
☀️
```

---

# 🎞️ UI Animation

Dashboard menggunakan beberapa animation dan visual effect seperti:

```text
Marquee
Glass Effect
Blur
Gradient
Hover Animation
Scale Animation
Transition
```

Contoh animation:

```css
@keyframes marquee {
    0% {
        transform: translateX(100%);
    }

    100% {
        transform: translateX(-100%);
    }
}
```

---

# 🔌 API Architecture

Arsitektur project:

```text
┌──────────────────────┐
│      Frontend        │
│      HTML / JS       │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│        API           │
│      /api/*          │
└──────────┬───────────┘
           │
           ├──────────────┐
           │              │
           ▼              ▼
      External API     Database
```

---

# 📡 API Modules

## Alight Motion

```text
/api/amgen.js
/api/amgen_auto.js
/api/bulk-am.js
```

## Anime

```text
/api/anime.js
```

## AI Chat

```text
/api/chat.js
```

## Key System

```text
/api/checkkey.js
/api/generatorkey.js
/api/liskeys.js
```

## Image

```text
/api/imagen.js
/api/removebg.js
/api/upscale.js
/api/wink.js
/api/react.js
```

## Downloader

```text
/api/igdl.js
/api/tiktok.js
```

## Payment

```text
/api/qris.js
```

---

# 🧪 Development

Clone repository:

```bash
git clone https://github.com/reyclouddev-ops/amfree.git
```

Masuk:

```bash
cd amfree
```

Install:

```bash
npm install
```

Lakukan perubahan pada source code.

Cek perubahan:

```bash
git status
```

---

# 🌿 Git Workflow

Buat branch baru:

```bash
git checkout -b feature/nama-fitur
```

Contoh:

```bash
git checkout -b feature/new-tools
```

Setelah selesai:

```bash
git add .
```

Commit:

```bash
git commit -m "feat: add new tools"
```

Push:

```bash
git push origin feature/new-tools
```

Kemudian buat Pull Request pada GitHub.

---

# 🐛 Bug Report

Jika menemukan bug, buat GitHub Issue.

Sertakan:

```text
Device:
Operating System:
Browser:
Page:
Error:
Steps to Reproduce:
Expected Result:
Actual Result:
Screenshot:
```

Contoh:

```text
Device: Android
OS: Android 16
Browser: Chrome
Page: /chatai

Error:
Request tidak mendapatkan response.

Steps:
1. Buka /chatai
2. Masukkan pesan
3. Tekan tombol Send
4. Response tidak muncul
```

---

# 💡 Feature Request

Untuk request fitur baru, sertakan:

```text
Nama fitur:
Deskripsi:
Tujuan:
Contoh penggunaan:
```

Contoh:

```text
Nama fitur:
YouTube Downloader

Deskripsi:
Menambahkan downloader YouTube.

Tujuan:
Menambah pilihan media downloader.

Contoh:
User memasukkan URL YouTube lalu API memproses request.
```

---

# 🤝 Contributing

Contribution dipersilakan.

## Fork

Fork repository:

https://github.com/reyclouddev-ops/amfree

## Clone

```bash
git clone https://github.com/reyclouddev-ops/amfree.git
```

## Branch

```bash
git checkout -b feature/nama-fitur
```

## Install

```bash
npm install
```

## Development

Lakukan perubahan pada source code.

## Commit

```bash
git add .
git commit -m "feat: add new feature"
```

## Push

```bash
git push origin feature/nama-fitur
```

## Pull Request

Buat Pull Request ke branch:

```text
main
```

---

# 📋 Code Style

Gunakan code style yang konsisten.

Disarankan:

```text
JavaScript
├── const / let
├── async / await
├── try / catch
├── descriptive variable names
└── modular functions
```

Hindari menyimpan credential langsung pada source code.

---

# 🧹 Maintenance

Untuk memperbarui dependency:

```bash
npm update
```

Untuk melihat dependency:

```bash
npm list
```

Untuk audit:

```bash
npm audit
```

---

# 📊 Project Information

```text
Project Name : AlightFree
Package Name : reycloud-am-generator
Version      : 2.0.0
Type         : CommonJS
Main         : api/amgen.js
Platform     : Web
Runtime      : Node.js
Deployment   : Vercel
Organization : ReyCloud
```

---

# 📁 Important Files

| File | Fungsi |
|---|---|
| `index.html` | Dashboard utama |
| `package.json` | Project configuration |
| `api/amgen.js` | Generator API |
| `api/amgen_auto.js` | Generator automation |
| `api/anime.js` | Anime API |
| `api/bulk-am.js` | Bulk generator API |
| `api/chat.js` | AI Chat API |
| `api/checkkey.js` | Check key API |
| `api/generatorkey.js` | Generate key API |
| `api/igdl.js` | Instagram downloader API |
| `api/imagen.js` | Image API |
| `api/liskeys.js` | Key list API |
| `api/qris.js` | QRIS API |
| `api/react.js` | Image tool API |
| `api/removebg.js` | Remove background API |
| `api/tiktok.js` | TikTok downloader API |
| `api/upscale.js` | Image upscale API |
| `api/wink.js` | Image tool API |
| `lib/auth.js` | Authentication |
| `lib/authadmin.js` | Admin authentication |
| `lib/qris.png` | QRIS asset |

---

# 🔗 Links

## Repository

https://github.com/reyclouddev-ops/amfree

## GitHub Organization

https://github.com/reyclouddev-ops

## Live Demo

https://amfree-delta.vercel.app/

## Vercel

https://vercel.com/

---

# ⚠️ Disclaimer

AlightFree dibuat untuk kebutuhan pengembangan, pembelajaran, dan penggunaan layanan digital yang sah.

Setiap API, service pihak ketiga, downloader, generator, AI service, dan layanan lain yang digunakan melalui project ini tetap mengikuti ketentuan dan kebijakan dari penyedia layanan masing-masing.

Pengguna bertanggung jawab atas penggunaan project dan integrasi API yang mereka konfigurasi sendiri.

Pastikan penggunaan project tidak melanggar:

- Terms of Service
- Copyright
- API Policy
- License
- Privacy Policy
- Peraturan yang berlaku

---

# ⭐ Support

Jika project ini bermanfaat, kamu dapat mendukung repository dengan:

```text
⭐ Star
🍴 Fork
🐛 Report Bug
💡 Request Feature
🔧 Pull Request
```

Repository:

https://github.com/reyclouddev-ops/amfree

---

# ❤️ ReyCloud

<div align="center">

# ⚡ ReyCloud

### Digital Tools & Web System

**Built with ❤️ by ReyCloud**

<br>

© 2026 ReyCloud

</div>

---

# 📜 License

Project ini menggunakan ketentuan lisensi yang berlaku pada repository.

Dependency pihak ketiga tetap mengikuti lisensi masing-masing.

---

# 📌 Credits

**Developer:**

ReyCloud

**Repository:**

reyclouddev-ops/amfree

**System:**

ReyCloud System

---

<div align="center">

### ⚡ ALIGHTFREE

**REYCLOUD SYSTEM**

</div>
~~~