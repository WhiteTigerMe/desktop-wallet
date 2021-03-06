import { Contracts } from "@arkecosystem/platform-sdk";
import { Contracts as ProfilesContracts } from "@arkecosystem/platform-sdk-profiles";
import { Circle } from "app/components/Circle";
import { Icon } from "app/components/Icon";
import { TabPanel, Tabs } from "app/components/Tabs";
import { TransactionDetail, TransactionFee } from "domains/transaction/components/TransactionDetail";
import { SendRegistrationForm } from "domains/transaction/pages/SendRegistration/SendRegistration.models";
import React from "react";

import { FormStep, ReviewStep } from "./";

const component = ({
	activeTab,
	fees,
	wallet,
}: {
	activeTab: number;
	fees: any;
	wallet: ProfilesContracts.IReadWriteWallet;
}) => (
	<Tabs activeId={activeTab}>
		<TabPanel tabId={1}>
			<FormStep fees={fees} wallet={wallet} />
		</TabPanel>
		<TabPanel tabId={2}>
			<ReviewStep wallet={wallet} />
		</TabPanel>
	</Tabs>
);

const transactionDetails = ({
	transaction,
	translations,
	wallet,
}: {
	transaction: Contracts.SignedTransactionData;
	translations: any;
	wallet: ProfilesContracts.IReadWriteWallet;
}) => (
	<>
		<TransactionDetail
			label={translations("TRANSACTION.TRANSACTION_TYPE")}
			extra={
				<Circle className="border-theme-text" size="lg">
					<Icon name="Delegate" width={25} height={25} />
				</Circle>
			}
		>
			{translations("TRANSACTION.TRANSACTION_TYPES.DELEGATE_REGISTRATION")}
		</TransactionDetail>

		<TransactionDetail label={translations("TRANSACTION.DELEGATE_NAME")}>
			{transaction.data().asset.delegate.username}
		</TransactionDetail>

		<TransactionFee currency={wallet.currency()} value={transaction.fee()} paddingPosition="top" />
	</>
);

component.displayName = "DelegateRegistrationForm";
transactionDetails.displayName = "DelegateRegistrationFormTransactionDetails";

export const DelegateRegistrationForm: SendRegistrationForm = {
	tabSteps: 2,
	component,
	transactionDetails,
	formFields: ["username"],
	signTransaction: async ({ env, form, profile }: any) => {
		const { clearErrors, getValues } = form;

		clearErrors("mnemonic");
		const { fee, mnemonic, secondMnemonic, senderAddress, username, encryptionPassword } = getValues();
		const senderWallet = profile.wallets().findByAddress(senderAddress);

		const wif = senderWallet?.usesWIF() ? await senderWallet.wif(encryptionPassword) : undefined;

		const transactionId = await senderWallet.transaction().signDelegateRegistration({
			fee,
			from: senderAddress,
			sign: {
				wif,
				mnemonic,
				secondMnemonic,
			},
			data: {
				username,
			},
		});

		await senderWallet.transaction().broadcast(transactionId);

		await env.persist();

		return senderWallet.transaction().transaction(transactionId);
	},
};
