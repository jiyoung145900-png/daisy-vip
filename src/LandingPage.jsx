import { useEffect, useMemo, useState } from "react";
import { db } from "./firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";

/* =====================
   LANDING PAGE (완성형/안전형)
   - Firestore 초대코드 가입
   - 초대코드 타입 지원:
     1) invite_codes/{CODE} (실장코드)
     2) users where refCode == CODE (유저 추천코드)
     3) ADMIN
   - onLogin/onGuestLogin 함수 방어(빌드 후 TypeError 방지)
   - refCode 대문자 통일(추천코드 대소문자 이슈 해결)
   - busy 확실히 해제(중간 return에서도 finally 적용)
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
  /* ---------- 안전 기본값(크래시 방지) ---------- */
  const safeLang = lang || "ko";
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

  const safeUsers = Array.isArray(users) ? users : [];

  const safeStyles =
    styles ||
    ({
      landingWrapper: {
        minHeight: "100dvh",
        background: "#000",
        color: "#fff",
        position: "relative",
      },
      bgWrap: {},
      bgOverlay: {
        position: "absolute",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
      },
      bgVideo: { position: "absolute", inset: 0, width: "100%" },

      logoContainer: { position: "absolute", left: 20, top: 20, zIndex: 2 },
      defaultLogo: { fontSize: 24, fontWeight: 900 },

      mainContent: {
        position: "relative",
        zIndex: 2,
        display: "flex",
        justifyContent: "center",
        paddingTop: 140,
        paddingLeft: 16,
        paddingRight: 16,
      },
      heroSection: { textAlign: "center", marginBottom: 30 },
      mainTitle: { fontSize: 34, fontWeight: 900 },
      subTitle: { opacity: 0.8 },

      authWrap: { display: "flex", justifyContent: "center" },
      authCard: {
        width: 420,
        maxWidth: "92vw",
        background: "rgba(0,0,0,0.55)",
        border: "1px solid #333",
        borderRadius: 16,
        backdropFilter: "blur(6px)",
      },
      authTitle: { fontWeight: 900 },
      authInput: {
        width: "100%",
        padding: 14,
        borderRadius: 10,
        border: "1px solid #333",
        background: "#111",
        color: "#fff",
        outline: "none",
      },
      primaryBtn: {
        width: "100%",
        padding: 16,
        borderRadius: 12,
        border: "none",
        background: "#ffb347",
        fontWeight: 900,
        cursor: "pointer",
      },
      guestBtn: {
        width: "100%",
        padding: 14,
        borderRadius: 12,
        border: "1px solid #333",
        background: "#111",
        color: "#fff",
        cursor: "pointer",
      },
      authToggle: {
        marginTop: 16,
        cursor: "pointer",
        opacity: 0.85,
        textAlign: "center",
        userSelect: "none",
      },
    });

  /* ---------- PC에서 너무 크게 보이는 문제 해결 ---------- */
  const [vw, setVw] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 1200
  );

  useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const isDesktop = vw >= 1024;

  const ui = useMemo(() => {
    if (!isDesktop) {
      return {
        scale: 1,
        cardPadding: "50px 40px",
        titleSize: "28px",
        inputH: "60px",
        inputF: "18px",
        btnH: "65px",
        btnF: "20px",
        guestH: "55px",
        toggleF: "15px",
        maxWidth: 520,
      };
    }
    return {
      scale: 0.86,
      cardPadding: "34px 28px",
      titleSize: "22px",
      inputH: "48px",
      inputF: "16px",
      btnH: "52px",
      btnF: "18px",
      guestH: "44px",
      toggleF: "13px",
      maxWidth: 520,
    };
  }, [isDesktop]);

  /* ---------- 상태 ---------- */
  const [mode, setMode] = useState("login");
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [ref, setRef] = useState("");
  const [busy, setBusy] = useState(false);

  /* ---------- 유틸 ---------- */
  const isFn = (v) => typeof v === "function";
  const toast = (ko, en) => alert(safeLang === "ko" ? ko : en);

  /* ---------- 초대코드 검증 ---------- */
  const validateInvite = async (codeUpper) => {
    // 1) 실장코드: invite_codes/{CODE}
    const inviteSnap = await getDoc(doc(db, "invite_codes", codeUpper));
    if (inviteSnap.exists()) {
      return {
        ok: true,
        type: "agent",
        agentName: inviteSnap.data()?.name || "",
      };
    }

    // 2) 유저 추천코드: users where refCode == CODE
    const qRef = query(
      collection(db, "users"),
      where("refCode", "==", codeUpper),
      limit(1)
    );
    const refSnap = await getDocs(qRef);
    if (!refSnap.empty) {
      return { ok: true, type: "user", agentName: "" };
    }

    // 3) 마스터
    if (codeUpper === "ADMIN") {
      return { ok: true, type: "master", agentName: "" };
    }

    return { ok: false };
  };

  /* ---------- 로그인/게스트 안전 호출 ---------- */
  const handleLoginClick = () => {
    if (busy) return;
    if (!isFn(onLogin)) {
      toast("onLogin이 함수로 전달되지 않았습니다.", "onLogin is not a function.");
      return;
    }
    onLogin(id, pw);
  };

  const handleGuestClick = () => {
    if (busy) return;
    if (!isFn(onGuestLogin)) {
      toast("onGuestLogin이 함수로 전달되지 않았습니다.", "onGuestLogin is not a function.");
      return;
    }
    onGuestLogin();
  };

  /* ---------- 회원가입 ---------- */
  const signup = async () => {
    if (busy) return;

    const newId = (id || "").trim();
    const newPw = (pw || "").trim();
    const inputRef = (ref || "").trim().toUpperCase();

    if (!newId || !newPw || !inputRef) {
      toast("모든 정보를 입력해주세요.", "Please fill all info.");
      return;
    }

    setBusy(true);
    try {
      // 1) 초대코드 검증
      const inviteRes = await validateInvite(inputRef);
      if (!inviteRes.ok) {
        toast("존재하지 않거나 틀린 초대 코드입니다.", "Invalid invitation code.");
        return;
      }

      // 2) 아이디 중복 체크
      const myUserRef = doc(db, "users", newId);
      const myUserSnap = await getDoc(myUserRef);
      if (myUserSnap.exists()) {
        toast("이미 존재하는 아이디입니다.", "ID already exists.");
        return;
      }

      // 3) 문서 생성
      const generatedNo = String(Date.now());

      // ✅ refCode는 무조건 대문자로 저장 (추천코드 대소문자 이슈 방지)
      const myRefCode = newId.toUpperCase();

      const newUser = {
        id: newId,
        pw: newPw, // 기존 호환
        password: newPw, // admin 호환
        no: generatedNo,
        referral: inputRef, // 추천인/실장 코드
        diamond: 0,
        refCode: myRefCode, // ✅ 내 추천코드
        agentName: inviteRes.agentName || "",
        joinedAt: new Date().toISOString(),
        createdAt: serverTimestamp(),
      };

      await setDoc(myUserRef, newUser);

      if (typeof setUsers === "function") {
        setUsers([...(safeUsers || []), newUser]);
      }

      toast("성공적으로 가입되었습니다! 로그인해주세요.", "Signup success! Please login.");
      setId("");
      setPw("");
      setRef("");
      setMode("login");
    } catch (e) {
      console.error("[signup] ERROR", e);
      toast(`회원가입 오류: ${e?.message || e}`, `Signup error: ${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  };

  /* ---------- Enter 키 ---------- */
  const handleKeyDown = (e) => {
    if (e.key !== "Enter") return;
    if (mode === "login") handleLoginClick();
    else signup();
  };

  return (
    <div
      style={{
        ...safeStyles.landingWrapper,
        minHeight: "100dvh",
        position: "relative",
      }}
    >
      {/* 1) 배경 */}
      <div
        style={{
          ...safeStyles.bgWrap,
          minHeight: "100dvh",
          position: "absolute",
          inset: 0,
          overflow: "hidden",
        }}
      >
        <div style={safeStyles.bgOverlay} />

        {safeHero.mode === "image" && safeHero.imageSrc && (
          <img
            src={safeHero.imageSrc}
            alt=""
            draggable={false}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100dvh",
              objectFit: "cover",
              zIndex: -1,
            }}
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
            style={{
              ...safeStyles.bgVideo,
              height: "100dvh",
              objectFit: "cover",
            }}
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
        <div style={{ width: "100%", maxWidth: ui.maxWidth }}>
          <div style={safeStyles.heroSection}>
            <h1
              style={{
                ...safeStyles.mainTitle,
                fontSize: isDesktop ? 30 : safeStyles.mainTitle.fontSize,
              }}
            >
              {safeHero.title?.[safeLang] || "DAISY"}
            </h1>
            <p style={safeStyles.subTitle}>{safeHero.desc?.[safeLang] || ""}</p>
          </div>

          {!isAdmin && (
            <div style={safeStyles.authWrap}>
              <div
                style={{
                  ...safeStyles.authCard,
                  padding: ui.cardPadding,
                  transform: `scale(${ui.scale})`,
                  transformOrigin: "top center",
                  opacity: busy ? 0.9 : 1,
                }}
              >
                <h2
                  style={{
                    ...safeStyles.authTitle,
                    fontSize: ui.titleSize,
                    marginBottom: isDesktop ? 22 : 35,
                  }}
                >
                  {mode === "login" ? safeT.login : safeT.signup}
                </h2>

                <input
                  style={{
                    ...safeStyles.authInput,
                    height: ui.inputH,
                    fontSize: ui.inputF,
                    marginBottom: "16px",
                  }}
                  placeholder={safeT.id}
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={busy}
                />

                <input
                  type="password"
                  style={{
                    ...safeStyles.authInput,
                    height: ui.inputH,
                    fontSize: ui.inputF,
                    marginBottom: "16px",
                  }}
                  placeholder={safeT.pw}
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={busy}
                />

                {mode === "signup" && (
                  <input
                    style={{
                      ...safeStyles.authInput,
                      height: ui.inputH,
                      fontSize: ui.inputF,
                      marginBottom: "16px",
                      border: "2px solid #ffb347",
                      background: "rgba(255,179,71,0.05)",
                    }}
                    placeholder={
                      safeLang === "ko"
                        ? "초대 코드를 입력하세요"
                        : "Enter Invitation Code"
                    }
                    value={ref}
                    onChange={(e) => setRef(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={busy}
                  />
                )}

                <button
                  style={{
                    ...safeStyles.primaryBtn,
                    height: ui.btnH,
                    fontSize: ui.btnF,
                    fontWeight: "900",
                    marginTop: "6px",
                    cursor: busy ? "wait" : "pointer",
                    opacity: busy ? 0.8 : 1,
                  }}
                  onClick={() => (mode === "login" ? handleLoginClick() : signup())}
                  disabled={busy}
                >
                  {busy
                    ? safeLang === "ko"
                      ? "처리중..."
                      : "Processing..."
                    : mode === "login"
                    ? safeT.login
                    : safeT.signup}
                </button>

                {mode === "login" && (
                  <button
                    style={{
                      ...safeStyles.guestBtn,
                      height: ui.guestH,
                      marginTop: "12px",
                      opacity: busy ? 0.6 : 1,
                      cursor: busy ? "not-allowed" : "pointer",
                    }}
                    onClick={handleGuestClick}
                    disabled={busy}
                  >
                    {safeT.guest}
                  </button>
                )}

                <div
                  style={{
                    ...safeStyles.authToggle,
                    fontSize: ui.toggleF,
                    marginTop: isDesktop ? "18px" : "30px",
                    pointerEvents: busy ? "none" : "auto",
                    opacity: busy ? 0.6 : 0.85,
                  }}
                  onClick={() => {
                    if (busy) return;
                    setMode(mode === "login" ? "signup" : "login");
                    setId("");
                    setPw("");
                    setRef("");
                  }}
                >
                  {mode === "login"
                    ? safeLang === "ko"
                      ? "처음이신가요? 회원가입"
                      : "New here? Sign Up"
                    : safeLang === "ko"
                    ? "이미 계정이 있나요? 로그인"
                    : "Have an account? Login"}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
