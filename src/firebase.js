import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// 1. 실제 프로젝트 설정값 (정확하게 반영됨)
const firebaseConfig = {
  apiKey: "AIzaSyC9iOPeIpzeBP-Y1fP-Tmqvo6ynjcR_nSI",
  authDomain: "daisy-club.firebaseapp.com",
  projectId: "daisy-club",
  storageBucket: "daisy-club.firebasestorage.app",
  messagingSenderId: "1074568055038",
  appId: "1:1074568055038:web:6723e1fd3b9d2cd435bdaf",
  measurementId: "G-TH9WM3YXGJ"
};

// 2. Firebase 초기화
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// 3. [가장 중요] db 내보내기 (이게 있어야 App.jsx 에러가 해결됩니다)
export const db = getFirestore(app);