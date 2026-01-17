import React, { useRef } from "react";
import { myStyles } from "./MyPage.styles";
import { avatarStyles, getAvatarUrl } from "./MyPage.utils";

const AvatarEditorModal = ({ 
  userId,
  tempSelectedIdx, 
  tempUploadedImg, 
  setTempSelectedIdx, 
  setTempUploadedImg, 
  onClose, 
  onApply, 
  onRandom 
}) => {
  const fileInputRef = useRef(null);

  return (
    <div style={myStyles.avatarPicker}>
      <div style={myStyles.pickerHeader}>
        <span style={{color: '#fff', fontWeight: '800', fontSize: '18px'}}>아바타 에디터</span>
        <div style={{display:'flex', gap: '10px'}}>
          <button onClick={onRandom} style={myStyles.randomBtn}>🎲 랜덤</button>
          <button onClick={onClose} style={myStyles.closeBtn}>×</button>
        </div>
      </div>

      <div style={myStyles.charGrid}>
        {avatarStyles.map((_, idx) => (
          <div 
            key={idx} 
            onClick={() => { setTempUploadedImg(null); setTempSelectedIdx(idx); }}
            style={{ 
              ...myStyles.pickerItem, 
              border: (tempSelectedIdx === idx && !tempUploadedImg) ? '2px solid #D4AF37' : '1px solid #333' 
            }}
          >
            <img src={getAvatarUrl(idx, userId)} alt="char" style={{width:'85%'}} />
          </div>
        ))}
      </div>

      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef} 
        onChange={(e) => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onloadend = () => { setTempUploadedImg(reader.result); setTempSelectedIdx(-1); };
            reader.readAsDataURL(file);
          }
        }} 
        style={{display: 'none'}} 
      />
      <button onClick={() => fileInputRef.current.click()} style={myStyles.uploadBtn}>📷 커스텀 사진 업로드</button>
      <button onClick={onApply} style={myStyles.applyBtn}>완료</button>
    </div>
  );
};

export default AvatarEditorModal;