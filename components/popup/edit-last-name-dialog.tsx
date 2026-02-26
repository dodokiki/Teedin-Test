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

interface EditLastNameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  currentValue: string | null | undefined;
  onUpdated: (newValue: string) => void;
}

export function EditLastNameDialog({
  open,
  onOpenChange,
  userId,
  currentValue,
  onUpdated,
}: EditLastNameDialogProps) {
  const [value, setValue] = useState(currentValue || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    setError(null);
    const { error } = await supabase
      .from("users")
      .update({ last_name: value })
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
          <DialogTitle>แก้ไขนามสกุล</DialogTitle>
          <DialogDescription>
            ปรับปรุงข้อมูลนามสกุลของคุณแล้วกดบันทึก
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              นามสกุลใหม่
            </label>
            <input
              type="text"
              className="w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="กรอกนามสกุล"
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
