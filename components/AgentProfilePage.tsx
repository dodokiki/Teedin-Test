"use client";

import React, { useRef, useState } from "react";

type Review = {
  id: number;
  name: string;
  rating: number;
  text: string;
};

export default function AgentProfilePage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [province, setProvince] = useState("");
  const [country, setCountry] = useState("");
  const [lineId, setLineId] = useState("");
  const [website, setWebsite] = useState("");

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const reviews: Review[] = [
    {
      id: 1,
      name: "Sally",
      rating: 5,
      text: "Great service, very responsive!",
    },
    { id: 2, name: "Mark", rating: 4, text: "Helpful and professional." },
    {
      id: 3,
      name: "Priya",
      rating: 5,
      text: "Found my dream home thanks to this agent.",
    },
  ];

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files && e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAvatarPreview(url);
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Agent Profile</h1>

      <div className="grid grid-cols-1 md:grid-cols-10 gap-6">
        {/* Left panel (span 3 of 10 on md) */}
        <div className="md:col-span-3 bg-white rounded-lg shadow p-6">
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center shadow">
                {avatarPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarPreview}
                    alt="avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-gray-400">No photo</span>
                )}
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-2 right-0 bg-white border rounded-full p-2 shadow text-sm hover:bg-gray-50"
                aria-label="Upload avatar"
              >
                Upload
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            <div className="w-full mt-6 space-y-4">
              <label className="block">
                <div className="text-sm text-gray-600 mb-1">Full Name</div>
                <input
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                  placeholder="Jane Doe"
                />
              </label>

              <label className="block">
                <div className="text-sm text-gray-600 mb-1">Email</div>
                <input
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  type="email"
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                  placeholder="agent@example.com"
                />
              </label>

              <label className="block">
                <div className="text-sm text-gray-600 mb-1">Phone Number</div>
                <input
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                  placeholder="+1 555 123 456"
                />
              </label>

              <label className="block">
                <div className="text-sm text-gray-600 mb-1">Address</div>
                <input
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                  placeholder="123 Main St"
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <div className="text-sm text-gray-600 mb-1">Province</div>
                  <input
                    value={province}
                    onChange={e => setProvince(e.target.value)}
                    className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                    placeholder="Province"
                  />
                </label>

                <label className="block">
                  <div className="text-sm text-gray-600 mb-1">Country</div>
                  <input
                    value={country}
                    onChange={e => setCountry(e.target.value)}
                    className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                    placeholder="Country"
                  />
                </label>
              </div>

              <label className="block">
                <div className="text-sm text-gray-600 mb-1">Line ID</div>
                <input
                  value={lineId}
                  onChange={e => setLineId(e.target.value)}
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                  placeholder="Line ID"
                />
              </label>

              <label className="block">
                <div className="text-sm text-gray-600 mb-1">
                  Website / Facebook
                </div>
                <input
                  value={website}
                  onChange={e => setWebsite(e.target.value)}
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                  placeholder="https://"
                />
              </label>

              <div className="pt-2">
                <button
                  type="button"
                  className="w-full bg-yellow-400 hover:bg-yellow-450 text-white rounded px-4 py-2 font-medium shadow"
                  onClick={() => {
                    // placeholder: save to local state only for now
                    // could later persist to backend
                    // no-op
                  }}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right panel (span 7 of 10 on md) */}
        <div className="md:col-span-7 bg-white rounded-lg shadow overflow-hidden">
          <div className="bg-yellow-100 p-6">
            <h2 className="text-xl font-semibold">Public Information</h2>
            <p className="text-sm text-gray-600 mt-1">
              This section shows agent public statistics and contact info.
            </p>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 border rounded">
                <div className="text-sm text-gray-500">Joined since</div>
                <div className="font-medium">April 2023</div>
              </div>

              <div className="p-4 border rounded">
                <div className="text-sm text-gray-500">Total listings</div>
                <div className="font-medium">18</div>
              </div>

              <div className="p-4 border rounded">
                <div className="text-sm text-gray-500">Response rate</div>
                <div className="font-medium">98% (within 1 hour avg)</div>
              </div>

              <div className="p-4 border rounded">
                <div className="text-sm text-gray-500">Buyer rating</div>
                <div className="font-medium">4.9 / 5.0 (22 reviews)</div>
              </div>
            </div>

            <div className="border rounded p-4">
              <h3 className="font-semibold mb-2">Contact</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="text-sm text-gray-500">Phone</div>
                  <div className="font-medium">{phone || "—"}</div>
                </div>

                <div>
                  <div className="text-sm text-gray-500">Line ID</div>
                  <div className="font-medium">{lineId || "—"}</div>
                </div>

                <div>
                  <div className="text-sm text-gray-500">
                    Website / Facebook
                  </div>
                  <div className="font-medium break-words">
                    {website || "—"}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-500">Address</div>
                  <div className="font-medium">
                    {address ? `${address}, ${province} ${country}` : "—"}
                  </div>
                </div>
              </div>
            </div>

            <div className="border rounded p-4">
              <h3 className="font-semibold mb-3">Customer Reviews</h3>

              <div className="space-y-4">
                {reviews.map(r => (
                  <div key={r.id} className="p-3 bg-gray-50 rounded">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{r.name}</div>
                      <div className="flex items-center space-x-1 text-yellow-500">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <svg
                            key={i}
                            className={`w-4 h-4 ${i < r.rating ? "fill-current text-yellow-400" : "text-gray-300"}`}
                            viewBox="0 0 20 20"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path d="M10 15l-5.878 3.09 1.122-6.545L.488 6.91l6.562-.955L10 0l2.95 5.955 6.562.955-4.756 4.635 1.122 6.545z" />
                          </svg>
                        ))}
                      </div>
                    </div>
                    <div className="text-sm text-gray-700 mt-2">{r.text}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
