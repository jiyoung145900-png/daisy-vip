import { useState, useEffect, useMemo } from "react";
import { db } from "./firebase";
import {
  doc, setDoc, deleteDoc, collection, onSnapshot,
  query, orderBy, limit, updateDoc, getDoc, addDoc,
  serverTimestamp
} from "firebase/firestore";

const CONFIG = {
  ROUND_DURATION: 65,
  BASE_ROUND: 1824231,
  START_TIME: new Date("2024-01-01T00:00:00Z").getTime(),
};

export const useAdminLogic = (initialUsers, setInitialUsers) => {
  const [users, setUsers] = useState(initialUsers || []);

  const [currentInfo, setCurrentInfo] = useState({ currentRound: 0, timeLeft: 0, isDrawing: false });
  const [targetRound, setTargetRound] = useState(0);
  const [queue, setQueue] = useState({});
  const [gameHistory, setGameHistory] = useState([]);
  const [sponsorships, setSponsorships] = useState([]);

  const [depositRequests, setDepositRequests] = useState([]);
  const [withdrawRequests, setWithdrawRequests] = useState([]);
  const [financeHistory, setFinanceHistory] = useState([]);

  // 🔥 실장 / 총판
  const [agents, setAgents] = useState([]);
  const [newAgentName, setNewAgentName] = useState("");
  const [newAgentCode, setNewAgentCode] = useState("");

  const activeUsers = useMemo(() => {
    const now = Date.now();
    return users.filter(u => u.lastActive && (now - u.lastActive < 60000));
  }, [users]);

  /* ------------------------------------------------------------------ */
  /* 실시간 리스너 통합 */
  /* ------------------------------------------------------------------ */
  useEffect(() => {

    // 유저
    const unsubUsers = onSnapshot(collection(db, "users"), snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0));
      setUsers(list);
      if (setInitialUsers) setInitialUsers(list);
    });

    // 결과 조작
    const unsubQueue = onSnapshot(collection(db, "event_manipulation"), snap => {
      const q = {};
      snap.forEach(d => q[d.id] = d.data().winner);
      setQueue(q);
    });

    // 베팅
    const unsubBets = onSnapshot(
      query(collection(db, "event_bets"), orderBy("round", "desc"), limit(100)),
      snap => setSponsorships(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    // 입금
    const unsubDep = onSnapshot(
      query(collection(db, "deposit_requests"), orderBy("timestamp", "desc")),
      snap => setDepositRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    // 출금
    const unsubWdr = onSnapshot(
      query(collection(db, "withdraw_requests"), orderBy("timestamp", "desc")),
      snap => setWithdrawRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    // 금융 기록
    const unsubFin = onSnapshot(
      query(collection(db, "finance_history"), orderBy("completedAt", "desc"), limit(50)),
      snap => setFinanceHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    // 🔥 실장 초대코드 리스너 (핵심)
    const unsubAgents = onSnapshot(collection(db, "invite_codes"), snap => {
      setAgents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 회차 타이머
    const syncTimer = setInterval(() => {
      const elapsed = Date.now() - CONFIG.START_TIME;
      const round = CONFIG.BASE_ROUND + Math.floor(elapsed / (CONFIG.ROUND_DURATION * 1000));
      const timeLeft = CONFIG.ROUND_DURATION - Math.floor((elapsed / 1000) % CONFIG.ROUND_DURATION);
      setCurrentInfo({ currentRound: round, timeLeft, isDrawing: timeLeft <= 5 });
      setTargetRound(prev => prev || round + 1);
    }, 1000);

    return () => {
      unsubUsers(); unsubQueue(); unsubBets();
      unsubDep(); unsubWdr(); unsubFin(); unsubAgents();
      clearInterval(syncTimer);
    };
  }, []);

  /* ------------------------------------------------------------------ */
  /* 실장 / 총판 초대코드 생성 (🔥 핵심 기능) */
  /* ------------------------------------------------------------------ */
  const addAgent = async () => {
    if (!newAgentName || !newAgentCode) {
      alert("이름과 초대코드를 입력하세요");
      return;
    }

    const code = newAgentCode.trim().toUpperCase();

    try {
      const ref = doc(db, "invite_codes", code);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        alert("이미 존재하는 코드입니다");
        return;
      }

      await setDoc(ref, {
        code,
        name: newAgentName,
        role: "agent",
        used: false,
        createdAt: serverTimestamp()
      });

      alert(`실장 코드 생성 완료: ${code}`);
      setNewAgentName("");
      setNewAgentCode("");

    } catch (e) {
      alert("생성 실패: " + e.message);
    }
  };

  /* ------------------------------------------------------------------ */
  /* 기존 기능 (유지) */
  /* ------------------------------------------------------------------ */

  const updateFullUserInfo = async (userId, diamond, refCode, referral) => {
    await updateDoc(doc(db, "users", userId), {
      diamond: parseInt(diamond),
      refCode: refCode || "",
      referral: referral || ""
    });
  };

  const handleChangeUserPassword = async (userId) => {
    const pw = prompt("새 비밀번호:");
    if (pw) await updateDoc(doc(db, "users", userId), { password: pw });
  };

  const approveDeposit = async (req) => {
    const ref = doc(db, "users", req.userId);
    const snap = await getDoc(ref);
    const dia = (snap.data()?.diamond || 0) + req.amount;
    await updateDoc(ref, { diamond: dia });
    await addDoc(collection(db, "finance_history"), { ...req, type: "입금", completedAt: new Date().toISOString() });
    await deleteDoc(doc(db, "deposit_requests", req.id));
  };

  const approveWithdraw = async (req) => {
    const ref = doc(db, "users", req.userId);
    const snap = await getDoc(ref);
    await updateDoc(ref, { diamond: (snap.data()?.diamond || 0) - req.amount });
    await addDoc(collection(db, "finance_history"), { ...req, type: "출금", completedAt: new Date().toISOString() });
    await deleteDoc(doc(db, "withdraw_requests", req.id));
  };

  const handleApplyManipulation = async (winner) => {
    await setDoc(doc(db, "event_manipulation", String(targetRound)), {
      winner, updatedAt: new Date().toISOString()
    });
  };

  const deleteQueue = async (round) => {
    await deleteDoc(doc(db, "event_manipulation", String(round)));
  };

  return {
    users,
    currentInfo, targetRound, setTargetRound, queue, deleteQueue,
    gameHistory, sponsorships, activeUsers,
    depositRequests, withdrawRequests, financeHistory,
    approveDeposit, approveWithdraw,
    agents, newAgentName, setNewAgentName,
    newAgentCode, setNewAgentCode, addAgent,
    handleApplyManipulation, updateFullUserInfo,
    handleChangeUserPassword
  };
};
