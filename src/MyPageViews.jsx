import React, { useState, useMemo } from "react";
import { myStyles } from "./MyPage.styles";

// 공통 헤더 컴포넌트
const SubHeader = ({ title, onBack }) => (
  <div style={myStyles.subHeader}>
    <button onClick={onBack} style={myStyles.backBtn}>〈</button>
    <span style={myStyles.subTitle}>{title}</span>
    <div style={{width: 30}}></div>
  </div>
);

// --- 1. 비밀번호 변경 화면 (기존 유지) ---
export const PasswordView = ({ onBack, isKo, onSubmit, userInfo }) => {
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  const handleSave = async () => {
    const success = await onSubmit(oldPw, newPw, confirmPw);
    if (success) onBack();
  };

  return (
    <div style={myStyles.container}>
      <SubHeader title={isKo ? "비밀번호 변경" : "Change Password"} onBack={onBack} />
      <div style={myStyles.formArea}>
        <div style={myStyles.inputGroup}><label style={myStyles.inputLabel}>ID</label>
          <input style={myStyles.inputDisabled} value={userInfo.id} disabled />
        </div>
        <div style={{height: 20}} />
        <div style={myStyles.inputGroup}><label style={myStyles.inputLabel}>{isKo ? "이전 비밀번호" : "Old Password"}</label>
          <input type="password" style={myStyles.input} value={oldPw} onChange={(e)=>setOldPw(e.target.value)} />
        </div>
        <div style={myStyles.inputGroup}><label style={myStyles.inputLabel}>{isKo ? "새 비밀번호" : "New Password"}</label>
          <input type="password" style={myStyles.input} value={newPw} onChange={(e)=>setNewPw(e.target.value)} />
        </div>
        <div style={myStyles.inputGroup}><label style={myStyles.inputLabel}>{isKo ? "확인" : "Confirm"}</label>
          <input type="password" style={myStyles.input} value={confirmPw} onChange={(e)=>setConfirmPw(e.target.value)} />
        </div>
        <button style={myStyles.saveBtn} onClick={handleSave}>{isKo ? "저장" : "Save"}</button>
      </div>
    </div>
  );
};

// --- 2. PIN 설정 화면 (기존 유지) ---
export const PinView = ({ onBack, isKo, onSubmit, userInfo }) => {
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const savedPin = localStorage.getItem(`user_pin_${userInfo.id}`);

  const handleSave = async () => {
    const success = await onSubmit(oldPin, newPin, confirmPin);
    if (success) onBack();
  };

  return (
    <div style={myStyles.container}>
      <SubHeader title={savedPin ? (isKo ? "결제 비밀번호 변경" : "Change PIN") : (isKo ? "결제 비밀번호 생성" : "Create PIN")} onBack={onBack} />
      <div style={myStyles.formArea}>
        {savedPin ? (
          <div style={myStyles.inputGroup}><label style={myStyles.inputLabel}>{isKo ? "이전 PIN" : "Old PIN"}</label>
            <input type="password" maxLength={6} style={{...myStyles.input, textAlign:'center', letterSpacing:'8px'}} value={oldPin} onChange={(e)=>setOldPin(e.target.value.replace(/[^0-9]/g,''))} />
          </div>
        ) : null}
        <div style={myStyles.inputGroup}><label style={myStyles.inputLabel}>{isKo ? "새 PIN (6자리)" : "New PIN"}</label>
          <input type="password" maxLength={6} style={{...myStyles.input, textAlign:'center', letterSpacing:'8px'}} value={newPin} onChange={(e)=>setNewPin(e.target.value.replace(/[^0-9]/g,''))} />
        </div>
        <div style={myStyles.inputGroup}><label style={myStyles.inputLabel}>{isKo ? "PIN 확인" : "Confirm"}</label>
          <input type="password" maxLength={6} style={{...myStyles.input, textAlign:'center', letterSpacing:'8px'}} value={confirmPin} onChange={(e)=>setConfirmPin(e.target.value.replace(/[^0-9]/g,''))} />
        </div>
        <button style={myStyles.saveBtn} onClick={handleSave}>{isKo ? "완료" : "Done"}</button>
      </div>
    </div>
  );
};

