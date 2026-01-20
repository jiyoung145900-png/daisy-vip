import React from "react";
import { motion } from "framer-motion";
import { ds } from "./EventStyles";

export const EventBanner = ({ round, timeLeft, isDrawing, drawingItems, lastResult }) => {
  return (
    <motion.div 
      style={{
        ...ds.eventBanner,
        background: isDrawing ? "linear-gradient(135deg, #1a1a1a 0%, #000 100%)" : ds.eventBanner.background
      }}
      animate={isDrawing ? { x: [-1, 1, -1, 1, 0], transition: { repeat: Infinity, duration: 0.1 } } : {}}
    >
      <div style={ds.radarContainer}>
        {[0, 1, 2].map((i) => (
          <motion.div key={i} style={ds.radarCircle} animate={{ scale: [0.8, 2.2], opacity: [0.3, 0] }} transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.8 }} />
        ))}
      </div>
      <div style={ds.bannerContent}>
        <div style={ds.bannerTop}>
          <div style={{...ds.liveBadge, background: isDrawing ? '#ffb347' : '#ff3b30'}}>{isDrawing ? "DRAWING" : "LIVE"}</div>
          <span style={ds.roundInfo}>제 {round}회차</span>
        </div>
        <div style={ds.timerDisplay}>
          {isDrawing ? (
            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', margin: '15px 0' }}>
              {drawingItems.map((icon, idx) => (
                <motion.div key={idx} initial={{ y: -20 }} animate={{ y: 0 }} style={{ fontSize: '50px' }}>{icon}</motion.div>
              ))}
            </div>
          ) : (
            <h2 style={ds.timeLeftNum}>{`${Math.floor(timeLeft/60)}:${(timeLeft%60).toString().padStart(2,'0')}`}</h2>
          )}
        </div>
        <div style={ds.lastResultBar}>
          <span style={ds.lastLabel}>{round - 1}회차 결과:</span>
          <div style={{display:'flex', gap:'5px'}}>
            {lastResult?.winItems.map((item, idx) => <span key={idx} style={ds.resTag}>{item}</span>) || "대기중"}
          </div>
        </div>
      </div>
    </motion.div>
  );
};