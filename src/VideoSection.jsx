import React, { useState, useEffect, useCallback } from "react";

export default function VideoSection({ 
  videoCategories = [], 
  selectedCategory, 
  setSelectedCategory, 
  filteredVideos = [], 
  t // ★ Dashboard에서 전달받은 번역 객체
}) {
  const [fullScreenVideo, setFullScreenVideo] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const isKo = t.home === "홈페이지";

  // ★ [핵심 추가] 카테고리명 번역 매핑
  const catTranslation = {
    "ALL": "ALL",
    "한국": "KOREA",
    "일본": "JAPAN",
    "중국": "CHINA",
    "동남아": "S.E ASIA",
    "서양": "WESTERN"
  };

  const getCatName = (name) => {
    if (isKo) return name;
    return catTranslation[name] || name;
  };

  // 카테고리 변경 시 1페이지로 리셋
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory]);

  // 페이지네이션 로직
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentVideos = filteredVideos.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredVideos.length / itemsPerPage);

  const isAllActive = selectedCategory === 'ALL';

  // 뒤로가기 이벤트 감지 (기존 유지)
  useEffect(() => {
    const handlePop = () => {
      if (fullScreenVideo) {
        setFullScreenVideo(null);
      }
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, [fullScreenVideo]);

  const openFull = (url) => {
    setFullScreenVideo(url);
    window.history.pushState({ isFullVideo: true }, ''); 
  };

  const closeFull = () => {
    setFullScreenVideo(null);
  };

  return (
    <div style={s.pagePadding}>
      <h2 style={s.tabDisplayTitle}>{isKo ? "프리미엄 갤러리" : "PREMIUM GALLERY"}</h2>

      {/* 카테고리 바 (번역 적용) */}
      <div style={s.videoCategoryBar}>
        <span onClick={() => setSelectedCategory('ALL')}
          style={{...s.videoCatItem, color: isAllActive ? '#ffb347' : '#555', borderBottom: isAllActive ? '2px solid #ffb347' : '2px solid transparent'}}
        > {getCatName('ALL')} </span>
        {videoCategories.map((cat) => (
          <span key={cat} onClick={() => setSelectedCategory(cat)}
            style={{...s.videoCatItem, color: selectedCategory === cat ? '#ffb347' : '#555', borderBottom: selectedCategory === cat ? '2px solid #ffb347' : '2px solid transparent'}}
          > {getCatName(cat)} </span>
        ))}
      </div>

      {/* 비디오 그리드 (번역 적용) */}
      <div style={s.videoGrid}>
        {currentVideos.length > 0 ? (
          currentVideos.map((vid) => (
            <div key={vid.id} style={s.videoCard} onClick={() => openFull(vid.url)}>
              <div style={s.videoWrapper}>
                <video src={vid.url} playsInline muted loop autoPlay style={s.videoEl} poster={vid.poster || ""} />
                <div style={s.playOverlay}>🔍 {isKo ? "전체화면" : "FULL VIEW"}</div>
              </div>
              <div style={s.videoDesc}>
                <span style={s.descBadge}>EXCLUSIVE</span>
                <p style={s.descText}>
                  {vid.description || (isKo ? `프리미엄 ${vid.category} 쇼` : `PREMIUM ${getCatName(vid.category)} SHOW`)}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div style={s.noData}>{isKo ? "해당 카테고리의 영상이 준비 중입니다." : "Videos in this category are coming soon."}</div>
        )}
      </div>

      {/* 페이지네이션 버튼 (기존 유지) */}
      {totalPages > 1 && (
        <div style={s.pagination}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
            <button key={pageNum} onClick={() => { setCurrentPage(pageNum); window.scrollTo(0, 0); }}
              style={{...s.pageBtn, background: currentPage === pageNum ? '#ffb347' : '#1a1a1a', color: currentPage === pageNum ? '#000' : '#888'}}
            > {pageNum} </button>
          ))}
        </div>
      )}

      {/* 풀스크린 비디오 뷰어 (기존 유지) */}
      {fullScreenVideo && (
        <div 
          id="full-screen-view" 
          style={s.fullOverlay} 
          onClick={closeFull}
        >
          <button style={s.closeFull} onClick={closeFull}>✕ {isKo ? "닫기" : "CLOSE"}</button>
          <div style={s.fullContent} onClick={e => e.stopPropagation()}>
            <video src={fullScreenVideo} style={s.fullVideoEl} controls autoPlay loop playsInline />
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  pagePadding: { padding: '0 20px 100px 20px' },
  tabDisplayTitle: { color: '#fff', fontSize: 20, fontWeight: 200, letterSpacing: 6, textAlign: 'center', marginBottom: 35, textTransform: 'uppercase' },
  videoCategoryBar: { display: 'flex', justifyContent: 'center', gap: 15, marginBottom: 30, borderBottom: '1px solid #1a1a1a', paddingBottom: 12, flexWrap: 'wrap' },
  videoCatItem: { fontSize: 13, fontWeight: 800, cursor: 'pointer', padding: '4px 4px', transition: 'all 0.3s ease', textTransform: 'uppercase' },
  videoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 },
  videoCard: { background: '#0f0f0f', borderRadius: 12, overflow: 'hidden', border: '1px solid #1a1a1a', cursor: 'pointer' },
  videoWrapper: { width: '100%', aspectRatio: '9/16', background: '#000', position: 'relative' },
  videoEl: { width: '100%', height: '100%', objectFit: 'cover' },
  playOverlay: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 900, opacity: 0.8 },
  videoDesc: { padding: '12px 10px', textAlign: 'center' },
  descBadge: { fontSize: 8, color: '#000', background: '#ffb347', padding: '2px 5px', borderRadius: 3, fontWeight: 900, display: 'inline-block', marginBottom: 6 },
  descText: { margin: 0, fontSize: 11, color: '#eee', fontWeight: 500, letterSpacing: -0.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  noData: { gridColumn: 'span 2', textAlign: 'center', color: '#444', padding: '50px 0', fontSize: 14 },
  pagination: { display: 'flex', justifyContent: 'center', gap: 8, marginTop: 30 },
  pageBtn: { border: 'none', width: 35, height: 35, borderRadius: '50%', fontWeight: 800, fontSize: 12, cursor: 'pointer' },
  fullOverlay: { position: 'fixed', inset: 0, background: '#000', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  fullContent: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  fullVideoEl: { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' },
  closeFull: { position: 'absolute', top: 30, right: 20, zIndex: 100001, background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '30px', fontWeight: 800 }
};