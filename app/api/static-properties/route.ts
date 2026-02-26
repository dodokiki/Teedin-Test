import { NextResponse } from "next/server";
import {
  newProperties,
  rentalProperties,
  saleProperties,
} from "@/data/properties";

export async function GET() {
  try {
    // Combine all static properties
    const allProperties = [
      ...newProperties,
      ...rentalProperties,
      ...saleProperties,
    ];

    type StaticProperty = {
      property_id: string;
      project_name: string;
      address: string;
      usable_area: number;
      bedrooms: number;
      bathrooms: number;
      parking_spaces: number;
      house_condition: string;
      highlight: string;
      area_around: string;
      facilities: string[];
      project_facilities: string[];
      description: string;
      price: string;
      images: string[];
      latitude: number;
      longitude: number;
    };

    // Transform the data to match the expected format
    const transformedProperties = allProperties.reduce<
      Record<string, StaticProperty>
    >((accumulator, property) => {
      accumulator[property.id] = {
        property_id: property.id,
        project_name: property.title,
        address: property.location,
        usable_area: property.details.area,
        bedrooms: property.details.bedrooms,
        bathrooms: property.details.bathrooms,
        parking_spaces: property.details.parking,
        house_condition: "พร้อมเข้าอยู่",
        highlight: property.highlight || "ทำเลดี ใกล้รถไฟฟ้า",
        area_around: "ใกล้ห้างสรรพสินค้า, รถไฟฟ้า, โรงเรียน",
        facilities: property.facilities || [],
        project_facilities: property.projectFacilities || [],
        description:
          property.description || "อสังหาริมทรัพย์คุณภาพดี ในทำเลทอง",
        price: property.price,
        images: [property.image],
        latitude: 13.7563,
        longitude: 100.5018,
      };
      return accumulator;
    }, {});

    return NextResponse.json(transformedProperties);
  } catch (error) {
    console.error("Error in static properties API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
