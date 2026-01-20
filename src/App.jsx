import { useEffect, useState, useCallback, useMemo } from "react";
import { db } from "./firebase"; 
// ★ [수정 1] getDoc 추가됨
import { doc, onSnapshot, setDoc, getDoc } from "firebase/firestore"; 
import LandingPage from "./LandingPage";
import Dashboard from "./Dashboard";
import AdminCMS from "./AdminCMS";
import IndependentAdmin from "./IndependentAdmin"; 

// [Core 1] Broadcast channel for tab communication
const broadcast = new BroadcastChannel('daisy_global_channel');

const ADMIN_ID = "admin";
const REGIONS = ["서울", "경기 북부", "경기 남부", "인천", "충청", "강원", "전라", "경북·대구", "부산·울산·경남", "제주"];
const VIDEO_CATS = ["한국", "일본", "중국", "동남아", "서양"];

// --- [Utility: Load/Save Data] ---
const load = (k, d) => { 
  try { 
    const v = localStorage.getItem(k); 
    if (!v) return d;
    const parsed = JSON.parse(v);
    return parsed === null ? d : parsed;
  } catch { return d; } 
};

const save = (k, v) => { 
  try { 
    if (v === undefined) return;
    localStorage.setItem(k, JSON.stringify(v)); 
  } catch (e) {
    if (e.name === 'QuotaExceededError') alert("Storage quota exceeded! Please reduce image sizes.");
  } 
};

// ★ Translations (100% Original)
const translations = {
  ko: { login: "로그인", signup: "회원가입", id: "아이디", pw: "비밀번호", ref: "추천인 코드", guest: "게스트로 시작", logout: "로그아웃", home: "홈페이지", manager: "매니저", event: "이벤트", video: "동영상", mypage: "마이페이지", welcome: "📢 데이지 클럽에 오신 것을 환영합니다!", desc_suffix: " 화면입니다.", prepare: "컨텐츠 준비 중입니다.", close: "닫기" },
  en: { login: "LOGIN", signup: "SIGN UP", id: "ID", pw: "PASSWORD", ref: "REFERRAL CODE", guest: "START AS GUEST", logout: "LOGOUT", home: "HOME", manager: "MODELS", event: "GAMES", video: "GALLERY", mypage: "MY PAGE", welcome: "📢 Welcome to DAISY CLUB!", desc_suffix: " Page Content.", prepare: "Coming Soon.", close: "CLOSE" }
};

