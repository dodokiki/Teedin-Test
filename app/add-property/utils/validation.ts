export function validateStep2(
  saleType: string,
  propertyType: string,
  projectLocation: string,
  selectedLocation: { ละติจูด: number; ลองจิจูด: number },
  rentalPeriod?: string
): { [key: string]: string } {
  const errors: { [key: string]: string } = {};
  if (!saleType) errors.saleType = "กรุณาเลือกประเภทการขาย/เช่า";
  if (!propertyType) errors.propertyType = "กรุณาเลือกประเภทอสังหา";
  if (!projectLocation) errors.projectLocation = "กรุณาระบุที่ตั้ง";
  if (!selectedLocation.ละติจูด || !selectedLocation.ลองจิจูด)
    errors.selectedLocation = "กรุณาปักหมุดแผนที่";
  if (saleType === "rent" && !rentalPeriod)
    errors.rentalPeriod = "กรุณาเลือกระยะเวลาเช่าขั้นต่ำ";
  return errors;
}

export function validateStep3(
  projectName: string,
  address: string,
  area: string,
  bedrooms: string,
  bathrooms: string,
  parking: string,
  highlightsType: string[],
  price: string,
  images: (File | null)[],
  selectedLocation?: { ที่อยู่: string; ละติจูด: number; ลองจิจูด: number },
  projectDescription?: string // เพิ่ม projectDescription parameter
): { [key: string]: string } {
  const errors: { [key: string]: string } = {};
  console.log("Validating step 3:", {
    projectName,
    address,
    area,
    bedrooms,
    bathrooms,
    parking,
    highlightsType,
    price,
    imagesCount: images.filter(img => img !== null).length,
    selectedLocation,
    projectDescription,
  });

  if (!projectName) errors.projectName = "กรุณากรอกชื่อโครงการ";
  if (!address && (!selectedLocation || !selectedLocation.ที่อยู่))
    errors.address = "กรุณากรอกที่อยู่";
  if (!area) errors.area = "กรุณากรอกพื้นที่ใช้สอย";
  if (!bedrooms) errors.bedrooms = "กรุณากรอกจำนวนห้องนอน";
  if (!bathrooms) errors.bathrooms = "กรุณากรอกจำนวนห้องน้ำ";
  if (!parking) errors.parking = "กรุณากรอกจำนวนที่จอดรถ";
  if (!highlightsType || highlightsType.length === 0)
    errors.highlightsType = "กรุณาเลือกจุดเด่นอย่างน้อย 1 ข้อ";

  if (!price) {
    errors.price = "กรุณากรอกราคา";
  } else {
    const priceNumber = parseFloat(price.replace(/,/g, ""));
    if (isNaN(priceNumber) || priceNumber <= 0) {
      errors.price = "กรุณากรอกราคาที่ถูกต้อง";
    } else if (priceNumber > 999999999999.99) {
      errors.price = "ราคาสูงเกินไป (สูงสุด 999,999,999,999.99 บาท)";
    }
  }

  // ตรวจสอบรูปภาพ - ต้องมีอย่างน้อย 1 รูป
  const hasImages = images.some(image => image !== null);
  if (!hasImages) {
    errors.images = "กรุณาเพิ่มรูปภาพอย่างน้อย 1 รูป";
  }

  console.log("Validation errors:", errors);
  return errors;
}

export function validateStep4(
  step2Errors: { [key: string]: string },
  step3Errors: { [key: string]: string }
): boolean {
  return (
    Object.keys(step2Errors).length === 0 &&
    Object.keys(step3Errors).length === 0
  );
}
