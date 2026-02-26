// Simple placeholder card used in the "อัพเดตทุก 3 เดือน" tab
// Matches the general card style and size used elsewhere
export default function ThreeMonthMockCard() {
  return (
    <div className="w-[268px] bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold">อัพเดตทุก 3 เดือน</h3>
          <span className="text-xs text-gray-500">Mock</span>
        </div>
        <div className="space-y-2">
          <div className="h-24 bg-gray-100 rounded-md" />
          <div className="h-4 bg-gray-100 rounded-md w-3/4" />
          <div className="h-4 bg-gray-100 rounded-md w-1/2" />
        </div>
      </div>
    </div>
  );
}
