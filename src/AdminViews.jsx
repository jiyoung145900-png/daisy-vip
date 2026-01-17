import React, { useState } from "react";
import { iaStyles } from "./AdminStyles";

// --- 1. 입출금 요청 뷰 ---
export const RequestsView = ({ depositRequests, withdrawRequests, approveDeposit, approveWithdraw }) => (
  <div style={iaStyles.card}>
    <h1 style={iaStyles.bigTabTitle}>🔔 입/출금 승인 대기</h1>
    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:40}}>
        <div>
            <h3 style={{color:'#00ff00', marginTop:0, borderBottom:'1px solid #333', paddingBottom:10}}>▼ 입금 신청 ({depositRequests.length})</h3>
            <table style={iaStyles.table}>
              <thead><tr><th>정보</th><th>금액</th><th>승인</th></tr></thead>
              <tbody>
                {depositRequests.length === 0 ? <tr><td colSpan="3" style={{padding:20, color:'#555'}}>없음</td></tr> : 
                depositRequests.map(r => (
                  <tr key={r.id} style={{borderBottom:'1px solid #222'}}>
                    <td><b>{r.userId}</b><br/><span style={{fontSize:12, color:'#888'}}>{r.depositName}</span></td>
                    <td style={{color:'#00ff00', fontSize:18, fontWeight:'bold'}}>{r.amount.toLocaleString()}</td>
                    <td><button onClick={()=>approveDeposit(r)} style={iaStyles.giantBtn}>승인</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>
        <div>
            <h3 style={{color:'#ff3b30', marginTop:0, borderBottom:'1px solid #333', paddingBottom:10}}>▼ 출금 신청 ({withdrawRequests.length})</h3>
            <table style={iaStyles.table}>
              <thead><tr><th>정보</th><th>금액</th><th>완료</th></tr></thead>
              <tbody>
                {withdrawRequests.length === 0 ? <tr><td colSpan="3" style={{padding:20, color:'#555'}}>없음</td></tr> :
                withdrawRequests.map(r => (
                  <tr key={r.id} style={{borderBottom:'1px solid #222'}}>
                    <td><b>{r.userId}</b><br/><span style={{fontSize:12, color:'#888'}}>{r.bankInfo?.bank}</span></td>
                    <td style={{color:'#ff3b30', fontSize:18, fontWeight:'bold'}}>{r.amount.toLocaleString()}</td>
                    <td><button onClick={()=>approveWithdraw(r)} style={{...iaStyles.giantBtn, background:'#ff3b30', color:'#fff'}}>처리</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>
    </div>
  </div>
);

// --- 2. 완료된 장부 뷰 ---
export const FinanceView = ({ financeHistory }) => (
  <div style={iaStyles.card}>
    <h1 style={iaStyles.bigTabTitle}>📜 자금 입/출금 완료 장부</h1>
    <table style={iaStyles.table}>
      <thead><tr><th>일시</th><th>ID</th><th>구분</th><th>금액</th><th>상태</th></tr></thead>
      <tbody>
        {financeHistory.length === 0 ? <tr><td colSpan="5" style={{padding:30, textAlign:'center'}}>내역 없음</td></tr> : 
          financeHistory.map(f => (
            <tr key={f.id} style={{borderBottom:'1px solid #222'}}>
              <td style={{color:'#888', fontSize:13}}>{new Date(f.completedAt).toLocaleString()}</td>
              <td style={{fontWeight:'bold'}}>{f.userId}</td>
              <td><span style={{background: f.type==='입금'?'rgba(0,255,0,0.1)':'rgba(255,59,48,0.1)', color: f.type==='입금'?'#00ff00':'#ff3b30', padding:'3px 8px', borderRadius:'5px', fontSize:12, fontWeight:'bold'}}>{f.type}</span></td>
              <td style={{fontSize:16, fontWeight:'bold'}}>{f.amount.toLocaleString()}</td>
              <td style={{color:'#4cd137', fontWeight:'bold'}}>{f.status}</td>
            </tr>
          ))
        }
      </tbody>
    </table>
  </div>
);

// --- 3. ★ 바카라 이벤트 제어 뷰 (완전 개편) ---
export const EventControlView = ({ currentInfo, targetRound, setTargetRound, queue, deleteQueue, handleApplyManipulation }) => {
  const [selectedWinner, setSelectedWinner] = useState(null); // "PLAYER" | "TIE" | "BANKER"

  return (
    <div style={iaStyles.card}>
      <h1 style={iaStyles.bigTabTitle}>🎰 바카라 실시간 조작</h1>
      
      {/* 라운드 모니터 */}
      <div style={iaStyles.monitorBox}>
        <div>현재 진행: <b style={{fontSize:'24px', color:'#fff'}}>{currentInfo.currentRound}회</b></div>
        <div>남은 시간: <b style={{fontSize:'24px', color: currentInfo.timeLeft <= 5 ? '#ff3b30' : '#00ff00'}}>{currentInfo.timeLeft}초</b></div>
        <div>상태: <span style={{color: currentInfo.isDrawing ? '#ff3b30' : '#00e676'}}>{currentInfo.isDrawing ? "진행중" : "베팅가능"}</span></div>
      </div>

      <div style={{marginTop:30}}>
        <div style={{marginBottom:'10px', color:'#888'}}>조작할 회차 (자동설정됨):</div>
        <input type="number" placeholder="회차" value={targetRound} onChange={e=>setTargetRound(parseInt(e.target.value))} style={iaStyles.adminInput} />
        
        {/* 조작 버튼 3개 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.5fr 1fr', gap: '20px', marginTop: '30px' }}>
            
            {/* PLAYER */}
            <div 
                onClick={() => setSelectedWinner("PLAYER")}
                style={{
                    ...iaStyles.adminItemCard,
                    border: selectedWinner === 'PLAYER' ? '4px solid #4d94ff' : '1px solid #333',
                    background: selectedWinner === 'PLAYER' ? '#4d94ff' : '#1a1a1a',
                    color: selectedWinner === 'PLAYER' ? '#000' : '#4d94ff',
                    cursor: 'pointer', textAlign: 'center', padding: '20px'
                }}
            >
                <div style={{fontSize:'24px', fontWeight:'bold'}}>PLAYER</div>
                <div style={{fontSize:'12px', opacity:0.8}}>플레이어 승 (x2.0)</div>
            </div>

            {/* TIE */}
            <div 
                onClick={() => setSelectedWinner("TIE")}
                style={{
                    ...iaStyles.adminItemCard,
                    border: selectedWinner === 'TIE' ? '4px solid #00e676' : '1px solid #333',
                    background: selectedWinner === 'TIE' ? '#00e676' : '#1a1a1a',
                    color: selectedWinner === 'TIE' ? '#000' : '#00e676',
                    cursor: 'pointer', textAlign: 'center', padding: '20px'
                }}
            >
                <div style={{fontSize:'24px', fontWeight:'bold'}}>TIE</div>
                <div style={{fontSize:'12px', opacity:0.8}}>무승부 (x9.0)</div>
            </div>

            {/* BANKER */}
            <div 
                onClick={() => setSelectedWinner("BANKER")}
                style={{
                    ...iaStyles.adminItemCard,
                    border: selectedWinner === 'BANKER' ? '4px solid #ff4d4d' : '1px solid #333',
                    background: selectedWinner === 'BANKER' ? '#ff4d4d' : '#1a1a1a',
                    color: selectedWinner === 'BANKER' ? '#000' : '#ff4d4d',
                    cursor: 'pointer', textAlign: 'center', padding: '20px'
                }}
            >
                <div style={{fontSize:'24px', fontWeight:'bold'}}>BANKER</div>
                <div style={{fontSize:'12px', opacity:0.8}}>뱅커 승 (x1.95)</div>
            </div>
        </div>

        {/* 적용 버튼 */}
        <button 
            onClick={()=>{
                if(!selectedWinner) return alert("결과를 선택하세요");
                handleApplyManipulation(selectedWinner).then(res=> { if(res) setSelectedWinner(null); });
            }} 
            style={{...iaStyles.applyBtn, background: selectedWinner ? '#fff' : '#333', color:'#000', opacity: selectedWinner ? 1 : 0.5, marginTop: '20px', width: '100%', padding: '15px', fontSize: '18px', fontWeight: 'bold', border: 'none', borderRadius: '8px'}}
        >
            {targetRound}회차 결과 <b>[{selectedWinner}]</b>로 고정하기
        </button>
      </div>

      {/* 예약된 목록 */}
      <div style={{marginTop:30, borderTop:'1px solid #333', paddingTop:20}}>
          <h3 style={{color:'#888'}}>📌 조작 예약 목록</h3>
          {Object.entries(queue).length === 0 ? <div style={{color:'#555'}}>예약 없음</div> : 
             Object.entries(queue).map(([k,v])=> (
                <div key={k} style={iaStyles.queueRow}>
                    <div>
                        <b style={{marginRight:10, color:'#fff'}}>{k}회차</b> 
                        <span style={{
                            fontWeight:'bold', 
                            color: v==='PLAYER'?'#4d94ff':v==='BANKER'?'#ff4d4d':'#00e676'
                        }}>
                            {v} WIN
                        </span>
                    </div>
                    <button onClick={()=>deleteQueue(k)} style={iaStyles.delBtn}>취소</button>
                </div>
             ))
          }
      </div>
    </div>
  );
};

// --- 4. 회원 관리 뷰 ---
export const UsersView = ({ users, updateFullUserInfo, handleChangeUserPassword }) => {
  const [term, setTerm] = useState("");
  const filtered = users.filter(u => (u.id||"").toLowerCase().includes(term.toLowerCase()));

  return (
    <div style={iaStyles.card}>
      <h1 style={iaStyles.bigTabTitle}>💰 회원 관리</h1>
      <div style={{display:'flex', gap:10, marginBottom:20}}>
          <span style={{fontSize:24}}>🔍</span>
          <input placeholder="아이디 검색..." value={term} onChange={e=>setTerm(e.target.value)} style={iaStyles.searchInputField} />
      </div>
      <table style={iaStyles.table}>
        <thead><tr><th>상태</th><th>아이디</th><th>다이아</th><th>변경값</th><th>액션</th></tr></thead>
        <tbody>{filtered.map(u => (
          <tr key={u.id} style={{borderBottom:'1px solid #222'}}>
            <td>{u.lastActive && (Date.now()-u.lastActive < 60000) ? <span style={{color:'#0f0'}}>●</span> : <span style={{color:'#444'}}>●</span>}</td>
            <td style={{fontWeight:'bold', fontSize:18}}>{u.id}</td>
            <td style={{color:'#ffb347'}}>💎 {(u.diamond||0).toLocaleString()}</td>
            <td><input id={`pt-${u.id}`} defaultValue={u.diamond} style={iaStyles.giantInput} /></td>
            <td style={{display:'flex', gap:5, alignItems:'center', padding:'10px 0'}}>
              <button onClick={()=>updateFullUserInfo(u.id, document.getElementById(`pt-${u.id}`).value, u.refCode, u.referral)} style={iaStyles.giantBtn}>수정</button>
              <button onClick={()=>handleChangeUserPassword(u.id)} style={{...iaStyles.giantBtn, background:'#5856d6', color:'#fff'}}>비번</button>
            </td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
};

// --- 5. 기타 뷰들 ---
export const AgentsView = ({ agents, users, newAgentName, setNewAgentName, newAgentCode, setNewAgentCode, addAgent, setAgents }) => (
  <div style={iaStyles.card}>
    <h1 style={iaStyles.bigTabTitle}>👔 실장 관리</h1>
    <div style={{display:'flex', gap:10, marginBottom:20}}>
      <input placeholder="이름" value={newAgentName} onChange={e=>setNewAgentName(e.target.value)} style={iaStyles.giantInput} />
      <input placeholder="코드" value={newAgentCode} onChange={e=>setNewAgentCode(e.target.value)} style={iaStyles.giantInput} />
      <button onClick={addAgent} style={iaStyles.giantBtn}>등록</button>
    </div>
    <table style={iaStyles.table}>
      <thead><tr><th>이름</th><th>코드</th><th>인원</th><th>명단</th><th>삭제</th></tr></thead>
      <tbody>{agents.map(a => {
        const myUsers = users.filter(u => u.referral === a.code);
        return (
          <tr key={a.id} style={{borderBottom:'1px solid #222'}}>
            <td style={{color:'#ffb347', fontSize:18}}>{a.name}</td><td>{a.code}</td><td style={{color:'#00ff00'}}>{myUsers.length}</td>
            <td style={{fontSize:12, color:'#888', maxWidth:300}}>{myUsers.map(u=>u.id).join(", ")}</td>
            <td><button onClick={()=>{const up=agents.filter(x=>x.id!==a.id); setAgents(up); localStorage.setItem("daisy_agents",JSON.stringify(up));}} style={iaStyles.delBtn}>삭제</button></td>
          </tr>
        );
      })}</tbody>
    </table>
  </div>
);

export const ReferralsView = ({ users, updateFullUserInfo }) => (
  <div style={iaStyles.card}>
    <h1 style={iaStyles.bigTabTitle}>🤝 추천인 코드</h1>
    <table style={iaStyles.table}>
      <thead><tr><th>아이디</th><th>내 코드</th><th>추천인</th><th>저장</th></tr></thead>
      <tbody>{users.map(u => (
        <tr key={u.id} style={{borderBottom:'1px solid #222'}}>
          <td>{u.id}</td>
          <td><input id={`rc-${u.id}`} defaultValue={u.refCode||""} style={iaStyles.giantInput} /></td>
          <td><input id={`rf-${u.id}`} defaultValue={u.referral||""} style={{...iaStyles.giantInput, color:'#0ff'}} /></td>
          <td><button onClick={()=>updateFullUserInfo(u.id, u.diamond, document.getElementById(`rc-${u.id}`).value, document.getElementById(`rf-${u.id}`).value)} style={iaStyles.giantBtn}>저장</button></td>
        </tr>
      ))}</tbody>
    </table>
  </div>
);

export const HistoryView = ({ gameHistory }) => (
  <div style={iaStyles.card}>
    <h1 style={iaStyles.bigTabTitle}>📋 게임 결과</h1>
    <table style={iaStyles.table}>
      <thead><tr><th>회차</th><th>결과</th></tr></thead>
      <tbody>{gameHistory.map(h => (
          <tr key={h.round} style={{borderBottom:'1px solid #222'}}>
              <td style={{color:'#ffb347'}}>{h.round}회</td>
              <td style={{
                  fontWeight: 'bold',
                  color: h.result === 'PLAYER' ? '#4d94ff' : h.result === 'BANKER' ? '#ff4d4d' : '#00e676'
              }}>
                  {h.result} ({h.pScore}:{h.bScore}) {h.isPP && <small style={{color:'#4d94ff'}}>PP</small>} {h.isBP && <small style={{color:'#ff4d4d'}}>BP</small>}
              </td>
          </tr>
      ))}</tbody>
    </table>
  </div>
);

export const SponsorshipsView = ({ sponsorships }) => (
  <div style={iaStyles.card}>
    <h1 style={iaStyles.bigTabTitle}>💎 실시간 베팅 내역</h1>
    <div style={{maxHeight:600, overflowY:'auto'}}>
        <table style={iaStyles.table}>
        <thead><tr><th>회차</th><th>ID</th><th>상세</th><th>총액</th><th>결과</th></tr></thead>
        <tbody>{sponsorships.map((s,i) => {
            // bets 객체가 있으면 상세 표시 (P:1000, T:500)
            const details = s.bets 
                ? Object.entries(s.bets).map(([k,v]) => `${k.substring(0,1)}:${(v/1000).toFixed(1)}k`).join(' ') 
                : (Array.isArray(s.picks) ? s.picks.join(', ') : s.pick); // 구버전 호환

            return (
                <tr key={i} style={{borderBottom:'1px solid #222'}}>
                    <td style={{color:'#ffb347'}}>{s.round}</td>
                    <td><b>{s.userId}</b></td>
                    <td style={{color: '#aaa', fontSize:'12px'}}>{details}</td>
                    <td style={{color:'#fff', fontWeight:'bold'}}>{s.betAmount?.toLocaleString()}</td>
                    <td>{s.result ? <span style={{color:'#0f0'}}>{s.result}</span> : <span style={{color:'#888'}}>진행중</span>}</td>
                </tr>
            );
        })}</tbody>
        </table>
    </div>
  </div>
);