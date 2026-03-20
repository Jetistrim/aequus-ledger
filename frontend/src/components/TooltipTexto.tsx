import { useState, useRef, useEffect } from 'react';

interface Props {
  texto?: string | null;
  placeholder?: string;
  className?: string;
}

/**
 * Exibe texto com truncamento por reticências e tooltip customizado ao passar o mouse.
 * O tooltip só aparece quando o texto realmente transborda o espaço disponível.
 */
export function TooltipTexto({ texto, placeholder = '—', className = '' }: Props) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tooltip, setTooltip] = useState<{ rect: DOMRect } | null>(null);

  const displayText = texto || placeholder;
  const isPlaceholder = !texto;

  function handleMouseEnter() {
    if (!texto) return;
    timerRef.current = setTimeout(() => {
      const el = spanRef.current;
      if (!el) return;
      // Só exibe tooltip quando o texto realmente transborda
      if (el.scrollWidth <= el.clientWidth) return;
      setTooltip({ rect: el.getBoundingClientRect() });
    }, 250);
  }

  function handleMouseLeave() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setTooltip(null);
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const tooltipTop = tooltip ? tooltip.rect.top - 10 : 0;
  const tooltipLeft = tooltip ? tooltip.rect.left : 0;

  return (
    <>
      <span
        ref={spanRef}
        className={`block w-full truncate ${isPlaceholder ? 'text-gray-400 italic' : ''} ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {displayText}
      </span>

      {tooltip && (
        <div
          className="pointer-events-none"
          style={{
            position: 'fixed',
            top: tooltipTop,
            left: tooltipLeft,
            transform: 'translateY(-100%)',
            zIndex: 9999,
          }}
        >
          {/* Balão do tooltip */}
          <div className="bg-gray-900 text-white text-xs rounded-xl shadow-2xl px-4 py-3 max-w-sm break-words leading-relaxed border border-gray-700/60">
            <p className="text-gray-400 text-[10px] uppercase tracking-widest mb-2 font-semibold border-b border-gray-700 pb-2">
              Conteúdo completo
            </p>
            <p className="text-gray-100 font-medium">{texto}</p>
          </div>
          {/* Seta apontando para baixo */}
          <div
            style={{
              width: 0,
              height: 0,
              marginLeft: 14,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid #111827',
            }}
          />
        </div>
      )}
    </>
  );
}
