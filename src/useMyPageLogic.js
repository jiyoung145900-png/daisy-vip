import { useState, useEffect, useCallback } from "react";
import { db } from "./firebase";
import {
  doc,
  getDoc,
  updateDoc,
  addDoc,
  collection,
  query,
  where,
  onSnapshot,
  increment,
  serverTimestamp,
} from "firebase/firestore";

const broadcast = new BroadcastChannel("daisy_global_channel");

export const useMyPageLogic = (user, onUpdatePoint, isKo) => {
  const [userInfo, setUserInfo] = useState(user || null);

  const [isCheckedIn, setIsCheckedIn] = useState(() => {
    if (!user) return false;
    const today = new Date().toDateString();
    return localStorage.getItem(`last_checkin_${user.id}`) === today;
  });

  // ★ State for transaction history
  const [myDeposits, setMyDeposits] = useState([]);
  const [myWithdraws, setMyWithdraws] = useState([]);

  // Sync initial user info from props
  useEffect(() => {
    if (user) setUserInfo(user);
  }, [user]);

  // ✅ [NEW] Real-time subscription to the true source of truth: users/{id}
  useEffect(() => {
    if (!user?.id) return;

    const userRef = doc(db, "users", user.id);
    const unsub = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        setUserInfo(snap.data());
      } else {
        // 문서가 없으면 기존 user 상태 유지
        setUserInfo((prev) => prev || user);
      }
    });

    return () => unsub();
  }, [user?.id]);

  // Real-time point updates (cross-tab/app broadcast) - keep for instant UI
  useEffect(() => {
    const handleUpdate = (targetId, newPoint) => {
      setUserInfo((prev) =>
        prev && prev.id === targetId ? { ...prev, diamond: newPoint } : prev
      );
    };

    const onWindowEvent = (e) => {
      const { userId, point } = e.detail || {};
      if (userId) handleUpdate(userId, point);
    };

    window.addEventListener("user_point_update", onWindowEvent);

    broadcast.onmessage = (e) => {
      const { type, userId, point } = e.data || {};
      if (type === "POINT_UPDATE" && userId) handleUpdate(userId, point);
    };

    return () => window.removeEventListener("user_point_update", onWindowEvent);
  }, []);

  // Real-time subscription for Deposits & Withdrawals (Pending + Completed)
  useEffect(() => {
    if (!userInfo?.id) return;

    const qDepPending = query(
      collection(db, "deposit_requests"),
      where("userId", "==", userInfo.id)
    );
    const qWdrPending = query(
      collection(db, "withdraw_requests"),
      where("userId", "==", userInfo.id)
    );
    const qHistory = query(
      collection(db, "finance_history"),
      where("userId", "==", userInfo.id)
    );

    let pendingDeps = [];
    let pendingWdrs = [];
    let historyAll = [];

    const mergeAndSet = () => {
      const doneDeps = historyAll
        .filter((h) => h.type === "입금")
        .map((h) => ({ ...h, status: "완료" }));
      const allDeps = [...pendingDeps, ...doneDeps].sort(
        (a, b) =>
          new Date(b.timestamp || b.completedAt) -
          new Date(a.timestamp || a.completedAt)
      );
      setMyDeposits(allDeps);

      const doneWdrs = historyAll
        .filter((h) => h.type === "출금")
        .map((h) => ({ ...h, status: "완료" }));
      const allWdrs = [...pendingWdrs, ...doneWdrs].sort(
        (a, b) =>
          new Date(b.timestamp || b.completedAt) -
          new Date(a.timestamp || a.completedAt)
      );
      setMyWithdraws(allWdrs);
    };

    const unsub1 = onSnapshot(qDepPending, (snap) => {
      pendingDeps = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        status: "심사중",
      }));
      mergeAndSet();
    });

    const unsub2 = onSnapshot(qWdrPending, (snap) => {
      pendingWdrs = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        status: "심사중",
      }));
      mergeAndSet();
    });

    const unsub3 = onSnapshot(qHistory, (snap) => {
      historyAll = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      mergeAndSet();
    });

    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, [userInfo?.id]);

  // Voice Alert (Fixed pitch/rate)
  const playFemaleVoice = useCallback(
    (text) => {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();

      const femaleVoice =
        voices.find((v) => v.lang.includes("ko") && v.name.includes("Google")) ||
        voices.find(
          (v) =>
            v.lang.includes("ko") &&
            (v.name.includes("Female") || v.name.includes("여성"))
        ) ||
        voices.find((v) => v.lang.includes("ko"));

      if (femaleVoice) utterance.voice = femaleVoice;
      utterance.lang = isKo ? "ko-KR" : "en-US";
      utterance.rate = 1.1;
      utterance.pitch = 1.0;

      window.speechSynthesis.speak(utterance);
    },
    [isKo]
  );

  // ✅ Daily Bonus (users/{id}.diamond increment) - NEVER decreases
  const handleDailyCheckIn = async () => {
    if (isCheckedIn) return;
    if (!userInfo?.id) return;

    try {
      const bonus = Math.floor(Math.random() * (2000 - 100 + 1)) + 100;

      const userRef = doc(db, "users", userInfo.id);

      // ✅ atomic increment
      await updateDoc(userRef, {
        diamond: increment(bonus),
        lastCheckInAt: serverTimestamp(),
      });

      // UI immediate update
      const optimistic = (userInfo.diamond || 0) + bonus;
      setUserInfo((prev) => ({ ...prev, diamond: optimistic }));

      localStorage.setItem(
        `last_checkin_${userInfo.id}`,
        new Date().toDateString()
      );
      setIsCheckedIn(true);

      if (onUpdatePoint) onUpdatePoint(optimistic);
      broadcast.postMessage({
        type: "POINT_UPDATE",
        userId: userInfo.id,
        point: optimistic,
      });

      const msg = isKo
        ? `데일리 보너스 ${bonus} 다이아가 지급되었습니다.`
        : `Daily bonus ${bonus} diamonds paid.`;
      playFemaleVoice(msg);
      alert(
        isKo
          ? `축하합니다! ${bonus.toLocaleString()} DIA가 지급되었습니다.`
          : `Congrats! ${bonus.toLocaleString()} DIA paid.`
      );
    } catch (e) {
      console.error(e);
      alert(isKo ? "보너스 지급 실패(서버 오류)" : "Bonus failed (server error)");
    }
  };

  // Deposit Request
  const requestDeposit = async (name, amount) => {
    if (!name.trim() || !amount)
      return alert(isKo ? "정보를 입력해주세요." : "Enter info.");
    try {
      await addDoc(collection(db, "deposit_requests"), {
        userId: userInfo.id,
        userName: userInfo.name || userInfo.id,
        depositName: name,
        amount: Number(amount),
        status: "pending",
        timestamp: new Date().toISOString(),
      });
      playFemaleVoice(isKo ? "입금이 신청되었습니다." : "Deposit requested.");
      alert(isKo ? "신청 완료!" : "Done!");
      return true;
    } catch (e) {
      alert("Error: " + e.message);
      return false;
    }
  };

  // Withdraw Request
  const requestWithdraw = async (amount, bankInfo, pin) => {
    // ✅ PIN은 users/{id}에 저장된 pin을 우선 사용 (로컬 fallback)
    const savedPin =
      userInfo?.pin || localStorage.getItem(`user_pin_${userInfo.id}`);

    if (pin !== savedPin) return alert(isKo ? "비밀번호 불일치" : "PIN mismatch");
    if (Number(amount) > (userInfo.diamond || 0))
      return alert(isKo ? "잔액 부족" : "Not enough balance");

    try {
      await addDoc(collection(db, "withdraw_requests"), {
        userId: userInfo.id,
        userName: userInfo.name || userInfo.id,
        amount: Number(amount),
        bankInfo,
        status: "pending",
        timestamp: new Date().toISOString(),
      });
      playFemaleVoice(isKo ? "출금이 신청되었습니다." : "Withdrawal requested.");
      alert(isKo ? "신청 완료!" : "Done!");
      return true;
    } catch (e) {
      alert("Error: " + e.message);
      return false;
    }
  };

  // Update Password (users/{id})
  const updatePassword = async (oldPw, newPw, confirmPw) => {
    if (!oldPw || newPw !== confirmPw)
      return alert(isKo ? "입력 정보를 확인해주세요." : "Check inputs.");
    try {
      // ✅ old password check (best effort)
      const currentPw = userInfo?.password;
      if (currentPw && oldPw !== currentPw)
        return alert(isKo ? "기존 비밀번호가 틀립니다." : "Old password wrong");

      const userRef = doc(db, "users", userInfo.id);
      await updateDoc(userRef, { password: newPw, updatedAt: serverTimestamp() });

      alert(isKo ? "비밀번호 변경 완료" : "Success");
      return true;
    } catch (e) {
      alert("Error: " + e.message);
      return false;
    }
  };

  // Setup PIN (users/{id} + local fallback)
  const updatePin = async (oldPin, newPin, confirmPin) => {
    const savedPin =
      userInfo?.pin || localStorage.getItem(`user_pin_${userInfo.id}`);

    if (savedPin && oldPin !== savedPin)
      return alert(isKo ? "이전 PIN 불일치" : "Old PIN wrong");
    if (newPin !== confirmPin || newPin.length !== 6)
      return alert(isKo ? "새 PIN 확인 필요" : "Check New PIN");

    try {
      const userRef = doc(db, "users", userInfo.id);
      await updateDoc(userRef, { pin: newPin, updatedAt: serverTimestamp() });

      localStorage.setItem(`user_pin_${userInfo.id}`, newPin);
      alert(isKo ? "설정 완료" : "Done");
      return true;
    } catch (e) {
      alert("Error: " + e.message);
      return false;
    }
  };

  // Change Avatar (users/{id} + local cache)
  const updateAvatar = async (img, idx, onLocalUpdate) => {
    const avatarData = { image: img, idx: idx };

    try {
      const userRef = doc(db, "users", userInfo.id);
      await updateDoc(userRef, { avatar: avatarData, updatedAt: serverTimestamp() });

      localStorage.setItem(
        `user_avatar_data_${userInfo.id}`,
        JSON.stringify(avatarData)
      );

      if (onLocalUpdate) onLocalUpdate(img, idx);

      alert(isKo ? "프로필 변경 완료" : "Updated");
      return true;
    } catch (e) {
      alert("Error: " + e.message);
      return false;
    }
  };

  return {
    userInfo,
    isCheckedIn,
    myDeposits,
    myWithdraws,
    handleDailyCheckIn,
    requestDeposit,
    requestWithdraw,
    updatePassword,
    updatePin,
    updateAvatar,
  };
};
