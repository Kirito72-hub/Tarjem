import React, { useCallback, useEffect, useState } from 'react';
import { Minus, Square, X } from 'lucide-react';

function RestoreIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
    >
      <rect x="3.5" y="0.5" width="8" height="8" rx="0.5" />
      <rect x="0.5" y="3.5" width="8" height="8" rx="0.5" />
    </svg>
  );
}

interface WindowButtonProps {
  onClick: () => void;
  'aria-label': string;
  children: React.ReactNode;
  variant?: 'default' | 'close';
}

const WindowButton: React.FC<WindowButtonProps> = ({
  onClick,
  'aria-label': ariaLabel,
  children,
  variant = 'default',
}) => (
  <button
    type="button"
    aria-label={ariaLabel}
    onClick={onClick}
    className={`flex h-8 w-11 items-center justify-center transition-colors ${
      variant === 'close'
        ? 'text-gray-400 hover:bg-red-500 hover:text-white'
        : 'text-gray-400 hover:bg-white/10 hover:text-gray-100'
    }`}
  >
    {children}
  </button>
);

export const TitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  const api = window.electronAPI;

  const syncMaximized = useCallback(async () => {
    if (!api) return;
    const maximized = await api.window.isMaximized();
    setIsMaximized(maximized);
  }, [api]);

  useEffect(() => {
    void syncMaximized();
  }, [syncMaximized]);

  const handleMinimize = () => {
    void api?.window.minimize();
  };

  const handleMaximize = async () => {
    if (!api) return;
    const maximized = await api.window.maximize();
    setIsMaximized(maximized);
  };

  const handleClose = () => {
    void api?.window.close();
  };

  const dragRegionStyle = { WebkitAppRegion: 'drag' } as React.CSSProperties;
  const noDragStyle = { WebkitAppRegion: 'no-drag' } as React.CSSProperties;

  return (
    <header
      className="flex h-8 shrink-0 items-center justify-between border-b border-white/5 bg-[#0F111A] select-none"
      style={dragRegionStyle}
    >
      <div className="pointer-events-none flex items-center gap-2 px-4">
        <span className="font-display text-sm font-semibold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
          Tarjem
        </span>
        <span className="text-[10px] text-gray-500">v0.1.0</span>
      </div>

      <div className="flex h-full items-stretch" style={noDragStyle}>
        <WindowButton onClick={handleMinimize} aria-label="Minimize window">
          <Minus size={14} />
        </WindowButton>
        <WindowButton
          onClick={() => void handleMaximize()}
          aria-label={isMaximized ? 'Restore window' : 'Maximize window'}
        >
          {isMaximized ? <RestoreIcon /> : <Square size={12} strokeWidth={2} />}
        </WindowButton>
        <WindowButton onClick={handleClose} aria-label="Close window" variant="close">
          <X size={14} />
        </WindowButton>
      </div>
    </header>
  );
};
