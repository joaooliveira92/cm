// src/renderer/components/match-screen/StadiumOverlay.tsx
import React from "react";

export interface StadiumOverlayProps {
  showOverlay: boolean;
}

export const StadiumOverlay: React.FC<StadiumOverlayProps> = ({ showOverlay }) => {
  return (
    <div
      className="stadium-overlay"
      style={{
        opacity: showOverlay ? 0.72 : 0,
        transition: "opacity 140ms ease-out",
      }}
    />
  );
};