import { useEffect, useMemo, useRef, useState } from "react";
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
  saveToFirebase,
  syncToFirebase,
  openIndependent,
  styles, // (unused)
}) {
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
  const safeLogoPos = logoPos || { x: 20, y: 20 };
  const safeLogoSize = typeof logoSize === "number" ? logoSize : 50;

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
  const safeSync = async (payload) => {
    if (!isFn(syncToFirebase)) return true; // sync 함수 없으면 그냥 성공 처리(크래시 방지)
    try {
      return await syncToFirebase(payload);
    } catch (e) {
      console.error("[syncToFirebase] error", e);
      return false;
    }
  };

  // ✅ logoSize/logoPos 저장: 마우스업/터치엔드에서만 저장(너무 잦은 저장 방지)
  const saveLogoUi = async (nextLogoSize, nextLogoPos) => {
    await safeSync({
      logoSize: typeof nextLogoSize === "number" ? nextLogoSize : safeLogoSize,
      logoPos: nextLogoPos || safeLogoPos,
    });
  };

  const handleRegionChange = (val) => {
    setNewM({ ...newM, region: val, loc: regionData[val][0] });
  };

  const startEdit = (m) => {
    setEditingId(m.id);
    setNewM(m);
    setShowManagerModal(true);
    const modalContent = document.getElementById("manager-modal-scroll");
    if (modalContent) modalContent.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveMember = async () => {
    if (loading) return alert("파일 업로드 중입니다. 잠시만 기다려주세요.");
    if (!newM.img || !newM.name) return alert("매니저 이름과 사진은 필수입니다.");

    let updatedMembers;
    if (editingId) {
      updatedMembers = (members || []).map((m) => (m.id === editingId ? { ...newM, id: editingId } : m));
      setEditingId(null);
    } else {
      updatedMembers = [...(members || []), { ...newM, id: Date.now() }];
    }

    setMembers?.(updatedMembers);
    setLoading(true);
    const ok = await safeSync({ members: updatedMembers });
    setLoading(false);

    if (ok) {
      setNewM(initialMember);
      alert("매니저 정보가 서버에 즉시 반영되었습니다! ✅");
    } else {
      alert("저장 실패(서버 동기화 오류) ❌");
    }
  };

  const saveVideoToGallery = async () => {
    if (loading) return alert("처리 중입니다. 잠시만 기다려주세요.");
    if (!tempVideoUrl) return alert("영상 파일을 먼저 업로드해주세요.");

    let updatedVideos;
    if (editingVideoId) {
      updatedVideos = (videos || []).map((v) =>
        v.id === editingVideoId ? { ...v, url: tempVideoUrl, category: videoCategory, description: videoDesc } : v
      );
      setEditingVideoId(null);
    } else {
      updatedVideos = [...(videos || []), { id: Date.now(), url: tempVideoUrl, category: videoCategory, description: videoDesc }];
    }

    setVideos?.(updatedVideos);
    setLoading(true);
    const ok = await safeSync({ videos: updatedVideos });
    setLoading(false);

    if (ok) {
      setTempVideoUrl("");
      setVideoDesc("");
      alert("갤러리 영상이 서버에 반영되었습니다! ✅");
    } else {
      alert("저장 실패(서버 동기화 오류) ❌");
    }
  };

  // ✅ 업로드 + (필요한 경우) 서버 즉시 저장
  const handleFileProcess = async (e, mode, callback) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const url = await uploadToCloudinary(file);

      if (url) {
        if (isFn(callback)) callback(url);

        let updates = {};
        if (mode === "logo") updates = { logo: url };
        else if (mode === "innerLogo") updates = { innerLogo: url };
        else if (mode === "heroImg") updates = { hero: { ...safeHero, imageSrc: url, mode: "image" } };
        // ✅ 핵심: heroVid 저장 누락 해결
        else if (mode === "heroVid") updates = { videoURL: url, hero: { ...safeHero, mode: "video" } };

        if (Object.keys(updates).length > 0) {
          const ok = await safeSync(updates);
          if (!ok) alert("업로드는 됐지만 서버 저장이 실패했습니다(권한/네트워크 확인) ❌");
        }
      }
    } catch (err) {
      console.error("저장 과정 에러:", err);
      alert("업로드/저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  // ✅ 시스템 설정 저장(텔레그램/비밀번호)
  const handleSaveSystemSettings = async () => {
    if (loading) return;
    setLoading(true);
    const success = await safeSync({
      telegramLink: telegramLink,
      adminPw: adminPw,
    });
    setLoading(false);
    if (success) alert("텔레그램 아이디 및 관리자 비밀번호가 즉시 저장되었습니다! ✅");
    else alert("저장 실패(서버 동기화 오류) ❌");
  };

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

      <div style={{ padding: "20px" }}>
        <h3 style={cmsStyles.mainTitle}>SERVER ADMIN PANEL</h3>

        {/* SECTION 1: 랜딩 페이지 설정 */}
        <div style={cmsStyles.sectionBox}>
          <label style={cmsStyles.sectionLabel}>❶ 랜딩 페이지 배경 설정</label>

          <div style={{ display: "flex", gap: 5, marginBottom: 15 }}>
            <button
              onClick={() => {
                setHero?.({ ...safeHero, mode: "image" });
                safeSync({ hero: { ...safeHero, mode: "image" } });
              }}
              style={{
                ...cmsStyles.modeBtn,
                background: safeHero.mode === "image" ? "#fff" : "#333",
                color: safeHero.mode === "image" ? "#000" : "#888",
              }}
            >
              이미지 모드
            </button>
            <button
              onClick={() => {
                setHero?.({ ...safeHero, mode: "video" });
                safeSync({ hero: { ...safeHero, mode: "video" } });
              }}
              style={{
                ...cmsStyles.modeBtn,
                background: safeHero.mode === "video" ? "#fff" : "#333",
                color: safeHero.mode === "video" ? "#000" : "#888",
              }}
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
              onChange={(e) =>
                handleFileProcess(e, "heroImg", (url) => setHero?.({ ...safeHero, imageSrc: url, mode: "image" }))
              }
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
            {videoURL && (
              <div style={{ marginTop: 5 }}>
                <p style={cmsStyles.checkText}>동영상 준비됨 ✅</p>
              </div>
            )}
          </div>

          <div style={cmsStyles.fieldGroup}>
            <label style={cmsStyles.fieldLabel}>중앙 메인 로고 및 위치</label>
            <input
              type="file"
              accept="image/*"
              style={cmsStyles.fileInput}
              disabled={loading}
              onChange={(e) => handleFileProcess(e, "logo", setLogo)}
            />

            <div style={cmsStyles.rangeRow}>
              <span>크기: {safeLogoSize}px</span>
              <input
                type="range"
                min="40"
                max="600"
                value={safeLogoSize}
                disabled={loading}
                onChange={(e) => setLogoSize?.(+e.target.value)}
                onMouseUp={() => saveLogoUi(safeLogoSize, safeLogoPos)}
                onTouchEnd={() => saveLogoUi(safeLogoSize, safeLogoPos)}
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
                  onMouseUp={() => saveLogoUi(safeLogoSize, safeLogoPos)}
                  onTouchEnd={() => saveLogoUi(safeLogoSize, safeLogoPos)}
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
                  onMouseUp={() => saveLogoUi(safeLogoSize, safeLogoPos)}
                  onTouchEnd={() => saveLogoUi(safeLogoSize, safeLogoPos)}
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
            <input
              type="file"
              accept="image/*"
              style={cmsStyles.fileInput}
              disabled={loading}
              onChange={(e) => handleFileProcess(e, "innerLogo", setInnerLogo)}
            />
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
                if (files.length === 0) return;

                setLoading(true);
                try {
                  const urls = await Promise.all(files.map((f) => uploadToCloudinary(f)));
                  const newImgs = urls
                    .filter(Boolean)
                    .map((u) => ({ id: Date.now() + Math.random(), url: u }));

                  const updatedSlide = [...(slideImages || []), ...newImgs];
                  setSlideImages?.(updatedSlide);

                  const ok = await safeSync({ slideImages: updatedSlide });
                  if (!ok) alert("배너 저장 실패(서버 동기화 오류) ❌");
                } catch (err) {
                  console.error(err);
                  alert("배너 업로드/저장 오류");
                } finally {
                  setLoading(false);
                  e.target.value = "";
                }
              }}
            />

            <div style={cmsStyles.bannerList}>
              {(slideImages || []).map((img) => (
                <div key={img.id} style={cmsStyles.bannerThumb}>
                  <img src={img.url} alt="slide" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button
                    onClick={async () => {
                      if (loading) return;
                      const filtered = (slideImages || []).filter((x) => x.id !== img.id);
                      setSlideImages?.(filtered);
                      const ok = await safeSync({ slideImages: filtered });
                      if (!ok) alert("삭제 저장 실패(서버 동기화 오류) ❌");
                    }}
                    style={cmsStyles.bannerDelBtn}
                  >
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
            매니저 프로필 관리 ({(members || []).length}명)
          </button>

          <button
            onClick={() => setShowVideoModal(true)}
            style={{ ...cmsStyles.modalOpenBtn, background: "#2196F3", marginTop: 10 }}
            disabled={loading}
          >
            비디오 갤러리 관리 ({(videos || []).length}개)
          </button>

          <button
            onClick={() => {
              if (isFn(openIndependent)) openIndependent();
            }}
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

          <button
            onClick={handleSaveSystemSettings}
            style={{ ...cmsStyles.modalOpenBtn, background: "#4CAF50", marginTop: 5 }}
            disabled={loading}
          >
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
              if (isFn(onExit)) onExit();
            }, 5000);

            try {
              if (isFn(saveToFirebase)) await saveToFirebase();
              clearTimeout(timer);
              if (isFn(onExit)) onExit();
            } catch (err) {
              if (isFn(onExit)) onExit();
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
              >
                닫기
              </button>
            </div>

            <div style={modalStyles.formBox}>
              <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                <select value={newM.region} onChange={(e) => handleRegionChange(e.target.value)} style={modalStyles.select}>
                  {regions.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>

                <select value={newM.loc} onChange={(e) => setNewM({ ...newM, loc: e.target.value })} style={modalStyles.select}>
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
                  onChange={(e) => setNewM({ ...newM, name: e.target.value })}
                />
                <input
                  style={{ ...modalStyles.input, flex: 1 }}
                  placeholder="나이"
                  value={newM.age}
                  onChange={(e) => setNewM({ ...newM, age: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", gap: 8, marginBottom: 10, marginTop: 10 }}>
                <input
                  style={modalStyles.input}
                  placeholder="키 (cm)"
                  value={newM.height}
                  onChange={(e) => setNewM({ ...newM, height: e.target.value })}
                />
                <input
                  style={modalStyles.input}
                  placeholder="몸무게 (kg)"
                  value={newM.weight}
                  onChange={(e) => setNewM({ ...newM, weight: e.target.value })}
                />
                <input
                  style={modalStyles.input}
                  placeholder="가슴 (컵)"
                  value={newM.bust}
                  onChange={(e) => setNewM({ ...newM, bust: e.target.value })}
                />
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
              {(members || []).map((m) => (
                <div key={m.id} style={modalStyles.listItem}>
                  <span>
                    [{m.loc}] {m.name} ({m.age ? m.age + "세" : "나이미정"})
                  </span>
                  <div>
                    <button onClick={() => startEdit(m)} style={modalStyles.editBtn} disabled={loading}>
                      수정
                    </button>
                    <button
                      onClick={async () => {
                        if (loading) return;
                        if (confirm("삭제하시겠습니까?")) {
                          const filtered = (members || []).filter((x) => x.id !== m.id);
                          setMembers?.(filtered);
                          const ok = await safeSync({ members: filtered });
                          if (!ok) alert("삭제 저장 실패(서버 동기화 오류) ❌");
                        }
                      }}
                      style={modalStyles.delBtn}
                      disabled={loading}
                    >
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
              {(videos || []).map((v) => (
                <div key={v.id} style={modalStyles.listItem}>
                  <video src={v.url} style={{ width: 60, height: 40, objectFit: "cover", borderRadius: 4 }} />
                  <div style={{ flex: 1, marginLeft: 10 }}>
                    <p style={{ fontSize: 10, color: "#888", margin: 0 }}>{v.description}</p>
                  </div>
                  <button
                    onClick={async () => {
                      if (loading) return;
                      if (confirm("삭제하시겠습니까?")) {
                        const filtered = (videos || []).filter((x) => x.id !== v.id);
                        setVideos?.(filtered);
                        const ok = await safeSync({ videos: filtered });
                        if (!ok) alert("삭제 저장 실패(서버 동기화 오류) ❌");
                      }
                    }}
                    style={modalStyles.delBtn}
                    disabled={loading}
                  >
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
