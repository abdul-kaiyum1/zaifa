module.exports = {
  "config": {
    "name": "tiktok",
    "aliases": [
      "tik"
    ],
    "version": "1.8",
    "author": "NTKhang",
    "countDown": 25,
    "role": 0,
    "shortDescription": "Tiktok",
    "longDescription": {
      "vi": "Tải video/slide (image), audio từ link tiktok",
      "en": "Download video/slide (image), audio from tiktok link"
    },
    "category": "media",
    "guide": {
      "vi": "   {pn} [video|-v|v] <url>: dùng để tải video/slide (image) từ link tiktok.\n   {pn} [audio|-a|a] <url>: dùng để tải audio từ link tiktok",
      "en": "   {pn} [video|-v|v] <url>: use to download video/slide (image) from tiktok link.\n   {pn} [audio|-a|a] <url>: use to download audio from tiktok link"
    }
  },
  "langs": {
    "vi": {
      "invalidUrl": "⚠ Vui lòng nhập url tiktok hợp lệ",
      "downloadingVideo": "📥 Đang tải video: %1...",
      "downloadedSlide": "✅ Đã tải slide: %1\n%2",
      "downloadedVideo": "✅ Đã tải video: %1\n🔗 Url Download: %2",
      "downloadingAudio": "📥 Đang tải audio: %1...",
      "downloadedAudio": "✅ Đã tải audio: %1",
      "errorOccurred": "❌ Đã xảy ra lỗi:\n\n%1",
      "tryAgain": "❌ Đã xảy ra lỗi, vui lòng thử lại sau"
    },
    "en": {
      "invalidUrl": "⚠ Please enter a valid tiktok url",
      "downloadingVideo": "📥 Downloading video: %1...",
      "downloadedSlide": "✅ Downloaded slide: %1\n%2",
      "downloadedVideo": "✅ Downloaded video: %1\n🔗 Download Url: %2",
      "downloadingAudio": "📥 Downloading audio: %1...",
      "downloadedAudio": "✅ Downloaded audio: %1",
      "errorOccurred": "❌ An error occurred:\n\n%1",
      "tryAgain": "❌ An error occurred, please try again later"
    }
  },
  "location": "/home/abdulkaiyum/octa/scripts/cmds/tiktok.js"
};