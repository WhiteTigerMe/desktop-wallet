import { Contracts } from "@arkecosystem/platform-sdk-profiles";
// @README: This import is fine in tests but should be avoided in production code.
import { ReadOnlyWallet } from "@arkecosystem/platform-sdk-profiles/dist/drivers/memory/wallets/read-only-wallet";
import { renderHook } from "@testing-library/react-hooks";
import React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { env, getDefaultProfileId, render, screen } from "utils/testing-library";

import { VoteLedgerReview } from "./LedgerReview";

describe("LedgerReview", () => {
	let profile: Contracts.IProfile;
	let wallet: Contracts.IReadWriteWallet;

	beforeEach(() => {
		profile = env.profiles().findById(getDefaultProfileId());
		wallet = profile.wallets().first();
	});

	it("should render for unvote transaction", () => {
		const unvotes = [
			new ReadOnlyWallet({
				address: wallet.address(),
				username: "Test Username",
				publicKey: wallet.publicKey(),
				explorerLink: "",
			}),
		];

		const { result } = renderHook(() => useForm());

		const { container } = render(
			<FormProvider {...result.current}>
				<VoteLedgerReview wallet={wallet} unvotes={unvotes} votes={[]} />
			</FormProvider>,
		);

		expect(screen.getByText(unvotes[0].username())).toBeInTheDocument();
		expect(container).toMatchSnapshot();
	});

	it("should render for vote transaction", () => {
		const votes = [
			new ReadOnlyWallet({
				address: wallet.address(),
				username: "Test Username",
				publicKey: wallet.publicKey(),
				explorerLink: "",
			}),
		];

		const { result } = renderHook(() => useForm());

		const { container } = render(
			<FormProvider {...result.current}>
				<VoteLedgerReview wallet={wallet} unvotes={[]} votes={votes} />
			</FormProvider>,
		);

		expect(screen.getByText(votes[0].username())).toBeInTheDocument();
		expect(container).toMatchSnapshot();
	});

	it("should render for unvote and vote transaction", () => {
		const votes = [
			new ReadOnlyWallet({
				address: wallet.address(),
				username: "Test Username",
				publicKey: wallet.publicKey(),
				explorerLink: "",
			}),
		];

		const { result } = renderHook(() => useForm());

		const { container } = render(
			<FormProvider {...result.current}>
				<VoteLedgerReview wallet={wallet} unvotes={votes} votes={votes} />
			</FormProvider>,
		);

		expect(screen.getAllByText(votes[0].username())).toHaveLength(2);
		expect(container).toMatchSnapshot();
	});
});
