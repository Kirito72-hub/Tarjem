# 🎬 AraMux

![Version](https://img.shields.io/badge/version-0.1.0--alpha-blueviolet?style=for-the-badge)
![Platform](https://img.shields.io/badge/platform-Windows-blue?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)

**The ultimate automated subtitle manager for Arabic Anime & TV enthusiasts.**

AraMux eliminates the tedious process of finding the right subtitles. It scans your local folders, calculates video file hashes to find the *exact* matching Arabic subtitle release, and uses FFmpeg to soft-merge them into your files instantly—all within a beautiful, gamified, and highly animated interface.

![App Screenshot Placeholder](https://via.placeholder.com/800x450?text=App+Screenshot+Here)
*(Add a GIF here showing the Drag & Drop animation!)*

## ✨ Features

* **📂 Smart Recursive Scanning:** Drag and drop an entire folder (or nested folders). AraMux finds every video file automatically.
* **⚡ Precision Hash Matching:** Uses 64kb byte-offset hashing (OpenSubtitles standard) to guarantee the subtitle matches your specific video release. No more out-of-sync audio!
* **🛠️ Automated FFmpeg Muxing:** Automatically merges downloaded `.srt` files into the video container (`.mkv`/`.mp4`) as a soft subtitle track. No re-encoding, no quality loss, instant results.
* **🎨 Modern "Gamified" UI:** Built with **Framer Motion** for silky smooth 60fps animations, toast notifications, and a dark-mode aesthetic inspired by modern gaming dashboards.
* **🇸🇦 Native RTL Support:** Fully optimized layout for Arabic text.

## 🛠️ Tech Stack

This project is built with the **"Modern & Flexible"** stack to ensure high performance and a stunning UI.

* **Runtime:** [Electron](https://www.electronjs.org/) (latest)
* **Frontend:** React + TypeScript + Vite
* **Styling:** Tailwind CSS + shadcn/ui
* **Animations:** Framer Motion
* **Core Logic:** Node.js + `fluent-ffmpeg`
* **Data Source:** OpenSubtitles API

## 🚀 Getting Started

### Prerequisites

* Node.js (v18 or higher)
* FFmpeg (The app looks for a local install or the bundled binary)

### Installation

1.  **Clone the repository**
    ```bash
    git clone [https://github.com/yourusername/aramux.git](https://github.com/yourusername/aramux.git)
    cd aramux
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Run the development server**
    ```bash
    npm run dev
    ```

4.  **Build for Windows**
    ```bash
    npm run build:win
    ```

## 🗺️ Roadmap

- [ ] **Phase 1:** Core scanning and hashing logic.
- [ ] **Phase 2:** OpenSubtitles API integration.
- [ ] **Phase 3:** FFmpeg "Soft Mux" pipeline.
- [ ] **Phase 4:** UI Polish (Glassmorphism & Lottie Animations).
- [ ] **Future:** Support for bulk batch processing (100+ files).

## 🤝 Contributing

Contributions are welcome! Please check out the [issues](https://github.com/yourusername/aramux/issues) tab to see what needs to be done.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.
