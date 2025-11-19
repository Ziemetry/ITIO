import React from 'react';

interface ScanOverlayProps {
  isScanning: boolean;
}

const ScanOverlay: React.FC<ScanOverlayProps> = ({ isScanning }) => {
  if (!isScanning) return null;

  return (
    <div className="absolute inset-0 bg-black/30 rounded-lg overflow-hidden z-10 flex flex-col justify-center items-center backdrop-blur-[2px]">
      {/* Scanning Line */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="w-full h-1 bg-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-scan-line opacity-90"></div>
      </div>
      
      <div className="text-white font-semibold text-lg tracking-wide animate-pulse drop-shadow-md">
        AI กำลังอ่านข้อมูล...
      </div>
    </div>
  );
};

export default ScanOverlay;