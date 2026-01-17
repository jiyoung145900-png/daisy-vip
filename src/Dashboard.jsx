import React, { useState, useEffect, useCallback } from "react";
import HomeSection from "./HomeSection";
import ManagerSection from "./ManagerSection";
import VideoSection from "./VideoSection";
import EventSection from "./EventSection";
import MyPageSection from "./MyPage"; 
// ★ Firebase 연동을 위한 import 추가
import { doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

export default function Dashboard({ 
  user, 
  onUpdatePoint, 
  appAvatarImage, 
  appAvatarIdx, 
  onAvatarChange,
  t, 
  onLogout, 
  lang, 
  dashStyles, 
  isGuest, 
  members = [], 
  regions = [], 
  slideImages = [],
  videos = [], 
  videoCategories = [], 
  innerLogo, 
  telegramLink = "https://t.me/your_address" 
}) {
  const [activeTab, setActiveTab] = useState('home');
  const [selectedM, setSelectedM] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("한국");
  const [selectedRegion, setSelectedRegion] = useState("전체");
  const [isEventLoading, setIsEventLoading] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // ★ 중요: props로 받은 user 대신 상위에서 관리되는 실시간 데이터를 참조해야 함
  // userPoint가 바뀌면 EventSection에도 실시간으로 전달되도록 수정
  const safeUser = user || { id: "MEMBER", no: "2282290", diamond: 0, rewards: 0 };

  // ★ [추가] 데일리 보너스 서버 저장 함수
  // 이 함수를 HomeSection 등에 props로 내려주어 버튼 클릭 시 실행하게 합니다.
  const handleClaimBonus = async () => {
    if (isGuest) return alert("회원만 이용 가능합니다.");
    
    const bonusAmount = 100000;
    const nextPoint = (Number(user?.diamond) || 0) + bonusAmount;

    // 1. 즉시 UI 업데이트 (상위 App.jsx의 포인트 변경)
    onUpdatePoint(nextPoint);

    // 2. Firebase 서버에 영구 저장
    if (user?.id) {
      try {
        const userRef = doc(db, "users", user.id);
        await updateDoc(userRef, {
          diamond: nextPoint,
          lastBonusDate: new Date().toISOString()
        });
        alert("데일리 보너스 10만 다이아가 서버에 저장되었습니다!");
      } catch (e) {
        console.error("보너스 서버 저장 실패:", e);
        alert("서버 저장에 실패했습니다. 인터넷 연결을 확인하세요.");
      }
    }
  };

  // 비디오 및 멤버 필터 로직 (기존 유지)
  const filteredVideos = videos.filter(v => {
    if (selectedCategory === "ALL" || !selectedCategory) return true;
    return v.category === selectedCategory;
  });

  const filteredMembers = members.filter(m => {
    if (!selectedRegion || selectedRegion === "전체" || selectedRegion === "ALL") return true;
    return m.region === selectedRegion;
  });

  // 실시간 접속자 카운트 (기존 유지)
  const [matchingCount, setMatchingCount] = useState(() => {
    const saved = localStorage.getItem('live_count');
    const initial = saved ? parseInt(saved) : 142;
    return (initial >= 123 && initial <= 179) ? initial : 145;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setMatchingCount(prev => {
        const rand = Math.random();
        let change = rand < 0.45 ? 1 : rand < 0.90 ? -1 : rand < 0.95 ? 2 : -2;
        let nextCount = prev + change;
        if (nextCount <= 123) nextCount = 125;
        if (nextCount >= 179) nextCount = 177;
        localStorage.setItem('live_count', nextCount); 
        return nextCount;
      });
    }, 5000); 
    return () => clearInterval(timer);
  }, []);

  const handlePopState = useCallback(() => {
    if (document.getElementById('full-screen-view')) return; 
    if (selectedM || document.getElementById('manager-detail-view')) return;
    if (activeTab !== 'home') { setActiveTab('home'); } 
    else { setShowLogoutConfirm(true); }
    window.history.pushState(null, '');
  }, [selectedM, activeTab]);

  useEffect(() => {
    window.history.pushState(null, '');
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [handlePopState]);

  const handleTabClick = (key) => {
    if (isGuest && (key === 'event' || key === 'mypage')) {
      alert(lang === "ko" ? "승인된 회원 전용 구역입니다." : "Authorized Members Only.");
      return;
    }
    if (key === 'event') {
      setIsEventLoading(true);
      setActiveTab(key);
      setTimeout(() => setIsEventLoading(false), 800);
    } else { setActiveTab(key); }
  };

  const openDetail = (m) => {
    setSelectedM(m);
    setActiveTab('manager');
    window.history.pushState({ isDetail: true }, ''); 
  };

  const handleTelegram = () => {
    if (telegramLink) window.open(telegramLink, "_blank");
    else alert(lang === "ko" ? "상담 링크가 설정되지 않았습니다." : "Link not set.");
  };

  useEffect(() => { window.scrollTo(0, 0); }, [activeTab]);

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <HomeSection 
            t={t} innerLogo={innerLogo} slideImages={slideImages} members={members} 
            setActiveTab={setActiveTab} openDetail={openDetail} 
            handleTelegram={handleTelegram} matchingCount={matchingCount}
            onClaimBonus={handleClaimBonus} // ★ 보너스 함수 전달
          />
        );
      case 'manager':
        return (
          <ManagerSection 
            t={t} regions={regions} selectedRegion={selectedRegion} setSelectedRegion={setSelectedRegion} 
            filteredMembers={filteredMembers} initialMember={selectedM} 
            onCloseDetail={() => setSelectedM(null)}
          />
        );
      case 'event':
        return isEventLoading ? (
          <div style={s.loadingContainer}>
            <div className="loading-spinner"></div>
            <div style={s.loadingText}>{lang === "ko" ? "프라이빗 혜택 로딩 중..." : "Loading Private Benefits..."}</div>
          </div>
        ) : (
          <EventSection 
            t={t} 
            user={user} // ★ safeUser 대신 상위 props user를 직접 전달 (실시간 반영)
            userPoint={user?.diamond || 0} // ★ 실시간 포인트 직접 전달
            onUpdatePoint={onUpdatePoint}
            onBack={() => setActiveTab('home')} confirmedImage={appAvatarImage} confirmedAvatarIdx={appAvatarIdx}
          />
        );
      case 'video':
        return (
          <VideoSection 
            t={t} videoCategories={videoCategories} selectedCategory={selectedCategory} 
            setSelectedCategory={setSelectedCategory} filteredVideos={filteredVideos} 
          />
        );
      case 'mypage':
        return (
          <MyPageSection 
            t={t} user={user} onBack={() => setActiveTab('home')} onLogout={() => setShowLogoutConfirm(true)} 
            confirmedImage={appAvatarImage} confirmedAvatarIdx={appAvatarIdx} onAvatarChange={onAvatarChange} s={s} 
          />
        );
      default: return null;
    }
  };

  return (
    <div style={{ ...dashStyles.container, background: '#080808', zIndex: 10, position: 'relative' }}>
      <div style={{...dashStyles.contentArea, background: 'transparent'}}>
        {activeTab !== 'home' && activeTab !== 'event' && activeTab !== 'mypage' && (
          <div style={s.topStatus}>
            <div style={s.statusInner}>
              <span className="dot-active" />
              <span style={s.statusText}>LIVE CONNECTED : </span>
              <b style={s.statusCount}>{matchingCount} MEMBERS</b>
            </div>
          </div>
        )}
        {renderContent()}
      </div>

      {showLogoutConfirm && (
        <div style={s.modalOverlay} onClick={() => setShowLogoutConfirm(false)}>
          <div style={{...s.modalContent, textAlign: 'center'}} onClick={e => e.stopPropagation()}>
            <h3 style={s.modalName}>{t.logout}</h3>
            <p style={{color: '#8E8E93', fontSize: 14, marginBottom: 20}}>
              {lang === "ko" ? "정말 로그아웃 하시겠습니까?" : "Are you sure you want to log out?"}
            </p>
            <div style={s.modalBtnGroup}>
              <button onClick={onLogout} style={s.mMatchBtn}>{t.logout}</button>
              <button onClick={() => setShowLogoutConfirm(false)} style={s.mCloseBtn}>
                {lang === "ko" ? "취소" : "CANCEL"}
              </button>
            </div>
          </div>
        </div>
      )}

      <nav style={{ ...dashStyles.bottomNav, backgroundColor: '#0F0F0F', borderTop: '1px solid #222', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {[
          { key: 'home', label: t.home, icon: '🏠' },
          { key: 'manager', label: t.manager, icon: '💎' },
          { key: 'event', label: t.event, icon: '🎁' },
          { key: 'video', label: t.video, icon: '🎬' },
          { key: 'mypage', label: t.mypage, icon: '👤' }
        ].map((item) => (
          <div key={item.key} onClick={() => handleTabClick(item.key)}
            style={{ ...dashStyles.navItem, color: activeTab === item.key ? '#D4AF37' : '#555' }}>
            <span style={{ fontSize: 22, filter: activeTab === item.key ? 'none' : 'grayscale(100%) opacity(0.4)', marginBottom: 4 }}>{item.icon}</span>
            <span style={{ fontSize: 10, fontWeight: 800 }}>{item.label}</span>
          </div>
        ))}
      </nav>

      <style>{`
        @keyframes pulse { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.4); opacity: 0.5; } 100% { transform: scale(1); opacity: 1; } }
        .dot-active { width: 8px; height: 8px; background: #34C759; border-radius: 50%; box-shadow: 0 0 8px #34C759; animation: pulse 1.5s infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .loading-spinner { width: 35px; height: 35px; border: 3px solid #222; border-top: 3px solid #D4AF37; border-radius: 50%; animation: spin 0.8s linear infinite; margin-bottom: 15px; }
      `}</style>
    </div>
  );
}

const s = {
  topStatus: { background: '#121212', padding: '12px 0', borderBottom: '1px solid #222' },
  statusInner: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 },
  statusText: { color: '#666', fontSize: 11, fontWeight: 600 },
  statusCount: { color: '#D4AF37', fontSize: 11, fontWeight: 800 },
  loadingContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 0' },
  loadingText: { fontSize: 13, color: '#D4AF37', fontWeight: 700 },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' },
  modalContent: { background: '#1A1A1A', width: '88%', maxWidth: '380px', padding: '24px', borderRadius: '28px', border: '1px solid #333' },
  modalName: { color: '#FFF', fontSize: 22, fontWeight: 800, margin: '0 0 6px 0' },
  modalBtnGroup: { display: 'flex', flexDirection: 'column', gap: 10 },
  mMatchBtn: { width: '100%', padding: '16px', background: '#D4AF37', color: '#000', border: 'none', borderRadius: '16px', fontWeight: 800, fontSize: '15px' },
  mCloseBtn: { width: '100%', padding: '14px', background: '#222', color: '#888', border: 'none', borderRadius: '16px', fontWeight: 700, fontSize: '14px' },
};