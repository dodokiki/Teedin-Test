import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useLanguage } from "@/contexts/language-context";
import { UserPlus } from "lucide-react";

interface RoleSwitchAlertProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RoleSwitchAlert({
  isOpen,
  onOpenChange,
}: RoleSwitchAlertProps) {
  const { t } = useLanguage();

  return (
    <>
      <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
        <AlertDialogContent className="bg-white text-gray-900 max-w-md rounded-2xl shadow-2xl border-0 p-0 overflow-hidden">
          <div className="p-6 flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-sm bg-orange-50 text-orange-600">
              <UserPlus className="w-10 h-10" />
            </div>
            <AlertDialogHeader className="space-y-3">
              <AlertDialogTitle className="text-2xl font-bold text-gray-900">
                {t("step1_alert_title")}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-gray-600 text-base leading-relaxed max-w-sm mx-auto">
                {t("step1_alert_desc")}
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>
          <AlertDialogFooter className="bg-gray-50 p-6 flex-col-reverse sm:flex-row gap-3 sm:gap-3">
            <AlertDialogCancel className="w-full sm:w-1/2 mt-0 h-12 rounded-xl border-gray-200 hover:bg-white hover:text-gray-900 hover:border-gray-300 transition-all">
              {t("close")}
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
