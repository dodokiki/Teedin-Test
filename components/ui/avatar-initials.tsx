import React from "react";

interface AvatarProps {
  firstName?: string;
  lastName?: string;
  email?: string;
  size?: number;
  className?: string;
}

const AvatarInitials: React.FC<AvatarProps> = ({
  firstName,
  lastName,
  email,
  size = 40,
  className = "",
}) => {
  // ฟังก์ชันสำหรับสร้างตัวอักษรเริ่มต้น
  const getInitials = () => {
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    } else if (firstName) {
      return firstName.charAt(0).toUpperCase();
    } else if (email) {
      return email.charAt(0).toUpperCase();
    } else {
      return "U";
    }
  };

  // ฟังก์ชันสำหรับสร้างสีพื้นหลังจากชื่อ
  const getBackgroundColor = () => {
    const name =
      `${firstName || ""} ${lastName || ""}`.trim() || email || "User";
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-indigo-500",
      "bg-yellow-500",
      "bg-red-500",
      "bg-teal-500",
      "bg-orange-500",
      "bg-cyan-500",
    ];

    return colors[Math.abs(hash) % colors.length];
  };

  const initials = getInitials();
  const bgColor = getBackgroundColor();

  return (
    <div
      className={`
        ${bgColor}
        text-white
        rounded-full
        flex
        items-center
        justify-center
        font-semibold
        text-sm
        ${className}
      `}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4, // ปรับขนาดตัวอักษรตามขนาด avatar
      }}
    >
      {initials}
    </div>
  );
};

export default AvatarInitials;
