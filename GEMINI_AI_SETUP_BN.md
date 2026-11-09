# Kolkata Tourist AI সেটআপ (বাংলা)

1. Google AI Studio থেকে Gemini API Key তৈরি করুন।
2. প্রজেক্টের মূল ফোল্ডারে `.env.example` কপি করে `.env` নামে ফাইল তৈরি করুন।
3. `.env` ফাইলে `GEMINI_API_KEY=আপনার_আসল_API_KEY` বসান। `GEMINI_MODEL=gemini-2.5-flash` রাখা যাবে।
4. টার্মিনালে `npm install` চালিয়ে তারপর `npm start` দিন।
5. `http://localhost:3000` থেকে ওয়েবসাইট খুলে কোনো Place পেজের নিচের Kolkata Tourist AI বক্সে প্রশ্ন করুন।

**নিরাপত্তা:** `.env` ফাইল GitHub-এ আপলোড করবেন না। API Key কখনো HTML/JavaScript ফ্রন্টএন্ডে বসাবেন না। `.gitignore`-এ `.env` যোগ করা আছে।

**Hosting:** AI chat-এর জন্য Node.js server চালু থাকা দরকার। শুধু GitHub Pages/static hosting-এ `/api/ai/chat` কাজ করবে না; Node server বা সমমানের secure backend deploy করতে হবে।
