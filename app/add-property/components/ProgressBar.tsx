import { useLanguage } from "@/contexts/language-context";
import { Check, FileText, Home, MapPin } from "lucide-react";

interface ProgressBarProps {
  currentStep: number;
}

interface Step {
  id: number;
  name: string;
  icon: React.ReactElement;
}

export function ProgressBar({ currentStep }: ProgressBarProps) {
  const { t } = useLanguage();
  const steps: Step[] = [
    {
      id: 1,
      name: t("progress_step1_intro"),
      icon: <FileText className="w-5 h-5" />,
    },
    {
      id: 2,
      name: t("progress_step2_basic"),
      icon: <Home className="w-5 h-5" />,
    },
    {
      id: 3,
      name: t("progress_step3_property"),
      icon: <MapPin className="w-5 h-5" />,
    },
    {
      id: 4,
      name: t("progress_step4_review"),
      icon: <Check className="w-5 h-5" />,
    },
  ];

  // กำหนดตำแหน่งจุดกลมให้แน่นอน
  const dotPositions = ["0%", "33%", "66%", "100%"];

  // Debug: แสดง currentStep ที่ได้รับ
  console.log("ProgressBar received currentStep:", currentStep);

  return (
    <div className="container mx-auto px-4 mt-8">
      <div className="relative max-w-4xl mx-auto">
        {/* เส้นพื้นหลังและเส้นความคืบหน้า */}
        <div className="absolute top-[12px] left-0 w-full h-1 bg-gray-200"></div>
        <div
          className="absolute top-[12px] left-0 h-1 bg-blue-600 transition-all duration-500"
          style={{
            width:
              currentStep === 1
                ? "0%"
                : currentStep === 2
                  ? "calc(33% + 3px)"
                  : currentStep === 3
                    ? "calc(66% + 3px)"
                    : currentStep === 4
                      ? "calc(100% + 3px)"
                      : "0%",
          }}
        ></div>

        {/* จุดและข้อความ */}
        <div className="relative w-full h-8">
          {steps.map((step, index) => (
            <div
              key={index}
              className="flex flex-col items-center absolute"
              style={{
                left: dotPositions[index],
                transform: "translateX(-50%)",
              }}
            >
              {/* จุดกลมเล็กๆ สีฟ้า */}
              <div
                className={`w-6 h-6 rounded-full mb-3 transition-all duration-300
                ${
                  currentStep > index + 1
                    ? "bg-blue-600"
                    : currentStep === index + 1
                      ? "bg-blue-600 ring-2 ring-blue-200"
                      : "bg-gray-200"
                }`}
              ></div>
              {/* ข้อความ */}
              <p
                className={`text-sm text-center transition-colors duration-300
            ${
              currentStep >= index + 1
                ? "text-blue-600 font-medium"
                : "text-gray-400"
            }`}
                style={{
                  maxWidth: index === 3 ? "140px" : "120px", // เพิ่มความกว้างให้ step 4
                  minWidth: index === 3 ? "140px" : "auto", // เพิ่มความกว้างขั้นต่ำให้ step 4
                }}
              >
                {step.name}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
