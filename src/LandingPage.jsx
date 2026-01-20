import { useState } from "react";
import { db } from "./firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

/* =====================
   LANDING PAGE (완성형 / 블랙화면 방지 / Firestore 초대코드 가입)
===================== */
export default function LandingPage({
  t,
  lang,
  users,
  setUsers,
  onLogin,
  onGuestLogin,
  hero,
  videoURL,
  logo,
  logoSize,
  logoPos,
  styles,
  isAdmin,
}) {
  // ---- 안전 기본값 (undefined 방지) ----
  const safeLang = lang || "ko";
  const safeUsers = Array.isArray(users) ? users : [];
  const safeT = t || {
    login: "로그인",
    signup: "회원가입",
    id: "아이디",
    pw: "비밀번호",
    guest: "게스트",
  };
  const safeHero = hero || {
    mode: "image",
    imageSrc: "",
    title: { ko: "DAISY", en: "DAISY" },
    desc: { ko: "", en: "" },
  };
  const safeStyles =
    styles ||
    ({
      landingWrapper: { minHeight: "100dvh", background: "#000", color: "#fff" },
      bgWrap: {},
      bgOverlay: { position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)" },
      bgVideo: { position: "absolute", inset: 0, width: "100%" },
      logoContainer: { position: "absolute", left: 20, top: 20, zIndex: 2 },
      defaultLogo: { fontSize: 24, fontWeight: 900 },
      mainContent: { position: "relative", zIndex: 2, display: "flex", justifyContent: "center", paddingTop: 140 },
      heroSection: { textAlign: "center", marginBottom: 30 },
      mainTitle: { fontSize: 34, fontWeight: 900 },
      subTitle: { opacity: 0.8 },
      authWrap: { display: "flex", justifyContent: "center" },
      authCard: { width: 420, background: "rgba(0,0,0,0.55)", border: "1px solid #333", borderRadius: 16 },
      authTitle: { fontWeight: 900 },
      authInput: { width: "100%", padding: 14, borderRadius: 10, border: "1px solid #333", background: "#111", color: "#fff" },
      primaryBtn: { width: "100%", padding: 16, borderRadius: 12, border: "none", background: "#ffb347", fontWeight: 900, cursor: "pointer" },
      guestBtn: { width: "100%", padding: 14, borderRadius: 12, border: "1px solid #333", background: "#111", color: "#fff", cursor: "pointer" },
      authToggle: { marginTop: 16, cursor: "pointer", opacity: 0.85, textAlign: "center" },
    });

  // ---- 상태 ----
  const [mode, setMode] = useState("login");
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [ref, setRef] = useState("");

  // ---- 회원가입(Firestore 기반) ----
  const signup = async () => {
    if (!id || !pw || !ref) {
      return alert(safeLang === "ko" ? "모든 정보를 입력해주세요." : "Please fill all info.");
    }

    const newId = id.trim();
    const newPw = pw.trim();
    const inputRef = ref.trim().toUpperCase();

    try {
      // 1) 초대코드(실장): invite_codes/{code}
      const inviteSnap = await getDoc(doc(db, "invite_codes", inputRef));

      // 2) 유저 추천코드(유저 id를 추천코드로 쓰는 구조): users/{id}
      const userRefSnap = await getDoc(doc(db, "users", inputRef));

      // 3) 마스터 코드
      const isMaster = inputRef === "ADMIN";

      if (!inviteSnap.exists() && !userRefSnap.exists() && !isMaster) {
        return alert(safeLang === "ko" ? "존재하지 않거나 틀린 초대 코드입니다." : "Invalid referral code.");
      }

      // 아이디 중복 체크 (Firestore 기준)
      const myUserRef = doc(db, "users", newId);
      const myUserSnap = await getDoc(myUserRef);
      if (myUserSnap.exists()) {
        return alert(safeLang === "ko" ? "이미 존재하는 아이디입니다." : "ID already exists.");
      }

      const agentName = inviteSnap.exists() ? (inviteSnap.data()?.name || "") : "";
      const generatedNo = String(Date.now());

      const newUser = {
        id: newId,
        pw: newPw,          // 기존 호환
        password: newPw,    // admin 호환
        no: generatedNo,
        referral: inputRef,
        diamond: 0,
        refCode: newId,
        agentName,
        joinedAt: new Date().toISOString(),
        createdAt: serverTimestamp(),
      };

      // 가입은 새 문서 생성이 안전 (merge X)
      await setDoc(myUserRef, newUser);

      // 화면 즉시 반영용 로컬 상태 업데이트(선택)
      if (typeof setUsers === "function") {
        setUsers([...(safeUsers || []), newUser]);
      }

      alert(safeLang === "ko" ? "성공적으로 가입되었습니다! 로그인해주세요." : "Signup Success! Please Login.");
      setId(""); setPw(""); setRef("");
      setMode("login");
    } catch (e) {
      console.error(e);
      alert("회원가입 오류: " + (e?.message || e));
    }
  };

  // ✅ Enter 처리 (블랙화면 원인 해결 포인트)
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      if (mode === "login") {
        onLogin?.(id, pw);
      } else {
        signup();
      }
    }
  };

  return (
    <div style={{ ...safeStyles.landingWrapper, minHeight: "100dvh", position: "relative" }}>
      {/* 1) 배경 */}
      <div style={{ ...safeStyles.bgWrap, minHeight: "100dvh", position: "absolute", inset: 0, overflow: "hidden" }}>
        <div style={safeStyles.bgOverlay} />

        {safeHero.mode === "image" && safeHero.imageSrc && (
          <img
            src={safeHero.imageSrc}
            alt=""
            draggable={false}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100dvh", objectFit: "cover", zIndex: -1 }}
          />
        )}

        {safeHero.mode === "video" && videoURL && (
          <video
            key={videoURL}
            src={videoURL}
            autoPlay
            muted
            loop
            playsInline
            style={{ ...safeStyles.bgVideo, height: "100dvh", objectFit: "cover" }}
          />
        )}
      </div>

      {/* 2) 로고 */}
      <div
        style={{
          ...safeStyles.logoContainer,
          left: `${(logoPos?.x ?? 20)}px`,
          top: `${(logoPos?.y ?? 20)}px`,
          transition: "all 0.3s ease",
        }}
      >
        {logo ? (
          <img
            src={logo}
            alt="logo"
            style={{
              height: `${(logoSize ?? 50)}px`,
              width: "auto",
              objectFit: "contain",
              filter: "drop-shadow(0 0 15px rgba(0,0,0,0.5))",
            }}
          />
        ) : (
          <strong style={safeStyles.defaultLogo}>DAISY</strong>
        )}
      </div>

      {/* 3) 메인 */}
      <div style={safeStyles.mainContent}>
        <div>
          <div style={safeStyles.heroSection}>
            <h1 style={safeStyles.mainTitle}>{safeHero.title?.[safeLang] || "DAISY"}</h1>
            <p style={safeStyles.subTitle}>{safeHero.desc?.[safeLang] || ""}</p>
          </div>

          {!isAdmin && (
            <div style={safeStyles.authWrap}>
              <div style={{ ...safeStyles.authCard, padding: "50px 40px" }}>
                <h2 style={{ ...safeStyles.authTitle, fontSize: "28px", marginBottom: "35px" }}>
                  {mode === "login" ? safeT.login : safeT.signup}
                </h2>

                <input
                  style={{ ...safeStyles.authInput, height: "60px", fontSize: "18px", marginBottom: "20px" }}
                  placeholder={safeT.id}
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  onKeyDown={handleKeyDown}
                />

                <input
                  type="password"
                  style={{ ...safeStyles.authInput, height: "60px", fontSize: "18px", marginBottom: "20px" }}
                  placeholder={safeT.pw}
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  onKeyDown={handleKeyDown}
                />

                {mode === "signup" && (
                  <input
                    style={{
                      ...safeStyles.authInput,
                      height: "60px",
                      fontSize: "18px",
                      marginBottom: "20px",
                      border: "2px solid #ffb347",
                      background: "rgba(255,179,71,0.05)",
                    }}
                    placeholder={safeLang === "ko" ? "초대 코드를 입력하세요" : "Enter Invitation Code"}
                    value={ref}
                    onChange={(e) => setRef(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                )}

                <button
                  style={{ ...safeStyles.primaryBtn, height: "65px", fontSize: "20px", fontWeight: "900", marginTop: "10px" }}
                  onClick={() => (mode === "login" ? onLogin?.(id, pw) : signup())}
                >
                  {mode === "login" ? safeT.login : safeT.signup}
                </button>

                {mode === "login" && (
                  <button
                    style={{ ...safeStyles.guestBtn, height: "55px", marginTop: "15px" }}
                    onClick={onGuestLogin}
                  >
                    {safeT.guest}
                  </button>
                )}

                <div
                  style={{ ...safeStyles.authToggle, fontSize: "15px", marginTop: "30px" }}
                  onClick={() => {
                    setMode(mode === "login" ? "signup" : "login");
                    setId(""); setPw(""); setRef("");
                  }}
                >
                  {mode === "login"
                    ? (safeLang === "ko" ? "처음이신가요? 회원가입" : "New here? Sign Up")
                    : (safeLang === "ko" ? "이미 계정이 있나요? 로그인" : "Have an account? Login")}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
