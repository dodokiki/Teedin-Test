"use client";

interface PricingTier {
  name: string;
  price: number;
  features: string[];
  highlighted?: boolean;
}

interface PricingCardProps {
  tier: PricingTier;
}

export function PricingCard({ tier }: PricingCardProps) {
  const { name, price, features, highlighted } = tier;

  return (
    <div
      className={`flex flex-col items-center p-8 rounded-lg shadow-lg transition-transform hover:scale-105 ${
        highlighted ? "bg-gray-200" : "bg-white"
      }`}
    >
      {/* Package Name */}
      <h3
        className={`text-sm font-semibold uppercase tracking-wider mb-4 ${
          highlighted ? "text-gray-700" : "text-gray-500"
        }`}
      >
        {name}
      </h3>

      {/* Price */}
      <div className="mb-6">
        <span className="text-5xl font-bold text-gray-900">${price}</span>
      </div>

      {/* Features List */}
      <ul className="space-y-3 mb-8 w-full">
        {features.map((feature, index) => (
          <li
            key={index}
            className="text-sm text-gray-600 text-center font-medium"
          >
            {feature}
          </li>
        ))}
      </ul>

      {/* Buy Now Button */}
      <button
        className={`px-8 py-3 rounded text-sm font-semibold uppercase tracking-wide transition-all ${
          highlighted
            ? "bg-blue-500 text-white hover:bg-blue-600"
            : "bg-gray-300 text-gray-700 hover:bg-gray-400"
        }`}
      >
        Buy Now
      </button>
    </div>
  );
}
