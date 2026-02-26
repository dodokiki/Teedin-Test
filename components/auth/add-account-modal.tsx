"use client";

import { LoginDrawer } from "@/components/auth/login-drawer";
import { useAuth } from "@/contexts/auth-context";

export function AddAccountModal() {
    const { isAddAccountModalOpen, closeAddAccountModal } = useAuth();

    return (
        <LoginDrawer
            isOpen={isAddAccountModalOpen}
            onClose={closeAddAccountModal}
            isAddAccountMode={true}
            onLoginSuccess={() => {
                // The context will handle the account update
                closeAddAccountModal();
            }}
        />
    );
}
