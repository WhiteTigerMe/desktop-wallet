import { Contracts } from "@arkecosystem/platform-sdk-profiles";
import { BigNumber } from "@arkecosystem/platform-sdk-support";
import { Icon } from "app/components/Icon";
import { Tooltip } from "app/components/Tooltip";
import { TotalAmountBox } from "domains/transaction/components/TotalAmountBox";
import {
	TransactionDetail,
	TransactionMemo,
	TransactionRecipients,
} from "domains/transaction/components/TransactionDetail";
import { evaluateFee } from "domains/transaction/utils";
import React from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

export const TransferLedgerReview = ({
	wallet,
	estimatedExpiration,
}: {
	wallet: Contracts.IReadWriteWallet;
	estimatedExpiration?: number;
}) => {
	const { t } = useTranslation();
	const { getValues } = useFormContext();

	const { fee, recipients, smartbridge } = getValues();

	let amount = BigNumber.ZERO;
	for (const recipient of recipients) {
		amount = amount.plus(recipient.amount);
	}

	const expirationType = wallet.network().expirationType();

	const expirationTypeTranslations = {
		height: t("TRANSACTION.EXPIRATION.HEIGHT"),
		timestamp: t("TRANSACTION.EXPIRATION.TIMESTAMP"),
	};

	return (
		<>
			<TransactionRecipients currency={wallet.currency()} recipients={recipients} border={false} />

			{smartbridge && <TransactionMemo memo={smartbridge} />}

			{estimatedExpiration && (
				<TransactionDetail
					label={
						<div data-testid="LedgerReview__expiration" className="flex items-center space-x-2">
							<span>{t("COMMON.EXPIRATION")}</span>

							<Tooltip content={expirationTypeTranslations[expirationType]}>
								<div className="rounded-full bg-theme-primary-100 hover:bg-theme-primary-200 dark:bg-theme-secondary-800 text-theme-primary-600 dark:text-theme-secondary-200 flex items-center justify-center w-4 h-4">
									<Icon width={9} height={9} name="QuestionMark" />
								</div>
							</Tooltip>
						</div>
					}
				>
					{estimatedExpiration}
				</TransactionDetail>
			)}

			<div className="mt-2">
				<TotalAmountBox amount={amount} fee={evaluateFee(fee)} ticker={wallet.currency()} />
			</div>
		</>
	);
};
