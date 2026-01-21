console.log("🔥 VERCEL BUILD CHECK 2026-01-21 🔥");
import { useEffect, useState } from "react";
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

const BUILD_TAG = "INVITE_BUILD_20260121_V2";

/* =====================
   LANDING PAGE (초대코드 완성형 - 4중 폴백)
   ✅ 어떤 기기/브라우저에서도 통과되게 최대한 강하게

   초대코드 검증 우선순위:
   1) Firestore invite_codes/{CODE} (문서ID=CODE)
   2) Firestore invite_codes where code == CODE
   3) Firestore settings/global 안 필드들에서 찾기
   4) public/invite-codes.json 에서 찾기  (최후 보루)

   - 공백/대소문자 무시
   - active:false / used:true면 막기
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
  const safeLang = lang || "ko";
  const safeT = t || {
    login: "로그인",
    signup: "회원가입",
    id: "아이디",
    pw: "비밀번호",
    guest: "게스트",
  };
  const safeHero =
    hero || {
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
      bgOverlay: { position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)" },
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

  const [vw, setVw] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 1200));
  useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const isDesktop = vw >= 1024;
  const scale = 1;

  const [mode, setMode] = useState("login");
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [ref, setRef] = useState("");
  const [busy, setBusy] = useState(false);

  const toast = (ko, en) => alert(safeLang === "ko" ? ko : en);
  const isFn = (v) => typeof v === "function";

  const normalizeCode = (v) => String(v ?? "").trim().toUpperCase();

  const handleLogin = () => {
    if (busy) return;
    if (!isFn(onLogin)) return toast("onLogin이 함수가 아닙니다.", "onLogin is not a function.");
    onLogin(id, pw);
  };

  const handleGuest = () => {
    if (busy) return;
    if (!isFn(onGuestLogin)) return toast("onGuestLogin이 함수가 아닙니다.", "onGuestLogin is not a function.");
    onGuestLogin();
  };

  // (3) settings/global 안에서 찾기
  const fetchInviteFromSettings = async (CODE) => {
    try {
      const snap = await getDoc(doc(db, "settings", "global"));
      if (!snap.exists()) return { ok: false, via: "settings:none", data: null };

      const g = snap.data() || {};
      const candidates = [g.inviteCodes, g.invite_codes, g.invites, g.refCodes, g.ref_codes].filter(Boolean);

      // 배열: [{code:"112233", ...}]
      for (const c of candidates) {
        if (Array.isArray(c)) {
          const hit = c.find((x) => normalizeCode(x?.code || x?.id || x?.key) === CODE);
          if (hit) return { ok: true, via: "settings:array", data: hit };
        }
      }

      // 맵: {"112233": {...}}
      for (const c of candidates) {
        if (c && typeof c === "object" && !Array.isArray(c)) {
          const hit = c[CODE];
          if (hit) return { ok: true, via: "settings:map", data: hit };
        }
      }

      return { ok: false, via: "settings:miss", data: null };
    } catch (e) {
      return { ok: false, via: "settings:error", data: null, error: e?.message || String(e) };
    }
  };

  // (4) public/invite-codes.json 에서 찾기  (최후 보루)
  const fetchInviteFromJson = async (CODE) => {
    try {
      // ✅ 캐시 완전 무시 (다른 기기/브라우저도 최신 받게)
      const res = await fetch(`/invite-codes.json?v=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) return { ok: false, via: "json:fetch_fail", data: null };
      const raw = await res.json();

      // 허용 포맷들:
      // 1) ["112233", "A001"]
      // 2) [{code:"112233", name:"실장1", used:false, active:true}, ...]
      // 3) {"112233": {...}, "A001": {...}}
      let hit = null;

      if (Array.isArray(raw)) {
        if (raw.length && typeof raw[0] === "string") {
          hit = raw.find((x) => normalizeCode(x) === CODE);
          if (hit) return { ok: true, via: "json:array_string", data: { code: CODE } };
        }
        if (raw.length && typeof raw[0] === "object") {
          const obj = raw.find((x) => normalizeCode(x?.code || x?.id || x?.key) === CODE);
          if (obj) return { ok: true, via: "json:array_object", data: obj };
        }
      }

      if (raw && typeof raw === "object" && !Array.isArray(raw)) {
        const obj = raw[CODE];
        if (obj) return { ok: true, via: "json:map", data: obj };
      }

      return { ok: false, via: "json:miss", data: null };
    } catch (e) {
      return { ok: false, via: "json:error", data: null, error: e?.message || String(e) };
    }
  };

  // 초대코드 조회 (4중 폴백)
  const fetchInvite = async (CODE) => {
    // 1) invite_codes/{CODE}
    try {
      const refDoc = doc(db, "invite_codes", CODE);
      const snap = await getDoc(refDoc);
      if (snap.exists()) return { ok: true, docRef: refDoc, data: snap.data(), via: "invite_codes:docId" };
    } catch (e) {
      // Firestore 자체가 막혀도 아래 폴백으로 계속 진행
    }

    // 2) invite_codes where code == CODE
    try {
      const q = query(collection(db, "invite_codes"), where("code", "==", CODE));
      const qs = await getDocs(q);
      if (!qs.empty) {
        const first = qs.docs[0];
        return { ok: true, docRef: first.ref, data: first.data(), via: "invite_codes:query" };
      }
    } catch (e) {
      // 계속 진행
    }

    // 3) settings/global 폴백
    const fromSettings = await fetchInviteFromSettings(CODE);
    if (fromSettings.ok) return { ok: true, docRef: null, data: fromSettings.data, via: fromSettings.via };

    // 4) JSON 폴백 (최후 보루)
    const fromJson = await fetchInviteFromJson(CODE);
    if (fromJson.ok) return { ok: true, docRef: null, data: fromJson.data, via: fromJson.via };

    return { ok: false, docRef: null, data: null, via: "none" };
  };

  const signup = async () => {
    if (busy) return;

    const newId = (id || "").trim();
    const newPw = (pw || "").trim();
    const inputRef = normalizeCode(ref);

    if (!newId || !newPw || !inputRef) return toast("모든 정보를 입력해주세요.", "Please fill all info.");

    setBusy(true);
    try {
      const isMaster = inputRef === "ADMIN";

      let invite = null;
      if (!isMaster) {
        invite = await fetchInvite(inputRef);
        console.log("[INVITE CHECK]", { inputRef, via: invite?.via, invite });

        if (!invite.ok) {
          toast("존재하지 않거나 틀린 초대 코드입니다.", "Invalid invitation code.");
          return;
        }

        if (invite.data?.active === false) {
          toast("비활성화된 초대 코드입니다.", "This invitation code is disabled.");
          return;
        }
        if (invite.data?.used === true) {
          toast("이미 사용된 초대 코드입니다.", "This invitation code was already used.");
          return;
        }
      }

      // 아이디 중복
      const myUserRef = doc(db, "users", newId);
      const myUserSnap = await getDoc(myUserRef);
      if (myUserSnap.exists()) return toast("이미 존재하는 아이디입니다.", "ID already exists.");

      const agentName = invite?.data?.name || "";
      const generatedNo = String(Date.now());

      const newUser = {
        id: newId,
        pw: newPw,
        password: newPw,
        no: generatedNo,
        referral: inputRef,
        diamond: 0,
        refCode: newId.toUpperCase(),
        agentName,
        joinedAt: new Date().toISOString(),
        createdAt: serverTimestamp(),
      };

      await setDoc(myUserRef, newUser);

      // invite_codes 문서가 실제 존재할 때만 업데이트 시도
      if (invite?.docRef) {
        try {
          await updateDoc(invite.docRef, {
            usedCount: increment(1),
            lastUsedAt: serverTimestamp(),
            // 단발코드로 쓰고 싶으면 주석 해제
            // used: true,
          });
        } catch (e) {
          console.warn("[invite update] skipped:", e?.message || e);
        }
      }

      if (typeof setUsers === "function") setUsers([...(safeUsers || []), newUser]);

      toast("성공적으로 가입되었습니다! 로그인해주세요.", "Signup Success! Please Login.");
      setId("");
      setPw("");
      setRef("");
      setMode("login");
    } catch (e) {
      console.error("[signup] ERROR", e);
      const msg = String(e?.message || e);
      toast(`회원가입 오류: ${msg}`, `Signup error: ${msg}`);
    } finally {
      setBusy(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key !== "Enter") return;
    if (mode === "login") handleLogin();
    else signup();
  };

  return (
    <div style={{ ...safeStyles.landingWrapper, minHeight: "100dvh", position: "relative" }}>
      {/* ✅ 빌드 태그: 다른 기기에서 “최신 코드 반영” 확인용 */}
      <div
        style={{
          position: "fixed",
          bottom: 8,
          right: 10,
          fontSize: 11,
          opacity: 0.55,
          zIndex: 999999,
          userSelect: "text",
          pointerEvents: "none",
        }}
      >
        {BUILD_TAG}
      </div>

      {/* 배경 */}
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

      {/* 로고 */}
      <div style={{ ...safeStyles.logoContainer, left: `${logoPos?.x ?? 20}px`, top: `${logoPos?.y ?? 20}px`, transition: "all 0.3s ease" }}>
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

      {/* 메인 */}
      <div style={safeStyles.mainContent}>
        <div style={{ width: "100%", maxWidth: 520 }}>
          <div style={safeStyles.heroSection}>
            <h1 style={{ ...safeStyles.mainTitle, fontSize: isDesktop ? 34 : safeStyles.mainTitle.fontSize }}>
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
                <h2 style={{ ...safeStyles.authTitle, fontSize: isDesktop ? "22px" : "28px", marginBottom: isDesktop ? "22px" : "35px" }}>
                  {mode === "login" ? safeT.login : safeT.signup}
                </h2>

                <input
                  style={{ ...safeStyles.authInput, height: isDesktop ? "48px" : "60px", fontSize: isDesktop ? "16px" : "18px", marginBottom: "16px" }}
                  placeholder={safeT.id}
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={busy}
                />

                <input
                  type="password"
                  style={{ ...safeStyles.authInput, height: isDesktop ? "48px" : "60px", fontSize: isDesktop ? "16px" : "18px", marginBottom: "16px" }}
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
                  {busy ? (safeLang === "ko" ? "처리중..." : "Processing...") : mode === "login" ? safeT.login : safeT.signup}
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
