KOLKATA TOURIST GUIDE — REAL-TIME CHAT SETUP

১) Profile & Settings থেকে একবার নিজের নাম এবং ছবি সেভ করুন।
২) Booking / Group Chat খুললে আর আলাদা করে নাম দিতে হবে না। Profile-এর নাম ও ছবি ব্যবহার হবে।
৩) রিয়েল-টাইম চ্যাটের জন্য Socket.IO-সহ server.js চালু থাকতে হবে।

গুরুত্বপূর্ণ: GitHub Pages শুধু static HTML/CSS/JS host করে; server.js সেখানে চালানো যায় না।
তাই GitHub Pages-এ frontend রাখলে server.js-কে Render/Railway/VPS-এর মতো Node.js hosting-এ deploy করুন।
তারপর chat-config.js ফাইলে নিচের লাইনটিতে আপনার backend-এর HTTPS URL বসান:

window.KTG_CHAT_SERVER_URL = "https://YOUR-BACKEND-DOMAIN";

একই domain-এ Node/Express server থেকে পুরো website চালালে chat-config.js-এর URL খালি রাখুন।

চ্যাটের মেসেজ, Online members এবং Live Location Socket.IO connection দিয়ে তাৎক্ষণিকভাবে আপডেট হয়।
Location sharing browser permission-এর ওপর নির্ভর করে; HTTPS বা localhost প্রয়োজন।
