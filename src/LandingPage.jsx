import { useState } from "react";
// ✅ 1. Firebase 관련 기능 불러오기
// (경로 확인 필수: firebase.js 파일 위치에 따라 "./firebase" 또는 "../firebase")
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase"; 

/* =====================
   LANDING PAGE (범인 검거용 탐정 버전)
   - UI/기능: 원본과 100% 동일
   - 변경점: 회원가입 실패 시 '접속 중인 프로젝트 ID'를 알려주는 기능 추가
===================== */
export default function LandingPage({ 
  t, lang, users, setUsers, onLogin, onGuestLogin, 
  hero, videoURL, logo, logoSize, logoPos, styles, isAdmin,
  syncToFirebase
}) {
  const [mode, setMode] = useState("login");
  const [id, setId] = useState(""); 
  const [pw, setPw] = useState(""); 
  const [ref, setRef] = useState("");

  /* =====================
      회원가입 로직 (탐정 모드 🕵️‍♂️)
  ===================== */
  const signup = async () => {
    // 1. 입력값 확인
    if (!id || !pw || !ref) {
      return alert(lang === "ko" ? "모든 정보를 입력해주세요." : "Please fill all info.");
    }

    // 2. 공백 제거 (실수 방지)
    const cleanRef = ref.trim();

    // 3. 이미 존재하는 아이디인지 확인
    if (users.find(u => u.id === id)) {
      return alert(lang === "ko" ? "이미 존재하는 아이디입니다." : "ID already exists.");
    }

    let agentName = "";
    let isValidRef = false;

    // 4. 초대 코드 검증 (순서: 관리자 -> 기존유저 -> Firebase DB)
    
    // (A) 관리자 코드
    if (cleanRef === "ADMIN") {
      isValidRef = true;
      agentName = "ADMIN";
    } 
    // (B) 기존 유저 (친구 추천)
    else {
      const userRef = users.find(u => u.id === cleanRef);
      if (userRef) {
        isValidRef = true;
        agentName = userRef.id;
      } else {
        // (C) 🔥 Firebase DB 조회 (여기가 범인 잡는 구간)
        try {
          // 현재 접속된 프로젝트 ID 확인
          const currentProject = db.app.options.projectId;

          const docRef = doc(db, "invite_codes", cleanRef);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            isValidRef = true;
            agentName = docSnap.data().name;
          } else {
            // 🚨 실패 시: 접속 중인 프로젝트 ID를 화면에 띄움
            return alert(
              `[초대 코드 확인 실패]\n` +
              `입력한 코드: ${cleanRef}\n` +
              `----------------------------\n` +
              `[범인 찾기 힌트]\n` +
              `현재 접속된 프로젝트 ID:\n` +
              `👉 ${currentProject}\n` +
              `----------------------------\n` +
              `위 ID가 Firebase 콘솔의 프로젝트 ID와\n` +
              `정확히 일치하는지 확인해보세요!\n` +
              `(틀리다면 Vercel 환경 변수가 잘못된 것입니다)`
            );
          }
        } catch (error) {
          console.error("DB 에러:", error);
          return alert(`서버 에러 발생: ${error.message}`);
        }
      }
    }

    // 5. 검증 성공 시 가입 진행
    if (!isValidRef) return; // 위에서 alert 띄웠으므로 중단

    const startNo = 2783982189;
    const generatedNo = (startNo + users.length).toString();

    const newUser = { 
      id,
      pw,
      no: generatedNo,
      referral: cleanRef,
      diamond: 0,
      refCode: id,
      agentName: agentName,
      joinedAt: new Date().toISOString()
    };

    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);

    if (syncToFirebase) {
      await syncToFirebase({ users: updatedUsers });
    }

    alert(lang === "ko" ? "성공적으로 가입되었습니다! 로그인해주세요." : "Signup Success! Please Login.");
    setId(""); setPw(""); setRef("");
    setMode("login");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      mode === "login" ? onLogin(id, pw) : signup();
    }
  };

  return (
    <div
      style={{
        ...styles.landingWrapper,
        minHeight: "100dvh" 
      }}
    >
      {/* =====================
          1. 배경 레이어
      ===================== */}
      <div
        style={{
          ...styles.bgWrap,
          minHeight: "100dvh",
          position: "absolute",
          inset: 0,
          overflow: "hidden"
        }}
      >
        <div style={styles.bgOverlay} />

        {hero.mode === "image" && hero.imageSrc && (
          <img
            src={hero.imageSrc}
            alt=""
            draggable={false}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100dvh",
              objectFit: "cover",
              zIndex: -1
            }}
          />
        )}

        {hero.mode === "video" && videoURL && (
          <video
            key={videoURL}
            src={videoURL}
            autoPlay
            muted
            loop
            playsInline
            style={{
              ...styles.bgVideo,
              height: "100dvh",
              objectFit: "cover"
            }}
          />
        )}
      </div>

      {/* =====================
          2. 로고 레이어
      ===================== */}
      <div style={{ 
        ...styles.logoContainer,
        left: `${logoPos.x}px`,
        top: `${logoPos.y}px`,
        transition: "all 0.3s ease"
      }}>
        {logo ? (
          <img
            src={logo}
            alt="logo"
            style={{
              height: `${logoSize}px`,
              width: "auto",
              objectFit: "contain",
              filter: "drop-shadow(0 0 15px rgba(0,0,0,0.5))"
            }}
          />
        ) : (
          <strong style={styles.defaultLogo}>DAISY</strong>
        )}
      </div>

      {/* =====================
          3. 메인 콘텐츠
      ===================== */}
      <div style={styles.mainContent}>
        <div style={styles.heroSection}>
          <h1 style={styles.mainTitle}>{hero.title[lang]}</h1>
          <p style={styles.subTitle}>{hero.desc[lang]}</p>
        </div>

        {!isAdmin && (
          <div style={styles.authWrap}>
            <div style={{ ...styles.authCard, padding: "50px 40px" }}>
              <h2 style={{ ...styles.authTitle, fontSize: "28px", marginBottom: "35px" }}>
                {mode === "login" ? t.login : t.signup}
              </h2>

              <input
                style={{ ...styles.authInput, height: "60px", fontSize: "18px", marginBottom: "20px" }}
                placeholder={t.id}
                value={id}
                onChange={e => setId(e.target.value)}
                onKeyDown={handleKeyDown}
              />

              <input
                type="password"
                style={{ ...styles.authInput, height: "60px", fontSize: "18px", marginBottom: "20px" }}
                placeholder={t.pw}
                value={pw}
                onChange={e => setPw(e.target.value)}
                onKeyDown={handleKeyDown}
              />

              {mode === "signup" && (
                <input
                  style={{
                    ...styles.authInput,
                    height: "60px",
                    fontSize: "18px",
                    marginBottom: "20px",
                    border: "2px solid #ffb347",
                    background: "rgba(255,179,71,0.05)"
                  }}
                  placeholder={lang === "ko" ? "초대 코드를 입력하세요" : "Enter Invitation Code"}
                  value={ref}
                  onChange={e => setRef(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              )}

              <button
                style={{ ...styles.primaryBtn, height: "65px", fontSize: "20px", fontWeight: "900", marginTop: "10px" }}
                onClick={() => mode === "login" ? onLogin(id, pw) : signup()}
              >
                {mode === "login" ? t.login : t.signup}
              </button>

              {mode === "login" && (
                <button
                  style={{ ...styles.guestBtn, height: "55px", marginTop: "15px" }}
                  onClick={onGuestLogin}
                >
                  {t.guest}
                </button>
              )}

              <div
                style={{ ...styles.authToggle, fontSize: "15px", marginTop: "30px" }}
                onClick={() => {
                  setMode(mode === "login" ? "signup" : "login");
                  setId(""); setPw(""); setRef("");
                }}
              >
                {mode === "login"
                  ? (lang === "ko" ? "처음이신가요? 회원가입" : "New here? Sign Up")
                  : (lang === "ko" ? "이미 계정이 있나요? 로그인" : "Have an account? Login")}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}