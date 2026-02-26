export const TRANSLATION_KEYS = {
  projectName: "project_name",
  address: "address",
  description: "description",
  highlight: "highlight",
  areaAround: "area_around",
  houseCondition: "house_condition",
  facilities: "facilities",
  projectFacilities: "project_facilities",
} as const;

export type TranslationKey =
  (typeof TRANSLATION_KEYS)[keyof typeof TRANSLATION_KEYS];
