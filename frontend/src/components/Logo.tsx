import { useState } from "react";
import type { SVGProps } from "react";

const LOGO_SRC = `${import.meta.env.BASE_URL}rus-svet-logo.png`;

export function RusSvetMark({ size = 44, ...rest }: { size?: number } & SVGProps<SVGSVGElement>) {
  const [broken, setBroken] = useState(false);
  if (!broken) {
    return (
      <img
        src={LOGO_SRC}
        alt="Русский Свет"
        height={size}
        style={{ height: size, width: "auto" }}
        onError={() => setBroken(true)}
        {...(rest as any)}
      />
    );
  }

  const w = (size * 120) / 96;
  return (
    <svg viewBox="0 0 120 96" width={w} height={size} fill="none" {...rest}>
      <ellipse cx="60" cy="48" rx="52" ry="40" stroke="#DB1E2A" strokeWidth="7" />
      <path d="M46 22h11v52H46V22Z" fill="#1C408C" />
      <path
        d="M55 22h14c10.5 0 19 7 19 17s-8.5 17-19 17H55v-9h13c5.5 0 9.5-3.5 9.5-8s-4-8-9.5-8H55v-9Z"
        fill="#1C408C"
      />
      <path d="M78 36c-2 10-10 17-22 19l6 12c12-3 21-10 24-21l-8-10Z" fill="#DB1E2A" />
    </svg>
  );
}

export function RusSvetLogo({ compact, className }: { compact?: boolean; className?: string }) {
  const [broken, setBroken] = useState(false);
  if (!broken) {
    return (
      <img
        src={LOGO_SRC}
        alt="Русский Свет"
        className={className}
        style={{ height: compact ? 36 : 46, width: "auto" }}
        onError={() => setBroken(true)}
      />
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className || ""}`}>
      <RusSvetMark size={compact ? 34 : 44} />
      {!compact && (
        <div className="flex flex-col leading-[1.05]">
          <span className="text-[18px] font-extrabold tracking-tight text-[#1C408C]">Русский Свет</span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#DB1E2A]">Технологии</span>
        </div>
      )}
    </div>
  );
}
