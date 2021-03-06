import { SignedMessage } from "@arkecosystem/platform-sdk/dist/contracts";
import { SignMessage } from "domains/wallet/components/SignMessage";
import { useCallback, useState } from "react";
import React from "react";

export const useSignMessageModal = ({ message, walletId }: { message: string; walletId: string }) => {
	const [isOpen, setIsOpen] = useState(false);
	const [signedResult, setSignedResult] = useState<SignedMessage | undefined>(undefined);

	const open = () => setIsOpen(true);
	const close = useCallback(() => setIsOpen(false), []);

	// eslint-disable-next-line arrow-body-style
	const ModalWrapper = useCallback(() => {
		return (
			<SignMessage
				walletId={walletId}
				isOpen={isOpen}
				messageText={message}
				onSign={setSignedResult}
				onCancel={close}
				onClose={close}
			/>
		);
	}, [isOpen, message, walletId, close]);

	return [ModalWrapper, signedResult, { isOpen, open, close }];
};
