import Image from "next/image";
import Link from "next/link";

interface LocationItem {
  name: string;
  image: string;
  url: string;
}

interface PopularLocationsProps {
  title: string;
  locations: LocationItem[];
}

export function PopularLocations({ title, locations }: PopularLocationsProps) {
  return (
    <section className="py-12 bg-white text-gray-800">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-700 to-blue-500 inline-block text-transparent bg-clip-text">
            {title}
          </h2>
        </div>{" "}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* แถวแรก - สุขุมวิท (ซ้าย) และ พระราม 9 (ขวา) */}
          <div className="md:col-span-1">
            <Link
              href={locations[0]?.url || "#"}
              className="relative rounded-xl overflow-hidden group transition-transform duration-500 hover:scale-[1.02] shadow-lg block h-[300px]"
            >
              <Image
                src={locations[0]?.image || "/placeholder.svg"}
                alt={locations[0]?.name || ""}
                fill
                className="object-cover brightness-75 group-hover:brightness-90 transition-all duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-80 group-hover:opacity-70 transition-opacity duration-500" />
              <div className="absolute bottom-6 left-6 text-white transform group-hover:translate-y-[-5px] transition-transform duration-300">
                <h3 className="text-xl sm:text-2xl font-bold">
                  {locations[0]?.name}
                </h3>
                <div className="w-12 h-1 bg-blue-500 mt-2 rounded-full transform origin-left scale-0 group-hover:scale-100 transition-transform duration-300"></div>
              </div>
            </Link>
          </div>

          <div className="md:col-span-2">
            <Link
              href={locations[1]?.url || "#"}
              className="relative rounded-xl overflow-hidden group transition-transform duration-500 hover:scale-[1.02] shadow-lg block h-[300px]"
            >
              <Image
                src={locations[1]?.image || "/placeholder.svg"}
                alt={locations[1]?.name || ""}
                fill
                className="object-cover brightness-75 group-hover:brightness-90 transition-all duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-80 group-hover:opacity-70 transition-opacity duration-500" />
              <div className="absolute bottom-6 left-6 text-white transform group-hover:translate-y-[-5px] transition-transform duration-300">
                <h3 className="text-xl sm:text-2xl font-bold">
                  {locations[1]?.name}
                </h3>
                <div className="w-12 h-1 bg-blue-500 mt-2 rounded-full transform origin-left scale-0 group-hover:scale-100 transition-transform duration-300"></div>
              </div>
            </Link>
          </div>

          {/* แถวสอง - ห้าแยกลาดพร้าว (ซ้าย) และ สาทร (ขวา) */}
          <div className="md:col-span-2">
            <Link
              href={locations[2]?.url || "#"}
              className="relative rounded-xl overflow-hidden group transition-transform duration-500 hover:scale-[1.02] shadow-lg block h-[300px]"
            >
              <Image
                src={locations[2]?.image || "/placeholder.svg"}
                alt={locations[2]?.name || ""}
                fill
                className="object-cover brightness-75 group-hover:brightness-90 transition-all duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-80 group-hover:opacity-70 transition-opacity duration-500" />
              <div className="absolute bottom-6 left-6 text-white transform group-hover:translate-y-[-5px] transition-transform duration-300">
                <h3 className="text-xl sm:text-2xl font-bold">
                  {locations[2]?.name}
                </h3>
                <div className="w-12 h-1 bg-blue-500 mt-2 rounded-full transform origin-left scale-0 group-hover:scale-100 transition-transform duration-300"></div>
              </div>
            </Link>
          </div>

          <div className="md:col-span-1">
            <Link
              href={locations[3]?.url || "#"}
              className="relative rounded-xl overflow-hidden group transition-transform duration-500 hover:scale-[1.02] shadow-lg block h-[300px]"
            >
              <Image
                src={locations[3]?.image || "/placeholder.svg"}
                alt={locations[3]?.name || ""}
                fill
                className="object-cover brightness-75 group-hover:brightness-90 transition-all duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-80 group-hover:opacity-70 transition-opacity duration-500" />
              <div className="absolute bottom-6 left-6 text-white transform group-hover:translate-y-[-5px] transition-transform duration-300">
                <h3 className="text-xl sm:text-2xl font-bold">
                  {locations[3]?.name}
                </h3>
                <div className="w-12 h-1 bg-blue-500 mt-2 rounded-full transform origin-left scale-0 group-hover:scale-100 transition-transform duration-300"></div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