export default function App() {
  // --- [State Management: 100% Original Recovery] ---
  const [lang, setLang] = useState(() => load("lang", "ko"));
  const [loggedIn, setLoggedIn] = useState(() => load("loggedIn", false));
  const [isAdmin, setIsAdmin] = useState(() => load("isAdmin", false));
  const [isGuest, setIsGuest] = useState(() => load("isGuest", false));
  const [users, setUsers] = useState(() => load("users", []));
  const [currentUser, setCurrentUser] = useState(() => load("currentUser", null));
  
  const [appAvatarImage, setAppAvatarImage] = useState(null);
  const [appAvatarIdx, setAppAvatarIdx] = useState(0);
  const [isIndependentAdmin, setIsIndependentAdmin] = useState(false); 
  
  // Password Management (For server sync)
  const [adminPw, setAdminPw] = useState(() => load("adminPw", "123456"));
  const [gamePw, setGamePw] = useState(() => load("gamePw", "1234")); 

  const [telegramLink, setTelegramLink] = useState(() => load("telegramLink", "https://t.me/DAISY_CORE_OFFICIAL"));
  const [showPopup, setShowPopup] = useState(true);
  const [showPopupAdmin, setShowPopupAdmin] = useState(false); 
  const [members, setMembers] = useState(() => load("members", []));
  const [slideImages, setSlideImages] = useState(() => load("slideImages", []));
  const [hero, setHero] = useState(() => load("hero", { mode: "image", imageSrc: null, title: { ko: "DAISY CORE", en: "DAISY CORE" }, desc: { ko: "선택된 사람들을 위한 프라이빗 커넥션", en: "Private connections for the chosen few" } }));
  const [videoURL, setVideoURL] = useState(() => load("videoURL", null));
  const [videos, setVideos] = useState(() => load("videos", []));
  const [logo, setLogo] = useState(() => load("logo", null));
  const [logoSize, setLogoSize] = useState(() => load("logoSize", 140));
  const [logoPos, setLogoPos] = useState(() => load("logoPos", { x: 0, y: 0 }));
  const [innerLogo, setInnerLogo] = useState(() => load("innerLogo", null));

  const [adminPreviewMode, setAdminPreviewMode] = useState("dashboard");
  const t = useMemo(() => translations[lang] || translations.ko, [lang]);

  // ★ Firebase Realtime Listener
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "global"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.hero) setHero(data.hero);
        if (data.videoURL !== undefined) setVideoURL(data.videoURL);
        if (data.logo !== undefined) setLogo(data.logo);
        if (data.logoSize) setLogoSize(data.logoSize);
        if (data.logoPos) setLogoPos(data.logoPos);
        if (data.members) setMembers(data.members);
        if (data.slideImages) setSlideImages(data.slideImages);
        if (data.videos) setVideos(data.videos);
        if (data.innerLogo !== undefined) setInnerLogo(data.innerLogo);
        
        // ★ [수정 2] useAdminLogic에서 저장한 adminPassword 필드명과 매칭
        if (data.adminPassword) setAdminPw(data.adminPassword);
        else if (data.adminPw) setAdminPw(data.adminPw); // 구버전 호환

        if (data.gamePw) setGamePw(data.gamePw);
        if (data.telegramLink) setTelegramLink(data.telegramLink);
        if (data.users) setUsers(data.users);
      }
    });
    return () => unsub();
  }, []);

  // ★ Sync Function
  const syncToFirebase = async (updates) => {
    try {
      const finalData = {
        hero, videoURL, logo, logoSize, logoPos,
        members, slideImages, videos, innerLogo,
        adminPw, gamePw, telegramLink, users,
        ...updates 
      };
      await setDoc(doc(db, "settings", "global"), finalData);
      console.log("▶ Server Sync Complete");
      return true;
    } catch (e) {
      console.error("▶ Sync Failed:", e);
      return false;
    }
  };

  const saveToFirebase = async () => {
    return await syncToFirebase({});
  };

  const syncUpdate = useCallback((targetId, newPoint, newRefCode, newReferral) => {
    setUsers(prev => prev.map(u => u.id === targetId ? { ...u, diamond: newPoint, refCode: newRefCode, referral: newReferral } : u));
    setCurrentUser(prev => (prev?.id === targetId ? { ...prev, diamond: newPoint, refCode: newRefCode, referral: newReferral } : prev));
  }, []);

  // External Broadcast/Listener
  useEffect(() => {
    broadcast.onmessage = (event) => {
      const { type, userId, point, refCode, referral } = event.data || {};
      if ((type === 'USER_UPDATE' || type === 'POINT_UPDATE') && userId) {
        syncUpdate(userId, point, refCode, referral);
      }
    };
    const handleLocalUpdate = (e) => {
      const { userId, point, refCode, referral } = e.detail || {};
      if (userId) syncUpdate(userId, point, refCode, referral);
    };
    window.addEventListener("user_point_update", handleLocalUpdate);
    return () => window.removeEventListener("user_point_update", handleLocalUpdate);
  }, [syncUpdate]);

  // Local Storage Auto-Save
  useEffect(() => {
    save("lang", lang); save("loggedIn", loggedIn); save("isAdmin", isAdmin);
    save("isGuest", isGuest); save("users", users); save("currentUser", currentUser);
    save("members", members); save("hero", hero); save("logo", logo); 
    save("logoSize", logoSize); save("logoPos", logoPos); save("slideImages", slideImages); 
    save("videoURL", videoURL); save("videos", videos); save("innerLogo", innerLogo); 
    save("adminPw", adminPw); save("gamePw", gamePw); save("telegramLink", telegramLink);
  }, [lang, loggedIn, isAdmin, isGuest, users, currentUser, hero, logo, logoSize, logoPos, members, slideImages, videoURL, videos, innerLogo, adminPw, gamePw, telegramLink]);

  // ★ [수정 3] 로그인 버튼 클릭 시 서버 데이터 직접 확인 (비동기 함수로 변경)
  // ★ [수정] 로그인 액션: 하드코딩된 '123456' 삭제 버전
  const handleLoginAction = async (id, pw) => {
    let serverAdminPw = adminPw; 
    let serverGamePw = gamePw;

    try {
      const snap = await getDoc(doc(db, "settings", "global"));
      if (snap.exists()) {
        const data = snap.data();
        if (data.adminPw) serverAdminPw = data.adminPw;
        if (data.gamePw) serverGamePw = data.gamePw;

        setAdminPw(serverAdminPw);
        setGamePw(serverGamePw);
      }
    } catch (e) {
      console.error("서버 비밀번호 확인 실패");
    }

    // [A] 게임 관리자 (ID: game)
    if (id === "game") {
      if (pw === serverGamePw) {
        setIsIndependentAdmin(true); 
        setLoggedIn(true); 
        return;
      } else {
        return alert("게임 관리자 비밀번호가 틀립니다.");
      }
    }
    
    // [B] 디자인 관리자 (ID: admin) 
    // ★ pw === "123456" 조건을 삭제했습니다. 이제 서버의 serverAdminPw로만 체크합니다.
    if (id === "admin") {
      if (pw === serverAdminPw) { 
        setIsAdmin(true); 
        setLoggedIn(true); 
        setCurrentUser({ id: "admin", no: "000001", diamond: 999999, rewards: 0, refCode: "MASTER" }); 
        setAdminPreviewMode("dashboard"); 
        return;
      } else {
        return alert("디자인 관리자 비밀번호가 틀립니다.");
      }
    }
    
    // [C] 일반 유저
    const u = users.find((u) => u.id === id && u.pw === pw);
    if (!u) return alert(lang === "ko" ? "로그인 정보가 틀립니다." : "Login Failed");
    setCurrentUser({ ...u }); setLoggedIn(true); setIsGuest(false);
  };

  const handleLogout = () => {
    setLoggedIn(false); setIsAdmin(false); setIsGuest(false); setIsIndependentAdmin(false);
    setCurrentUser(null);
  };

  const refreshAvatar = (newImg, newIdx) => {
    setAppAvatarImage(newImg); setAppAvatarIdx(newIdx);
  };

  if (isIndependentAdmin) {
    return <IndependentAdmin users={users} setUsers={setUsers} onExit={handleLogout} />;
  }

  const actualLoggedIn = loggedIn && currentUser;
  const showLanding = !actualLoggedIn || (isAdmin && adminPreviewMode === "landing");

  return (
    <div style={{ ...styles.app, height: '100vh', overflow: 'hidden' }}>
      
      {showPopup && !isAdmin && actualLoggedIn && !showLanding && (
        <div style={styles.popupOverlay}>
          <div style={styles.popupContent}>
            <h2 style={{ color: '#ffb347', marginBottom: '15px' }}>NOTICE</h2>
            <p style={{ color: '#fff', fontSize: '0.9rem', marginBottom: '25px' }}>최상의 서비스를 제공하겠습니다.</p>
            <button onClick={() => setShowPopup(false)} style={styles.popupBtn}>{t.close}</button>
          </div>
        </div>
      )}

      {showLanding ? (
        <div style={{ height: '100%', overflowY: 'auto' }}>
          <LandingPage 
            t={t} lang={lang} users={users} setUsers={setUsers} hero={hero} videoURL={videoURL}
            logo={logo} logoSize={logoSize} logoPos={logoPos} styles={styles} isAdmin={isAdmin}
            setLang={setLang} onLogin={handleLoginAction}
            onGuestLogin={() => { 
              const guestUser = {id:"GUEST", no:"G-1", diamond:0, rewards:0, refCode: ""};
              setCurrentUser(guestUser);
              setLoggedIn(true); setIsAdmin(false); setIsGuest(true); 
            }}
            syncToFirebase={syncToFirebase} 
          />
        </div>
      ) : (
        <Dashboard 
          user={currentUser} 
          onUpdatePoint={(newVal) => syncUpdate(currentUser.id, newVal, currentUser.refCode, currentUser.referral)}
          appAvatarImage={appAvatarImage} appAvatarIdx={appAvatarIdx} onAvatarChange={refreshAvatar}
          t={t} lang={lang} isGuest={isGuest} members={members} regions={REGIONS} slideImages={slideImages}
          videos={videos} videoCategories={VIDEO_CATS} innerLogo={innerLogo} telegramLink={telegramLink}
          onLogout={handleLogout} dashStyles={dashStyles} 
        />
      )}

      {isAdmin && (
        <AdminCMS 
          adminPreviewMode={adminPreviewMode} setAdminPreviewMode={setAdminPreviewMode}
          hero={hero} setHero={setHero} setVideoURL={setVideoURL} videoURL={videoURL}
          logo={logo} setLogo={setLogo} logoSize={logoSize} setLogoSize={setLogoSize} 
          logoPos={logoPos} setLogoPos={setLogoPos} members={members} setMembers={setMembers} 
          regions={REGIONS} slideImages={slideImages} setSlideImages={setSlideImages}
          videos={videos} setVideos={setVideos} videoCategories={VIDEO_CATS} 
          innerLogo={innerLogo} setInnerLogo={setInnerLogo} onExit={handleLogout} styles={styles}
          adminPw={adminPw} setAdminPw={setAdminPw} telegramLink={telegramLink} setTelegramLink={setTelegramLink}
          openIndependent={() => setIsIndependentAdmin(true)} 
          saveToFirebase={saveToFirebase}
          syncToFirebase={syncToFirebase} 
        />
      )}

      {!isAdmin && showLanding && (
        <header style={{position:'fixed', top:20, right:20, zIndex:10002}}>
          <button style={styles.langBtn} onClick={() => setLang(lang === "ko" ? "en" : "ko")}>
            {lang === "ko" ? "ENGLISH" : "한국어"}
          </button>
        </header>
      )}
    </div>
  );
}

