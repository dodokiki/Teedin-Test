import React, { useState } from "react";

interface FilterPanelProps {
  onClose: () => void;
  onApply?: (next: {
    types: string[];
    actions: string[];
    priceMax: number;
  }) => void;
  initialTypes?: string[]; // e.g., ["คอนโด", "บ้าน"]
  initialActions?: string[]; // e.g., ["ขาย", "เช่า"]
  initialPriceMax?: number; // e.g., 100000000
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  onClose,
  onApply,
  initialTypes = ["คอนโด", "บ้าน"],
  initialActions = ["ขาย", "เช่า"],
  initialPriceMax = 100000000,
}) => {
  const [types, setTypes] = useState({
    condo: initialTypes.includes("คอนโด"),
    house: initialTypes.includes("บ้าน"),
  });
  const [actions, setActions] = useState({
    sell: initialActions.includes("ขาย"),
    rent: initialActions.includes("เช่า"),
  });
  const [price, setPrice] = useState(initialPriceMax);

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-6 w-[calc(100vw-2rem)] max-w-[320px] shadow-xl relative">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          onClick={onClose}
          aria-label="ปิด"
        >
          ×
        </button>
        <div className="flex flex-col gap-4">
          <div>
            <label className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={types.condo}
                onChange={() => setTypes(t => ({ ...t, condo: !t.condo }))}
                className="accent-emerald-500 w-5 h-5 rounded"
              />
              <span className="text-gray-700 text-base">คอนโด</span>
            </label>
            <label className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={types.house}
                onChange={() => setTypes(t => ({ ...t, house: !t.house }))}
                className="accent-emerald-500 w-5 h-5 rounded"
              />
              <span className="text-gray-700 text-base">บ้าน</span>
            </label>
          </div>
          <div>
            <label className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={actions.sell}
                onChange={() => setActions(a => ({ ...a, sell: !a.sell }))}
                className="accent-emerald-500 w-5 h-5 rounded"
              />
              <span className="text-gray-700 text-base">ขาย</span>
            </label>
            <label className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={actions.rent}
                onChange={() => setActions(a => ({ ...a, rent: !a.rent }))}
                className="accent-emerald-500 w-5 h-5 rounded"
              />
              <span className="text-gray-700 text-base">เช่า</span>
            </label>
          </div>
          <div>
            <div className="text-gray-700 text-sm mb-1">ช่วงราคา</div>
            <div className="flex items-center justify-between text-gray-400 text-xs mb-1">
              <span>10,000</span>
              <span>100,000,000</span>
            </div>
            <input
              type="range"
              min={10000}
              max={100000000}
              value={price}
              onChange={e => setPrice(Number(e.target.value))}
              className="w-full accent-emerald-500"
            />
          </div>
          <div className="flex gap-2 mt-2">
            <button
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-2 font-semibold"
              onClick={() => {
                onApply?.({
                  types: [types.condo && "คอนโด", types.house && "บ้าน"].filter(
                    Boolean
                  ) as string[],
                  actions: [
                    actions.sell && "ขาย",
                    actions.rent && "เช่า",
                  ].filter(Boolean) as string[],
                  priceMax: price,
                });
                onClose();
              }}
            >
              ใช้ตัวกรอง
            </button>
            <button
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg px-3 py-2"
              onClick={() => {
                setTypes({ condo: false, house: false });
                setActions({ sell: false, rent: false });
                setPrice(100000000);
              }}
            >
              รีเซ็ต
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterPanel;
