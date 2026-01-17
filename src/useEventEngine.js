import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { EventService, soundManager, ITEM_CONFIG } from "./EventService"; 

export { ITEM_CONFIG as allItems }; 

export function useEventEngine(user, userPoint, onUpdatePoint, pointControls) {
  // --- Refs (원본 그대로 보존) ---
  const isProcessingRef = useRef(false);
  const pointRef = useRef(userPoint);
  const betRef = useRef(null);
  const roundRef = useRef(0); 

  useEffect(() => { pointRef.current = userPoint; }, [userPoint]);

  // --- State (원본 그대로) ---
  const [totalHistory, setTotalHistory] = useState([]);
  
  // ★ [복구/정산 엔진 삽입] 엔진 시작 시 과거 기록 복구 및 "부재중 베팅" 자동 정산 ★
  useEffect(() => {
    const initEngine = async () => {
      const { round: currentRound } = EventService.getCurrentRoundInfo();
      
      // 1. [원본 로직] 전체 히스토리 복구
      const savedTotal = JSON.parse(localStorage.getItem("event_total_history") || "[]");
      const lastSavedRound = savedTotal.length > 0 ? savedTotal[0].round : currentRound - 1;

      if (currentRound > lastSavedRound + 1) {
        const missed = await EventService.getMissedHistory(lastSavedRound, currentRound);
        const updatedTotal = [...missed.reverse(), ...savedTotal].slice(0, 100);
        setTotalHistory(updatedTotal);
        localStorage.setItem("event_total_history", JSON.stringify(updatedTotal));
      } else {
        setTotalHistory(savedTotal);
      }

      // 2. [추가] 부재중 베팅 자동 정산 및 기록 생성 로직
      const savedBet = localStorage.getItem(`pending_bet_${user?.id}`);
      if (savedBet) {
        const parsedBet = JSON.parse(savedBet);

        // 사용자가 없는 사이 결과가 이미 나왔다면?
        if (parsedBet.round < currentRound) {
          const fixedResult = await EventService.getFixedResult(parsedBet.round);
          const winObjs = fixedResult || EventService.generateResult(parsedBet.round);
          const winNames = winObjs.map(i => i.name);
          
          const { items, perAmount, totalCost } = parsedBet;
          const matchedCount = items.filter(name => winNames.includes(name)).length;
          let winAmount = 0;
          
          // [사용자님의 원본 정산 공식 100% 동일 적용]
          if (items.length === 1) { 
             if (matchedCount >= 1) winAmount = perAmount * 2; 
          } else if (items.length === 2) {
            if (matchedCount === 1) winAmount = totalCost; 
            else if (matchedCount === 2) winAmount = totalCost * 4; 
          }

          // 기록 생성
          const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
          const newRecord = {
            round: parsedBet.round, selected: [...items], winNames, winIcons: winObjs.map(i => i.icon),
            earn: winAmount, cost: totalCost, date: currentTime, status: "자동정산"
          };

          // 내 히스토리에 즉시 반영
          setMyHistory(prev => {
            if (prev.find(h => h.round === parsedBet.round)) return prev;
            const updated = [newRecord, ...prev].slice(0, 100);
            localStorage.setItem(`event_my_history_${user?.id}`, JSON.stringify(updated));
            return updated;
          });

          // 당첨금 자동 지급
          if (winAmount > 0) {
            updatePointWithAnim(pointRef.current + winAmount);
          }
          localStorage.removeItem(`pending_bet_${user?.id}`);
        } else {
          // 아직 진행 중인 회차라면 베팅 상태 유지
          betRef.current = parsedBet;
          setMyPendingBet(parsedBet);
        }
      }
    };
    initEngine();
  }, [user?.id]);

  const [myHistory, setMyHistory] = useState(() => {
    const saved = localStorage.getItem(`event_my_history_${user?.id}`);
    return saved ? JSON.parse(saved) : [];
  });

  const [gameState, setGameState] = useState({
    round: 0,
    timeLeft: 60,
    isDrawing: false
  });
  
  const [drawingItems, setDrawingItems] = useState(["🚀", "❤️"]);
  const [myPendingBet, setMyPendingBet] = useState(null);
  const [showResult, setShowResult] = useState(null);
  const [liveNoti, setLiveNoti] = useState("이벤트가 활성화되었습니다!");

  // --- [원본 기능: 포인트 업데이트] ---
  const updatePointWithAnim = useCallback((newPoint) => {
    if (onUpdatePoint) {
      onUpdatePoint(newPoint);
      if(pointControls) pointControls.start({ scale: [1, 1.2, 1], transition: { duration: 0.3 } });
    }
  }, [onUpdatePoint, pointControls]);

  // --- [원본 기능: 관리자 다이아 수정 리스너] ---
  useEffect(() => {
    const handlePointUpdate = (e) => {
      if (user && e.detail && e.detail.userId === user.id) {
        updatePointWithAnim(e.detail.point);
      }
    };
    window.addEventListener("user_point_update", handlePointUpdate);
    return () => window.removeEventListener("user_point_update", handlePointUpdate);
  }, [user, updatePointWithAnim]);

  // --- [원본 기능: 관리자 기록 수정 리스너] ---
  useEffect(() => {
    const handleHistoryUpdate = () => {
      const saved = localStorage.getItem("event_total_history");
      if (saved) setTotalHistory(JSON.parse(saved));
    };
    window.addEventListener("event_history_update", handleHistoryUpdate);
    return () => window.removeEventListener("event_history_update", handleHistoryUpdate);
  }, []);

  // ★ [수정] 베팅 시 로컬 스토리지에 즉시 백업 ★
  const handleSetMyPendingBet = (bet) => {
    betRef.current = bet;
    setMyPendingBet(bet);
    if (bet) {
      localStorage.setItem(`pending_bet_${user?.id}`, JSON.stringify(bet));
    } else {
      localStorage.removeItem(`pending_bet_${user?.id}`);
    }
  };

  // --- [라운드 종료: 서버 연동 및 정산 처리] ---
  const handleRoundEnd = useCallback(async (targetRound) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    
    setGameState(prev => ({ ...prev, isDrawing: true, timeLeft: 0 }));
    soundManager.play("draw");

    // 셔플 애니메이션 (원본 로직 그대로)
    const shuffleInterval = setInterval(() => {
      const randomIcons = EventService.generateResult(Math.random()).map(i => i.icon);
      setDrawingItems(randomIcons);
    }, 120);

    // 애니메이션 도중 서버에서 조작 데이터가 있는지 확인
    const fixedResult = await EventService.getFixedResult(targetRound);

    setTimeout(() => {
      clearInterval(shuffleInterval);
      
      // 서버 조작 우선, 없으면 수학적 고정 결과 사용
      const winObjs = fixedResult || EventService.generateResult(targetRound);
      const winNames = winObjs.map(i => i.name);
      const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      
      setDrawingItems(winObjs.map(v => v.icon));
      
      setTotalHistory(prev => {
        const newHistoryItem = { 
          round: targetRound, 
          winItems: winObjs.map(v => `${v.icon} ${v.name}`), 
          date: currentTime 
        };
        const updated = [newHistoryItem, ...prev].slice(0, 100);
        localStorage.setItem("event_total_history", JSON.stringify(updated));
        return updated;
      });

      // --- [원본 베팅 정산 로직: 100% 동일 보존] ---
      const activeBet = betRef.current;
      if (activeBet && activeBet.round === targetRound) {
        const { items, perAmount, totalCost } = activeBet;
        const matchedCount = items.filter(name => winNames.includes(name)).length;
        let winAmount = 0;

        if (items.length === 1) { 
           if (matchedCount >= 1) winAmount = perAmount * 2; 
        } else if (items.length === 2) {
          if (matchedCount === 1) winAmount = totalCost; 
          else if (matchedCount === 2) winAmount = totalCost * 4; 
        }

        const isSuccess = winAmount > totalCost;
        const isDraw = winAmount === totalCost && totalCost > 0;

        if (isSuccess) { 
          soundManager.play("win");
          if (navigator.vibrate) navigator.vibrate([100, 50, 150]); 
        } else if (!isDraw && totalCost > 0) { 
          soundManager.play("lose");
        }

        updatePointWithAnim(pointRef.current + winAmount);
        
        setShowResult({ 
          winItems: winObjs.map(v => `${v.icon} ${v.name}`), 
          winAmount, 
          betTotal: totalCost, 
          isWin: isSuccess, 
          isDraw 
        });
        
        setMyHistory(prev => {
          const updated = [{
            round: targetRound, selected: [...items], winNames, winIcons: winObjs.map(i => i.icon),
            earn: winAmount, cost: totalCost, date: currentTime
          }, ...prev].slice(0, 100);
          localStorage.setItem(`event_my_history_${user?.id}`, JSON.stringify(updated));
          return updated;
        });
      }

      setTimeout(() => {
        handleSetMyPendingBet(null);
        isProcessingRef.current = false;
      }, 2000);

    }, 3000); 
  }, [user?.id, updatePointWithAnim]);

  // --- [원본 기능: 시간 동기화 루프] ---
  useEffect(() => {
    const tick = () => {
      const { round, timeLeft, isDrawingPhase } = EventService.getCurrentRoundInfo();
      if (roundRef.current !== 0 && round > roundRef.current && !isProcessingRef.current) {
        handleRoundEnd(roundRef.current); 
      }
      roundRef.current = round; 
      setGameState(prev => {
        if (isProcessingRef.current) return prev; 
        if (prev.round !== round || prev.timeLeft !== timeLeft) {
          return { round, timeLeft, isDrawing: isDrawingPhase };
        }
        return prev;
      });
    };
    const interval = setInterval(tick, 1000);
    tick(); 
    return () => clearInterval(interval);
  }, [handleRoundEnd]);

  // --- [원본 기능: 라이브 알림 생성기 (원본 로직 100%)] ---
  useEffect(() => {
    const generateRandomUser = () => {
      const type = Math.random();
      if (type < 0.3) {
        const f = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임", "한", "오", "서", "신"];
        const l = ["수", "진", "영", "호", "민", "훈", "우", "석", "준", "현", "철", "미"];
        return `${f[Math.floor(Math.random()*f.length)]}*${l[Math.floor(Math.random()*l.length)]}`;
      } else if (type < 0.6) {
        return `010-****-${Math.floor(1000 + Math.random() * 8999)}`;
      } else {
        const pre = ["Super", "King", "God", "Win", "Lucky"];
        return `${pre[Math.floor(Math.random()*pre.length)]}${Math.floor(Math.random()*999)}`;
      }
    };
    const messages = ["대박 당첨!", "적중 성공!", "수익 실현!", "축하합니다!", "배당금 획득!"];
    const notiTimer = setInterval(() => {
      const rName = generateRandomUser();
      const rItem = ITEM_CONFIG[Math.floor(Math.random() * ITEM_CONFIG.length)];
      const rMsg = messages[Math.floor(Math.random() * messages.length)];
      setLiveNoti(`${rName}님이 ${rItem.icon} ${rItem.name} ${rMsg}`);
    }, 6000 + Math.random() * 4000);
    return () => clearInterval(notiTimer);
  }, []);

  // --- [원본 기능: 통계 계산] ---
  const stats = useMemo(() => EventService.calculateStats(totalHistory), [totalHistory]);

  return {
    round: gameState.round,
    timeLeft: gameState.timeLeft,
    isDrawing: gameState.isDrawing || isProcessingRef.current, 
    drawingItems,
    totalHistory,
    myHistory,
    myPendingBet,
    setMyPendingBet: handleSetMyPendingBet,
    showResult,
    setShowResult,
    liveNoti,
    stats,
    updatePointWithAnim
  };
}