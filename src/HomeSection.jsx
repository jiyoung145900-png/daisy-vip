import React, { useState, useEffect, useMemo, useRef } from "react";

const LEFT_TAGS = ["DAISY VIP", "PURE LUXURY", "SWEET BLOOM", "GOLDEN CLASS", "ELITE SELECT"];

export default function HomeSection({
  members = [],
  slideImages = [],
  innerLogo,
  handleTelegram,
  setActiveTab,
  openDetail,
  matchingCount = 0,
  t, // ★ Dashboard에서 전달받은 번역 객체
}) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollRef = useRef(null);

  /* [기존 유지] 상단 배너 자동 슬라이드 */
  useEffect(() => {
    if (!slideImages || slideImages.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((p) => (p + 1) % slideImages.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [slideImages]);

  /* [기존 유지] 무한 스크롤용 멤버 데이터 생성 */
  const loopMembers = useMemo(() => {
    if (!members || members.length === 0) return [];
    return [...members, ...members, ...members];
  }, [members]);

  /* [기존 유지] PC 화살표 버튼 클릭 시 스크롤 이동 */
  const scrollByButton = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 300; 
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  /* [기존 유지] PC 마우스 드래그 핸들러 */
  const handleMouseDown = (e) => {
    const slider = scrollRef.current;
    if (!slider) return;
    let isDown = true;
    let startX = e.pageX - slider.offsetLeft;
    let scrollLeft = slider.scrollLeft;

    const handleMouseMove = (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - slider.offsetLeft;
      const walk = (x - startX) * 2;
      slider.scrollLeft = scrollLeft - walk;
    };

    const handleMouseUp = () => {
      isDown = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div style={h.container}>
      {/* ===== BACKGROUND ===== */}
      <div className="bg-glow" />
      <div className="bg-pattern" />

      {/* ===== HEADER ===== */}
      <header style={h.header}>
        <div style={h.logoArea}>
          {innerLogo ? (
            <img src={innerLogo} style={h.logoImg} alt="logo" />
          ) : (
            <h1 style={h.defaultLogo}>
              DAISY<br />
              <span>LOUNGE</span>
            </h1>
          )}
        </div>
        <div style={h.statusBadge}>
          <div className="dot-pulse-wrap">
            <span className="dot-pulse" />
          </div>
          <span style={{ opacity: 0.8 }}>LIVE CONNECTED :</span>
          <b style={h.countText}>{matchingCount} MEMBERS</b>
        </div>
      </header>

      {/* ===== INTRO TEXT (번역 적용) ===== */}
      <div style={h.introTextArea}>
        <div style={h.introSub}>WELCOME TO THE PRIVATE</div>
        <div style={h.introMain}>
          {/* ★ 한글: 데이지에 오신 것을 환영합니다 / 영어: Welcome to DAISY CLUB! */}
          {t.welcome.replace("📢 ", "")} 
          <span style={h.introSparkle}>✦</span>
        </div>
      </div>

      {/* ===== MAIN SLIDER ===== */}
      {slideImages && slideImages.length > 0 && (
        <div style={h.sliderContainer}>
          <div style={h.sliderWrap}>
            {slideImages.map((img, idx) => {
              const imgUrl = img.url || img;
              const active = idx === currentSlide;
              return (
                <div
                  key={idx}
                  style={{
                    ...h.slide,
                    opacity: active ? 1 : 0,
                    visibility: active ? "visible" : "hidden",
                  }}
                >
                  <div style={h.imageBorderWrapper}>
                    <img src={imgUrl} style={h.actualImg} alt="slide" draggable="false" />
                    <div style={h.slideOverlay} />
                    <div style={h.adTag}>PREMIUM PICK</div>
                  </div>
                </div>
              );
            })}
            <div style={h.indicatorWrap}>
              {slideImages.map((_, i) => (
                <div
                  key={i}
                  style={{
                    ...h.dot,
                    width: i === currentSlide ? 20 : 6,
                    backgroundColor: i === currentSlide ? "#FFD700" : "rgba(255,255,255,0.3)",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== WELCOME TEXT (번역 적용) ===== */}
      <div style={h.welcomeBox}>
        <div style={h.welcomeLine} />
        <span style={h.welcomeText}>
          {/* ★ 언어에 따른 감성 문구 처리 */}
          {t.home === "홈페이지" 
            ? "기다림마저 설레는 공간, 오늘 당신을 찾아갑니다" 
            : "A space where even waiting is exciting, visiting you today"}
        </span>
        <div style={h.welcomeLine} />
      </div>

      {/* ===== SECTION LABEL (번역 적용) ===== */}
      <div style={h.sectionLabel}>
        <div style={h.labelLeft}>
          <span className="shine-text" style={h.labelIcon}>✦</span>
          <span style={h.labelText}>
            {/* ★ 한글: DAISY 매니저 / 영어: DAISY MODELS */}
            DAISY {t.manager.toUpperCase()}
          </span>
        </div>
        <div onClick={() => setActiveTab && setActiveTab("manager")} style={h.moreBtn}>
          VIEW ALL ❯
        </div>
      </div>

      {/* ===== 매니저 카드 리스트 영역 ===== */}
      <div style={{ position: 'relative', width: '100%' }}>
        <div 
          ref={scrollRef}
          className="snap-container"
          style={h.scrollArea}
          onMouseDown={handleMouseDown}
        >
          {loopMembers.map((m, i) => (
            <div 
              key={i} 
              style={h.card} 
              onClick={() => openDetail && openDetail(m)}
            >
              <div style={h.cardImgWrap}>
                <img src={m.img} style={h.cardImg} alt={m.name || "member"} draggable="false" />
                <div style={h.cardOverlay} />
                <div style={h.cardBadge}>
                  {LEFT_TAGS[i % LEFT_TAGS.length]}
                </div>
              </div>
              
              <div style={h.cardInfo}>
                <div style={h.cardName}>{m.name}</div>
                
                {/* 1열: 지역(loc) · 나이(age) */}
                <div style={h.cardSpecs}>
                  <span style={h.specText}>
                    {m.loc || m.region || (t.home === "홈페이지" ? "지역" : "Area")}
                  </span>
                  <span style={h.specDivider}>·</span>
                  <span style={h.specText}>
                    {m.age ? `${m.age}${t.home === "홈페이지" ? "세" : ""}` : (t.home === "홈페이지" ? "20대" : "20s")}
                  </span>
                </div>
                
                {/* 2열: 키 · 몸무게 · 가슴 */}
                <div style={{ ...h.cardSpecs, marginTop: '5px' }}>
                  <span style={h.specText}>{m.height ? m.height + 'cm' : 'cm'}</span>
                  <span style={h.specDivider}>·</span>
                  <span style={h.specText}>{m.weight ? m.weight + 'kg' : 'kg'}</span>
                  <span style={h.specDivider}>·</span>
                  <span style={h.specText}>{m.bust || m.size || "Size"}</span>
                </div>

              </div>
            </div>
          ))}
        </div>

        {/* PC 전용 좌우 화살표 버튼 */}
        <div className="pc-arrows-wrap">
          <button className="arrow-btn" onClick={(e) => { e.stopPropagation(); scrollByButton('left'); }}>❮</button>
          <button className="arrow-btn" onClick={(e) => { e.stopPropagation(); scrollByButton('right'); }}>❯</button>
        </div>
      </div>

      {/* ===== FOOTER (번역 적용) ===== */}
      <div style={h.footerBtnArea}>
        <button onClick={handleTelegram} className="shimmer-btn" style={h.teleBtn}>
          💬 {t.home === "홈페이지" ? "실시간 상담 연결하기" : "Connect Real-time Chat"}
        </button>
        <p style={h.footerNotice}>24/7 PRIVATE CONCIERGE SERVICE</p>
      </div>

      <style>{`
        .bg-pattern { position: absolute; inset: 0; background-image: radial-gradient(rgba(255,215,0,0.05) 1px, transparent 1px); background-size: 30px 30px; z-index: -1; }
        .bg-glow { position: absolute; top: -100px; left: 50%; transform: translateX(-50%); width: 150%; height: 600px; background: radial-gradient(circle, rgba(255,215,0,0.07) 0%, transparent 70%); z-index: -1; }
        
        .snap-container::-webkit-scrollbar { display: none; }
        
        .pc-arrows-wrap { position: absolute; top: 40%; left: 0; right: 0; display: flex; justify-content: space-between; pointer-events: none; padding: 0 5px; z-index: 100; }
        .arrow-btn { width: 40px; height: 40px; border-radius: 50%; background: #FFD700; color: #000; border: 2px solid #fff; font-size: 18px; font-weight: bold; cursor: pointer; pointer-events: auto; box-shadow: 0 4px 10px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; transition: 0.2s; opacity: 0.9; }
        .arrow-btn:hover { background: #fff; transform: scale(1.1); }
        @media (max-width: 768px) { .pc-arrows-wrap { display: none; } }

        .dot-pulse-wrap { width: 12px; height: 12px; display: flex; align-items: center; justify-content: center; margin-right: 5px; }
        .dot-pulse { width: 6px; height: 6px; background: #00ff00; border-radius: 50%; box-shadow: 0 0 10px #00ff00; animation: pulse 1.5s infinite; }
        @keyframes pulse { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.5); opacity: 0.5; } 100% { transform: scale(1); opacity: 1; } }
        .shine-text { animation: textShine 2s infinite alternate; }
        @keyframes textShine { from { opacity: .5; text-shadow: none; } to { opacity: 1; text-shadow: 0 0 10px #FFD700; } }
        .shimmer-btn { position: relative; overflow: hidden; outline: none; border: none; }
        .shimmer-btn::after { content: ''; position: absolute; top: -50%; left: -100%; width: 200%; height: 200%; background: linear-gradient(45deg, transparent, rgba(255,255,255,0.2), transparent); transform: rotate(45deg); animation: shimmer 3s infinite; }
        @keyframes shimmer { 0% { left: -100%; } 100% { left: 100%; } }
      `}</style>
    </div>
  );
}

const h = {
  container: { position: 'relative', overflow: 'hidden', backgroundColor: '#0a0a0a', paddingBottom: 50, minHeight: '100vh', color: '#fff' },
  header: { padding: '50px 0 10px', textAlign: 'center' },
  logoArea: { marginBottom: 20 },
  logoImg: { maxWidth: '220px', filter: 'drop-shadow(0 0 10px rgba(255,215,0,0.3))' },
  defaultLogo: { fontSize: 36, color: '#fff', fontWeight: 900, letterSpacing: -1, lineHeight: 0.8 },
  statusBadge: { fontSize: 10, color: '#eee', background: 'rgba(255,255,255,0.07)', padding: '8px 16px', borderRadius: '30px', display: 'inline-flex', alignItems: 'center', gap: 5, border: '1px solid rgba(255,255,255,0.1)' },
  countText: { color: '#FFD700', letterSpacing: 1 },
  introTextArea: { textAlign: 'center', marginTop: 30, marginBottom: 15 },
  introSub: { fontSize: 10, color: '#FFD700', letterSpacing: 2, fontWeight: 600, opacity: 0.8, marginBottom: 5 },
  introMain: { fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: -0.5 },
  introSparkle: { color: '#FFD700', marginLeft: 5, fontSize: 14 },
  welcomeBox: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 15, margin: '35px 0' },
  welcomeLine: { width: 30, height: 1, background: 'linear-gradient(90deg, transparent, #FFD700, transparent)' },
  welcomeText: { color: '#bbb', fontSize: 13, fontWeight: 300, letterSpacing: 0.5, textAlign: 'center' },
  sliderContainer: { padding: '0 20px' },
  sliderWrap: { width: '100%', height: '260px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  slide: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'opacity 1s ease-in-out' },
  imageBorderWrapper: { position: 'relative', display: 'inline-flex', borderRadius: '15px', border: '1.5px solid rgba(255,215,0,0.5)', overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.9)', zIndex: 2, maxWidth: '100%', maxHeight: '240px' },
  actualImg: { display: 'block', maxWidth: '100%', maxHeight: '240px', width: 'auto', height: 'auto', objectFit: 'contain' },
  slideOverlay: { position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.7) 100%)', zIndex: 3 },
  adTag: { position: 'absolute', top: 12, left: 12, background: 'linear-gradient(135deg, #FFD700, #B8860B)', color: '#000', fontSize: 9, fontWeight: 900, padding: '4px 8px', borderRadius: 4, zIndex: 4 },
  indicatorWrap: { position: 'absolute', bottom: 5, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 5, zIndex: 5 },
  dot: { height: 6, borderRadius: 3, transition: 'all 0.3s' },
  sectionLabel: { padding: '40px 24px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  labelLeft: { display: 'flex', alignItems: 'center', gap: 8 },
  labelIcon: { color: '#FFD700', fontSize: 18 },
  labelText: { color: '#fff', fontSize: 17, fontWeight: 800 },
  moreBtn: { fontSize: 11, color: '#FFD700', opacity: 0.8, cursor: 'pointer' },

  scrollArea: { 
    display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', overflowX: 'auto', 
    scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch', 
    padding: '10px 20px 40px', width: '100%', boxSizing: 'border-box',
    scrollbarWidth: 'none', msOverflowStyle: 'none'
  },
  card: { 
    width: '210px', minWidth: '210px', flexShrink: 0, background: '#1a1a1a', 
    borderRadius: '20px', overflow: 'hidden', border: '1px solid #333', 
    boxShadow: '0 10px 25px rgba(0,0,0,0.6)', scrollSnapAlign: 'center', 
    marginRight: '15px', cursor: 'pointer'
  },
  cardImgWrap: { position: 'relative', height: '280px' },
  cardImg: { width: '100%', height: '100%', objectFit: 'cover' },
  cardOverlay: { position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 50%, #1a1a1a 100%)' },
  cardBadge: { position: 'absolute', top: 12, right: 12, background: 'rgba(255,215,0,0.9)', color: '#000', fontSize: 10, fontWeight: 900, padding: '4px 10px', borderRadius: 6 },
  
  cardInfo: { padding: '15px 10px 22px', textAlign: 'center' },
  cardName: { color: '#fff', fontSize: '20px', fontWeight: 900, marginBottom: 8, letterSpacing: '-0.5px' },
  
  cardSpecs: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 },
  specText: { fontSize: '13px', color: '#bbb', fontWeight: 400 },
  specDivider: { fontSize: '12px', color: '#555' },

  footerBtnArea: { padding: '0 24px', marginTop: 40, textAlign: 'center' },
  teleBtn: { width: '100%', padding: '20px', borderRadius: '12px', background: 'linear-gradient(135deg, #0088cc, #005588)', color: '#fff', fontSize: '15px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 },
  footerNotice: { fontSize: 10, color: '#444', marginTop: 15, letterSpacing: 2 }
};