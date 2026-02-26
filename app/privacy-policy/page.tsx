"use client";

import { useLanguage } from "@/contexts/language-context";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export default function PrivacyPolicyPage() {
  const { language } = useLanguage();
  const [activeSection, setActiveSection] = useState("cookies");
  const isScrollingRef = useRef(false);

  // Simple scroll spy effect
  useEffect(() => {
    const handleScroll = () => {
      if (isScrollingRef.current) return;

      const sections = document.querySelectorAll("section[id]");
      let current = "";
      sections.forEach(section => {
        const sectionTop = (section as HTMLElement).offsetTop;
        if (window.scrollY >= sectionTop - 200) {
          current = section.getAttribute("id") || "";
        }
      });
      if (current) setActiveSection(current);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      isScrollingRef.current = true;
      setActiveSection(id);

      const headerOffset = 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition =
        elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });

      // Reset after animation
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 800);
    }
  };

  const sidebarItems = [
    { id: "auto-collection", label: "ข้อมูลที่เราเก็บรวบรวมโดยอัตโนมัติ" },
    { id: "personal-data", label: "การเก็บรวบรวมข้อมูลส่วนบุคคล" },
    { id: "data-management", label: "การจัดการข้อมูลส่วนบุคคล" },
    { id: "data-storage", label: "การจัดเก็บข้อมูลส่วนบุคคล" },
    { id: "data-usage", label: "การใช้และประมวลผลข้อมูลส่วนบุคคล" },
    { id: "data-transfer", label: "การส่งหรือโอนข้อมูลส่วนบุคคล" },
    { id: "user-rights", label: "สิทธิของผู้ใช้" },
    {
      id: "cookies",
      label: "คุกกี้",
      subItems: [
        { id: "what-is-cookie", label: "คุกกี้คืออะไร" },
        { id: "cookies-usage", label: "คุกกี้ที่เราใช้งาน" },
        { id: "web-beacons", label: "เรามีการใช้เว็บบีคอนหรือไม่" },
        { id: "cookie-choices", label: "ตัวเลือกคุกกี้ของท่านมีอะไรบ้าง" },
        { id: "do-not-track", label: "การส่งสัญญาณห้ามติดตาม" },
        { id: "external-links", label: "การเชื่อมต่อไปยังเว็บไซต์อื่น" },
      ],
    },
    { id: "security", label: "การรักษาความมั่นคงปลอดภัย" },
    { id: "contact", label: "ติดต่อเรา" },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-800 font-sukhumvit">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-20">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">
              {language === "th" ? "กลับสู่หน้าหลัก" : "Back to Home"}
            </span>
          </Link>
          <div className="font-bold text-xl text-primary">TEEDIN EASY</div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Sidebar */}
          <aside className="w-full lg:w-1/4 hidden lg:block">
            <div className="sticky top-24">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-primary">
                  นโยบายความเป็นส่วนตัว
                </h2>
              </div>
              <nav className="space-y-1 relative">
                {sidebarItems.map(item => (
                  <div key={item.id}>
                    <button
                      onClick={() => scrollToSection(item.id)}
                      className={`relative block w-full text-left px-4 py-2 text-sm transition-all duration-200 ${
                        activeSection === item.id ||
                        (item.subItems &&
                          item.subItems.some(sub => sub.id === activeSection))
                          ? "text-primary font-bold"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {/* Active Indicator - Only show if exact match */}
                      {activeSection === item.id && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full bg-primary" />
                      )}
                      {item.label}
                    </button>

                    {item.subItems && (
                      <div className="ml-0 space-y-1">
                        {item.subItems.map(sub => (
                          <button
                            key={sub.id}
                            onClick={() => scrollToSection(sub.id)}
                            className={`relative block w-full text-left pl-8 pr-4 py-2 text-sm transition-all duration-200 ${
                              activeSection === sub.id
                                ? "text-primary font-bold"
                                : "text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            {activeSection === sub.id && (
                              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full bg-primary" />
                            )}
                            {sub.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </nav>
            </div>
          </aside>

          {/* Content */}
          <div className="w-full lg:w-3/4 space-y-16 pb-24">
            <div className="lg:hidden mb-8">
              <h1 className="text-3xl font-bold text-slate-900 mb-2">
                นโยบายความเป็นส่วนตัว
              </h1>
              <p className="text-slate-500">อัปเดตล่าสุด: 23 พฤศจิกายน 2568</p>
            </div>

            <section id="auto-collection" className="scroll-mt-24">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                ข้อมูลที่เราเก็บรวบรวมโดยอัตโนมัติ
              </h2>
              <p className="text-slate-600 leading-relaxed">
                เมื่อท่านเข้าใช้งานเว็บไซต์ Teedin Easy
                เซิร์ฟเวอร์ของเราจะบันทึกข้อมูลบางอย่างโดยอัตโนมัติ ซึ่งรวมถึง
                IP Address, ประเภทของเบราว์เซอร์, เวลาที่เข้าใช้งาน,
                และหน้าเว็บที่ท่านเยี่ยมชม
                ข้อมูลเหล่านี้ช่วยให้เราวิเคราะห์แนวโน้มและปรับปรุงประสิทธิภาพของระบบ
              </p>
            </section>

            <section id="personal-data" className="scroll-mt-24">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                การเก็บรวบรวมข้อมูลส่วนบุคคล
              </h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                เราเก็บรวบรวมข้อมูลส่วนบุคคลที่ท่านให้ไว้กับเราโดยตรง เช่น
                เมื่อท่านลงทะเบียนสมาชิก, ลงประกาศอสังหาริมทรัพย์, หรือติดต่อเรา
                ข้อมูลที่เก็บรวบรวมอาจรวมถึง:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-600">
                <li>ชื่อ-นามสกุล</li>
                <li>ที่อยู่อีเมล</li>
                <li>หมายเลขโทรศัพท์</li>
                <li>ข้อมูลที่อยู่และการติดต่อ</li>
                <li>ข้อมูลเกี่ยวกับอสังหาริมทรัพย์ที่ท่านลงประกาศ</li>
              </ul>
            </section>

            <section id="data-management" className="scroll-mt-24">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                การจัดการข้อมูลส่วนบุคคล
              </h2>
              <p className="text-slate-600 leading-relaxed">
                เรามีมาตรการในการบริหารจัดการข้อมูลส่วนบุคคลของท่านอย่างเหมาะสม
                เพื่อให้มั่นใจว่าข้อมูลของท่านถูกต้อง เป็นปัจจุบัน
                และมีความปลอดภัย
              </p>
            </section>

            <section id="data-storage" className="scroll-mt-24">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                การจัดเก็บข้อมูลส่วนบุคคล
              </h2>
              <p className="text-slate-600 leading-relaxed">
                ข้อมูลส่วนบุคคลของท่านจะถูกจัดเก็บในระบบฐานข้อมูลที่มีความปลอดภัยสูง
                (Supabase)
                และจะถูกเก็บรักษาไว้ตราบเท่าที่จำเป็นตามวัตถุประสงค์ที่ได้แจ้งไว้
                หรือตามที่กฎหมายกำหนด
              </p>
            </section>

            <section id="data-usage" className="scroll-mt-24">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                การใช้และประมวลผลข้อมูลส่วนบุคคล
              </h2>
              <p className="text-slate-600 leading-relaxed">
                เราใช้ข้อมูลของท่านเพื่อให้บริการ, ยืนยันตัวตน, ติดต่อสื่อสาร,
                และปรับปรุงบริการของเรา
                รวมถึงการวิเคราะห์ข้อมูลเพื่อการตลาดและการโฆษณาตามความสนใจ
              </p>
            </section>

            <section id="data-transfer" className="scroll-mt-24">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                การส่งหรือโอนข้อมูลส่วนบุคคลไปยังต่างประเทศ
              </h2>
              <p className="text-slate-600 leading-relaxed">
                ข้อมูลของท่านอาจถูกโอนไปยังเซิร์ฟเวอร์ที่ตั้งอยู่ในต่างประเทศ
                (เช่น สิงคโปร์ หรือ สหรัฐอเมริกา)
                ซึ่งเราจะดำเนินการให้มั่นใจว่ามีมาตรฐานการคุ้มครองข้อมูลที่เพียงพอ
              </p>
            </section>

            <section id="user-rights" className="scroll-mt-24">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                สิทธิของผู้ใช้
              </h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                ท่านมีสิทธิตามกฎหมาย PDPA ดังนี้:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-600">
                <li>สิทธิในการเข้าถึงและขอรับสำเนาข้อมูลส่วนบุคคล</li>
                <li>สิทธิในการแก้ไขข้อมูลให้ถูกต้อง</li>
                <li>สิทธิในการลบหรือทำลายข้อมูล</li>
                <li>สิทธิในการระงับการใช้ข้อมูล</li>
                <li>สิทธิในการคัดค้านการเก็บรวบรวม ใช้ หรือเปิดเผยข้อมูล</li>
              </ul>
            </section>

            {/* Cookies Section - Detailed based on image */}
            <div id="cookies" className="scroll-mt-24">
              <h2 className="text-3xl font-bold text-slate-900 mb-8">
                คุกกี้ (Cookies)
              </h2>

              <section id="what-is-cookie" className="scroll-mt-24 mb-12">
                <h3 className="text-2xl font-bold text-slate-900 mb-4">
                  คุกกี้คืออะไร
                </h3>
                <p className="text-slate-600 leading-relaxed mb-4">
                  คุกกี้คือไฟล์ข้อมูลขนาดเล็กที่จะถูกเก็บในรูปแบบไฟล์ข้อความที่ถูกบันทึกเอาไว้ในคอมพิวเตอร์ของท่านหรืออุปกรณ์อื่นเมื่อมีการโหลดหน้าเว็บไซต์ในเบราว์เซอร์
                  โดยได้ใช้กันอย่างแพร่หลายในการจดจำท่านและความชอบของท่านไม่ว่าจะเป็นการเข้าชมเพียงครั้งเดียว
                  (ผ่าน "คุกกี้เซสชั่น") หรือสำหรับการเข้าชมซ้ำหลายครั้ง (โดยใช้
                  "คุกกี้ถาวร")
                </p>
                <p className="text-slate-600 leading-relaxed mb-4">
                  คุกกี้เซสชั่น
                  เป็นคุกกี้ชั่วคราวที่ใช้ระหว่างการเยี่ยมชมเว็บไซต์ของท่านและคุกกี้จะหมดอายุเมื่อท่านปิดเว็บเบราว์เซอร์
                </p>
                <p className="text-slate-600 leading-relaxed">
                  คุกกี้ถาวรใช้เพื่อจดจำการตั้งค่าของท่านภายในเว็บไซต์ของเราและยังคงอยู่บนคอมพิวเตอร์ตั้งโต๊ะหรืออุปกรณ์มือถือของท่านแม้ว่าท่านจะปิดเบราว์เซอร์หรือรีสตาร์ทคอมพิวเตอร์ของท่านก็ตาม
                  คุกกี้เหล่านี้ให้ประสบการณ์ที่สม่ำเสมอและมีประสิทธิภาพสำหรับท่านในขณะที่เยี่ยมชมเว็บไซต์ของเราหรือใช้บริการของเรา
                </p>
              </section>

              <section id="cookies-usage" className="scroll-mt-24 mb-12">
                <h3 className="text-2xl font-bold text-slate-900 mb-6">
                  คุกกี้ที่เราใช้งาน
                </h3>

                <div className="space-y-6">
                  <div>
                    <h4 className="text-lg font-bold text-slate-800 mb-2">
                      คุกกี้ที่มีความจำเป็นอย่างยิ่ง (Necessary Cookies)
                    </h4>
                    <p className="text-slate-600">
                      คุกกี้ที่มีความจำเป็นอย่างยิ่งช่วยให้เราสามารถนำเสนอประสบการณ์ที่ดีที่สุดเมื่อท่านเข้าถึงและสำรวจเว็บไซต์ของเราและใช้งานคุณสมบัติต่างๆ
                      ตัวอย่างเช่น
                      คุกกี้เหล่านี้แจ้งให้เราทราบว่าท่านได้ทำการสร้างบัญชีและได้ลงชื่อเข้าใช้บัญชีนั้นเพื่อเข้าถึงเนื้อหา
                    </p>
                  </div>

                  <div>
                    <h4 className="text-lg font-bold text-slate-800 mb-2">
                      คุกกี้เพื่อการทำงานของเว็บไซต์ (Functionality Cookies)
                    </h4>
                    <p className="text-slate-600">
                      คุกกี้เพื่อการทำงานของเว็บไซต์ช่วยให้เราดำเนินการเว็บไซต์และบริการของเราตามตัวเลือกที่ท่านเลือก
                      ตัวอย่างเช่น
                      เราจะจดจำชื่อผู้ใช้งานของท่านและวิธีที่ท่านปรับแต่งเว็บไซต์และบริการสำหรับการเยี่ยมชมครั้งต่อไป
                    </p>
                  </div>

                  <div>
                    <h4 className="text-lg font-bold text-slate-800 mb-2">
                      คุกกี้เพื่อการวิเคราะห์/เพื่อประสิทธิภาพ (Analytical
                      Cookies)
                    </h4>
                    <p className="text-slate-600">
                      คุกกี้เหล่านี้ช่วยให้เราและผู้ให้บริการภายนอกสามารถรวบรวมข้อมูลที่รวบรวมเพื่อวัตถุประสงค์ทางสถิติเกี่ยวกับวิธีที่ผู้เยี่ยมชมของเราใช้งานเว็บไซต์
                      คุกกี้เหล่านี้ไม่มีข้อมูลส่วนบุคคล เช่น ชื่อ
                      และที่อยู่ของท่าน
                      และจะใช้เพื่อช่วยให้เราปรับปรุงประสบการณ์การใช้งานเว็บไซต์ของท่าน
                    </p>
                  </div>

                  <div>
                    <h4 className="text-lg font-bold text-slate-800 mb-2">
                      คุกกี้โซเชียลมีเดีย (Social Media Cookies)
                    </h4>
                    <p className="text-slate-600">
                      คุกกี้ของบุคคลที่สามจากเว็บไซต์สื่อสังคมออนไลน์ (เช่น
                      Facebook, Twitter และอื่น ๆ)
                      เพื่อช่วยให้เราติดตามผู้ใช้สื่อสังคมออนไลน์
                      เมื่อพวกเขาเยี่ยมชมเว็บไซต์ของเรา
                      โดยใช้เครื่องมือในการติดตามที่จัดเตรียมไว้โดยสื่อสังคมออนไลน์เหล่านั้น
                    </p>
                  </div>
                </div>
              </section>

              <section id="web-beacons" className="scroll-mt-24 mb-12">
                <h3 className="text-2xl font-bold text-slate-900 mb-4">
                  เรามีการใช้เว็บบีคอน (web beacon) หรือพิกเซลการติดตาม
                  (tracking pixel) หรือไม่
                </h3>
                <p className="text-slate-600 leading-relaxed mb-4">
                  อีเมลของเราอาจมี "เว็บบีคอน" (หรือ "พิกเซลการติดตาม")
                  เพื่อแจ้งให้เราทราบว่าอีเมลของเรามีการเปิดและตรวจสอบการคลิกผ่านลิงก์หรือโฆษณาภายในอีเมลหรือไม่
                </p>
                <p className="text-slate-600 leading-relaxed">
                  เราอาจใช้ข้อมูลนี้เพื่อวัตถุประสงค์รวมถึงการพิจารณาว่าอีเมลใดที่น่าสนใจสำหรับผู้ใช้มากกว่าและเพื่อสอบถามว่าผู้ใช้ที่ไม่เปิดอีเมลของเรามีความประสงค์ที่จะรับอีเมลต่อไปหรือไม่
                </p>
              </section>

              <section id="cookie-choices" className="scroll-mt-24 mb-12">
                <h3 className="text-2xl font-bold text-slate-900 mb-4">
                  ตัวเลือกคุกกี้ของท่านมีอะไรบ้าง
                </h3>
                <p className="text-slate-600 leading-relaxed mb-4">
                  หากท่านไม่ชอบแนวคิดเกี่ยวกับคุกกี้หรือคุกกี้ในบางประเภท
                  ท่านสามารถเปลี่ยนแปลงการตั้งค่าเบราว์เซอร์ของท่านเพื่อลบคุกกี้ที่ตั้งค่าไว้แล้วและไม่ทำการยอมรับคุกกี้ใหม่
                  หากต้องการเรียนรู้เพิ่มเติมเกี่ยวกับวิธีการหรือเรียนรู้เพิ่มเติมเกี่ยวกับคุกกี้
                  โปรดไปที่ internetcookies.org
                </p>
                <p className="text-slate-600 leading-relaxed">
                  อย่างไรก็ตาม โปรดทราบว่าหากท่านลบคุกกี้หรือไม่ยอมรับคุกกี้
                  ท่านอาจไม่สามารถใช้ระบบการทำงานได้ทั้งหมดของเว็บไซต์ Teedin
                  Easy และบริการได้
                </p>
              </section>

              <section id="do-not-track" className="scroll-mt-24 mb-12">
                <h3 className="text-2xl font-bold text-slate-900 mb-4">
                  การส่งสัญญาณห้ามติดตาม
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  เบราว์เซอร์บางตัวอาจมีคุณสมบัติห้ามติดตาม (Do Not Track)
                  ที่ส่งสัญญาณไปยังเว็บไซต์ที่ท่านได้เยี่ยมชมว่าท่านไม่ต้องการให้มีการติดตามกิจกรรมออนไลน์ของท่าน
                  การติดตามไม่เหมือนกับการใช้หรือเก็บรวบรวมข้อมูลที่เกี่ยวข้องกับเว็บไซต์
                  เพื่อจุดประสงค์เหล่านี้การติดตามหมายถึงการเก็บรวบรวมข้อมูลส่วนบุคคลที่สามารถระบุตัวตนได้จากผู้บริโภคที่ใช้หรือเยี่ยมชมเว็บไซต์หรือบริการออนไลน์ในขณะที่พวกเขาเข้าชมเว็บไซต์ต่างๆ
                  ในช่วงเวลาหนึ่ง
                </p>
              </section>

              <section id="external-links" className="scroll-mt-24 mb-12">
                <h3 className="text-2xl font-bold text-slate-900 mb-4">
                  การเชื่อมต่อไปยังเว็บไซต์อื่น
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  เว็บไซต์ Teedin Easy
                  มีลิงก์ที่เชื่อมต่อไปยังเว็บไซต์อื่นที่ไม่ได้เป็นเจ้าของหรือควบคุมโดยเรา
                  โปรดทราบว่าเราจะไม่รับผิดชอบต่อแนวทางการปฏิบัติทางด้านความเป็นส่วนตัวของเว็บไซต์อื่น
                  ๆ หรือบุคคลที่สามดังกล่าว
                  ดังนั้นเราขอแนะนำให้ท่านได้ตระหนักเมื่อท่านได้ออกจากเว็บไซต์ของเราและอ่านนโยบายความเป็นส่วนตัวของแต่ละเว็บไซต์ที่อาจมีการเก็บรวบรวมข้อมูลส่วนบุคคล
                </p>
              </section>
            </div>

            <section id="security" className="scroll-mt-24">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                การรักษาความมั่นคงปลอดภัยของข้อมูลส่วนบุคคล
              </h2>
              <p className="text-slate-600 leading-relaxed">
                เรารักษาความปลอดภัยข้อมูลที่ท่านให้ไว้บนเซิร์ฟเวอร์คอมพิวเตอร์ภายใต้การควบคุม
                สภาพแวดล้อมที่ปลอดภัยได้รับการปกป้องจากการเข้าถึงการใช้งานหรือการเปิดเผยโดยไม่ได้รับอนุญาต
                เรารักษามาตรการป้องกันด้านการบริหารเทคนิคและทางกายภาพที่เหมาะสมเพื่อป้องกันการเข้าถึง
                การใช้ การแก้ไข
                และการเปิดเผยข้อมูลส่วนบุคคลโดยไม่ได้รับอนุญาตที่อยู่ภายใต้การควบคุมและดูแล
                อย่างไรก็ตาม
                เราไม่สามารถรับประกันการส่งข้อมูลผ่านอินเทอร์เน็ตหรือเครือข่ายไร้สายได้อย่างเต็มที่
              </p>
            </section>

            <section id="contact" className="scroll-mt-24">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                ติดต่อเรา
              </h2>
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                <p className="mb-2 text-slate-600">
                  หากท่านมีข้อสงสัยเกี่ยวกับนโยบายความเป็นส่วนตัว
                  สามารถติดต่อเราได้ที่:
                </p>
                <p className="font-bold text-primary text-lg">
                  Teedin Easy Team
                </p>
                <p className="text-slate-600">Email: support@teedin-easy.com</p>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
