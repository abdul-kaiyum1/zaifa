module.exports = {
  "config": {
    "name": "ytb",
    "version": "1.14",
    "author": "NTKhang",
    "countDown": 5,
    "role": 0,
    "shortDescription": "YouTube",
    "longDescription": {
      "vi": "Tải video, audio hoặc xem thông tin video trên YouTube",
      "en": "Download video, audio or view video information on YouTube"
    },
    "category": "search",
    "guide": {
      "vi": "   {pn} [video|-v] [<tên video>|<link video>]: dùng để tải video từ youtube.\n   {pn} [audio|-a] [<tên video>|<link video>]: dùng để tải audio từ youtube\n   {pn} [info|-i] [<tên video>|<link video>]: dùng để xem thông tin video từ youtube\n   Ví dụ:\n    {pn} -v Fallen Kingdom\n    {pn} -a Fallen Kingdom\n    {pn} -i Fallen Kingdom",
      "en": "   {pn} [video|-v] [<video name>|<video link>]: use to download video from youtube.\n   {pn} [audio|-a] [<video name>|<video link>]: use to download audio from youtube\n   {pn} [info|-i] [<video name>|<video link>]: use to view video information from youtube\n   Example:\n    {pn} -v Fallen Kingdom\n    {pn} -a Fallen Kingdom\n    {pn} -i Fallen Kingdom"
    }
  },
  "langs": {
    "vi": {
      "error": "❌ Đã xảy ra lỗi: %1",
      "noResult": "⭕ Không có kết quả tìm kiếm nào phù hợp với từ khóa %1",
      "choose": "%1Reply tin nhắn với số để chọn hoặc nội dung bất kì để gỡ",
      "video": "video",
      "audio": "âm thanh",
      "downloading": "⬇ Đang tải xuống %1 \"%2\"",
      "downloading2": "⬇ Đang tải xuống %1 \"%2\"\n🔃 Tốc độ: %3MB/s\n⏸ Đã tải: %4/%5MB (%6%)\n⏳ Ước tính thời gian còn lại: %7 giây",
      "noVideo": "⭕ Rất tiếc, không tìm thấy video nào có dung lượng nhỏ hơn 83MB",
      "noAudio": "⭕ Rất tiếc, không tìm thấy audio nào có dung lượng nhỏ hơn 26MB",
      "info": "💠 Tiêu đề: %1\n🏪 Channel: %2\n👨‍👩‍👧‍👦 Subscriber: %3\n⏱ Thời gian video: %4\n👀 Lượt xem: %5\n👍 Lượt thích: %6\n🆙 Ngày tải lên: %7\n🔠 ID: %8\n🔗 Link: %9",
      "listChapter": "\n📖 Danh sách phân đoạn: %1\n"
    },
    "en": {
      "error": "❌ An error occurred: %1",
      "noResult": "⭕ No search results match the keyword %1",
      "choose": "%1Reply to the message with a number to choose or any content to cancel",
      "video": "video",
      "audio": "audio",
      "downloading": "⬇ Downloading %1 \"%2\"",
      "downloading2": "⬇ Downloading %1 \"%2\"\n🔃 Speed: %3MB/s\n⏸ Downloaded: %4/%5MB (%6%)\n⏳ Estimated time remaining: %7 seconds",
      "noVideo": "⭕ Sorry, no video was found with a size less than 83MB",
      "noAudio": "⭕ Sorry, no audio was found with a size less than 26MB",
      "info": "💠 Title: %1\n🏪 Channel: %2\n👨‍👩‍👧‍👦 Subscriber: %3\n⏱ Video duration: %4\n👀 View count: %5\n👍 Like count: %6\n🆙 Upload date: %7\n🔠 ID: %8\n🔗 Link: %9",
      "listChapter": "\n📖 List chapter: %1\n"
    }
  },
  "location": "/home/abdulkaiyum/octa/scripts/cmds/ytb.js"
};