const styles = {
  app: { width: "100%", background: "#000", fontFamily: "'Inter', sans-serif", color: '#fff', position: 'relative' },
  bgWrap: { position: "fixed", inset: 0, zIndex: 0 },
  bgOverlay: { position: 'absolute', inset: 0, background: 'radial-gradient(circle, transparent 20%, rgba(0,0,0,0.6) 100%)', zIndex: 1 },
  bgImage: { width: "100%", height: "100%", backgroundSize: "cover", backgroundPosition: "center" },
  bgVideo: { width: "100%", height: "100%", objectFit: "cover" },
  logoContainer: { position: "absolute", zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', pointerEvents: 'none' },
  defaultLogo: { fontSize: 32, letterSpacing: 4, fontWeight: 900, color: '#fff', textShadow: '0 0 20px rgba(255,179,71,0.5)' },
  landingWrapper: { minHeight: '100vh', position: 'relative', zIndex: 1 },
  mainContent: { position: 'relative', zIndex: 5, paddingTop: '15vh' },
  heroSection: { textAlign: "center", marginBottom: 40 },
  mainTitle: { fontSize: '4rem', fontWeight: 900, letterSpacing: -2, margin: 0, color: '#fff' },
  subTitle: { fontSize: '1.2rem', opacity: 0.7, color: '#fff', fontWeight: 300, marginTop: 10 },
  authWrap: { display: "flex", justifyContent: "center", padding: '0 20px' },
  authCard: { width: '100%', maxWidth: 380, padding: 40, borderRadius: 30, background: "rgba(255,255,255,0.05)", backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' },
  authTitle: { textAlign: 'center', marginBottom: 25, fontSize: 24, fontWeight: 700 },
  authInput: { width: "100%", padding: '15px 20px', marginBottom: 15, borderRadius: 15, background: "rgba(255,255,255,0.1)", border: '1px solid rgba(255,255,255,0.1)', color: "#fff", fontSize: 16, boxSizing: 'border-box' },
  primaryBtn: { width: "100%", padding: 15, borderRadius: 15, fontWeight: 700, background: '#fff', color: '#000', border: 'none', cursor: 'pointer', fontSize: 16 },
  guestBtn: { width: "100%", padding: 15, marginTop: 10, borderRadius: 15, background: "transparent", color: "#fff", border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 14 },
  authToggle: { marginTop: 20, textAlign: "center", fontSize: 13, opacity: 0.6, cursor: 'pointer', textDecoration: 'underline' },
  langBtn: { padding: "8px 16px", borderRadius: 20, background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer', fontWeight: 600, backdropFilter: 'blur(5px)' },
  popupOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 10001, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(5px)' },
  popupContent: { width: '90%', maxWidth: '350px', backgroundColor: '#111', border: '2px solid #ffb347', borderRadius: '25px', padding: '30px', textAlign: 'center', boxShadow: '0 0 30px rgba(255,179,71,0.4)' },
  popupBtn: { width: '100%', padding: '12px', background: '#ffb347', border: 'none', borderRadius: '12px', fontWeight: 'bold', color: '#000', cursor: 'pointer' }
};

const dashStyles = {
  container: { 
    position: 'relative', zIndex: 10, width: '100%', maxWidth: 500, margin: '0 auto', background: '#000', 
    height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' 
  },
  contentArea: { 
    flex: 1, overflowY: 'auto', paddingBottom: 20, WebkitOverflowScrolling: 'touch' 
  },
  bottomNav: { 
    position: 'relative', width: '100%', maxWidth: 500, height: 80, background: 'rgba(20,20,20,0.95)', 
    display: 'flex', justifyContent: 'space-around', alignItems: 'center', borderTop: '1px solid #222', 
    backdropFilter: 'blur(10px)', flexShrink: 0
  },
  navItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s' },
  logoutBtn: { padding: '12px 30px', borderRadius: 15, background: 'rgba(255,45,85,0.1)', color: '#ff2d55', border: '1px solid #ff2d55', fontWeight: 700, cursor: 'pointer' }
};