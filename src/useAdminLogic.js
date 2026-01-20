import { useState, useEffect, useMemo } from "react";
import { db } from "./firebase";
import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
  updateDoc,
  getDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

const CONFIG = {
  ROUND_DURATION: 65,
  BASE_ROUND: 1824231,
  START_TIME: new Date("2024-01-01T00:00:00Z").getTime(),
  ONE_WEEK_ROUNDS: 9300,
  ONE_MONTH_ROUNDS: 40000,
};

export const useAdminLogic = (users, setUsers) => {
  const [currentInfo, setCurrentInfo] = useState({
    currentRound: 0,
    timeLeft: 0,
    isDrawing: false,
  });
  const [targetRound, setTargetRound] = useState(0);
  const [queue, setQueue] = useState({});
  const [gameHistory, setGameHistory] = useState([]);
  const [sponsorships, setSponsorships] = useState([]);

  const [depositRequests, setDepositRequests] = useState([]);
  const [withdrawRequests, setWithdrawRequests] = useState([]);
  const [financeHistory, setFinanceHistory] = useState([]);

  // ✅ 실장(추천코드) = Firestore invite_codes
  const [agents, setAgents] = useState([]);
  const [newAgentName, setNewAgentName] = useState("");
  const [newAgentCode, setNewAgentCode] = useState("");

  const activeUsers = useMemo(() => {
    const now = Date.now();
    return users.filter((u) => u.lastActive && now - u.lastActive < 60000);
  }, [users]);

  // 안전한 저장 헬퍼 (undefined 제거)
  const saveGlobalUsers = async (updatedUsers) => {
    const cleanUsers = JSON.parse(JSON.stringify(updatedUsers));
    await setDoc(doc(db, "settings", "global"), { users: cleanUsers }, { merge: true });
  };

  // --- 1. 데이터 로드 및 리스너 ---
  useEffect(() => {
    const unsubQueue = onSnapshot(collection(db, "event_manipulation"), (snap) => {
      const q = {};
      snap.forEach((d) => (q[d.id] = d.data().items));
      setQueue(q);
    });

    const unsubBets = onSnapshot(
      query(collection(db, "event_bets"), orderBy("round", "desc"), limit(100)),
      (snap) => {
        const bets = [];
        snap.forEach((d) => bets.push({ id: d.id, ...d.data() }));
        if (bets.length > 0) setSponsorships(bets);
      }
    );

    const unsubDep = onSnapshot(
      query(collection(db, "deposit_requests"), orderBy("timestamp", "desc")),
      (snap) => {
        const reqs = [];
        snap.forEach((d) => reqs.push({ id: d.id, ...d.data() }));
        setDepositRequests(reqs);
      }
    );

    const unsubWdr = onSnapshot(
      query(collection(db, "withdraw_requests"), orderBy("timestamp", "desc")),
      (snap) => {
        const reqs = [];
        snap.forEach((d) => reqs.push({ id: d.id, ...d.data() }));
        setWithdrawRequests(reqs);
      }
    );

    const unsubFin = onSnapshot(
      query(collection(db, "finance_history"), orderBy("completedAt", "desc"), limit(50)),
      (snap) => {
        const logs = [];
        snap.forEach((d) => logs.push({ id: d.id, ...d.data() }));
        setFinanceHistory(logs);
      }
    );

    // ✅ [핵심] 추천코드(실장) 목록 = Firestore invite_codes 실시간 구독
    const unsubAgents = onSnapshot(collection(db, "invite_codes"), (snap) => {
      const list = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      // 보기 좋게 정렬(선택)
      list.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
      setAgents(list);
    });

    // 기존 로컬 기록(그대로 유지)
    const gHistory = JSON.parse(localStorage.getItem("event_total_history") || "[]");
    setGameHistory(gHistory.sort((a, b) => b.round - a.round));

    const syncTimer = setInterval(() => {
      const now = Date.now();
      const elapsed = now - CONFIG.START_TIME;
      const round = CONFIG.BASE_ROUND + Math.floor(elapsed / (CONFIG.ROUND_DURATION * 1000));
      const remainingMs =
        CONFIG.ROUND_DURATION * 1000 - (elapsed % (CONFIG.ROUND_DURATION * 1000));
      let timeLeft = Math.floor(remainingMs / 1000);
      if (timeLeft >= CONFIG.ROUND_DURATION) timeLeft = 0;

      setCurrentInfo({ currentRound: round, timeLeft, isDrawing: timeLeft <= 5 });
      setTargetRound((prev) => (prev === 0 ? round + 1 : prev));
    }, 1000);

    return () => {
      unsubQueue();
      unsubBets();
      unsubDep();
      unsubWdr();
      unsubFin();
      unsubAgents();
      clearInterval(syncTimer);
    };
  }, []);

  // --- 2. 액션 핸들러 ---

  // 유저 정보 수정
  const updateFullUserInfo = async (userId, newPoint, newRefCode, newReferral) => {
    const pInt = parseInt(newPoint);
    if (isNaN(pInt)) return alert("숫자를 입력하세요.");

    try {
      const updated = users.map((u) =>
        u.id === userId
          ? {
              ...u,
              diamond: pInt,
              refCode: newRefCode || "",
              referral: newReferral || "",
            }
          : u
      );
      setUsers(updated);
      localStorage.setItem("users", JSON.stringify(updated));
      await saveGlobalUsers(updated);

      // users 컬렉션에도 반영(실패해도 진행)
      try {
        await updateDoc(doc(db, "users", userId), {
          diamond: pInt,
          refCode: newRefCode || "",
          referral: newReferral || "",
        });
      } catch (e) {}

      alert(`[${userId}] 정보 수정 완료`);
    } catch (e) {
      alert("저장 실패: " + e.message);
    }
  };

  // 유저 비밀번호 변경
  const handleChangeUserPassword = async (userId) => {
    const newPass = window.prompt(`[${userId}] 새 비밀번호 입력:`);
    if (!newPass) return;

    try {
      const updated = users.map((u) => (u.id === userId ? { ...u, password: newPass } : u));
      setUsers(updated);
      localStorage.setItem("users", JSON.stringify(updated));
      await saveGlobalUsers(updated);

      try {
        await updateDoc(doc(db, "users", userId), { password: newPass });
      } catch (e) {}

      alert("비밀번호 변경 완료");
    } catch (e) {
      alert("변경 실패");
    }
  };

  // 게임 관리자(gamePw) 변경
  const handleChangeAdminPassword = async () => {
    const newPass = window.prompt("변경할 '게임 관리자(game)' 접속 비밀번호를 입력하세요:");
    if (!newPass) return;

    try {
      await setDoc(doc(db, "settings", "global"), { gamePw: newPass }, { merge: true });
      localStorage.setItem("daisy_game_password", newPass);
      alert(`게임 관리자 비밀번호가 즉시 서버에 저장되었습니다! ✅\n변경됨: ${newPass}`);
    } catch (e) {
      alert("저장 실패: " + e.message);
    }
  };

  // 입금 승인
  const approveDeposit = async (req) => {
    if (!window.confirm(`${req.userId}님의 ${req.amount.toLocaleString()} DIA 입금을 승인하시겠습니까?`))
      return;

    try {
      const globalRef = doc(db, "settings", "global");
      const globalSnap = await getDoc(globalRef);
      const allUsers = globalSnap.exists() ? globalSnap.data().users || [] : [];

      const targetUser = allUsers.find((u) => u.id === req.userId);
      const currentDia = targetUser ? targetUser.diamond || 0 : 0;
      const newDia = currentDia + req.amount;

      const updatedUsers = allUsers.map((u) => (u.id === req.userId ? { ...u, diamond: newDia } : u));

      setUsers(updatedUsers);
      await saveGlobalUsers(updatedUsers);

      try {
        await updateDoc(doc(db, "users", req.userId), { diamond: newDia });
      } catch (e) {}

      await addDoc(collection(db, "finance_history"), {
        ...req,
        type: "입금",
        status: "완료",
        completedAt: new Date().toISOString(),
      });

      await deleteDoc(doc(db, "deposit_requests", req.id));
      alert("입금 승인 완료!");
    } catch (e) {
      alert("오류 발생: " + e.message);
    }
  };

  // 출금 승인
  const approveWithdraw = async (req) => {
    if (!window.confirm(`${req.userId}님의 출금을 처리완료(차감) 하시겠습니까?`)) return;

    try {
      const globalRef = doc(db, "settings", "global");
      const globalSnap = await getDoc(globalRef);
      const allUsers = globalSnap.exists() ? globalSnap.data().users || [] : [];

      const targetUser = allUsers.find((u) => u.id === req.userId);
      const currentDia = targetUser ? targetUser.diamond || 0 : 0;

      if (currentDia < req.amount) {
        if (
          !window.confirm(
            `[경고] 유저의 잔액(${currentDia})이 출금액(${req.amount})보다 부족합니다. 진행합니까?`
          )
        )
          return;
      }

      const newDia = currentDia - req.amount;
      const updatedUsers = allUsers.map((u) => (u.id === req.userId ? { ...u, diamond: newDia } : u));

      setUsers(updatedUsers);
      await saveGlobalUsers(updatedUsers);

      try {
        await updateDoc(doc(db, "users", req.userId), { diamond: newDia });
      } catch (e) {}

      await addDoc(collection(db, "finance_history"), {
        ...req,
        type: "출금",
        status: "완료",
        completedAt: new Date().toISOString(),
      });

      await deleteDoc(doc(db, "withdraw_requests", req.id));
      alert("출금 처리 및 차감 완료!");
    } catch (e) {
      alert("오류 발생: " + e.message);
    }
  };

  // 결과 조작
  const handleApplyManipulation = async (items) => {
    if (items.length !== 2) return alert("아이템 2개 선택 필요");
    try {
      await setDoc(doc(db, "event_manipulation", String(targetRound)), {
        items,
        updatedAt: new Date().toISOString(),
      });
      setQueue({ ...queue, [targetRound]: items });
      alert(`[${targetRound}회차] 조작 예약됨`);
      return true;
    } catch (e) {
      alert("실패");
      return false;
    }
  };

  const deleteQueue = async (round) => {
    try {
      await deleteDoc(doc(db, "event_manipulation", String(round)));
      const q = { ...queue };
      delete q[round];
      setQueue(q);
    } catch (e) {
      alert("삭제 실패");
    }
  };

  /* ------------------------------------------------------------------ */
  /* ✅ 추천코드(실장) 관리: Firestore invite_codes */
  /* ------------------------------------------------------------------ */
  const addAgent = async () => {
    const name = (newAgentName || "").trim();
    const code = (newAgentCode || "").trim().toUpperCase();

    if (!name) return alert("이름을 입력하세요.");
    if (!code) return alert("코드를 입력하세요.");

    try {
      // 중복 체크
      const snap = await getDoc(doc(db, "invite_codes", code));
      if (snap.exists()) return alert("이미 존재하는 코드입니다.");

      await setDoc(doc(db, "invite_codes", code), {
        name,
        code,
        active: true,
        createdAt: serverTimestamp(),
      });

      setNewAgentName("");
      setNewAgentCode("");
      alert("추천코드 등록 완료 ✅");
    } catch (e) {
      console.error(e);
      alert("등록 실패: " + (e?.message || e));
    }
  };

  const deleteAgent = async (code) => {
    const upper = String(code || "").trim().toUpperCase();
    if (!upper) return;

    if (!window.confirm(`[${upper}] 코드를 삭제하시겠습니까?`)) return;

    try {
      await deleteDoc(doc(db, "invite_codes", upper));
      alert("삭제 완료 ✅");
    } catch (e) {
      console.error(e);
      alert("삭제 실패: " + (e?.message || e));
    }
  };

  return {
    currentInfo,
    targetRound,
    setTargetRound,
    queue,
    deleteQueue,
    gameHistory,
    sponsorships,
    activeUsers,

    depositRequests,
    withdrawRequests,
    financeHistory,
    approveDeposit,
    approveWithdraw,

    agents,
    newAgentName,
    setNewAgentName,
    newAgentCode,
    setNewAgentCode,
    addAgent,
    deleteAgent, // ✅ AgentsView 삭제 버튼이 이걸 필요로 함

    handleApplyManipulation,
    updateFullUserInfo,
    handleChangeUserPassword,
    handleChangeAdminPassword,
  };
};
