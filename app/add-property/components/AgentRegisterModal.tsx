import { useLanguage } from "@/contexts/language-context";
import { useState } from "react";

interface AgentRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AgentRegisterModal({
  isOpen,
  onClose,
}: AgentRegisterModalProps) {
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleRegister = async () => {
    setIsLoading(true);
    try {
      // TODO: Implement actual agent registration
      await new Promise(resolve => setTimeout(resolve, 2000));
      alert(t("agent_modal_redirecting"));
      onClose();
    } catch (error) {
      console.error("Error registering agent:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContactStaff = () => {
    // TODO: Implement contact staff functionality
    alert(t("agent_modal_contacting"));
    onClose();
  };

}
