import React, { useState } from "react";
import { iaStyles } from "./AdminStyles";
import { useAdminLogic } from "./useAdminLogic.js"; // 로직 훅
import { 
  RequestsView, FinanceView, EventControlView, UsersView, 
  AgentsView, ReferralsView, HistoryView, SponsorshipsView 
} from "./AdminViews.jsx"; // 뷰 컴포넌트

export default function IndependentAdmin({ users, setUsers, onExit }) {
  const [tab, setTab] = useState("requests");

  // 로직 훅 사용
  const {
    currentInfo, targetRound, setTargetRound, queue, deleteQueue,
    gameHistory, sponsorships, activeUsers,
    depositRequests, withdrawRequests, financeHistory, approveDeposit, approveWithdraw,
    agents, setAgents, newAgentName, setNewAgentName, newAgentCode, setNewAgentCode, addAgent,
    handleApplyManipulation, updateFullUserInfo, handleChangeUserPassword, handleChangeAdminPassword
  } = useAdminLogic(users, setUsers);

  return (
    <div style={iaStyles.container}>
      <aside style={iaStyles.sidebar}>
        <h2 style={iaStyles.title}>MASTER PANEL</h2>
        <div style={iaStyles.onlineBadge}>
           <div style={{color:'#888', fontSize:13, marginBottom:5}}>NOW ONLINE</div>
           <div style={{color:'#00ff00', fontSize:22, fontWeight:'bold'}}>● {activeUsers.length}명</div>
        </div>

        <div onClick={() => setTab("requests")} style={tab === "requests" ? iaStyles.menuActive : iaStyles.menu}>
            🔔 입/출금 관리 <span style={iaStyles.countTag}>{depositRequests.length + withdrawRequests.length}</span>
        </div>
        <div onClick={() => setTab("finance")} style={tab === "finance" ? iaStyles.menuActive : iaStyles.menu}>📜 완료된 장부</div>
        <div style={{height:1, background:'#333', margin:'10px 0'}}></div>
        <div onClick={() => setTab("event")} style={tab === "event" ? iaStyles.menuActive : iaStyles.menu}>🕹️ 이벤트 조작</div>
        <div onClick={() => setTab("users")} style={tab === "users" ? iaStyles.menuActive : iaStyles.menu}>💰 회원 관리</div>
        <div onClick={() => setTab("referrals")} style={tab === "referrals" ? iaStyles.menuActive : iaStyles.menu}>🤝 추천인 관리</div>
        <div onClick={() => setTab("agents")} style={tab === "agents" ? iaStyles.menuActive : iaStyles.menu}>👔 실장 장부</div>
        <div onClick={() => setTab("history")} style={tab === "history" ? iaStyles.menuActive : iaStyles.menu}>📋 게임 결과</div>
        <div onClick={() => setTab("sponsorships")} style={tab === "sponsorships" ? iaStyles.menuActive : iaStyles.menu}>💎 후원 내역</div>
        
        <div style={{marginTop: 30, marginBottom: 10, borderTop: '1px solid #333', paddingTop: 20}}>
            <button onClick={handleChangeAdminPassword} style={{...iaStyles.menu, background: 'none', border: 'none', width: '100%', textAlign: 'left', fontSize: 16}}>🔑 관리자 비번 변경</button>
        </div>
        <button onClick={onExit} style={iaStyles.exitBtn}>시스템 종료</button>
      </aside>

      <main style={iaStyles.main}>
        {tab === "requests" && <RequestsView depositRequests={depositRequests} withdrawRequests={withdrawRequests} approveDeposit={approveDeposit} approveWithdraw={approveWithdraw} />}
        {tab === "finance" && <FinanceView financeHistory={financeHistory} />}
        {tab === "event" && <EventControlView currentInfo={currentInfo} targetRound={targetRound} setTargetRound={setTargetRound} queue={queue} deleteQueue={deleteQueue} handleApplyManipulation={handleApplyManipulation} />}
        {tab === "users" && <UsersView users={users} updateFullUserInfo={updateFullUserInfo} handleChangeUserPassword={handleChangeUserPassword} />}
        {tab === "referrals" && <ReferralsView users={users} updateFullUserInfo={updateFullUserInfo} />}
        {tab === "agents" && <AgentsView agents={agents} setAgents={setAgents} users={users} newAgentName={newAgentName} setNewAgentName={setNewAgentName} newAgentCode={newAgentCode} setNewAgentCode={setNewAgentCode} addAgent={addAgent} />}
        {tab === "history" && <HistoryView gameHistory={gameHistory} />}
        {tab === "sponsorships" && <SponsorshipsView sponsorships={sponsorships} />}
      </main>
    </div>
  );
}