import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

interface FeaturedPropertyProps {
  title: string;
  location: string;
  description: string;
  price: string;
  images: string[];
  details: {
    totalUnits: string;
    roomSize: string;
    pricePerSqm: string;
    maintenanceFee: string;
  };
  tags: string[];
  t: (key: string) => string;
}

export function FeaturedProperty({
  title,
  location,
  description,
  price,
  images,
  details,
  tags,
  t,
}: FeaturedPropertyProps) {
  const [currentIndex, setCurrentIndex] = useState(1);

  // ข้อมูลโครงการสำหรับแต่ละรูปภาพ
  const projectData = [
    {
      id: "featured-1",
      title: t("project_grand_title"),
      location: t("project_grand_location"),
      description: t("project_grand_description"),
      details: {
        totalUnits: t("project_grand_total_units"),
        roomSize: t("project_grand_room_size"),
        pricePerSqm: t("project_grand_price_per_sqm"),
        maintenanceFee: t("project_grand_maintenance_fee"),
      },
      price: t("project_grand_price"),
    },
    {
      id: "featured-2",
      title: t("project_luxe_title"),
      location: t("project_luxe_location"),
      description: t("project_luxe_description"),
      details: {
        totalUnits: t("project_luxe_total_units"),
        roomSize: t("project_luxe_room_size"),
        pricePerSqm: t("project_luxe_price_per_sqm"),
        maintenanceFee: t("project_luxe_maintenance_fee"),
      },
      price: t("project_luxe_price"),
    },
    {
      id: "featured-3",
      title: t("project_riverside_title"),
      location: t("project_riverside_location"),
      description: t("project_riverside_description"),
      details: {
        totalUnits: t("project_riverside_total_units"),
        roomSize: t("project_riverside_room_size"),
        pricePerSqm: t("project_riverside_price_per_sqm"),
        maintenanceFee: t("project_riverside_maintenance_fee"),
      },
      price: t("project_riverside_price"),
    },
  ];

  // คำนวณ index ที่จะแสดงทั้ง 3 รูป (ซ้าย กลาง ขวา)
  const displayedIndices = [
    (currentIndex - 1 + images.length) % images.length,
    currentIndex,
    (currentIndex + 1) % images.length,
  ];

  // ข้อมูลโครงการที่แสดงปัจจุบัน
  const currentProjectData = projectData[currentIndex % projectData.length];
  // ฟังก์ชั่นเลื่อนไปรูปถัดไป
  const goToNext = () => {
    setCurrentIndex(prevIndex => (prevIndex + 1) % images.length);
  };

  // ฟังก์ชั่นเลื่อนไปรูปก่อนหน้า
  const goToPrevious = () => {
    setCurrentIndex(
      prevIndex => (prevIndex - 1 + images.length) % images.length
    );
  };

  // เลือกรูปโดยตรง
  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <section className="w-full min-h-screen bg-white text-gray-800">
      {" "}
      <div className="w-full px-4 py-8">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-blue-700 to-blue-500 inline-block text-transparent bg-clip-text">
            {t("featured_property_title")}
          </h2>
          <p className="mt-3 text-lg sm:text-xl text-gray-600">
            {t("featured_property_price")}
          </p>
        </div>
        <div className="relative flex justify-center items-center mb-5 h-64 sm:h-80 md:h-[26rem] w-full">
          {/* Images */}
          {/* Desktop Carousel */}
          <div className="hidden md:flex justify-center items-center w-full h-full">
            {displayedIndices.map((imageIndex, i) => {
              let position = "";
              let zIndex = 10;
              let scale = "scale-100";
              if (i === 0) {
                // left
                position = "absolute left-1/2 transform -translate-x-[150%]";
                zIndex = 5;
                scale = "scale-75";
              } else if (i === 2) {
                // right
                position = "absolute left-1/2 transform translate-x-[50%]";
                zIndex = 5;
                scale = "scale-75";
              } else {
                // center
                position = "absolute left-1/2 transform -translate-x-1/2";
                zIndex = 20;
                scale = "scale-100";
              }
              return (
                <div
                  key={i}
                  className={`rounded-xl overflow-hidden ${position} ${scale} cursor-pointer transition-all duration-300`}
                  style={{ zIndex }}
                  onClick={i !== 1 ? () => goToSlide(imageIndex) : undefined}
                >
                  <div
                    className={`relative ${i === 1 ? "w-[70vw] max-w-[700px] h-[400px]" : "w-[50vw] max-w-[500px] h-[300px]"}`}
                  >
                    <Image
                      src={images[imageIndex] || "/placeholder.svg"}
                      alt={`${title} image ${imageIndex + 1}`}
                      fill
                      className="w-full h-full object-cover shadow-lg"
                    />
                  </div>
                </div>
              );
            })}
          </div>
          {/* Mobile Carousel */}
          <div className="md:hidden w-full h-full relative">
            <div className="w-full h-full rounded-xl overflow-hidden">
              <Image
                src={images[currentIndex] || "/placeholder.svg"}
                alt={`${title} image ${currentIndex + 1}`}
                fill
                className="object-cover"
              />
            </div>
            <button
              onClick={goToPrevious}
              className="absolute top-1/2 left-2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full z-10"
            >
              &#10094;
            </button>
            <button
              onClick={goToNext}
              className="absolute top-1/2 right-2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full z-10"
            >
              &#10095;
            </button>
          </div>{" "}
        </div>{" "}
        <div className="flex flex-col items-start mt-16 w-full max-w-4xl mx-auto px-4">
          <div className="flex gap-2 mb-4">
            {tags.map((tag, index) => (
              <span
                key={index}
                className="bg-[#006ce3] text-white px-4 py-1.5 text-sm font-medium rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>{" "}
          <h3 className="text-2xl font-bold mb-1">
            {currentProjectData.title}
          </h3>
          <p className="text-gray-600 mb-4">{currentProjectData.location}</p>{" "}
          <p className="text-gray-700 text-left mb-6">
            {currentProjectData.description}
          </p>{" "}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 mb-6 w-full">
            <div className="flex flex-col items-start">
              <p className="text-gray-500 text-sm mb-1">
                {t("featured_property_total_units")}
              </p>
              <p className="font-semibold">
                {currentProjectData.details.totalUnits}
              </p>
            </div>
            <div className="flex flex-col items-start">
              <p className="text-gray-500 text-sm mb-1">
                {t("featured_property_room_size")}
              </p>
              <p className="font-semibold">
                {currentProjectData.details.roomSize}
              </p>
            </div>
            <div className="flex flex-col items-start">
              <p className="text-gray-500 text-sm mb-1">
                {t("featured_property_price_per_sqm")}
              </p>
              <p className="font-semibold">
                {currentProjectData.details.pricePerSqm}
              </p>
            </div>
            <div className="flex flex-col items-start">
              <p className="text-gray-500 text-sm mb-1">
                {t("featured_property_maintenance_fee")}
              </p>
              <p className="font-semibold">
                {currentProjectData.details.maintenanceFee}
              </p>
            </div>
          </div>{" "}
          <div className="flex flex-col items-start mb-6 w-full">
            <p className="text-xl font-bold text-gray-800">
              {currentProjectData.price}
            </p>
          </div>
          <div className="w-full">
            <Link
              href={`/property/${currentProjectData.id}`}
              className="w-full"
            >
              <Button className="bg-[#006ce3] hover:bg-[#0055b3] rounded-full px-6 mt-2">
                {t("featured_property_view_details")}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
