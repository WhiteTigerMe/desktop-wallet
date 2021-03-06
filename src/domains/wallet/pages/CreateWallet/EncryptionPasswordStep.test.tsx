/* eslint-disable @typescript-eslint/require-await */
import { BIP39 } from "@arkecosystem/platform-sdk-crypto";
import { Contracts } from "@arkecosystem/platform-sdk-profiles";
import { act } from "@testing-library/react-hooks";
import { createMemoryHistory } from "history";
import React from "react";
import { Route } from "react-router-dom";
import { act as actAsync, env, fireEvent, getDefaultProfileId, renderWithRouter, waitFor } from "utils/testing-library";

import { CreateWallet } from "./CreateWallet";

let profile: Contracts.IProfile;
let bip39GenerateMock: any;

const passphrase = "power return attend drink piece found tragic fire liar page disease combine";

beforeAll(() => {
	bip39GenerateMock = jest.spyOn(BIP39, "generate").mockReturnValue(passphrase);
});

const fixtureProfileId = getDefaultProfileId();

afterAll(() => {
	bip39GenerateMock.mockRestore();
});

describe("EncryptionPasswordStep", () => {
	beforeEach(() => {
		profile = env.profiles().findById(fixtureProfileId);

		for (const wallet of profile.wallets().values()) {
			profile.wallets().forget(wallet.id());
		}

		bip39GenerateMock = jest.spyOn(BIP39, "generate").mockReturnValue(passphrase);
	});

	afterEach(() => {
		bip39GenerateMock.mockRestore();
	});

	it("should create a wallet and use encryption password", async () => {
		const history = createMemoryHistory();
		const createURL = `/profiles/${fixtureProfileId}/wallets/create`;
		history.push(createURL);

		const { queryAllByText, getByTestId, getByText, getAllByTestId } = renderWithRouter(
			<Route path="/profiles/:profileId/wallets/create">
				<CreateWallet />
			</Route>,
			{
				routes: [createURL],
				history,
			},
		);

		await waitFor(() => expect(getByTestId("NetworkStep")).toBeTruthy());

		const selectNetworkInput = getByTestId("SelectNetworkInput__input");
		const continueButton = getByTestId("CreateWallet__continue-button");
		const backButton = getByTestId("CreateWallet__back-button");

		const historySpy = jest.spyOn(history, "push").mockImplementation();

		expect(backButton).not.toHaveAttribute("disabled");
		act(() => {
			fireEvent.click(backButton);
		});

		expect(historySpy).toHaveBeenCalledWith(`/profiles/${fixtureProfileId}/dashboard`);

		act(() => {
			fireEvent.change(selectNetworkInput, { target: { value: "Ark Dev" } });
			fireEvent.keyDown(selectNetworkInput, { key: "Enter", code: 13 });
		});
		await waitFor(() => expect(continueButton).not.toHaveAttribute("disabled"));

		act(() => {
			fireEvent.change(selectNetworkInput, { target: { value: "" } });
		});
		await waitFor(() => expect(continueButton).toHaveAttribute("disabled"));

		act(() => {
			fireEvent.change(selectNetworkInput, { target: { value: "Ark Dev" } });
			fireEvent.keyDown(selectNetworkInput, { key: "Enter", code: 13 });
		});

		await waitFor(() => expect(continueButton).not.toHaveAttribute("disabled"));

		act(() => {
			fireEvent.click(continueButton);
		});

		await waitFor(() => expect(profile.wallets().values().length).toBe(1));

		await waitFor(() => expect(getByTestId("CreateWallet__WalletOverviewStep")).toBeTruthy());

		act(() => {
			fireEvent.click(backButton);
		});

		await waitFor(() => expect(getByTestId("NetworkStep")).toBeTruthy());

		act(() => {
			fireEvent.click(continueButton);
		});

		await waitFor(() => expect(getByTestId("CreateWallet__WalletOverviewStep")).toBeTruthy());

		act(() => {
			fireEvent.click(continueButton);
		});

		await waitFor(() => expect(getByTestId("CreateWallet__ConfirmPassphraseStep")).toBeTruthy());

		act(() => {
			fireEvent.click(backButton);
		});

		await waitFor(() => expect(getByTestId("CreateWallet__WalletOverviewStep")).toBeTruthy());

		act(() => {
			fireEvent.click(continueButton);
		});

		await waitFor(() => expect(getByTestId("CreateWallet__ConfirmPassphraseStep")).toBeTruthy());

		const walletMnemonic = passphrase.split(" ");
		for (let i = 0; i < 3; i++) {
			const wordNumber = parseInt(getByText(/Select the/).innerHTML.replace(/Select the/, ""));

			await actAsync(async () => {
				fireEvent.click(getByText(walletMnemonic[wordNumber - 1]));
				if (i < 2) {
					await waitFor(() => expect(queryAllByText(/The #([0-9]+) word/).length === 2 - i));
				}
			});
		}
		await waitFor(() => expect(continueButton).not.toHaveAttribute("disabled"));

		act(() => {
			fireEvent.click(continueButton);
		});

		const walletSpy = jest.spyOn(profile.wallets(), "importByMnemonicWithEncryption").mockRejectedValue(true);

		await waitFor(() => expect(getByTestId("EncryptPassword")).toBeTruthy());

		const passwordInput = getAllByTestId("InputPassword")[0];
		const confirmPassword = getAllByTestId("InputPassword")[1];

		actAsync(() => {
			fireEvent.input(passwordInput, { target: { value: "password" } });
		});

		await waitFor(() => expect(passwordInput).toHaveValue("password"));

		actAsync(() => {
			fireEvent.input(confirmPassword, { target: { value: "password" } });
		});

		await waitFor(() => expect(confirmPassword).toHaveValue("password"));

		actAsync(() => {
			fireEvent.click(getByTestId("CreateWallet__continue-button"));
		});
		await waitFor(() => expect(getByTestId("CreateWallet__SuccessStep")).toBeTruthy());

		act(() => {
			fireEvent.click(getByTestId("CreateWallet__save-button"));
		});

		await waitFor(() => expect(walletSpy).toHaveBeenCalled());
		historySpy.mockRestore();
		walletSpy.mockRestore();
	});

	it("should fail creating a wallet with encryption password", async () => {
		const history = createMemoryHistory();
		const createURL = `/profiles/${fixtureProfileId}/wallets/create`;
		history.push(createURL);

		const { queryAllByText, getByTestId, getByText, asFragment, getAllByTestId } = renderWithRouter(
			<Route path="/profiles/:profileId/wallets/create">
				<CreateWallet />
			</Route>,
			{
				routes: [createURL],
				history,
			},
		);

		await waitFor(() => expect(getByTestId("NetworkStep")).toBeTruthy());

		const selectNetworkInput = getByTestId("SelectNetworkInput__input");
		const continueButton = getByTestId("CreateWallet__continue-button");
		const backButton = getByTestId("CreateWallet__back-button");

		const historySpy = jest.spyOn(history, "push").mockImplementation();

		expect(backButton).not.toHaveAttribute("disabled");
		act(() => {
			fireEvent.click(backButton);
		});

		expect(historySpy).toHaveBeenCalledWith(`/profiles/${fixtureProfileId}/dashboard`);

		act(() => {
			fireEvent.change(selectNetworkInput, { target: { value: "Ark Dev" } });
			fireEvent.keyDown(selectNetworkInput, { key: "Enter", code: 13 });
		});
		await waitFor(() => expect(continueButton).not.toHaveAttribute("disabled"));

		act(() => {
			fireEvent.change(selectNetworkInput, { target: { value: "" } });
		});
		await waitFor(() => expect(continueButton).toHaveAttribute("disabled"));

		act(() => {
			fireEvent.change(selectNetworkInput, { target: { value: "Ark Dev" } });
			fireEvent.keyDown(selectNetworkInput, { key: "Enter", code: 13 });
		});

		await waitFor(() => expect(continueButton).not.toHaveAttribute("disabled"));

		act(() => {
			fireEvent.click(continueButton);
		});

		await waitFor(() => expect(profile.wallets().values().length).toBe(1));

		await waitFor(() => expect(getByTestId("CreateWallet__WalletOverviewStep")).toBeTruthy());

		act(() => {
			fireEvent.click(backButton);
		});

		await waitFor(() => expect(getByTestId("NetworkStep")).toBeTruthy());

		act(() => {
			fireEvent.click(continueButton);
		});

		await waitFor(() => expect(getByTestId("CreateWallet__WalletOverviewStep")).toBeTruthy());

		act(() => {
			fireEvent.click(continueButton);
		});

		await waitFor(() => expect(getByTestId("CreateWallet__ConfirmPassphraseStep")).toBeTruthy());

		act(() => {
			fireEvent.click(backButton);
		});

		await waitFor(() => expect(getByTestId("CreateWallet__WalletOverviewStep")).toBeTruthy());

		act(() => {
			fireEvent.click(continueButton);
		});

		await waitFor(() => expect(getByTestId("CreateWallet__ConfirmPassphraseStep")).toBeTruthy());

		const walletMnemonic = passphrase.split(" ");
		for (let i = 0; i < 3; i++) {
			const wordNumber = parseInt(getByText(/Select the/).innerHTML.replace(/Select the/, ""));

			await actAsync(async () => {
				fireEvent.click(getByText(walletMnemonic[wordNumber - 1]));
				if (i < 2) {
					await waitFor(() => expect(queryAllByText(/The #([0-9]+) word/).length === 2 - i));
				}
			});
		}
		await waitFor(() => expect(continueButton).not.toHaveAttribute("disabled"));

		act(() => {
			fireEvent.click(continueButton);
		});

		const walletSpy = jest
			.spyOn(profile.wallets(), "importByMnemonicWithEncryption")
			.mockRejectedValue(new Error("failed"));

		await waitFor(() => expect(getByTestId("EncryptPassword")).toBeTruthy());

		const passwordInput = getAllByTestId("InputPassword")[0];
		const confirmPassword = getAllByTestId("InputPassword")[1];

		actAsync(() => {
			fireEvent.input(passwordInput, { target: { value: "password" } });
		});

		await waitFor(() => expect(passwordInput).toHaveValue("password"));

		actAsync(() => {
			fireEvent.input(confirmPassword, { target: { value: "password" } });
		});

		await waitFor(() => expect(confirmPassword).toHaveValue("password"));

		actAsync(() => {
			fireEvent.click(getByTestId("CreateWallet__continue-button"));
		});
		await waitFor(() => expect(getByTestId("CreateWallet__SuccessStep")).toBeTruthy());

		act(() => {
			fireEvent.click(getByTestId("CreateWallet__save-button"));
		});

		await waitFor(() => expect(walletSpy).rejects.toBeTruthy());
		walletSpy.mockRestore();
	});
});
