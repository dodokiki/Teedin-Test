/** @type {import('next').NextConfig} */

const nextConfig = {
  env: {
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY:
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    NEXT_PUBLIC_GOOGLE_API_KEY:
      process.env.NEXT_PUBLIC_GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    NEXT_PUBLIC_GOOGLE_MAP_ID:
      process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      {
        source: "/.well-known/:path*",
        destination: "/api/.well-known/:path*",
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "bsmcqplghysxwniajxbp.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "kxkryylxfkkjgbgtxfog.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "fogcmljbxtfpidxthwgb.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "tedin-easy.vercel.app",
        pathname: "/properties/**",
      },
      {
        protocol: "https",
        hostname: "example.com",
        pathname: "/images/**",
      },
      {
        protocol: "https",
        hostname: "via.placeholder.com",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
    ],
    unoptimized: false,
    loader: "default",

    minimumCacheTTL: 60,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ["image/webp", "image/avif"],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  experimental: {
    // optimizePackageImports: [
    //   "lucide-react",
    //   "@radix-ui/react-icons",
    //   "@radix-ui/react-dropdown-menu",
    //   "@radix-ui/react-dialog",
    //   "@radix-ui/react-toast",
    //   "react-chartjs-2",
    // ],

    serverActions: {
      bodySizeLimit: "2mb",
    },
  },

  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? {
          exclude: ["error", "warn"],
        }
        : false,
  },

  // ✅ เพิ่ม performance optimizations
  // ปิดการแสดง Header X-Powered-By: Next.js เพื่อไม่ให้คนรู้ว่าใช้ Next.js เวอร์ชั่นอะไร
  poweredByHeader: false,
  compress: true,
};

export default nextConfig;
