import React, { useEffect, useMemo, useRef, useState } from "react";
import { uploadToCloudinary } from "./CloudinaryService";

export default function AdminCMS({
  adminPreviewMode,
  setAdminPreviewMode,

  hero,
  setHero,
  videoURL,
  setVideoURL,

  logo,
  setLogo,
  logoSize,
  setLogoSize,
  logoPos,
  setLogoPos,

  innerLogo,
  setInnerLogo,

  onExit,

  members,
  setMembers,

  slideImages,
  setSlideImages,

  videos,
  setVideos,

  adminPw,
  setAdminPw,
  telegramLink,
  setTelegramLink,

  // 둘 중 하나만 있어도 동작하도록
  saveToFirebase,
  syncToFirebase,

  openIndependent,

  styles, // unused
}) {
  /* =========================
     0) 기본 데이터/안전값
  ========================= */
  const regionData = useMemo(
    () => ({
      서울: ["강남/서초/송파", "강동/광진/성동", "마포/강서/양천", "영등포/구로/금천", "종로/중구/용산", "동대문/중랑/노원"],
      "경기 북부": ["일산/파주/고양", "의정부/양주/동두천", "남양주/구리/포천"],
      "경기 남부": ["수원/용인/화성", "분당/판교/성남", "안양/군포/의왕", "안산/시흥/광명", "부천/김포", "평택/안성/오산"],
      인천: ["부평/계양", "미추홀/연수/남동", "서구/강화/옹진"],
      충청: ["천안/아산/당진", "대전/세종/공주", "청주/충주/음성"],
      강원: ["춘천/홍천/철원", "원주/횡성/평창", "강릉/속초/동해"],
      전라: ["광주/나주/담양", "전주/익산/군산", "목포/무안/영암", "순천/여수/광양"],
      "경북·대구": ["대구 시내/수성/동구", "대구 서구/남구/달서", "포항/경주/영덕", "구미/김천/상주", "안동/영주/경산"],
      "부산·울산·경남": ["부산 서면/동래/연제", "부산 해운대/수영/기장", "부산 사하/강서/사상", "울산/양산", "창원/김해/거제"],
      제주: ["제주시 권역", "서귀포시 권역"],
    }),
    []
  );

  const regions = useMemo(() => Object.keys(regionData), [regionData]);
  const videoCategories = useMemo(() => ["한국", "일본", "중국", "동남아", "서양"], []);

  const safeHero = hero || { mode: "image", imageSrc: "" };
  const safeVideoURL = videoURL || "";
  const safeLogoPos = logoPos || { x: 20, y: 20 };
  const safeLogoSize = typeof logoSize === "number" ? logoSize : 50;
  const safeMembers = Array.isArray(members) ? members : [];
  const safeSlide = Array.isArray(slideImages) ? slideImages : [];
  const safeVideos = Array.isArray(videos) ? videos : [];

  const initialMember = useMemo(
    () => ({
      name: "",
      region: "서울",
      loc: regionData["서울"][0],
      img: "",
      video: "",
      age: "",
      height: "",
      weight: "",
      bust: "",
    }),
    [regionData]
  );

  const [newM, setNewM] = useState(initialMember);
  const [editingId, setEditingId] = useState(null);

  const [loading, setLoading] = useState(false);

  const [videoCategory, setVideoCategory] = useState("한국");
  const [videoDesc, setVideoDesc] = useState("");
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [editingVideoId, setEditingVideoId] = useState(null);
  const [tempVideoUrl, setTempVideoUrl] = useState("");

  const isFn = (v) => typeof v === "function";

  /* =========================
     1) "진짜 저장"을 위한 공통 저장 함수
     - syncToFirebase 있으면 즉시 저장
     - 없으면 실패로 처리(사용자에게 알려야 함)
  ========================= */
  const safeSync = async (payload) => {
    if (!isFn(syncToFirebase)) {
      alert("❌ 저장 함수(syncToFirebase)가 연결되지 않았습니다.\nApp.jsx에서 AdminCMS에 syncToFirebase props 전달 확인하세요.");
      return false;
    }
    try {
      const res = await syncToFirebase(payload);
      return !!res;
    } catch (e) {
      console.error("[syncToFirebase] error", e);
      return false;
    }
  };

  /* =========================
     2) 로고 UI 저장(최신값 저장 보장)
  ========================= */
  const logoSizeRef = useRef(safeLogoSize);
  const logoPosRef = useRef(safeLogoPos);

  useEffect(() => {
    logoSizeRef.current = safeLogoSize;
  }, [safeLogoSize]);

  useEffect(() => {
    logoPosRef.current = safeLogoPos;
  }, [safeLogoPos]);

  const saveLogoUi = async () => {
    const next = {
      logoSize: typeof logoSizeRef.current === "number" ? logoSizeRef.current : 50,
      logoPos: logoPosRef.current || { x: 20, y: 20 },
    };
    const ok = await safeSync(next);
    if (!ok) alert("로고 위치/크기 저장 실패 ❌");
  };

  /* =========================
     3) 공통: 업로드 + 필요 시 즉시 저장
     - heroImg, heroVid, logo, innerLogo 는 즉시 저장
     - member/video 모달 업로드는 목록 추가 버튼에서 저장(원래 UX)
  ========================= */
  const handleFileProcess = async (e, mode, callback) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const url = await uploadToCloudinary(file);

      if (!url) {
        alert("업로드 실패(Cloudinary) ❌");
        return;
      }

      if (isFn(callback)) callback(url);

      let updates = null;

      if (mode === "logo") updates = { logo: url };
      if (mode === "innerLogo") updates = { innerLogo: url };
      if (mode === "heroImg") updates = { hero: { ...safeHero, imageSrc: url, mode: "image" } };
      if (mode === "heroVid") updates = { videoURL: url, hero: { ...safeHero, mode: "video" } };

      if (updates) {
        const ok = await safeSync(updates);
        if (!ok) alert("업로드는 됐지만 서버 저장 실패(권한/네트워크 확인) ❌");
      }
    } catch (err) {
      console.error("업로드/저장 에러:", err);
      alert("업로드/저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  /* =========================
     4) 시스템 설정 저장(텔레그램/관리자 비번)
  ========================= */
  const handleSaveSystemSettings = async () => {
    if (loading) return;
    setLoading(true);
    const ok = await safeSync({ telegramLink: telegramLink || "", adminPw: adminPw || "" });
    setLoading(false);
    if (ok) alert("✅ 텔레그램/관리자 비밀번호가 서버에 저장되었습니다!");
    else alert("❌ 저장 실패(권한/네트워크 확인)");
  };

  /* =========================
     5) 매니저 저장/삭제/수정
  ========================= */
  const handleRegionChange = (val) => {
    setNewM((prev) => ({ ...prev, region: val, loc: regionData[val][0] }));
  };

  const startEdit = (m) => {
    setEditingId(m.id);
    setNewM(m);
    setShowManagerModal(true);
    const modalContent = document.getElementById("manager-modal-scroll");
    if (modalContent) modalContent.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveMember = async () => {
    if (loading) return alert("처리 중입니다. 잠시만 기다려주세요.");
    if (!newM.name || !newM.img) return alert("매니저 이름과 사진은 필수입니다.");

    const base = safeMembers;
    const next = editingId
      ? base.map((m) => (m.id === editingId ? { ...newM, id: editingId } : m))
      : [...base, { ...newM, id: Date.now() }];

    setMembers?.(next);

    setLoading(true);
    const ok = await safeSync({ members: next });
    setLoading(false);

    if (!ok) return alert("❌ 저장 실패(서버 동기화 오류)");

    alert("✅ 매니저 정보가 서버에 반영되었습니다!");
    setEditingId(null);
    setNewM(initialMember);
    setShowManagerModal(false);
  };

  const deleteMember = async (id) => {
    if (loading) return;
    if (!confirm("삭제하시겠습니까?")) return;
    const next = safeMembers.filter((m) => m.id !== id);
    setMembers?.(next);

    setLoading(true);
    const ok = await safeSync({ members: next });
    setLoading(false);

    if (!ok) alert("❌ 삭제 저장 실패(서버 동기화 오류)");
  };

  /* =========================
     6) 비디오 갤러리 저장/삭제
  ========================= */
  const saveVideoToGallery = async () => {
    if (loading) return alert("처리 중입니다. 잠시만 기다려주세요.");
    if (!tempVideoUrl) return alert("영상 파일을 먼저 업로드해주세요.");

    const base = safeVideos;

    const next = editingVideoId
      ? base.map((v) => (v.id === editingVideoId ? { ...v, url: tempVideoUrl, category: videoCategory, description: videoDesc } : v))
      : [...base, { id: Date.now(), url: tempVideoUrl, category: videoCategory, description: videoDesc }];

    setVideos?.(next);

    setLoading(true);
    const ok = await safeSync({ videos: next });
    setLoading(false);

    if (!ok) return alert("❌ 저장 실패(서버 동기화 오류)");

    alert("✅ 갤러리 영상이 서버에 반영되었습니다!");
    setTempVideoUrl("");
    setVideoDesc("");
    setEditingVideoId(null);
    setShowVideoModal(false);
  };

  const deleteVideo = async (id) => {
    if (loading) return;
    if (!confirm("삭제하시겠습니까?")) return;
    const next = safeVideos.filter((v) => v.id !== id);
    setVideos?.(next);

    setLoading(true);
    const ok = await safeSync({ videos: next });
    setLoading(false);

    if (!ok) alert("❌ 삭제 저장 실패(서버 동기화 오류)");
  };

  /* =========================
     7) 배너 업로드/삭제
  ========================= */
  const addBanners = async (files) => {
    if (loading) return;
    if (!files || files.length === 0) return;

    setLoading(true);
    try {
      const urls = await Promise.all(files.map((f) => uploadToCloudinary(f)));
      const newImgs = urls.filter(Boolean).map((u) => ({ id: Date.now() + Math.random(), url: u }));
      const next = [...safeSlide, ...newImgs];

      setSlideImages?.(next);

      const ok = await safeSync({ slideImages: next });
      if (!ok) alert("❌ 배너 저장 실패(서버 동기화 오류)");
    } catch (e) {
      console.error(e);
      alert("배너 업로드/저장 오류");
    } finally {
      setLoading(false);
    }
  };

  const deleteBanner = async (id) => {
    if (loading) return;
    const next = safeSlide.filter((x) => x.id !== id);
    setSlideImages?.(next);
    const ok = await safeSync({ slideImages: next });
    if (!ok) alert("❌ 배너 삭제 저장 실패(서버 동기화 오류)");
  };

  /* =========================
     8) 프리뷰 탭 안전 전환
  ========================= */
  const safeSetPreview = (mode) => {
    if (loading) return;
    if (isFn(setAdminPreviewMode)) setAdminPreviewMode(mode);
  };

  return (
    <div style={cmsStyles.cms}>
      {/* ❶ 프리뷰 전환 탭 */}
      <div style={cmsStyles.toggleArea}>
        <button
          onClick={() => safeSetPreview("landing")}
          style={{
            ...cmsStyles.tabBtn,
            background: adminPreviewMode === "landing" ? "#ffb347" : "#222",
            color: adminPreviewMode === "landing" ? "#000" : "#888",
            border: adminPreviewMode === "landing" ? "2px solid #fff" : "none",
            opacity: loading ? 0.7 : 1,
          }}
        >
          ❶ 랜딩페이지 보기
        </button>
        <button
          onClick={() => safeSetPreview("dashboard")}
          style={{
            ...cmsStyles.tabBtn,
            background: adminPreviewMode === "dashboard" ? "#ffb347" : "#222",
            color: adminPreviewMode === "dashboard" ? "#000" : "#888",
            border: adminPreviewMode === "dashboard" ? "2px solid #fff" : "none",
            opacity: loading ? 0.7 : 1,
          }}
        >
          ❷ 홈페이지 보기
        </button>
      </div>

      <div style={{ padding: 20 }}>
        <h3 style={cmsStyles.mainTitle}>SERVER ADMIN PANEL</h3>

        {/* SECTION 1: 랜딩 페이지 설정 */}
        <div style={cmsStyles.sectionBox}>
          <label style={cmsStyles.sectionLabel}>❶ 랜딩 페이지 배경 설정</label>

          <div style={{ display: "flex", gap: 5, marginBottom: 15 }}>
            <button
              onClick={async () => {
                setHero?.({ ...safeHero, mode: "image" });
                await safeSync({ hero: { ...safeHero, mode: "image" } });
              }}
              style={{
                ...cmsStyles.modeBtn,
                background: safeHero.mode === "image" ? "#fff" : "#333",
                color: safeHero.mode === "image" ? "#000" : "#888",
              }}
              disabled={loading}
            >
              이미지 모드
            </button>

            <button
              onClick={async () => {
                setHero?.({ ...safeHero, mode: "video" });
                await safeSync({ hero: { ...safeHero, mode: "video" } });
              }}
              style={{
                ...cmsStyles.modeBtn,
                background: safeHero.mode === "video" ? "#fff" : "#333",
                color: safeHero.mode === "video" ? "#000" : "#888",
              }}
              disabled={loading}
            >
              동영상 모드
            </button>
          </div>

          <div style={cmsStyles.fieldGroup}>
            <label style={cmsStyles.fieldLabel}>배경 이미지 (업로드 시 자동저장)</label>
            <input
              type="file"
              accept="image/*"
              style={cmsStyles.fileInput}
              disabled={loading}
              onChange={(e) => handleFileProcess(e, "heroImg", (url) => setHero?.({ ...safeHero, imageSrc: url, mode: "image" }))}
            />
            {safeHero.imageSrc && (
              <img
                src={safeHero.imageSrc}
                style={{ width: "100%", height: 60, objectFit: "cover", marginTop: 5, borderRadius: 5 }}
                alt="preview"
              />
            )}
          </div>

          <div style={cmsStyles.fieldGroup}>
            <label style={cmsStyles.fieldLabel}>배경 동영상 (업로드 시 자동저장)</label>
            <input
              type="file"
              accept="video/*"
              style={cmsStyles.fileInput}
              disabled={loading}
              onChange={(e) =>
                handleFileProcess(e, "heroVid", (url) => {
                  setVideoURL?.(url);
                  setHero?.({ ...safeHero, mode: "video" });
                })
              }
            />
            {safeVideoURL && (
              <div style={{ marginTop: 5 }}>
                <p style={cmsStyles.checkText}>동영상 준비됨 ✅</p>
              </div>
            )}
          </div>

          <div style={cmsStyles.fieldGroup}>
            <label style={cmsStyles.fieldLabel}>중앙 메인 로고 및 위치</label>

            <input type="file" accept="image/*" style={cmsStyles.fileInput} disabled={loading} onChange={(e) => handleFileProcess(e, "logo", setLogo)} />

            <div style={cmsStyles.rangeRow}>
              <span>크기: {safeLogoSize}px</span>
              <input
                type="range"
                min="40"
                max="600"
                value={safeLogoSize}
                disabled={loading}
                onChange={(e) => setLogoSize?.(+e.target.value)}
                onMouseUp={saveLogoUi}
                onTouchEnd={saveLogoUi}
              />
            </div>

            <div style={cmsStyles.rangeGrid}>
              <div>
                <span>상하(Y)</span>
                <input
                  type="range"
                  min="0"
                  max="1000"
                  value={safeLogoPos.y}
                  disabled={loading}
                  onChange={(e) => setLogoPos?.({ ...safeLogoPos, y: +e.target.value })}
                  onMouseUp={saveLogoUi}
                  onTouchEnd={saveLogoUi}
                />
              </div>
              <div>
                <span>좌우(X)</span>
                <input
                  type="range"
                  min="0"
                  max="1000"
                  value={safeLogoPos.x}
                  disabled={loading}
                  onChange={(e) => setLogoPos?.({ ...safeLogoPos, x: +e.target.value })}
                  onMouseUp={saveLogoUi}
                  onTouchEnd={saveLogoUi}
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: 홈페이지 설정 */}
        <div style={{ ...cmsStyles.sectionBox, borderColor: "#FFD700" }}>
          <label style={{ ...cmsStyles.sectionLabel, color: "#FFD700" }}>❷ 홈페이지 설정</label>

          <div style={cmsStyles.fieldGroup}>
            <label style={cmsStyles.fieldLabel}>상단 고정 로고 (Inner Logo)</label>
            <input type="file" accept="image/*" style={cmsStyles.fileInput} disabled={loading} onChange={(e) => handleFileProcess(e, "innerLogo", setInnerLogo)} />
            {innerLogo && <img src={innerLogo} style={{ maxHeight: 30, marginTop: 5 }} alt="inner-logo" />}
          </div>

          <div style={cmsStyles.fieldGroup}>
            <label style={cmsStyles.fieldLabel}>상단 배너 슬라이더 (X 눌러 삭제)</label>

            <input
              type="file"
              multiple
              accept="image/*"
              style={cmsStyles.fileInput}
              disabled={loading}
              onChange={async (e) => {
                const files = Array.from(e.target.files || []);
                e.target.value = "";
                await addBanners(files);
              }}
            />

            <div style={cmsStyles.bannerList}>
              {safeSlide.map((img) => (
                <div key={img.id} style={cmsStyles.bannerThumb}>
                  <img src={img.url} alt="slide" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button onClick={() => deleteBanner(img.id)} style={cmsStyles.bannerDelBtn} disabled={loading}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SECTION 3: 컨텐츠 데이터 관리 */}
        <div style={cmsStyles.sectionBox}>
          <label style={cmsStyles.sectionLabel}>❸ 컨텐츠 데이터 관리</label>

          <button onClick={() => setShowManagerModal(true)} style={cmsStyles.modalOpenBtn} disabled={loading}>
            매니저 프로필 관리 ({safeMembers.length}명)
          </button>

          <button
            onClick={() => setShowVideoModal(true)}
            style={{ ...cmsStyles.modalOpenBtn, background: "#2196F3", marginTop: 10 }}
            disabled={loading}
          >
            비디오 갤러리 관리 ({safeVideos.length}개)
          </button>

          <button
            onClick={() => isFn(openIndependent) && openIndependent()}
            style={{ ...cmsStyles.modalOpenBtn, background: "#9C27B0", marginTop: 10 }}
            disabled={loading}
          >
            회원 포인트 관리 (독립 어드민)
          </button>
        </div>

        {/* SECTION 4: 시스템 설정 */}
        <div style={cmsStyles.sectionBox}>
          <label style={cmsStyles.sectionLabel}>❹ 시스템 설정</label>

          <div style={cmsStyles.fieldGroup}>
            <label style={cmsStyles.fieldLabel}>텔레그램 상담 링크 아이디</label>
            <input
              type="text"
              style={cmsStyles.textInput}
              placeholder="@TelegramID"
              value={telegramLink || ""}
              disabled={loading}
              onChange={(e) => setTelegramLink?.(e.target.value)}
            />
          </div>

          <div style={cmsStyles.fieldGroup}>
            <label style={cmsStyles.fieldLabel}>관리자 접속 비밀번호</label>
            <input
              type="text"
              style={cmsStyles.textInput}
              placeholder="새 비밀번호 입력"
              value={adminPw || ""}
              disabled={loading}
              onChange={(e) => setAdminPw?.(e.target.value)}
            />
          </div>

          <button onClick={handleSaveSystemSettings} style={{ ...cmsStyles.modalOpenBtn, background: "#4CAF50", marginTop: 5 }} disabled={loading}>
            시스템 설정 즉시저장
          </button>
        </div>

        {/* 종료 */}
        <button
          style={{
            ...cmsStyles.saveExitBtn,
            background: loading ? "#ffb347" : "#fff",
            cursor: loading ? "wait" : "pointer",
            opacity: loading ? 0.85 : 1,
          }}
          onClick={async () => {
            if (loading) return;
            setLoading(true);
            const timer = setTimeout(() => {
              isFn(onExit) && onExit();
            }, 5000);

            try {
              // saveToFirebase가 있으면 마지막 전체 저장도 수행
              if (isFn(saveToFirebase)) await saveToFirebase();
              clearTimeout(timer);
              isFn(onExit) && onExit();
            } catch (err) {
              isFn(onExit) && onExit();
            } finally {
              setLoading(false);
            }
          }}
        >
          {loading ? "데이터 저장 확인 중..." : "작업 종료 및 패널 닫기"}
        </button>
      </div>

      {/* [모달 1] 매니저 관리 */}
      {showManagerModal && (
        <div style={modalStyles.overlay}>
          <div id="manager-modal-scroll" style={modalStyles.container}>
            <div style={modalStyles.header}>
              <h2 style={{ color: "#ffb347" }}>{editingId ? "매니저 정보 수정" : "신규 매니저 등록"}</h2>
              <button
                onClick={() => {
                  setShowManagerModal(false);
                  setEditingId(null);
                  setNewM(initialMember);
                }}
                style={modalStyles.closeBtn}
                disabled={loading}
              >
                닫기
              </button>
            </div>

            <div style={modalStyles.formBox}>
              <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                <select value={newM.region} onChange={(e) => handleRegionChange(e.target.value)} style={modalStyles.select} disabled={loading}>
                  {regions.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>

                <select value={newM.loc} onChange={(e) => setNewM({ ...newM, loc: e.target.value })} style={modalStyles.select} disabled={loading}>
                  {regionData[newM.region].map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <input
                  style={{ ...modalStyles.input, flex: 2 }}
                  placeholder="매니저 이름"
                  value={newM.name}
                  disabled={loading}
                  onChange={(e) => setNewM({ ...newM, name: e.target.value })}
                />
                <input
                  style={{ ...modalStyles.input, flex: 1 }}
                  placeholder="나이"
                  value={newM.age}
                  disabled={loading}
                  onChange={(e) => setNewM({ ...newM, age: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", gap: 8, marginBottom: 10, marginTop: 10 }}>
                <input style={modalStyles.input} placeholder="키 (cm)" value={newM.height} disabled={loading} onChange={(e) => setNewM({ ...newM, height: e.target.value })} />
                <input style={modalStyles.input} placeholder="몸무게 (kg)" value={newM.weight} disabled={loading} onChange={(e) => setNewM({ ...newM, weight: e.target.value })} />
                <input style={modalStyles.input} placeholder="가슴 (컵)" value={newM.bust} disabled={loading} onChange={(e) => setNewM({ ...newM, bust: e.target.value })} />
              </div>

              <div style={{ display: "flex", gap: 10, marginBottom: 10, marginTop: 10 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 11, color: "#ffb347", margin: "0 0 5px 0" }}>사진 업로드</p>
                  <input type="file" accept="image/*" disabled={loading} onChange={(e) => handleFileProcess(e, "image", (url) => setNewM({ ...newM, img: url }))} />
                  {newM.img && <img src={newM.img} style={modalStyles.previewImg} alt="p" />}
                </div>

                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 11, color: "#ffb347", margin: "0 0 5px 0" }}>영상 업로드</p>
                  <input type="file" accept="video/*" disabled={loading} onChange={(e) => handleFileProcess(e, "video", (url) => setNewM({ ...newM, video: url }))} />
                  {newM.video && <video src={newM.video} style={modalStyles.previewImg} controls />}
                </div>
              </div>

              <button onClick={saveMember} style={modalStyles.actionBtn} disabled={loading}>
                {editingId ? "수정 완료" : "목록 추가"}
              </button>
            </div>

            <div style={modalStyles.list}>
              {safeMembers.map((m) => (
                <div key={m.id} style={modalStyles.listItem}>
                  <span>
                    [{m.loc}] {m.name} ({m.age ? m.age + "세" : "나이미정"})
                  </span>
                  <div>
                    <button onClick={() => startEdit(m)} style={modalStyles.editBtn} disabled={loading}>
                      수정
                    </button>
                    <button onClick={() => deleteMember(m.id)} style={modalStyles.delBtn} disabled={loading}>
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* [모달 2] 비디오 관리 */}
      {showVideoModal && (
        <div style={modalStyles.overlay}>
          <div id="video-modal-scroll" style={{ ...modalStyles.container, border: "2px solid #2196F3" }}>
            <div style={modalStyles.header}>
              <h2 style={{ color: "#2196F3" }}>{editingVideoId ? "영상 정보 수정" : "새 영상 업로드"}</h2>
              <button
                onClick={() => {
                  setShowVideoModal(false);
                  setEditingVideoId(null);
                  setVideoDesc("");
                  setTempVideoUrl("");
                }}
                style={modalStyles.closeBtn}
                disabled={loading}
              >
                닫기
              </button>
            </div>

            <div style={modalStyles.formBox}>
              <select value={videoCategory} onChange={(e) => setVideoCategory(e.target.value)} style={modalStyles.select} disabled={loading}>
                {videoCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <input
                style={{ ...modalStyles.input, marginTop: 10 }}
                placeholder="영상 설명"
                value={videoDesc}
                disabled={loading}
                onChange={(e) => setVideoDesc(e.target.value)}
              />

              <input type="file" accept="video/*" disabled={loading} onChange={(e) => handleFileProcess(e, "video", (url) => setTempVideoUrl(url))} />

              {tempVideoUrl && <video src={tempVideoUrl} style={{ width: "100%", maxHeight: 150, marginTop: 10 }} controls />}

              <button onClick={saveVideoToGallery} style={{ ...modalStyles.actionBtn, background: "#2196F3" }} disabled={loading}>
                갤러리 반영
              </button>
            </div>

            <div style={modalStyles.list}>
              {safeVideos.map((v) => (
                <div key={v.id} style={modalStyles.listItem}>
                  <video src={v.url} style={{ width: 60, height: 40, objectFit: "cover", borderRadius: 4 }} />
                  <div style={{ flex: 1, marginLeft: 10 }}>
                    <p style={{ fontSize: 10, color: "#888", margin: 0 }}>{v.description}</p>
                  </div>
                  <button onClick={() => deleteVideo(v.id)} style={modalStyles.delBtn} disabled={loading}>
                    삭제
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================
   Styles (원래 느낌 유지)
========================= */
const cmsStyles = {
  cms: {
    position: "fixed",
    right: 0,
    top: 0,
    height: "100vh",
    width: "340px",
    background: "#111",
    borderLeft: "1px solid #333",
    zIndex: 11000,
    color: "#fff",
    boxSizing: "border-box",
    overflowY: "auto",
  },
  toggleArea: { display: "flex", background: "#000", padding: "10px", gap: "5px", position: "sticky", top: 0, zIndex: 12000 },
  tabBtn: { flex: 1, padding: "12px 5px", border: "none", borderRadius: "8px", fontSize: "11px", fontWeight: "bold", cursor: "pointer", transition: "0.2s" },
  mainTitle: { color: "#ffb347", fontSize: "1.1rem", borderBottom: "1px solid #333", paddingBottom: 10, marginBottom: 20, textAlign: "center" },
  sectionBox: { background: "rgba(255,255,255,0.02)", border: "1px solid #333", padding: "15px", borderRadius: "12px", marginBottom: 20 },
  sectionLabel: { fontSize: "13px", fontWeight: "bold", color: "#ffb347", display: "block", marginBottom: 15 },
  modeBtn: { flex: 1, padding: "8px", fontSize: "11px", borderRadius: "5px", border: "none", fontWeight: "bold", cursor: "pointer" },
  fieldGroup: { marginBottom: 15, paddingBottom: 10, borderBottom: "1px solid #222" },
  fieldLabel: { fontSize: "11px", color: "#aaa", display: "block", marginBottom: 5 },
  fileInput: { width: "100%", fontSize: "11px", color: "#888" },
  checkText: { fontSize: "10px", color: "#4CAF50", margin: "5px 0" },
  rangeRow: { display: "flex", justifyContent: "space-between", fontSize: "10px", marginTop: 10, color: "#888", gap: 10, alignItems: "center" },
  rangeGrid: { display: "flex", gap: 10, marginTop: 10, fontSize: "10px", color: "#888" },
  bannerList: { display: "flex", gap: 8, overflowX: "auto", marginTop: 10, paddingBottom: 5 },
  bannerThumb: { position: "relative", flexShrink: 0, width: 80, height: 45, borderRadius: 4, overflow: "hidden", border: "1px solid #444" },
  bannerDelBtn: {
    position: "absolute",
    top: 2,
    right: 2,
    background: "rgba(255,0,0,0.8)",
    color: "#fff",
    border: "none",
    borderRadius: "50%",
    width: 18,
    height: 18,
    fontSize: "10px",
    cursor: "pointer",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  modalOpenBtn: { width: "100%", padding: "12px", background: "#ffb347", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" },
  textInput: { width: "100%", padding: "12px", background: "#000", border: "1px solid #333", color: "#fff", borderRadius: "8px", fontSize: "12px", boxSizing: "border-box" },
  saveExitBtn: { width: "100%", padding: "18px", background: "#fff", color: "#000", border: "none", borderRadius: "10px", fontWeight: "bold", cursor: "pointer", marginTop: 10 },
};

const modalStyles = {
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", zIndex: 12000, display: "flex", justifyContent: "center", alignItems: "center", padding: 20 },
  container: { width: "100%", maxWidth: "550px", maxHeight: "90vh", background: "#111", padding: "25px", borderRadius: "20px", border: "2px solid #ffb347", overflowY: "auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  closeBtn: { background: "#ff4d4d", color: "#fff", border: "none", padding: "8px 15px", borderRadius: "6px", cursor: "pointer" },
  formBox: { background: "rgba(255,255,255,0.03)", padding: 15, borderRadius: "12px", marginBottom: 20 },
  select: { flex: 1, padding: "10px", background: "#000", color: "#fff", border: "1px solid #444", borderRadius: "6px" },
  input: { width: "100%", padding: "12px", background: "#000", border: "1px solid #333", color: "#fff", borderRadius: "8px", boxSizing: "border-box" },
  previewImg: { width: "100%", height: 100, objectFit: "contain", background: "#000", marginTop: 10, borderRadius: 8 },
  actionBtn: { width: "100%", padding: "15px", background: "#4CAF50", color: "#fff", border: "none", borderRadius: "10px", fontWeight: "bold", cursor: "pointer", marginTop: 10 },
  list: { background: "#000", borderRadius: "10px", border: "1px solid #222" },
  listItem: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", borderBottom: "1px solid #111" },
  editBtn: { background: "none", color: "#4CAF50", border: "none", cursor: "pointer", fontWeight: "bold" },
  delBtn: { background: "none", color: "#ff4d4d", border: "none", cursor: "pointer", marginLeft: 10, fontWeight: "bold" },
};
