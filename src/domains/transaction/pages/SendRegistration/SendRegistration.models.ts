import { Contracts } from "@arkecosystem/platform-sdk";
import { Contracts as ProfileContracts, Environment } from "@arkecosystem/platform-sdk-profiles";
import { TFunction } from "i18next";
import { useForm } from "react-hook-form";

export type ExtendedSignedTransactionData = Contracts.SignedTransactionData & {
	generatedAddress?: string;
};

export type SendRegistrationDetailsOptions = {
	transaction: ExtendedSignedTransactionData;
	translations: TFunction;
	wallet: ProfileContracts.IReadWriteWallet;
};

export type SendRegistrationComponent = {
	activeTab: number;
	fees: Contracts.TransactionFee;
	wallet: ProfileContracts.IReadWriteWallet;
	profile: ProfileContracts.IProfile;
};

export type SendRegistrationSignOptions = {
	env: Environment;
	form: ReturnType<typeof useForm>;
	profile: ProfileContracts.IProfile;
};

export type SendRegistrationForm = {
	transactionDetails: ({ transaction, translations, wallet }: SendRegistrationDetailsOptions) => JSX.Element;

	signTransaction: (options: SendRegistrationSignOptions) => Promise<Contracts.SignedTransactionData>;

	tabSteps: number;

	formFields: string[];

	component: ({ activeTab, fees, wallet }: SendRegistrationComponent) => JSX.Element;
};
