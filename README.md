# 🎬 [AppName]

![Version](https://img.shields.io/badge/version-0.1.0--alpha-blueviolet?style=for-the-badge)
![Platform](https://img.shields.io/badge/platform-Windows-blue?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)

**The modern way to watch Anime & Series in Arabic.**

[AppName] is a high-performance desktop utility designed to eliminate the hassle of finding subtitles. It scans your local folders, calculates video file hashes to find the *exact* matching Arabic subtitle release, and uses FFmpeg to soft-merge them into your files instantly—all wrapped in a stunning, animated interface.

![App Screenshot Placeholder](https://via.placeholder.com/800x450?text=Application+UI+Screenshot)

## ✨ Features

* **📂 Smart Recursive Scanning:** Drag and drop an entire folder. [AppName] detects every video file automatically.
* **⚡ Precision Hash Matching:** Uses 64kb byte-offset hashing (OpenSubtitles standard) to guarantee the subtitle matches your specific video release. **No more out-of-sync audio.**
* **🛠️ Automated Soft-Subbing:** Instantly merges downloaded `.srt` files into the video container (`.mkv`/`.mp4`) as a selectable track.
    * *Zero Re-encoding:* Merging takes seconds.
    * *Zero Quality Loss:* Your video quality remains untouched.
* **🎨 Gamified "Fluid" UI:** Built with **Framer Motion** for silky smooth 60fps animations, interactive cards, and a sleek dark-mode aesthetic.
* **🇸🇦 Native Arabic Support:** UI and logic are optimized for RTL layouts and Arabic text encoding.

## 🛠️ Tech Stack

Built with the **"Modern & Flexible"** stack for maximum performance and design control.

* **Runtime:** [Electron](https://www.electronjs.org/) (Latest)
* **Frontend:** React + TypeScript + Vite
* **Styling:** Tailwind CSS + shadcn/ui
* **Animations:** Framer Motion
* **Backend:** Node.js + `fluent-ffmpeg`
* **Data Source:** OpenSubtitles API

## 🚀 Getting Started

### Prerequisites

* Node.js (v18 or higher)
* FFmpeg (The app checks for a local install or uses the bundled binary)

### Installation

1.  **Clone the repository**
    ```bash
    git clone [https://github.com/](https://github.com/)[Username]/[AppName].git
    cd [AppName]
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

- [ ] **Phase 1:** Core file scanning and hashing logic.
- [ ] **Phase 2:** OpenSubtitles API integration (Hash & Fuzzy search).
- [ ] **Phase 3:** FFmpeg "Soft Mux" pipeline implementation.
- [ ] **Phase 4:** UI Polish (Glassmorphism & Lottie Animations).
- [ ] **Future:** Batch processing for entire seasons.

## 🤝 Contributing

Contributions are welcome! Please check out the [issues](https://github.com/[Username]/[AppName]/issues) tab to see what needs to be done.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.
