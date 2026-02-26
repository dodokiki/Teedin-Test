"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ConfirmApproveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isConfirming: boolean;
}

export default function ConfirmApproveModal({
  isOpen,
  onClose,
  onConfirm,
  isConfirming,
}: ConfirmApproveModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-circle-check-big h-6 w-6 text-gray-800"
            >
              <path d="M21.801 10A10 10 0 1 1 17 3.335"></path>
              <path d="m9 11 3 3L22 4"></path>
            </svg>
          </div>
          <DialogTitle className="text-center text-xl">
            ยืนยันการอนุมัติ
          </DialogTitle>
          <DialogDescription className="text-center pt-2">
            คุณต้องการอนุมัติการ์ดนี้ใช่หรือไม่?
            <br />
            เมื่ออนุมัติแล้ว การ์ดจะแสดงบนหน้าเว็บทันที
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center gap-2 mt-2">
          <Button variant="outline" onClick={onClose} disabled={isConfirming}>
            ยกเลิก
          </Button>
          <Button
            type="button"
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={onConfirm}
            disabled={isConfirming}
          >
            {isConfirming ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                กำลังอนุมัติ...
              </>
            ) : (
              "ยืนยันอนุมัติ"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
