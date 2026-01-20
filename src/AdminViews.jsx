import React, { useState } from "react";
import { iaStyles } from "./AdminStyles";
import { ITEM_CONFIG } from "./EventService"; // ITEM_CONFIG 파일 경로 확인 필요

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

// --- 3. 이벤트 조작 뷰 ---
export const EventControlView = ({ currentInfo, targetRound, setTargetRound, queue, deleteQueue, handleApplyManipulation }) => {
  const [selected, setSelected] = useState([]);
  return (
    <div style={iaStyles.card}>
      <h1 style={iaStyles.bigTabTitle}>🎯 실시간 이벤트 제어</h1>
      <div style={iaStyles.monitorBox}>
        <div>현재: <b>{currentInfo.currentRound}회</b></div>
        <div>남은 시간: <b style={{color: currentInfo.timeLeft <= 5 ? '#ff3b30' : '#00ff00'}}>{currentInfo.timeLeft}초</b></div>
      </div>
      <div style={{marginTop:30}}>
        <input type="number" placeholder="회차" value={targetRound} onChange={e=>setTargetRound(parseInt(e.target.value))} style={iaStyles.adminInput} />
        <div style={iaStyles.adminItemGrid}>
          {ITEM_CONFIG.map(item => (
            <div key={item.name} onClick={()=>{
              const exists = selected.includes(item.name);
              setSelected(exists ? selected.filter(i=>i!==item.name) : [...selected, item.name].slice(0,2));
            }} style={{ ...iaStyles.adminItemCard, border: selected.includes(item.name) ? `3px solid ${item.color}` : '3px solid #333', background: selected.includes(item.name) ? `${item.color}33` : '#1a1a1a' }}>
              <span style={{fontSize:28}}>{item.icon}</span><br/><b>{item.name}</b>
            </div>
          ))}
        </div>
        <button onClick={()=>{handleApplyManipulation(selected).then(res=>res && setSelected([]))}} style={iaStyles.applyBtn}>결과 조작 저장</button>
      </div>
      <div style={{marginTop:20}}>
          {Object.entries(queue).map(([k,v])=> <div key={k} style={iaStyles.queueRow}><b>{k}회</b>: {v.join(", ")} <button onClick={()=>deleteQueue(k)} style={iaStyles.delBtn}>X</button></div>)}
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
            <td style={{color:'#ffb347'}}>💎 {u.diamond?.toLocaleString()}</td>
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

// --- 5. 실장, 추천인, 결과, 후원 뷰 (간단해서 한 파일에 둠) ---
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
      <tbody>{gameHistory.map(h => <tr key={h.round} style={{borderBottom:'1px solid #222'}}><td style={{color:'#ffb347'}}>{h.round}회</td><td>{h.winItems?.join(" / ")}</td></tr>)}</tbody>
    </table>
  </div>
);

export const SponsorshipsView = ({ sponsorships }) => (
  <div style={iaStyles.card}>
    <h1 style={iaStyles.bigTabTitle}>💎 후원(베팅) 내역</h1>
    <div style={{maxHeight:600, overflowY:'auto'}}>
        <table style={iaStyles.table}>
        <thead><tr><th>회차</th><th>ID</th><th>금액</th><th>결과</th></tr></thead>
        <tbody>{sponsorships.map((s,i) => (
            <tr key={i} style={{borderBottom:'1px solid #222'}}>
                <td style={{color:'#ffb347'}}>{s.round}</td><td><b>{s.userId}</b></td><td style={{color:'#0f0'}}>{s.betAmount?.toLocaleString()}</td>
                <td>{s.win===true?"승리":(s.win===false?"패배":"진행중")}</td>
            </tr>
        ))}</tbody>
        </table>
    </div>
  </div>
);