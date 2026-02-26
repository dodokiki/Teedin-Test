import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  // ✅ ใช้ lazy initialization เพื่อลด flash/jank
  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < MOBILE_BREAKPOINT;
  });

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    // ✅ ใช้ mql.matches แทน window.innerWidth (เร็วกว่า)
    const onChange = () => {
      setIsMobile(mql.matches);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(mql.matches); // ✅ Set ค่าเริ่มต้นจาก mql
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
