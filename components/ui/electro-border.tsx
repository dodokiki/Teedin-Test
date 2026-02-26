"use client";

import React, {
  useRef,
  useLayoutEffect,
  useEffect,
  useId,
  type CSSProperties,
  type PropsWithChildren,
} from "react";

const toRGBA = (hex: string, alpha = 1): string => {
  if (!hex) return `rgba(0,0,0,${alpha})`;
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return `rgba(0,0,0,${alpha})`;
  ctx.fillStyle = hex;
  const computed = ctx.fillStyle;
  if (computed.startsWith("rgba")) {
    return computed.replace(/[\d.]+\)$/g, `${alpha})`);
  }
  if (computed.startsWith("rgb")) {
    return computed.replace("rgb", "rgba").replace(")", `,${alpha})`);
  }
  return computed;
};

export interface ElectroBorderProps extends PropsWithChildren {
  borderColor?: string;
  borderWidth?: number;
  distortion?: number;
  animationSpeed?: number;
  radius?: string | number;
  glow?: boolean;
  aura?: boolean;
  effects?: boolean;
  glowBlur?: number;
  className?: string;
  style?: CSSProperties;
}

export const ElectroBorder: React.FC<ElectroBorderProps> = ({
  children,
  borderColor = "#00fffc",
  borderWidth = 2,
  distortion = 1,
  animationSpeed = 0.8,
  radius = "inherit",
  glow = true,
  aura = true,
  effects = true,
  glowBlur = 30,
  className,
  style,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const strokeLayer = useRef<HTMLDivElement>(null);
  const id = useId().replace(/[:]/g, "");
  const filterId = `electro-filter-${id}`;

  const updateFilter = () => {
    const svg = svgRef.current;
    const root = rootRef.current;
    if (!svg || !root) return;

    if (strokeLayer.current) {
      strokeLayer.current.style.filter = `url(#${filterId})`;
    }

    const { width, height } = root.getBoundingClientRect();

    const dxAnimations = Array.from(
      svg.querySelectorAll<SVGAnimateElement>(
        'feOffset > animate[attributeName="dx"]'
      )
    );
    const dyAnimations = Array.from(
      svg.querySelectorAll<SVGAnimateElement>(
        'feOffset > animate[attributeName="dy"]'
      )
    );

    dxAnimations.forEach((a, i) =>
      a.setAttribute("values", i % 2 === 0 ? `${width};0` : `0;-${width}`)
    );
    dyAnimations.forEach((a, i) =>
      a.setAttribute("values", i % 2 === 0 ? `${height};0` : `0;-${height}`)
    );

    const duration = Math.max(0.01, 6 / animationSpeed);
    [...dxAnimations, ...dyAnimations].forEach(a =>
      a.setAttribute("dur", `${duration}s`)
    );

    const disp = svg.querySelector("feDisplacementMap");
    if (disp) disp.setAttribute("scale", `${35 * distortion}`);

    requestAnimationFrame(() => {
      [...dxAnimations, ...dyAnimations].forEach((a: any) => {
        if (a.beginElement) a.beginElement();
      });
    });
  };

  useLayoutEffect(() => {
    const observer = new ResizeObserver(() => updateFilter());
    if (rootRef.current) observer.observe(rootRef.current);
    updateFilter();
    return () => observer.disconnect();
  }, []);

  useEffect(() => updateFilter(), [animationSpeed, distortion]);

  const radiusStyle: CSSProperties = { borderRadius: radius };

  const borderBase: CSSProperties = {
    border: `${borderWidth}px solid ${borderColor}`,
    ...radiusStyle,
  };

  const glowLayer1: CSSProperties =
    effects && glow
      ? {
          ...radiusStyle,
          border: `${borderWidth}px solid ${toRGBA(borderColor, 0.7)}`,
          filter: `blur(${borderWidth * 1.2}px)`,
          opacity: 0.1,
        }
      : {};

  const glowLayer2: CSSProperties =
    effects && glow
      ? {
          ...radiusStyle,
          border: `${borderWidth}px solid ${toRGBA(borderColor, 0.9)}`,
          filter: `blur(${glowBlur}px)`,
          opacity: 0.5,
        }
      : {};

  const backgroundAura: CSSProperties =
    effects && aura
      ? {
          ...radiusStyle,
          transform: "scale(1.05)",
          background: `radial-gradient(circle at 50% 50%, ${toRGBA(
            borderColor,
            0.5
          )} 0%, transparent 70%)`,
          filter: `blur(${glowBlur * 1.2}px)`,
          opacity: 0.7,
          zIndex: -1,
        }
      : {};

  return (
    <div
      ref={rootRef}
      className={`relative isolate ${className ?? ""}`}
      style={style}
    >
      <svg
        ref={svgRef}
        className="absolute h-0 w-0"
        aria-hidden
        focusable="false"
      >
        <defs>
          <filter id={filterId} x="-200%" y="-200%" width="500%" height="500%">
            <feTurbulence
              type="turbulence"
              baseFrequency="0.02"
              numOctaves="8"
              result="turb1"
              seed="1"
            />
            <feOffset in="turb1" dx="0" dy="0" result="offset1">
              <animate
                attributeName="dy"
                values="600;0"
                dur="6s"
                repeatCount="indefinite"
              />
            </feOffset>
            <feTurbulence
              type="turbulence"
              baseFrequency="0.03"
              numOctaves="8"
              result="turb2"
              seed="2"
            />
            <feOffset in="turb2" dx="0" dy="0" result="offset2">
              <animate
                attributeName="dx"
                values="0;-600"
                dur="6s"
                repeatCount="indefinite"
              />
            </feOffset>
            <feBlend in="offset1" in2="offset2" mode="lighten" result="mix" />
            <feDisplacementMap
              in="SourceGraphic"
              in2="mix"
              scale="35"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      <div className="pointer-events-none absolute inset-0" style={radiusStyle}>
        <div
          ref={strokeLayer}
          className="absolute inset-0 -left-2 -top-3"
          style={borderBase}
        />
        {effects && glow && (
          <div className="absolute inset-0" style={glowLayer1} />
        )}
        {effects && glow && (
          <div className="absolute inset-0" style={glowLayer2} />
        )}
        {effects && aura && (
          <div className="absolute inset-0" style={backgroundAura} />
        )}
      </div>

      <div className="relative z-10" style={radiusStyle}>
        {children}
      </div>
    </div>
  );
};

export default ElectroBorder;