// --- 3. 입금 화면 (★ 내역 확인 버튼 추가됨) ---
export const DepositView = ({ onBack, isKo, onSubmit, onViewHistory }) => {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");

  const handleReq = async () => {
    const success = await onSubmit(name, amount);
    if(success) onBack();
  }

  return (
    <div style={myStyles.container}>
      <SubHeader title={isKo ? "입금 신청" : "Deposit"} onBack={onBack} />
      <div style={myStyles.formArea}>
        {/* 내역 확인 버튼 */}
        <div style={{display:'flex', justifyContent:'flex-end', marginBottom:20}}>
            <button onClick={onViewHistory} style={{background:'#222', color:'#aaa', border:'1px solid #444', padding:'8px 12px', borderRadius:8, fontSize:13, cursor:'pointer'}}>
                📄 {isKo ? "나의 입금 신청 내역" : "My History"}
            </button>
        </div>

        <div style={myStyles.inputGroup}><label style={myStyles.inputLabel}>{isKo ? "입금자명" : "Name"}</label>
          <input style={myStyles.input} value={name} onChange={(e)=>setName(e.target.value)} />
        </div>
        <div style={myStyles.inputGroup}><label style={myStyles.inputLabel}>{isKo ? "금액" : "Amount"}</label>
          <input type="number" style={myStyles.input} value={amount} onChange={(e)=>setAmount(e.target.value)} />
        </div>
        <button style={myStyles.saveBtn} onClick={handleReq}>{isKo ? "신청하기" : "Request"}</button>
      </div>
    </div>
  );
};

// --- 4. 출금 화면 (★ 내역 확인 버튼 추가됨) ---
export const WithdrawView = ({ onBack, isKo, onSubmit, onViewHistory }) => {
  const [amount, setAmount] = useState("");
  const [bank, setBank] = useState("");
  const [account, setAccount] = useState("");
  const [holder, setHolder] = useState("");
  const [pin, setPin] = useState("");

  const handleReq = async () => {
    const success = await onSubmit(amount, { bank, account, holder }, pin);
    if(success) onBack();
  }

  return (
    <div style={myStyles.container}>
      <SubHeader title={isKo ? "출금 신청" : "Withdraw"} onBack={onBack} />
      <div style={myStyles.formArea}>
        {/* 내역 확인 버튼 */}
        <div style={{display:'flex', justifyContent:'flex-end', marginBottom:20}}>
            <button onClick={onViewHistory} style={{background:'#222', color:'#aaa', border:'1px solid #444', padding:'8px 12px', borderRadius:8, fontSize:13, cursor:'pointer'}}>
                📄 {isKo ? "나의 출금 신청 내역" : "My History"}
            </button>
        </div>

        <div style={myStyles.inputGroup}><label style={myStyles.inputLabel}>{isKo ? "금액" : "Amount"}</label>
          <input type="number" style={myStyles.input} value={amount} onChange={(e)=>setAmount(e.target.value)} />
        </div>
        <div style={myStyles.inputGroup}><label style={myStyles.inputLabel}>{isKo ? "은행 정보" : "Bank Info"}</label>
          <input style={{...myStyles.input, marginBottom:5}} placeholder={isKo ? "은행명" : "Bank Name"} value={bank} onChange={(e)=>setBank(e.target.value)}/>
          <input style={{...myStyles.input, marginBottom:5}} placeholder={isKo ? "계좌번호" : "Account No"} value={account} onChange={(e)=>setAccount(e.target.value)}/>
          <input style={myStyles.input} placeholder={isKo ? "예금주" : "Holder"} value={holder} onChange={(e)=>setHolder(e.target.value)}/>
        </div>
        <div style={myStyles.inputGroup}><label style={myStyles.inputLabel}>PIN</label>
          <input type="password" maxLength={6} style={{...myStyles.input, textAlign:'center', letterSpacing:'8px'}} value={pin} onChange={(e)=>setPin(e.target.value.replace(/[^0-9]/g,''))} />
        </div>
        <button style={{...myStyles.saveBtn, background:'#D4AF37', color:'#000'}} onClick={handleReq}>{isKo ? "신청하기" : "Request"}</button>
      </div>
    </div>
  );
};

