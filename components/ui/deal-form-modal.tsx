import React, { useState } from "react";
import { Button } from "./button";
import { GenericModal } from "./generic-modal";
import { Input } from "./input";
import { Label } from "./label";

interface DealFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (buyer: string, seller: string) => void;
  title?: string;
  buyerLabel?: string;
  sellerLabel?: string;
  submitText?: string;
  cancelText?: string;
}

export const DealFormModal: React.FC<DealFormModalProps> = ({
  open,
  onClose,
  onSubmit,
  title = "กรอกข้อมูลผู้ซื้อและผู้ขาย",
  buyerLabel = "ชื่อผู้ซื้อ",
  sellerLabel = "ชื่อผู้ขาย",
  submitText = "ยืนยัน",
  cancelText = "ยกเลิก",
}) => {
  const [buyer, setBuyer] = useState("");
  const [seller, setSeller] = useState("");

  const isValid = buyer.trim() !== "" && seller.trim() !== "";

  const handleSubmit = () => {
    if (isValid) {
      onSubmit(buyer, seller);
      setBuyer("");
      setSeller("");
    }
  };

  const handleClose = () => {
    setBuyer("");
    setSeller("");
    onClose();
  };

  return (
    <GenericModal open={open} onClose={handleClose} title={title} size="md">
      <div className="w-full space-y-4">
        <div>
          <Label htmlFor="buyer">{buyerLabel}</Label>
          <Input
            id="buyer"
            value={buyer}
            onChange={e => setBuyer(e.target.value)}
            placeholder="กรอกชื่อผู้ซื้อ"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="seller">{sellerLabel}</Label>
          <Input
            id="seller"
            value={seller}
            onChange={e => setSeller(e.target.value)}
            placeholder="กรอกชื่อผู้ขาย"
            className="mt-1"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={handleClose} className="flex-1">
            {cancelText}
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid} className="flex-1">
            {submitText}
          </Button>
        </div>
      </div>
    </GenericModal>
  );
};
