import { db } from "./firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { useState } from "react";

/* =====================
   LANDING PAGE (순차 고유번호 2783982189 및 원본 기능 통합)
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
     회원가입 로직 (원본 유지)
  ===================== */
const signup = async () => {
  if (!id || !pw || !ref) {
    return alert(lang === "ko" ? "모든 정보를 입력해주세요." : "Please fill all info.");
  }

  const newId = id.trim();
  const newPw = pw.trim();
  const inputRef = ref.trim().toUpperCase();

  try {
    // 1) 초대코드 검증: invite_codes에서 확인 (실장 코드)
    const inviteRef = doc(db, "invite_codes", inputRef);
    const inviteSnap = await getDoc(inviteRef);

    // 2) 유저 추천코드 검증: users에서 확인 (유저의 refCode = id 구조)
    const userRefDoc = doc(db, "users", inputRef);
    const userRefSnap = await getDoc(userRefDoc);

    // 3) 마스터 코드
    const isMaster = inputRef === "ADMIN";

    // 초대코드가 실장/유저/마스터 어느 것도 아니면 탈락
    if (!inviteSnap.exists() && !userRefSnap.exists() && !isMaster) {
      return alert(lang === "ko" ? "존재하지 않거나 틀린 초대 코드입니다." : "Invalid referral code.");
    }

    // 아이디 중복 체크: users 컬렉션에서 확인
    const myUserRef = doc(db, "users", newId);
    const myUserSnap = await getDoc(myUserRef);
    if (myUserSnap.exists()) {
      return alert(lang === "ko" ? "이미 존재하는 아이디입니다." : "ID already exists.");
    }

    // 실장 이름(있으면)
    const agentName = inviteSnap.exists() ? (inviteSnap.data()?.name || "") : "";

    // 고유번호는 기존처럼 users.length 기반이 아니라,
    // Firestore 기준으로 안정적으로 "가입시간 기반"으로 생성 (충돌 방지)
    const generatedNo = String(Date.now());

    const newUser = {
      id: newId,
      password: newPw,         // ✅ admin 로직이 password 필드 쓰고 있어서 통일
      pw: newPw,               // ✅ 기존 코드 호환 (이미 pw로 쓰는 곳 있으면 유지)
      no: generatedNo,
      referral: inputRef,      // ✅ 추천인/실장 코드 저장
      diamond: 0,
      refCode: newId,          // ✅ 내 추천코드 = 내 아이디
      agentName,
      joinedAt: new Date().toISOString(),
      createdAt: serverTimestamp()
    };

    // Firestore에 생성
    await setDoc(myUserRef, newUser, { merge: true });

    // 로컬 상태도 갱신(화면 즉시 반영용)
    const updatedUsers = [...(users || []), newUser];
    setUsers(updatedUsers);

    alert(lang === "ko" ? "성공적으로 가입되었습니다! 로그인해주세요." : "Signup Success! Please Login.");
    setId(""); setPw(""); setRef("");
    setMode("login");

  } catch (e) {
    console.error(e);
    alert("회원가입 오류: " + (e?.message || e));
  }
};

  return (
    <div
      style={{
        ...styles.landingWrapper,
        minHeight: "100dvh" // ✅ iOS 확대 방지 핵심
      }}
    >
      {/* =====================
          1. 배경 레이어 (iOS 안전 구조)
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
          2. 로고 레이어 (원본 유지)
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
          3. 메인 콘텐츠 (원본 유지)
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