// --- 5. [신규] 입/출금 신청 내역 화면 (심사중/완료 상태 표시) ---
export const TransactionHistoryView = ({ onBack, isKo, title, data }) => {
    return (
      <div style={myStyles.container}>
        <SubHeader title={title} onBack={onBack} />
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {data.length === 0 ? <div style={{ textAlign: 'center', color: '#666', marginTop: '50px' }}>{isKo ? "내역이 없습니다." : "No records."}</div> :
            data.map((h, i) => {
              // 상태별 색상 및 텍스트 처리
              const isDone = h.status === '완료';
              const statusColor = isDone ? '#4cd137' : '#fbc531'; // 초록 vs 노랑
              const statusBg = isDone ? 'rgba(76, 209, 55, 0.1)' : 'rgba(251, 197, 49, 0.1)';
              const statusText = isDone ? (isKo ? '처리완료' : 'Done') : (isKo ? '심사중' : 'Pending');

              return (
                <div key={i} style={{ background: '#1a1a1a', padding: '20px', borderRadius: '15px', marginBottom: '15px', border: '1px solid #333', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                      <div style={{color: '#888', fontSize: '12px', marginBottom: '5px'}}>
                          {new Date(h.timestamp || h.completedAt).toLocaleString()}
                      </div>
                      <div style={{color: '#fff', fontSize: '18px', fontWeight:'bold'}}>
                          {h.amount?.toLocaleString()} DIA
                      </div>
                      {/* 추가 정보 표시 (입금자명 or 은행) */}
                      <div style={{color: '#666', fontSize:'13px', marginTop:4}}>
                          {h.depositName ? (isKo ? `입금자: ${h.depositName}` : `Name: ${h.depositName}`) : 
                           (h.bankInfo ? `${h.bankInfo.bank} ${h.bankInfo.holder}` : '')}
                      </div>
                  </div>
                  <div style={{
                      padding: '6px 12px', borderRadius:'8px', fontSize:'13px', fontWeight:'bold',
                      background: statusBg, color: statusColor, border: `1px solid ${statusColor}`
                  }}>
                      {statusText}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    );
};

// --- 6. 게임 이용 내역 화면 (기존 유지) ---
export const HistoryView = ({ onBack, isKo, userId }) => {
  const donationHistory = useMemo(() => {
    if (!userId) return [];
    const saved = localStorage.getItem(`event_my_history_${userId}`);
    return saved ? JSON.parse(saved) : [];
  }, [userId]);

  return (
    <div style={myStyles.container}>
      <SubHeader title={isKo ? "이용 내역" : "History"} onBack={onBack} />
      <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
        {donationHistory.length === 0 ? <div style={{ textAlign: 'center', color: '#666', marginTop: '50px' }}>{isKo ? "내역이 없습니다." : "No records."}</div> :
          donationHistory.map((h, i) => (
            <div key={i} style={{ background: '#1a1a1a', padding: '15px', borderRadius: '10px', marginBottom: '10px', border: '1px solid #333' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#888', fontSize: '11px', marginBottom: '5px' }}><span>{h.round}{isKo ? "회차" : "R"}</span><span>{h.date}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ color: '#fff' }}>{h.selected?.join(", ")}</span><span style={{ color: h.earn > 0 ? '#4cd137' : '#e84118', fontWeight: 'bold' }}>{h.earn > 0 ? `+${h.earn.toLocaleString()}` : `-${h.cost.toLocaleString()}`}</span></div>
            </div>
          ))}
      </div>
    </div>
  );
};

// --- 7. 설정 메뉴 화면 (기존 유지) ---
export const SettingsView = ({ onBack, isKo, onChangeView }) => (
  <div style={myStyles.container}>
    <SubHeader title={isKo ? "시스템 설정" : "Settings"} onBack={onBack} />
    <div style={myStyles.settingList}>
      <div style={myStyles.settingItem} onClick={() => onChangeView("profile")}>
        <span style={myStyles.settingText}>{isKo ? "로그인 비밀번호 변경" : "Change Password"}</span><span style={myStyles.arrow}>❯</span>
      </div>
      <div style={myStyles.settingItem} onClick={() => onChangeView("payment_pin")}>
        <span style={myStyles.settingText}>{isKo ? "결제 비밀번호(PIN) 설정" : "Setup PIN"}</span><span style={myStyles.arrow}>❯</span>
      </div>
    </div>
  </div>
);