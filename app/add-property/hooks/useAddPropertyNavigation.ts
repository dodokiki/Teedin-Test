import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function useAddPropertyNavigation(
  currentStep: number,
  projectName: string,
  address: string,
  price: string
) {
  const router = useRouter();

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // เมื่อ refresh หน้า ไม่ต้องลบข้อมูล
      sessionStorage.setItem("page-refreshed", "true");

      // ✅ แสดงข้อความเตือนถ้ามีข้อมูลในฟอร์ม
      const hasFormData = localStorage.getItem("add-property-form-data");
      if (hasFormData && (projectName || address || price)) {
        e.preventDefault();
        e.returnValue =
          "คุณมีข้อมูลที่ยังไม่ได้บันทึก ต้องการออกจากหน้านี้หรือไม่?";
        return e.returnValue;
      }
    };

    const handlePopState = () => {
      // เมื่อผู้ใช้กดปุ่ม back/forward
      const currentPath = window.location.pathname;
      if (currentPath !== "/add-property") {
        localStorage.removeItem("add-property-form-data");
        console.log(
          "Form data cleared - user navigated away via browser navigation"
        );
      }
    };

    // ✅ Override router.push เพื่อตรวจจับการเปลี่ยนหน้าผ่าน Next.js router
    const originalPush = router.push;
    const boundOriginalPush = router.push.bind(router);
    type PushArgs = Parameters<typeof router.push>;

    router.push = ((href: PushArgs[0], options?: PushArgs[1]) => {
      // ถ้าไปหน้าอื่นที่ไม่ใช่ add-property
      if (typeof href === "string" && !href.includes("/add-property")) {
        localStorage.removeItem("add-property-form-data");
        console.log("Form data cleared - user navigated to:", href);
      }
      return boundOriginalPush(href, options);
    }) as typeof router.push;

    // เพิ่ม event listeners
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);

    // Cleanup
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
      // คืนค่า router.push เดิม
      router.push = originalPush;
    };
  }, [router, projectName, address, price]);

  const navigateAway = () => {
    localStorage.removeItem("add-property-form-data");
  };

  return { navigateAway };
}
