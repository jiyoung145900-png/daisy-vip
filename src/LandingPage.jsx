import { useEffect, useMemo, useState } from "react";
import { db } from "./firebase";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  increment,
} from "firebase/firestore";

/* =====================
   LANDING PAGE (완성형)
   - Firestore 초대코드(어드민 생성)로 회원가입
   - 초대코드 검증:
      1) invite_codes/{CODE} (문서ID=CODE)
      2) (백업) invite_codes where code == CODE (자동ID 저장 케이스 대응)
      3) ADMIN 마스터 코드
   - 권한 오류(Missing permissions) 구분 메시지
   - onLogin/onGuestLogin 함수 방어 (d is not a function 방지)
   - PC UI 과대 자동 축소(반응형)
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
  // ---- 안전 기본값(크래시 방지) ----
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

  // ---- 반응형(PC에서 너무 큰 문제 해결) ----
  const [vw, setVw] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 1200
  );
  useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const isDesktop = vw >= 1024;
  const scale = useMemo(() => (isDesktop ? 0.82 : 1), [isDesktop]);

  // ---- 상태 ----
  const [mode, setMode] = useState("login");
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [ref, setRef] = useState("");
  const [busy, setBusy] = useState(false);

  const toast = (ko, en) => alert(safeLang === "ko" ? ko : en);
  const isFn = (v) => typeof v === "function";

  // ---- 로그인/게스트 안전 호출 ----
  const handleLogin = () => {
    if (busy) return;
    if (!isFn(onLogin)) {
      toast("onLogin이 함수로 전달되지 않았습니다.", "onLogin is not a function.");
      return;
    }
    onLogin(id, pw);
  };

  const handleGuest = () => {
    if (busy) return;
    if (!isFn(onGuestLogin)) {
      toast(
        "onGuestLogin이 함수로 전달되지 않았습니다.",
        "onGuestLogin is not a function."
      );
      return;
    }
    onGuestLogin();
  };

  // ✅ 초대코드 조회(문서ID 우선, 없으면 where code== 로 백업)
  const fetchInvite = async (CODE) => {
    // 1) 문서ID로 조회
    const refDoc = doc(db, "invite_codes", CODE);
    const snap = await getDoc(refDoc);
    if (snap.exists()) {
      return { ok: true, docRef: refDoc, data: snap.data(), via: "docId" };
    }

    // 2) 자동ID 저장 케이스: code 필드로 조회
    const q = query(collection(db, "invite_codes"), where("code", "==", CODE));
    const qs = await getDocs(q);
    if (!qs.empty) {
      const first = qs.docs[0];
      return { ok: true, docRef: first.ref, data: first.data(), via: "query" };
    }

    return { ok: false, docRef: null, data: null, via: "none" };
  };

  // ---- 회원가입(Firestore 기반) ----
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
      const isMaster = inputRef === "ADMIN";

      // ✅ 초대코드 검증 (반드시 존재해야 가입)
      let invite = null;
      if (!isMaster) {
        invite = await fetchInvite(inputRef);
        if (!invite.ok) {
          toast("존재하지 않거나 틀린 초대 코드입니다.", "Invalid invitation code.");
          return;
        }

        // active 필드가 있으면 비활성 코드 막기 (없으면 통과)
        if (invite.data?.active === false) {
          toast("비활성화된 초대 코드입니다.", "This invitation code is disabled.");
          return;
        }
      }

      // 아이디 중복 체크
      const myUserRef = doc(db, "users", newId);
      const myUserSnap = await getDoc(myUserRef);
      if (myUserSnap.exists()) {
        toast("이미 존재하는 아이디입니다.", "ID already exists.");
        return;
      }

      const agentName = invite?.data?.name || "";
      const generatedNo = String(Date.now());

      const newUser = {
        id: newId,
        pw: newPw,          // 기존 호환
        password: newPw,    // admin 호환
        no: generatedNo,
        referral: inputRef, // ✅ 가입에 사용된 초대코드(ADMIN 포함)
        diamond: 0,
        refCode: newId.toUpperCase(), // 내 추천코드(기본)

        agentName,
        joinedAt: new Date().toISOString(),
        createdAt: serverTimestamp(),
      };

      await setDoc(myUserRef, newUser);

      // ✅ 초대코드 사용 카운트 기록(선택)
      // (Rules에서 update 허용되어야 함. 막혀있으면 실패해도 가입은 유지)
      if (invite?.docRef) {
        try {
          await updateDoc(invite.docRef, {
            usedCount: increment(1),
            lastUsedAt: serverTimestamp(),
          });
        } catch (e) {
          // 권한 없으면 무시(가입 자체는 성공)
          console.warn("[invite update] skipped:", e?.message || e);
        }
      }

      if (typeof setUsers === "function") {
        setUsers([...(safeUsers || []), newUser]);
      }

      toast("성공적으로 가입되었습니다! 로그인해주세요.", "Signup Success! Please Login.");
      setId("");
      setPw("");
      setRef("");
      setMode("login");
    } catch (e) {
      console.error("[signup] ERROR", e);

      const msg = String(e?.message || e);
      if (msg.includes("Missing or insufficient permissions")) {
        toast(
          "초대코드 확인 권한이 없습니다. (Firebase Rules에서 invite_codes 읽기 허용 필요)",
          "No permission to read invite code. Check Firebase Rules (allow read invite_codes)."
        );
        return;
      }

      toast(`회원가입 오류: ${msg}`, `Signup error: ${msg}`);
    } finally {
      setBusy(false);
    }
  };

  // ✅ Enter 키 처리
  const handleKeyDown = (e) => {
    if (e.key !== "Enter") return;
    if (mode === "login") handleLogin();
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
          left: `${logoPos?.x ?? 20}px`,
          top: `${logoPos?.y ?? 20}px`,
          transition: "all 0.3s ease",
        }}
      >
        {logo ? (
          <img
            src={logo}
            alt="logo"
            style={{
              height: `${logoSize ?? 50}px`,
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
        <div style={{ width: "100%", maxWidth: 520 }}>
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
                  padding: isDesktop ? "34px 28px" : "50px 40px",
                  transform: `scale(${scale})`,
                  transformOrigin: "top center",
                  opacity: busy ? 0.9 : 1,
                }}
              >
                <h2
                  style={{
                    ...safeStyles.authTitle,
                    fontSize: isDesktop ? "22px" : "28px",
                    marginBottom: isDesktop ? "22px" : "35px",
                  }}
                >
                  {mode === "login" ? safeT.login : safeT.signup}
                </h2>

                <input
                  style={{
                    ...safeStyles.authInput,
                    height: isDesktop ? "48px" : "60px",
                    fontSize: isDesktop ? "16px" : "18px",
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
                    height: isDesktop ? "48px" : "60px",
                    fontSize: isDesktop ? "16px" : "18px",
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
                      height: isDesktop ? "48px" : "60px",
                      fontSize: isDesktop ? "16px" : "18px",
                      marginBottom: "16px",
                      border: "2px solid #ffb347",
                      background: "rgba(255,179,71,0.05)",
                    }}
                    placeholder={safeLang === "ko" ? "초대 코드를 입력하세요" : "Enter Invitation Code"}
                    value={ref}
                    onChange={(e) => setRef(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={busy}
                  />
                )}

                <button
                  style={{
                    ...safeStyles.primaryBtn,
                    height: isDesktop ? "52px" : "65px",
                    fontSize: isDesktop ? "18px" : "20px",
                    fontWeight: "900",
                    marginTop: "6px",
                    cursor: busy ? "wait" : "pointer",
                    opacity: busy ? 0.85 : 1,
                  }}
                  onClick={() => (mode === "login" ? handleLogin() : signup())}
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
                      height: isDesktop ? "44px" : "55px",
                      marginTop: "12px",
                      cursor: busy ? "not-allowed" : "pointer",
                      opacity: busy ? 0.6 : 1,
                    }}
                    onClick={handleGuest}
                    disabled={busy}
                  >
                    {safeT.guest}
                  </button>
                )}

                <div
                  style={{
                    ...safeStyles.authToggle,
                    fontSize: isDesktop ? "13px" : "15px",
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
