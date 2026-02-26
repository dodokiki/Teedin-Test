"use client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
import { useState } from "react";

interface EditPhoneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  currentValue: string | null | undefined;
  onUpdated: (newValue: string) => void;
}

export function EditPhoneDialog({
  open,
  onOpenChange,
  userId,
  currentValue,
  onUpdated,
}: EditPhoneDialogProps) {
  const [value, setValue] = useState(currentValue || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValidPhone = (v: string) =>
    /^\+?\d{7,15}$/.test(v.replace(/\s|-/g, ""));

  const handleSave = async () => {
    if (!userId) return;
    if (!isValidPhone(value)) {
      setError("รูปแบบเบอร์โทรไม่ถูกต้อง");
      return;
    }
    setSaving(true);
    setError(null);
    const { error } = await supabase
      .from("users")
      .update({ phone: value })
      .eq("id", userId);
    setSaving(false);
    if (error) {
      setError(error.message);
    } else {
      onUpdated(value);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>แก้ไขเบอร์โทรศัพท์</DialogTitle>
          <DialogDescription>ใส่เบอร์โทรใหม่แล้วกดบันทึก</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              เบอร์โทรใหม่
            </label>
            <input
              type="tel"
              className="w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="เช่น 0633914529 หรือ +66633914529"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 text-sm rounded border bg-white hover:bg-gray-50"
              disabled={saving}
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2 disabled:opacity-70"
              disabled={saving || !value.trim()}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} บันทึก
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
