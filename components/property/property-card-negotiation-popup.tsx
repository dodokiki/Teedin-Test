import { supabase } from "@/lib/supabaseClient";
import React, { useState } from "react";

// Removed N_* popup components; use simple confirm/prompt flows instead

const NegotiationActionPopups: React.FC<{ negotiationId?: string }> = ({
  negotiationId,
}) => {
  const [loading, setLoading] = useState(false);

  // อัปเดต card_status = 'confirm' ใน Supabase
  const handleConfirmStatus = async () => {
    if (!negotiationId) return;
    setLoading(true);
    await supabase
      .from("negotiations")
      .update({ card_status: "confirm" })
      .eq("id", negotiationId);
    setLoading(false);
  };

  const handleReject = async () => {
    if (!negotiationId) return;
    const reason =
      typeof window !== "undefined"
        ? window.prompt("กรุณาระบุเหตุผลในการปฏิเสธข้อเสนอ:")
        : null;
    if (!reason) return;
    setLoading(true);
    await supabase
      .from("negotiations")
      .update({ card_status: "cancel", rejection_reason: reason })
      .eq("id", negotiationId);
    setLoading(false);
  };

  return (
    <>
      <div className="flex flex-col gap-2 mt-4">
        <button
          className="bg-[#006CE3] hover:bg-[#0056b3] text-white text-lg font-bold rounded-xl py-2 w-full transition-colors duration-150"
          onClick={async () => {
            const ok =
              typeof window !== "undefined"
                ? window.confirm("ยืนยันการยอมรับข้อเสนอ?")
                : true;
            if (!ok) return;
            await handleConfirmStatus();
          }}
          type="button"
          disabled={loading}
        >
          ยอมรับข้อเสนอ
        </button>
        <button
          className="border border-[#006CE3] text-[#222] text-lg font-bold rounded-xl py-2 w-full bg-white hover:bg-gray-100 transition-colors duration-150"
          onClick={handleReject}
          type="button"
          disabled={loading}
        >
          ปฏิเสธ
        </button>
      </div>
    </>
  );
};

export default NegotiationActionPopups;
