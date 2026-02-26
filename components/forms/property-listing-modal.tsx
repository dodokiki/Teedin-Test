"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Camera, ChevronDown, MapPin, X } from "lucide-react";
import type React from "react";
import { useState } from "react";

interface PropertyListingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PropertyListingModal({
  isOpen,
  onClose,
}: PropertyListingModalProps) {
  const [images, setImages] = useState<string[]>([]);

  if (!isOpen) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      // In a real app, you would upload these to a server
      // For now, we'll just create object URLs
      const newImages = Array.from(files).map(file =>
        URL.createObjectURL(file)
      );
      setImages([...images, ...newImages]);
    }
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
        <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white z-10 p-4 border-b flex justify-between items-center">
            <h2 className="text-xl font-bold">เพิ่มประกาศ</h2>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-gray-100"
            >
              <X size={24} />
            </button>
          </div>

          <div className="p-6">
            <form onSubmit={e => e.preventDefault()}>
              {/* Property Images */}
              <div className="mb-8">
                <h3 className="text-lg font-medium mb-4">รูปภาพอสังหาฯ</h3>
                <div className="grid grid-cols-3 gap-3">
                  {[...Array(6)].map((_, index) => (
                    <div
                      key={index}
                      className="aspect-square bg-gray-200 rounded-lg flex items-center justify-center relative"
                    >
                      {images[index] ? (
                        <img
                          src={images[index] || "/placeholder.svg"}
                          alt={`Property image ${index + 1}`}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <label className="cursor-pointer w-full h-full flex items-center justify-center">
                          <Camera size={32} className="text-gray-500" />
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageUpload}
                          />
                        </label>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Basic Information */}
              <div className="mb-8">
                <h3 className="text-lg font-medium mb-4">ข้อมูลพื้นฐาน</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm mb-1">ชื่ออสังหาฯ</label>
                    <div className="relative">
                      <select
                        className="w-full p-3 bg-gray-200 rounded-md appearance-none pr-10"
                        defaultValue=""
                      >
                        <option value="" disabled>
                          โปรดเลือก
                        </option>
                        <option>คอนโดมิเนียม</option>
                        <option>บ้านเดี่ยว</option>
                        <option>ทาวน์โฮม</option>
                      </select>
                      <ChevronDown
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                        size={20}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm mb-1">ราคา</label>
                    <div className="relative">
                      <select
                        className="w-full p-3 bg-gray-200 rounded-md appearance-none pr-10"
                        defaultValue=""
                      >
                        <option value="" disabled>
                          โปรดเลือก
                        </option>
                        <option>ต่ำกว่า 1 ล้านบาท</option>
                        <option>1-3 ล้านบาท</option>
                        <option>3-5 ล้านบาท</option>
                        <option>5-10 ล้านบาท</option>
                        <option>มากกว่า 10 ล้านบาท</option>
                      </select>
                      <ChevronDown
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                        size={20}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm mb-1">ประเภทอสังหาฯ</label>
                    <div className="relative">
                      <select
                        className="w-full p-3 bg-gray-200 rounded-md appearance-none pr-10"
                        defaultValue=""
                      >
                        <option value="" disabled>
                          โปรดเลือก
                        </option>
                        <option>คอนโดมิเนียม</option>
                        <option>บ้านเดี่ยว</option>
                        <option>ทาวน์โฮม</option>
                        <option>ที่ดิน</option>
                      </select>
                      <ChevronDown
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                        size={20}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm mb-1">สภาพบ้าน</label>
                    <div className="relative">
                      <select
                        className="w-full p-3 bg-gray-200 rounded-md appearance-none pr-10"
                        defaultValue=""
                      >
                        <option value="" disabled>
                          โปรดเลือก
                        </option>
                        <option>ใหม่</option>
                        <option>มือสอง</option>
                        <option>ต้องปรับปรุง</option>
                      </select>
                      <ChevronDown
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                        size={20}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm mb-1">สถานะการขาย</label>
                    <div className="relative">
                      <select
                        className="w-full p-3 bg-gray-200 rounded-md appearance-none pr-10"
                        defaultValue=""
                      >
                        <option value="" disabled>
                          โปรดเลือก
                        </option>
                        <option>ขาย</option>
                        <option>เช่า</option>
                        <option>ขายและเช่า</option>
                      </select>
                      <ChevronDown
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                        size={20}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Usable Area Information */}
              <div className="mb-8">
                <h3 className="text-lg font-medium mb-4">
                  ข้อมูลพื้นที่ใช้สอย
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm mb-1">ขนาดที่ดิน</label>
                    <div className="relative">
                      <select
                        className="w-full p-3 bg-gray-200 rounded-md appearance-none pr-10"
                        defaultValue=""
                      >
                        <option value="" disabled>
                          โปรดระบุ ตร.วา หรือ ไร่
                        </option>
                        <option>น้อยกว่า 50 ตร.วา</option>
                        <option>50-100 ตร.วา</option>
                        <option>100-200 ตร.วา</option>
                        <option>มากกว่า 200 ตร.วา</option>
                        <option>1-5 ไร่</option>
                        <option>มากกว่า 5 ไร่</option>
                      </select>
                      <ChevronDown
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                        size={20}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm mb-1">
                      พื้นที่ใช้สอย (ตร.ม.)
                    </label>
                    <div className="relative">
                      <select
                        className="w-full p-3 bg-gray-200 rounded-md appearance-none pr-10"
                        defaultValue=""
                      >
                        <option value="" disabled>
                          โปรดระบุ
                        </option>
                        <option>น้อยกว่า 30 ตร.ม.</option>
                        <option>30-50 ตร.ม.</option>
                        <option>50-80 ตร.ม.</option>
                        <option>80-120 ตร.ม.</option>
                        <option>120-200 ตร.ม.</option>
                        <option>มากกว่า 200 ตร.ม.</option>
                      </select>
                      <ChevronDown
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                        size={20}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm mb-1">จำนวนห้อง</label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm mb-1">ห้องนอน</label>
                        <Input
                          type="number"
                          placeholder="ห้องนอน"
                          className="w-full p-3 bg-gray-200 rounded-md"
                          min={0}
                        />
                      </div>
                      <div>
                        <label className="block text-sm mb-1">ห้องน้ำ</label>
                        <Input
                          type="number"
                          placeholder="ห้องน้ำ"
                          className="w-full p-3 bg-gray-200 rounded-md"
                          min={0}
                        />
                      </div>
                      <div>
                        <label className="block text-sm mb-1">
                          ห้องนั่งเล่น
                        </label>
                        <Input
                          type="number"
                          placeholder="ห้องนั่งเล่น"
                          className="w-full p-3 bg-gray-200 rounded-md"
                          min={0}
                        />
                      </div>
                      <div>
                        <label className="block text-sm mb-1">ห้องครัว</label>
                        <Input
                          type="number"
                          placeholder="ห้องครัว"
                          className="w-full p-3 bg-gray-200 rounded-md"
                          min={0}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm mb-1">
                      ที่จอดรถ (จำนวนคัน)
                    </label>
                    <div className="relative">
                      <select
                        className="w-full p-3 bg-gray-200 rounded-md appearance-none pr-10"
                        defaultValue=""
                      >
                        <option value="" disabled>
                          โปรดระบุ
                        </option>
                        <option>ไม่มี</option>
                        <option>1 คัน</option>
                        <option>2 คัน</option>
                        <option>3 คัน</option>
                        <option>มากกว่า 3 คัน</option>
                      </select>
                      <ChevronDown
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                        size={20}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Property Highlights */}
              <div className="mb-8">
                <h3 className="text-lg font-medium mb-4">จุดเด่นอสังหาฯ</h3>
                <div className="space-y-4">
                  <div className="relative">
                    <select
                      className="w-full p-3 bg-gray-200 rounded-md appearance-none pr-10"
                      defaultValue=""
                    >
                      <option value="" disabled>
                        ใกล้สถานีขนส่งมวลชนโปรดระบุ
                      </option>
                      <option>ใกล้ BTS</option>
                      <option>ใกล้ MRT</option>
                      <option>ใกล้ Airport Link</option>
                    </select>
                    <ChevronDown
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                      size={20}
                    />
                  </div>

                  <div className="relative">
                    <select
                      className="w-full p-3 bg-gray-200 rounded-md appearance-none pr-10"
                      defaultValue=""
                    >
                      <option value="" disabled>
                        ทำเลที่ตั้งและความสะดวกสบาย
                      </option>
                      <option>ใกล้ห้างสรรพสินค้า</option>
                      <option>ใกล้โรงเรียน</option>
                      <option>ใกล้โรงพยาบาล</option>
                    </select>
                    <ChevronDown
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                      size={20}
                    />
                  </div>

                  <div className="relative">
                    <select
                      className="w-full p-3 bg-gray-200 rounded-md appearance-none pr-10"
                      defaultValue=""
                    >
                      <option value="" disabled>
                        สิ่งอำนวยความสะดวกในทรัพย์
                      </option>
                      <option>สระว่ายน้ำ</option>
                      <option>ฟิตเนส</option>
                      <option>สวนส่วนกลาง</option>
                      <option>ระบบรักษาความปลอดภัย 24 ชม.</option>
                    </select>
                    <ChevronDown
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                      size={20}
                    />
                  </div>
                </div>
              </div>

              {/* About Property */}
              <div className="mb-8">
                <h3 className="text-lg font-medium mb-4">เกี่ยวกับอสังหาฯ</h3>
                <Textarea
                  placeholder="กรอกรายละเอียด"
                  className="w-full p-3 bg-gray-200 rounded-md min-h-[120px]"
                />
              </div>

              {/* Property Location */}
              <div className="mb-8">
                <h3 className="text-lg font-medium mb-4">ที่ตั้งอสังหาฯ</h3>
                <div className="relative">
                  <Input
                    placeholder="โปรดระบุที่ตั้งอสังหาฯ"
                    className="w-full p-3 bg-gray-200 rounded-md pr-10"
                  />
                  <MapPin
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                    size={20}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-[#006ce3] hover:bg-blue-700 text-white py-3 rounded-md"
              >
                ยืนยัน
              </Button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
