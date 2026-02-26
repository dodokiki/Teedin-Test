import { useLanguage } from "@/contexts/language-context";

interface Step1IntroductionProps {
  onNextStep: () => void;
}

export function Step1Introduction({ onNextStep }: Step1IntroductionProps) {
  const { t } = useLanguage();

  return (
    <div className="max-w-4xl mx-auto mt-12 px-4">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800 font-mono text-center">
          {t("step1_heading")}
        </h2>
        <p className="text-gray-700 text-lg leading-relaxed text-left mt-4 mb-4">
          <span className="font-semibold text-blue-600">Teedin Easy</span>{" "}
          {t("step1_intro_line1_prefix")}
          <span className="font-semibold text-green-600">
            {t("step1_intro_maps")}
          </span>
          {t("step1_intro_line1_suffix")}
          <span className="font-semibold text-pink-600">
            {t("step1_intro_pin")}
          </span>
          {t("step1_intro_line2")}
        </p>

        <div className="text-left">
          <p className="text-gray-600 text-sm leading-6 mb-2">
            <span className="font-semibold text-green-600">
              {t("step1_how_title")}
            </span>
          </p>
          <p className="text-gray-600 text-sm leading-6 mb-3 ml-4">
            {t("step1_step1")}
            <br />
            {t("step1_step2")}
            <br />
            {t("step1_step3")}
            <br />
            {t("step1_step4")}
            <br />
            {t("step1_step5")}
            <br />
            {t("step1_step6")}
          </p>

          <p className="text-gray-600 text-sm leading-6 mb-2">
            <span className="font-semibold text-blue-600">
              {t("step1_why_title")}
            </span>
          </p>
          <p className="text-gray-600 text-sm leading-6 ml-4">
            {t("step1_why_1")}
            <br />
            {t("step1_why_2")}
            <br />
            {t("step1_why_3")}
          </p>
        </div>
      </div>

      <div className="text-center">
        <button
          onClick={onNextStep}
          className="px-8 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium"
        >
          {t("step1_start_button")}
        </button>
      </div>
    </div>
  );
}
