import { useState, useEffect, useMemo } from "react";
import { db } from "./firebase"; 
import { 
  doc, setDoc, deleteDoc, collection, onSnapshot, 
  query, orderBy, limit, updateDoc, getDoc, addDoc 
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

  const [agents, setAgents] = useState([]);
  const [newAgentName, setNewAgentName] = useState("");
  const [newAgentCode, setNewAgentCode] = useState("");

  const activeUsers = useMemo(() => {
    const now = Date.now();
    return users.filter(u => u.lastActive && (now - u.lastActive < 60000));
  }, [users]);

  // 안전한 저장을 위한 헬퍼
  const saveGlobalUsers = async (updatedUsers) => {
    try {
        const cleanUsers = JSON.parse(JSON.stringify(updatedUsers));
        await setDoc(doc(db, "settings", "global"), { users: cleanUsers }, { merge: true });
    } catch(e) { console.log("백업 저장 실패"); }
  };

  // ★ [핵심 추가] 기존 로컬 데이터를 Firebase로 자동 업로드 (1회성 복구)
  useEffect(() => {
    const syncLocalToFirebase = async () => {
      const localData = JSON.parse(localStorage.getItem("users") || "[]");
      if (localData.length === 0) return;

      // console.log("🔄 로컬 데이터 DB 동기화 시작...", localData.length);
      
      // 로컬에 있는 유저들을 하나씩 DB에 확인 후 없으면 업로드
      for (const u of localData) {
        if (u.id) {
          try {
            const userRef = doc(db, "users", u.id);
            const userSnap = await getDoc(userRef);
            if (!userSnap.exists()) {
              // DB에 없으면 로컬 데이터로 생성
              await setDoc(userRef, u, { merge: true });
              // console.log(`✅ [${u.id}] DB 업로드 완료`);
            }
          } catch (e) {
            console.error("동기화 실패:", e);
          }
        }
      }
    };
    
    syncLocalToFirebase();
  }, []);

  // --- ★ [핵심] 리스너 통합 (실시간 감시) ---
  useEffect(() => {
    
    // 1. 유저 데이터 실시간 감시 (다이아 변동 즉시 반영)
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
        const userList = snap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        // 데이터가 있으면 상태 업데이트
        if (userList.length > 0) {
            // 최근 접속순 정렬
            userList.sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0));
            setUsers(userList);
            if (setInitialUsers) setInitialUsers(userList);
        }
    });

    // 2. 조작 대기열 리스너
    const unsubQueue = onSnapshot(collection(db, "event_manipulation"), (snap) => {
      const q = {}; 
      snap.forEach(doc => {
          q[doc.id] = doc.data().winner || doc.data().items; 
      });
      setQueue(q);
    });

    // 3. 베팅 내역 리스너
    const unsubBets = onSnapshot(query(collection(db, "event_bets"), orderBy("round", "desc"), limit(100)), (snap) => {
      const bets = []; snap.forEach(doc => bets.push({ id: doc.id, ...doc.data() }));
      if (bets.length > 0) setSponsorships(bets);
    });

    // 4. 입금 요청 리스너
    const unsubDep = onSnapshot(query(collection(db, "deposit_requests"), orderBy("timestamp", "desc")), (snap) => {
      const reqs = []; snap.forEach(doc => reqs.push({ id: doc.id, ...doc.data() })); 
      setDepositRequests(reqs);
    });

    // 5. 출금 요청 리스너
    const unsubWdr = onSnapshot(query(collection(db, "withdraw_requests"), orderBy("timestamp", "desc")), (snap) => {
      const reqs = []; snap.forEach(doc => reqs.push({ id: doc.id, ...doc.data() })); 
      setWithdrawRequests(reqs);
    });

    // 6. 금융 기록 리스너
    const unsubFin = onSnapshot(query(collection(db, "finance_history"), orderBy("completedAt", "desc"), limit(50)), (snap) => {
      const logs = []; snap.forEach(doc => logs.push({ id: doc.id, ...doc.data() })); 
      setFinanceHistory(logs);
    });

    setAgents(JSON.parse(localStorage.getItem("daisy_agents") || "[]"));
    const gHistory = JSON.parse(localStorage.getItem("event_total_history") || "[]");
    setGameHistory(gHistory.sort((a, b) => b.round - a.round));

    const syncTimer = setInterval(() => {
      const now = Date.now();
      const elapsed = now - CONFIG.START_TIME;
      const round = CONFIG.BASE_ROUND + Math.floor(elapsed / (CONFIG.ROUND_DURATION * 1000));
      const remainingMs = (CONFIG.ROUND_DURATION * 1000) - (elapsed % (CONFIG.ROUND_DURATION * 1000));
      let timeLeft = Math.floor(remainingMs / 1000);
      if (timeLeft >= CONFIG.ROUND_DURATION) timeLeft = 0;
      
      setCurrentInfo({ currentRound: round, timeLeft: timeLeft, isDrawing: timeLeft <= 5 });
      setTargetRound(prev => prev === 0 ? round + 1 : prev);
    }, 1000);

    return () => {
      unsubUsers(); unsubQueue(); unsubBets(); unsubDep(); unsubWdr(); unsubFin();
      clearInterval(syncTimer);
    };
  }, [setUsers]); // setInitialUsers 의존성은 제거하거나 포함해도 무방

  // --- 액션 핸들러 (DB 직접 수정) ---

  // 1. 유저 정보 수정
  const updateFullUserInfo = async (userId, newPoint, newRefCode, newReferral) => {
    const pInt = parseInt(newPoint);
    if (isNaN(pInt)) return alert("숫자를 입력하세요.");
    
    if(!window.confirm(`[${userId}] 정보를 수정하시겠습니까?`)) return;

    try {
      await updateDoc(doc(db, "users", userId), { 
        diamond: pInt, 
        refCode: newRefCode || "", 
        referral: newReferral || "" 
      });
      alert(`[${userId}] 수정 완료`);
    } catch (e) { alert("저장 실패: " + e.message); }
  };

  // 2. 유저 비밀번호 변경
  const handleChangeUserPassword = async (userId) => {
    const newPass = window.prompt(`[${userId}] 새 비밀번호 입력:`);
    if (!newPass) return;
    try {
      await updateDoc(doc(db, "users", userId), { password: newPass });
      alert("비밀번호 변경 완료");
    } catch (e) { alert("변경 실패: " + e.message); }
  };

  // 3. 관리자 비밀번호 변경
  const handleChangeAdminPassword = async () => {
    const newPass = window.prompt("변경할 '게임 관리자(game)' 접속 비밀번호를 입력하세요:");
    if (!newPass) return;
    try {
      await setDoc(doc(db, "settings", "global"), { gamePw: newPass }, { merge: true });
      localStorage.setItem("daisy_game_password", newPass); 
      alert(`관리자 비번 변경됨: ${newPass}`);
    } catch (e) { alert("저장 실패: " + e.message); }
  };

  // 4. 입금 승인
  const approveDeposit = async (req) => {
    if(!window.confirm(`${req.userId}님의 ${req.amount.toLocaleString()} DIA 입금을 승인하시겠습니까?`)) return;
    try {
      const userRef = doc(db, "users", req.userId);
      const userSnap = await getDoc(userRef);
      const currentDia = userSnap.exists() ? (userSnap.data().diamond || 0) : 0;
      const newDia = currentDia + req.amount;

      await updateDoc(userRef, { diamond: newDia });

      await addDoc(collection(db, "finance_history"), { ...req, type: "입금", status: "완료", completedAt: new Date().toISOString() });
      await deleteDoc(doc(db, "deposit_requests", req.id));
      
      alert("입금 승인 완료!");
    } catch(e) { alert("오류 발생: " + e.message); }
  };

  // 5. 출금 승인
  const approveWithdraw = async (req) => {
    if(!window.confirm(`${req.userId}님의 출금을 처리완료(차감) 하시겠습니까?`)) return;
    try {
      const userRef = doc(db, "users", req.userId);
      const userSnap = await getDoc(userRef);
      const currentDia = userSnap.exists() ? (userSnap.data().diamond || 0) : 0;

      if(currentDia < req.amount) {
          if(!window.confirm(`[경고] 잔액 부족(${currentDia}). 강제 차감합니까?`)) return;
      }
      
      const newDia = currentDia - req.amount;
      await updateDoc(userRef, { diamond: newDia });

      await addDoc(collection(db, "finance_history"), { ...req, type: "출금", status: "완료", completedAt: new Date().toISOString() });
      await deleteDoc(doc(db, "withdraw_requests", req.id));
      alert("출금 처리 완료!");
    } catch(e) { alert("오류 발생: " + e.message); }
  };

  // 6. 결과 조작
  const handleApplyManipulation = async (winner) => {
    if (!winner) return alert("결과를 선택해주세요.");
    try {
      await setDoc(doc(db, "event_manipulation", String(targetRound)), { 
          winner: winner, 
          updatedAt: new Date().toISOString() 
      });
      setQueue({...queue, [targetRound]: winner});
      alert(`[${targetRound}회차] 결과를 [${winner}]로 고정했습니다!`);
      return true; 
    } catch (e) { alert("실패: " + e.message); return false; }
  };

  // 7. 조작 취소
  const deleteQueue = async (round) => {
    try {
      await deleteDoc(doc(db, "event_manipulation", String(round)));
      const q = { ...queue }; delete q[round]; setQueue(q);
    } catch (e) { alert("삭제 실패"); }
  };

  // 8. 총판 추가
  const addAgent = () => {
    if (!newAgentName) return;
    const updated = [...agents, { name: newAgentName, code: newAgentCode, id: Date.now() }];
    setAgents(updated); 
    localStorage.setItem("daisy_agents", JSON.stringify(updated));
    setNewAgentName(""); setNewAgentCode("");
  };

  return {
    users, 
    currentInfo, targetRound, setTargetRound, queue, deleteQueue,
    gameHistory, sponsorships, activeUsers,
    depositRequests, withdrawRequests, financeHistory, approveDeposit, approveWithdraw,
    agents, newAgentName, setNewAgentName, newAgentCode, setNewAgentCode, addAgent,
    handleApplyManipulation, updateFullUserInfo, handleChangeUserPassword, handleChangeAdminPassword
  };
};