import { Contracts } from "@arkecosystem/platform-sdk-profiles";
import { BigNumber } from "@arkecosystem/platform-sdk-support";
import { Header } from "app/components/Header";
import { TotalAmountBox } from "domains/transaction/components/TotalAmountBox";
import {
	TransactionMemo,
	TransactionNetwork,
	TransactionRecipients,
	TransactionSender,
} from "domains/transaction/components/TransactionDetail";
import { evaluateFee } from "domains/transaction/utils";
import React, { useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

export const ReviewStep = ({ wallet }: { wallet: Contracts.IReadWriteWallet }) => {
	const { t } = useTranslation();
	const { unregister, watch } = useFormContext();

	const { fee, recipients, smartbridge } = watch();

	let amount = BigNumber.ZERO;

	for (const recipient of recipients) {
		amount = amount.plus(recipient.amount);
	}

	useEffect(() => {
		unregister("mnemonic");
	}, [unregister]);

	return (
		<section data-testid="SendTransfer__review-step">
			<Header title={t("TRANSACTION.REVIEW_STEP.TITLE")} subtitle={t("TRANSACTION.REVIEW_STEP.DESCRIPTION")} />

			<TransactionNetwork network={wallet.network()} border={false} paddingPosition="bottom" className="mt-8" />

			<TransactionSender address={wallet.address()} alias={wallet.alias()} />

			<TransactionRecipients currency={wallet.currency()} recipients={recipients} />

			{smartbridge && <TransactionMemo memo={smartbridge} />}

			<div className="mt-2">
				<TotalAmountBox amount={amount} fee={evaluateFee(fee)} ticker={wallet.currency()} />
			</div>
		</section>
	);
};
