/* eslint-disable @typescript-eslint/await-thenable */
/* eslint-disable @typescript-eslint/require-await */
import { Coins } from "@arkecosystem/platform-sdk";
import { Contracts } from "@arkecosystem/platform-sdk-profiles";
import { BigNumber } from "@arkecosystem/platform-sdk-support";
import Transport, { Observer } from "@ledgerhq/hw-transport";
import { createTransportReplayer, RecordStore } from "@ledgerhq/hw-transport-mocker";
import { act, renderHook } from "@testing-library/react-hooks";
import { LedgerProvider } from "app/contexts";
import { toasts } from "app/services";
import { NetworkStep } from "domains/wallet/components/NetworkStep";
import { createMemoryHistory } from "history";
import nock from "nock";
import React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { Route } from "react-router-dom";
import {
	act as actAsync,
	env,
	fireEvent,
	getDefaultProfileId,
	render,
	RenderResult,
	renderWithRouter,
	screen,
	waitFor,
} from "utils/testing-library";

import { ImportWallet } from "./ImportWallet";
import { SecondStep } from "./Step2";
import { ThirdStep } from "./Step3";

let profile: Contracts.IProfile;
const fixtureProfileId = getDefaultProfileId();

const identityAddress = "DC8ghUdhS8w8d11K8cFQ37YsLBFhL3Dq2P";
const mnemonic = "buddy year cost vendor honey tonight viable nut female alarm duck symptom";
const randomAddress = "D61mfSggzbvQgTUe6JhYKH2doHaqJ3Dyib";

const route = `/profiles/${fixtureProfileId}/wallets/import`;

jest.setTimeout(30000);

describe("ImportWallet", () => {
	beforeAll(() => {
		nock.disableNetConnect();

		nock("https://dwallets.ark.io")
			.get("/api/wallets/DC8ghUdhS8w8d11K8cFQ37YsLBFhL3Dq2P")
			.reply(200, require("tests/fixtures/coins/ark/devnet/wallets/DC8ghUdhS8w8d11K8cFQ37YsLBFhL3Dq2P.json"))
			.persist();
	});

	beforeEach(() => {
		profile = env.profiles().findById(fixtureProfileId);

		const walletId = profile.wallets().findByAddress(randomAddress)?.id();

		if (walletId) {
			profile.wallets().forget(walletId);
		}
	});

	it("should render network step", async () => {
		const { result: form } = renderHook(() => useForm());
		const { getByTestId, asFragment } = render(
			<FormProvider {...form.current}>
				<NetworkStep profile={profile} title="title" subtitle="subtitle" />
			</FormProvider>,
		);

		expect(getByTestId("NetworkStep")).toBeTruthy();
		expect(asFragment()).toMatchSnapshot();

		const selectNetworkInput = getByTestId("SelectNetworkInput__input");
		expect(selectNetworkInput).toBeTruthy();

		await act(async () => {
			fireEvent.change(selectNetworkInput, { target: { value: "ARK D" } });
		});

		await act(async () => {
			fireEvent.keyDown(selectNetworkInput, { key: "Enter", code: 13 });
		});

		expect(selectNetworkInput).toHaveValue("ARK Devnet");
	});

	it("should render network step without test networks", async () => {
		profile.settings().set(Contracts.ProfileSetting.UseTestNetworks, false);

		const { result: form } = renderHook(() => useForm());
		const { getByTestId, asFragment, queryByTestId } = render(
			<FormProvider {...form.current}>
				<NetworkStep profile={profile} title="title" subtitle="subtitle" />
			</FormProvider>,
		);

		expect(getByTestId("NetworkStep")).toBeTruthy();

		const selectNetworkInput = getByTestId("SelectNetworkInput__input");
		expect(selectNetworkInput).toBeTruthy();

		act(() => {
			fireEvent.focus(selectNetworkInput);
		});

		expect(queryByTestId("NetworkIcon-ARK-ark.mainnet")).toBeInTheDocument();
		expect(queryByTestId("NetworkIcon-ARK-ark.devnet")).toBeNull();

		expect(asFragment()).toMatchSnapshot();

		profile.settings().set(Contracts.ProfileSetting.UseTestNetworks, true);
	});

	it("should render 2st step", async () => {
		let form: ReturnType<typeof useForm>;

		const Component = () => {
			form = useForm({
				defaultValues: {
					network: {
						id: () => "ark.devnet",
						coin: () => "ARK",
					},
					type: "mnemonic",
				},
			});
			form.register("type");
			form.register("network");
			return (
				<FormProvider {...form}>
					<SecondStep profile={profile} />
				</FormProvider>
			);
		};

		const { container } = render(<Component />);

		expect(screen.getByTestId("ImportWallet__second-step")).toBeTruthy();

		await waitFor(() => expect(screen.getByTestId("ImportWallet__mnemonic-input")));

		const passphraseInput = screen.getByTestId("ImportWallet__mnemonic-input");
		expect(passphraseInput).toBeTruthy();

		fireEvent.change(passphraseInput, { target: { value: mnemonic } });

		await waitFor(() => {
			expect(form.getValues()).toMatchObject({ type: "mnemonic", value: mnemonic });
		});

		act(() => {
			fireEvent.focus(screen.getByTestId("SelectDropdownInput__input"));
		});

		await waitFor(() => expect(screen.getByTestId("select-list__toggle-option-1")).toBeInTheDocument());

		act(() => {
			fireEvent.mouseDown(screen.getByTestId("select-list__toggle-option-1"));
		});

		await waitFor(() => expect(screen.getByTestId("ImportWallet__address-input")).toBeInTheDocument());

		expect(container).toMatchSnapshot();
	});

	it("should render 3st step", async () => {
		let form: ReturnType<typeof useForm>;
		const Component = () => {
			form = useForm({
				defaultValues: {
					network: {
						id: () => "ark.devnet",
						coin: () => "ARK",
						ticker: () => "DARK",
					},
					type: "mnemonic",
				},
			});

			return (
				<FormProvider {...form}>
					<ThirdStep
						address={identityAddress}
						balance={BigNumber.make(80)}
						nameMaxLength={42}
						profile={profile}
					/>
				</FormProvider>
			);
		};

		const { getByTestId, getByText, asFragment } = render(<Component />);

		expect(getByTestId("ImportWallet__third-step")).toBeTruthy();
		expect(asFragment()).toMatchSnapshot();

		expect(getByText("ARK Devnet")).toBeTruthy();
		expect(getByText(identityAddress)).toBeTruthy();

		const walletNameInput = getByTestId("ImportWallet__name-input");

		await act(async () => {
			fireEvent.change(walletNameInput, { target: { value: "Test" } });
		});

		expect(form.getValues()).toEqual({ name: "Test" });
	});

	it("should go back to dashboard", async () => {
		const history = createMemoryHistory();
		history.push(route);

		let rendered: RenderResult;

		const historySpy = jest.spyOn(history, "push").mockImplementationOnce();

		await actAsync(async () => {
			rendered = renderWithRouter(
				<Route path="/profiles/:profileId/wallets/import">
					<ImportWallet />
				</Route>,
				{
					routes: [route],
					history,
				},
			);
			await waitFor(() => expect(rendered.getByTestId("NetworkStep")).toBeTruthy());
		});

		const { getByTestId } = rendered;

		const backButton = getByTestId("ImportWallet__back-button");
		expect(backButton).toBeTruthy();
		expect(backButton).not.toHaveAttribute("disabled");

		await fireEvent.click(backButton);

		expect(historySpy).toHaveBeenCalledWith(`/profiles/${fixtureProfileId}/dashboard`);

		historySpy.mockRestore();
	});

	it("should go to previous step", async () => {
		const history = createMemoryHistory();
		history.push(route);

		let rendered: RenderResult;

		await actAsync(async () => {
			rendered = renderWithRouter(
				<Route path="/profiles/:profileId/wallets/import">
					<ImportWallet />
				</Route>,
				{
					routes: [route],
					history,
				},
			);
			await waitFor(() => expect(rendered.getByTestId("NetworkStep")).toBeTruthy());
		});

		const { getByTestId, asFragment } = rendered;

		expect(asFragment()).toMatchSnapshot();

		await actAsync(async () => {
			const selectNetworkInput = getByTestId("SelectNetworkInput__input");
			expect(selectNetworkInput).toBeTruthy();

			await fireEvent.change(selectNetworkInput, { target: { value: "ARK D" } });
			await fireEvent.keyDown(selectNetworkInput, { key: "Enter", code: 13 });

			expect(selectNetworkInput).toHaveValue("ARK Devnet");

			const continueButton = getByTestId("ImportWallet__continue-button");
			expect(continueButton).toBeTruthy();
			expect(continueButton).not.toHaveAttribute("disabled");

			await fireEvent.click(continueButton);

			await waitFor(() => {
				expect(getByTestId("ImportWallet__second-step")).toBeTruthy();
			});

			await fireEvent.click(getByTestId("ImportWallet__back-button"));

			await waitFor(() => {
				expect(getByTestId("NetworkStep")).toBeTruthy();
			});
		});
	});

	it("should import by mnemonic", async () => {
		const history = createMemoryHistory();
		history.push(route);

		let rendered: RenderResult;

		await actAsync(async () => {
			rendered = renderWithRouter(
				<Route path="/profiles/:profileId/wallets/import">
					<ImportWallet />
				</Route>,
				{
					routes: [route],
					history,
				},
			);
			await waitFor(() => expect(rendered.getByTestId("NetworkStep")).toBeTruthy());
		});

		const { getByTestId, asFragment } = rendered;

		expect(asFragment()).toMatchSnapshot();

		await actAsync(async () => {
			const selectNetworkInput = getByTestId("SelectNetworkInput__input");
			expect(selectNetworkInput).toBeTruthy();

			await fireEvent.change(selectNetworkInput, { target: { value: "ARK D" } });
			await fireEvent.keyDown(selectNetworkInput, { key: "Enter", code: 13 });

			expect(selectNetworkInput).toHaveValue("ARK Devnet");

			let continueButton = getByTestId("ImportWallet__continue-button");

			expect(continueButton).toBeTruthy();
			expect(continueButton).not.toBeDisabled();

			await fireEvent.click(continueButton);

			await waitFor(() => {
				expect(getByTestId("ImportWallet__second-step")).toBeTruthy();
			});

			const passphraseInput = getByTestId("ImportWallet__mnemonic-input");
			expect(passphraseInput).toBeTruthy();

			await fireEvent.input(passphraseInput, { target: { value: mnemonic } });

			continueButton = getByTestId("ImportWallet__continue-button");

			expect(continueButton).toBeTruthy();
			await waitFor(() => {
				expect(continueButton).not.toBeDisabled();
			});

			await fireEvent.click(continueButton);

			await waitFor(() => {
				expect(getByTestId("EncryptPassword")).toBeTruthy();
			});

			await waitFor(() => {
				expect(getByTestId("ImportWallet__skip-button")).not.toBeDisabled();
			});

			await fireEvent.click(getByTestId("ImportWallet__skip-button"));

			await waitFor(() => {
				expect(getByTestId("ImportWallet__third-step")).toBeTruthy();
			});

			const submitButton = getByTestId("ImportWallet__save-button");
			expect(submitButton).toBeTruthy();
			await waitFor(() => {
				expect(submitButton).not.toHaveAttribute("disabled");
			});

			await fireEvent.click(submitButton);

			await waitFor(() => {
				expect(profile.wallets().findByAddress(identityAddress)).toBeTruthy();
			});
		});
	});

	it("should import by mnemonic and use encryption password", async () => {
		const history = createMemoryHistory();
		history.push(route);

		let rendered: RenderResult;

		await actAsync(async () => {
			rendered = renderWithRouter(
				<Route path="/profiles/:profileId/wallets/import">
					<ImportWallet />
				</Route>,
				{
					routes: [route],
					history,
				},
			);
			await waitFor(() => expect(rendered.getByTestId("NetworkStep")).toBeTruthy());
		});

		const { getByTestId, asFragment, getAllByTestId } = rendered;

		expect(asFragment()).toMatchSnapshot();

		await actAsync(async () => {
			const selectNetworkInput = getByTestId("SelectNetworkInput__input");
			expect(selectNetworkInput).toBeTruthy();

			await fireEvent.change(selectNetworkInput, { target: { value: "ARK D" } });
			await fireEvent.keyDown(selectNetworkInput, { key: "Enter", code: 13 });
			expect(selectNetworkInput).toHaveValue("ARK Devnet");

			const continueButton = getByTestId("ImportWallet__continue-button");

			expect(continueButton).toBeTruthy();
			expect(continueButton).not.toHaveAttribute("disabled");

			fireEvent.click(continueButton);

			await waitFor(() => {
				expect(getByTestId("ImportWallet__second-step")).toBeTruthy();
			});

			const passphraseInput = getByTestId("ImportWallet__mnemonic-input");
			expect(passphraseInput).toBeTruthy();

			fireEvent.input(passphraseInput, { target: { value: "some mnemonic" } });

			await waitFor(() => {
				expect(getByTestId("ImportWallet__continue-button")).not.toBeDisabled();
			});

			fireEvent.click(getByTestId("ImportWallet__continue-button"));

			await waitFor(() => {
				expect(getByTestId("EncryptPassword")).toBeTruthy();
			});

			const passwordInput = getAllByTestId("InputPassword")[0];
			const confirmPassword = getAllByTestId("InputPassword")[1];

			fireEvent.input(passwordInput, { target: { value: "password" } });
			fireEvent.input(confirmPassword, { target: { value: "password" } });

			await waitFor(() => {
				expect(confirmPassword).toHaveValue("password");
			});

			await waitFor(() => {
				expect(getByTestId("ImportWallet__continue-button")).not.toBeDisabled();
			});

			fireEvent.click(getByTestId("ImportWallet__continue-button"));

			await waitFor(() => {
				expect(getByTestId("ImportWallet__third-step")).toBeTruthy();
			});
		});
	});

	it("should import by address", async () => {
		const history = createMemoryHistory();
		history.push(route);

		let rendered: RenderResult;

		history.push(route);

		await actAsync(async () => {
			rendered = renderWithRouter(
				<Route path="/profiles/:profileId/wallets/import">
					<ImportWallet />
				</Route>,
				{
					routes: [route],
					history,
				},
			);
			await waitFor(() => expect(rendered.getByTestId("NetworkStep")).toBeTruthy());
		});

		const { getByTestId, queryByTestId, asFragment } = rendered;

		expect(asFragment()).toMatchSnapshot();

		await actAsync(async () => {
			const selectNetworkInput = getByTestId("SelectNetworkInput__input");
			expect(selectNetworkInput).toBeTruthy();

			await fireEvent.change(selectNetworkInput, { target: { value: "ARK D" } });
			await fireEvent.keyDown(selectNetworkInput, { key: "Enter", code: 13 });

			expect(selectNetworkInput).toHaveValue("ARK Devnet");

			let continueButton = getByTestId("ImportWallet__continue-button");

			expect(continueButton).toBeTruthy();
			expect(continueButton).not.toHaveAttribute("disabled");

			await fireEvent.click(continueButton);

			await waitFor(() => {
				expect(getByTestId("ImportWallet__second-step")).toBeTruthy();
			});

			act(() => {
				fireEvent.focus(screen.getByTestId("SelectDropdownInput__input"));
			});

			await waitFor(() => expect(screen.getByTestId("select-list__toggle-option-1")).toBeInTheDocument());

			act(() => {
				fireEvent.mouseDown(screen.getByTestId("select-list__toggle-option-1"));
			});

			await waitFor(() => expect(queryByTestId("ImportWallet__address-input")).toBeInTheDocument());
			const addressInput = getByTestId("ImportWallet__address-input");
			expect(addressInput).toBeTruthy();

			await fireEvent.input(addressInput, { target: { value: randomAddress } });

			continueButton = getByTestId("ImportWallet__continue-button");

			expect(continueButton).toBeTruthy();
			await waitFor(() => {
				expect(continueButton).not.toHaveAttribute("disabled");
			});

			await fireEvent.click(continueButton);

			await waitFor(() => {
				expect(getByTestId("ImportWallet__third-step")).toBeTruthy();
			});

			const submitButton = getByTestId("ImportWallet__save-button");
			expect(submitButton).toBeTruthy();
			await waitFor(() => {
				expect(submitButton).not.toHaveAttribute("disabled");
			});

			await fireEvent.click(submitButton);

			await waitFor(() => {
				expect(profile.wallets().findByAddress(randomAddress)).toBeTruthy();
			});
		});
	});

	it("should import by private key", async () => {
		const history = createMemoryHistory();
		history.push(route);

		let rendered: RenderResult;

		history.push(route);

		await actAsync(async () => {
			rendered = renderWithRouter(
				<Route path="/profiles/:profileId/wallets/import">
					<ImportWallet />
				</Route>,
				{
					routes: [route],
					history,
				},
			);
			await waitFor(() => expect(rendered.getByTestId("NetworkStep")).toBeTruthy());
		});

		const { getByTestId, queryByTestId, asFragment } = rendered;

		expect(asFragment()).toMatchSnapshot();

		await actAsync(async () => {
			const selectNetworkInput = getByTestId("SelectNetworkInput__input");
			expect(selectNetworkInput).toBeTruthy();

			await fireEvent.change(selectNetworkInput, { target: { value: "ARK D" } });
			await fireEvent.keyDown(selectNetworkInput, { key: "Enter", code: 13 });

			expect(selectNetworkInput).toHaveValue("ARK Devnet");

			let continueButton = getByTestId("ImportWallet__continue-button");

			expect(continueButton).toBeTruthy();
			expect(continueButton).not.toHaveAttribute("disabled");

			await fireEvent.click(continueButton);

			await waitFor(() => {
				expect(getByTestId("ImportWallet__second-step")).toBeTruthy();
			});

			act(() => {
				fireEvent.focus(screen.getByTestId("SelectDropdownInput__input"));
			});

			await waitFor(() => expect(screen.getByTestId("select-list__toggle-option-2")).toBeInTheDocument());

			act(() => {
				fireEvent.mouseDown(screen.getByTestId("select-list__toggle-option-2"));
			});

			await waitFor(() => expect(queryByTestId("ImportWallet__privatekey-input")).toBeInTheDocument());
			const privateKeyInput = getByTestId("ImportWallet__privatekey-input");
			expect(privateKeyInput).toBeTruthy();

			fireEvent.input(privateKeyInput, {
				target: { value: "invalid" },
			});

			await waitFor(() => expect(getByTestId("ImportWallet__continue-button")).toHaveAttribute("disabled"));

			await fireEvent.input(privateKeyInput, {
				target: { value: "1e089e3c5323ad80a90767bdd5907297b4138163f027097fd3bdbeab528d2d68" },
			});

			continueButton = getByTestId("ImportWallet__continue-button");

			expect(continueButton).toBeTruthy();
			await waitFor(() => {
				expect(continueButton).not.toHaveAttribute("disabled");
			});

			await fireEvent.click(continueButton);

			await waitFor(() => {
				expect(getByTestId("ImportWallet__third-step")).toBeTruthy();
			});

			const submitButton = getByTestId("ImportWallet__save-button");
			expect(submitButton).toBeTruthy();
			await waitFor(() => {
				expect(submitButton).not.toHaveAttribute("disabled");
			});

			await fireEvent.click(submitButton);

			await waitFor(() => {
				expect(profile.wallets().findByAddress("DDA5nM7KEqLeTtQKv5qGgcnc6dpNBKJNTS")).toBeTruthy();
			});
		});
	});

	it("should import by WIF", async () => {
		const history = createMemoryHistory();
		history.push(route);

		let rendered: RenderResult;

		history.push(route);

		await actAsync(async () => {
			rendered = renderWithRouter(
				<Route path="/profiles/:profileId/wallets/import">
					<ImportWallet />
				</Route>,
				{
					routes: [route],
					history,
				},
			);
			await waitFor(() => expect(rendered.getByTestId("NetworkStep")).toBeTruthy());
		});

		const { getByTestId, queryByTestId, asFragment } = rendered;

		await actAsync(async () => {
			const selectNetworkInput = getByTestId("SelectNetworkInput__input");
			expect(selectNetworkInput).toBeTruthy();

			await fireEvent.change(selectNetworkInput, { target: { value: "ARK D" } });
			await fireEvent.keyDown(selectNetworkInput, { key: "Enter", code: 13 });

			expect(selectNetworkInput).toHaveValue("ARK Devnet");

			let continueButton = getByTestId("ImportWallet__continue-button");

			expect(continueButton).toBeTruthy();
			expect(continueButton).not.toHaveAttribute("disabled");

			await fireEvent.click(continueButton);

			await waitFor(() => {
				expect(getByTestId("ImportWallet__second-step")).toBeTruthy();
			});

			act(() => {
				fireEvent.focus(screen.getByTestId("SelectDropdownInput__input"));
			});

			await waitFor(() => expect(screen.getByTestId("select-list__toggle-option-3")).toBeInTheDocument());

			act(() => {
				fireEvent.mouseDown(screen.getByTestId("select-list__toggle-option-3"));
			});

			await waitFor(() => expect(queryByTestId("ImportWallet__wif-input")).toBeInTheDocument());
			const wifInput = getByTestId("ImportWallet__wif-input");
			expect(wifInput).toBeTruthy();

			continueButton = getByTestId("ImportWallet__continue-button");

			fireEvent.input(wifInput, {
				target: { value: "invalid" },
			});

			await waitFor(() => expect(continueButton).toHaveAttribute("disabled"));

			await fireEvent.input(wifInput, {
				target: { value: "SHjn7G4NygZH5LHvuhbMSdgrn42vqu3LdYzjxUoh2E9b7PdVsBPs" },
			});

			expect(continueButton).toBeTruthy();
			await waitFor(() => {
				expect(continueButton).not.toHaveAttribute("disabled");
			});

			await fireEvent.click(continueButton);

			await waitFor(() => {
				expect(getByTestId("ImportWallet__third-step")).toBeTruthy();
			});

			const submitButton = getByTestId("ImportWallet__save-button");
			expect(submitButton).toBeTruthy();
			await waitFor(() => {
				expect(submitButton).not.toHaveAttribute("disabled");
			});

			await fireEvent.click(submitButton);

			await waitFor(() => {
				expect(profile.wallets().findByAddress("DDA5nM7KEqLeTtQKv5qGgcnc6dpNBKJNTS")).toBeTruthy();
			});
		});
	});

	it("should import by encrypted WIF", async () => {
		const history = createMemoryHistory();
		history.push(route);

		let rendered: RenderResult;

		history.push(route);

		await actAsync(async () => {
			rendered = renderWithRouter(
				<Route path="/profiles/:profileId/wallets/import">
					<ImportWallet />
				</Route>,
				{
					routes: [route],
					history,
				},
			);
			await waitFor(() => expect(rendered.getByTestId("NetworkStep")).toBeTruthy());
		});

		const { getByTestId, queryByTestId, asFragment } = rendered;

		expect(asFragment()).toMatchSnapshot();

		await actAsync(async () => {
			const selectNetworkInput = getByTestId("SelectNetworkInput__input");
			expect(selectNetworkInput).toBeTruthy();

			await fireEvent.change(selectNetworkInput, { target: { value: "ARK D" } });
			await fireEvent.keyDown(selectNetworkInput, { key: "Enter", code: 13 });

			expect(selectNetworkInput).toHaveValue("ARK Devnet");

			let continueButton = getByTestId("ImportWallet__continue-button");

			expect(continueButton).toBeTruthy();
			expect(continueButton).not.toHaveAttribute("disabled");

			await fireEvent.click(continueButton);

			await waitFor(() => {
				expect(getByTestId("ImportWallet__second-step")).toBeTruthy();
			});

			act(() => {
				fireEvent.focus(screen.getByTestId("SelectDropdownInput__input"));
			});

			await waitFor(() => expect(screen.getByTestId("select-list__toggle-option-4")).toBeInTheDocument());

			act(() => {
				fireEvent.mouseDown(screen.getByTestId("select-list__toggle-option-4"));
			});

			await waitFor(() => expect(queryByTestId("ImportWallet__encryptedWif-input")).toBeInTheDocument());

			await fireEvent.input(getByTestId("ImportWallet__encryptedWif-input"), {
				target: { value: "6PYR8Zq7e84mKXq3kxZyrZ8Zyt6iE89fCngdMgibQ5HjCd7Bt3k7wKc4ZL" },
			});

			await fireEvent.input(getByTestId("ImportWallet__encryptedWif__password-input"), {
				target: { value: "password" },
			});

			continueButton = getByTestId("ImportWallet__continue-button");

			expect(continueButton).toBeTruthy();
			await waitFor(() => {
				expect(continueButton).not.toHaveAttribute("disabled");
			});

			await fireEvent.click(continueButton);

			await waitFor(() => expect(queryByTestId("ImportWallet__third-step")).toBeInTheDocument(), {
				timeout: 15000,
			});

			const submitButton = getByTestId("ImportWallet__save-button");
			expect(submitButton).toBeTruthy();
			await waitFor(() => {
				expect(submitButton).not.toHaveAttribute("disabled");
			});

			await fireEvent.click(submitButton);

			await waitFor(() => {
				expect(profile.wallets().findByAddress("D61mfSggzbvQgTUe6JhYKH2doHaqJ3Dyib")).toBeTruthy();
			});
		});
	});

	it("should fail to import by encrypted WIF", async () => {
		const toastSpy = jest.spyOn(toasts, "error").mockImplementation();

		const history = createMemoryHistory();
		history.push(route);

		let rendered: RenderResult;

		history.push(route);

		await actAsync(async () => {
			rendered = renderWithRouter(
				<Route path="/profiles/:profileId/wallets/import">
					<ImportWallet />
				</Route>,
				{
					routes: [route],
					history,
				},
			);
			await waitFor(() => expect(rendered.getByTestId("NetworkStep")).toBeTruthy());
		});

		const { getByTestId, queryByTestId, asFragment } = rendered;

		expect(asFragment()).toMatchSnapshot();

		await actAsync(async () => {
			const selectNetworkInput = getByTestId("SelectNetworkInput__input");
			expect(selectNetworkInput).toBeTruthy();

			await fireEvent.change(selectNetworkInput, { target: { value: "ARK D" } });
			await fireEvent.keyDown(selectNetworkInput, { key: "Enter", code: 13 });

			expect(selectNetworkInput).toHaveValue("ARK Devnet");

			let continueButton = getByTestId("ImportWallet__continue-button");

			expect(continueButton).toBeTruthy();
			expect(continueButton).not.toHaveAttribute("disabled");

			await fireEvent.click(continueButton);

			await waitFor(() => {
				expect(getByTestId("ImportWallet__second-step")).toBeTruthy();
			});

			act(() => {
				fireEvent.focus(screen.getByTestId("SelectDropdownInput__input"));
			});

			await waitFor(() => expect(screen.getByTestId("select-list__toggle-option-4")).toBeInTheDocument());

			act(() => {
				fireEvent.mouseDown(screen.getByTestId("select-list__toggle-option-4"));
			});

			await waitFor(() => expect(queryByTestId("ImportWallet__encryptedWif-input")).toBeInTheDocument());

			await fireEvent.input(getByTestId("ImportWallet__encryptedWif-input"), {
				target: { value: "6PYR8Zq7e84mKXq3kxZyrZ8Zyt6iE89fCngdMgibQ5HjCd7Bt3k7wKc4ZL" },
			});

			await fireEvent.input(getByTestId("ImportWallet__encryptedWif__password-input"), {
				target: { value: "wrong-password" },
			});

			continueButton = getByTestId("ImportWallet__continue-button");

			expect(continueButton).toBeTruthy();
			await waitFor(() => {
				expect(continueButton).not.toHaveAttribute("disabled");
			});

			await fireEvent.click(continueButton);

			await waitFor(() => expect(queryByTestId("ImportWallet__third-step")).not.toBeInTheDocument(), {
				timeout: 15000,
			});
		});

		await waitFor(() =>
			expect(toastSpy).toHaveBeenCalledWith("Failed to decrypt WIF. Please check your password."),
		);
		toastSpy.mockRestore();
	});

	it("should import by address and name", async () => {
		const networkMock = jest.spyOn(env, "availableNetworks").mockReturnValue([
			new Coins.Network("ARK", {
				id: "ark.devnet",
				type: "test",
				name: "ARK Devnet",
				explorer: "https://dexplorer.ark.io/",
				currency: { ticker: "DARK", symbol: "DѦ" },
				crypto: { slip44: 111 },
				networking: { hosts: ["https://dwallets.ark.io"], hostsMultiSignature: [] },
				governance: { voting: { enabled: false, maximumPerWallet: 1, maximumPerTransaction: 1 } },
			}),
		]);

		const history = createMemoryHistory();
		history.push(route);

		const { getByTestId, queryByTestId } = renderWithRouter(
			<Route path="/profiles/:profileId/wallets/import">
				<ImportWallet />
			</Route>,
			{
				routes: [route],
				history,
			},
		);

		await waitFor(() => expect(getByTestId("NetworkStep")).toBeTruthy());

		const selectNetworkInput = getByTestId("SelectNetworkInput__input");

		fireEvent.change(selectNetworkInput, { target: { value: "ARK D" } });
		fireEvent.keyDown(selectNetworkInput, { key: "Enter", code: 13 });

		expect(selectNetworkInput).toHaveValue("ARK Devnet");

		await waitFor(() => expect(getByTestId("ImportWallet__continue-button")).not.toBeDisabled());
		fireEvent.click(getByTestId("ImportWallet__continue-button"));

		expect(getByTestId("ImportWallet__second-step")).toBeTruthy();

		actAsync(() => {
			fireEvent.focus(getByTestId("SelectDropdownInput__input"));
		});

		await waitFor(() => expect(getByTestId("select-list__toggle-option-1")).toBeInTheDocument());

		actAsync(() => {
			fireEvent.mouseDown(getByTestId("select-list__toggle-option-1"));
		});
		await waitFor(() => expect(queryByTestId("ImportWallet__address-input")).toBeInTheDocument());
		const addressInput = getByTestId("ImportWallet__address-input");
		expect(addressInput).toBeTruthy();

		await fireEvent.input(addressInput, { target: { value: randomAddress } });

		await waitFor(() => expect(getByTestId("ImportWallet__continue-button")).not.toBeDisabled());
		fireEvent.click(getByTestId("ImportWallet__continue-button"));

		await waitFor(() => {
			expect(getByTestId("ImportWallet__third-step")).toBeTruthy();
		});

		const alias = "Test";

		const historySpy = jest.spyOn(history, "push").mockImplementation();

		fireEvent.input(getByTestId("ImportWallet__name-input"), { target: { value: alias } });

		await actAsync(async () => {
			fireEvent.submit(getByTestId("ImportWallet__name-input"), { key: "Enter", code: 13 });
		});

		expect(historySpy).toHaveBeenCalledWith(`/profiles/${profile.id()}/wallets/${profile.wallets().last().id()}`);

		await waitFor(() => {
			expect(profile.wallets().findByAlias(alias)).toBeTruthy();
		});

		historySpy.mockRestore();
		networkMock.mockRestore();
	});

	it("should show an error message for invalid address", async () => {
		const history = createMemoryHistory();
		history.push(route);

		let rendered: RenderResult;

		history.push(route);

		await actAsync(async () => {
			rendered = renderWithRouter(
				<Route path="/profiles/:profileId/wallets/import">
					<ImportWallet />
				</Route>,
				{
					routes: [route],
					history,
				},
			);
			await waitFor(() => expect(rendered.getByTestId("NetworkStep")).toBeTruthy());
		});

		const { getByTestId, asFragment, queryByTestId } = rendered;

		expect(asFragment()).toMatchSnapshot();

		await actAsync(async () => {
			const selectNetworkInput = getByTestId("SelectNetworkInput__input");
			expect(selectNetworkInput).toBeTruthy();

			await fireEvent.change(selectNetworkInput, { target: { value: "ARK D" } });
			await fireEvent.keyDown(selectNetworkInput, { key: "Enter", code: 13 });

			expect(selectNetworkInput).toHaveValue("ARK Devnet");

			let continueButton = getByTestId("ImportWallet__continue-button");

			expect(continueButton).toBeTruthy();
			expect(continueButton).not.toHaveAttribute("disabled");

			await fireEvent.click(continueButton);

			await waitFor(() => {
				expect(getByTestId("ImportWallet__second-step")).toBeTruthy();
			});

			act(() => {
				fireEvent.focus(screen.getByTestId("SelectDropdownInput__input"));
			});

			await waitFor(() => expect(screen.getByTestId("select-list__toggle-option-1")).toBeInTheDocument());

			act(() => {
				fireEvent.mouseDown(screen.getByTestId("select-list__toggle-option-1"));
			});
			await waitFor(() => expect(queryByTestId("ImportWallet__address-input")).toBeInTheDocument());

			const addressInput = getByTestId("ImportWallet__address-input");
			expect(addressInput).toBeTruthy();

			await fireEvent.input(addressInput, { target: { value: "123" } });

			await waitFor(() => {
				expect(getByTestId("Input__error")).toBeVisible();
			});

			continueButton = getByTestId("ImportWallet__continue-button");

			expect(continueButton).toBeTruthy();
			await waitFor(() => {
				expect(continueButton).toBeDisabled();
			});
		});
	});

	it("should show an error message for duplicate address", async () => {
		const history = createMemoryHistory();
		history.push(route);

		let rendered: RenderResult;

		history.push(route);

		await actAsync(async () => {
			rendered = renderWithRouter(
				<Route path="/profiles/:profileId/wallets/import">
					<ImportWallet />
				</Route>,
				{
					routes: [route],
					history,
				},
			);
			await waitFor(() => expect(rendered.getByTestId("NetworkStep")).toBeTruthy());
		});

		const { getByTestId, asFragment, queryByTestId } = rendered;

		expect(asFragment()).toMatchSnapshot();

		await actAsync(async () => {
			const selectNetworkInput = getByTestId("SelectNetworkInput__input");
			expect(selectNetworkInput).toBeTruthy();

			await fireEvent.change(selectNetworkInput, { target: { value: "ARK D" } });
			await fireEvent.keyDown(selectNetworkInput, { key: "Enter", code: 13 });

			expect(selectNetworkInput).toHaveValue("ARK Devnet");

			let continueButton = getByTestId("ImportWallet__continue-button");

			expect(continueButton).toBeTruthy();
			expect(continueButton).not.toHaveAttribute("disabled");

			await fireEvent.click(continueButton);

			await waitFor(() => {
				expect(getByTestId("ImportWallet__second-step")).toBeTruthy();
			});

			const passphraseInput = getByTestId("ImportWallet__mnemonic-input");
			expect(passphraseInput).toBeTruthy();

			await fireEvent.input(passphraseInput, { target: { value: mnemonic } });

			await waitFor(() => {
				expect(getByTestId("Input__error")).toBeVisible();
			});

			act(() => {
				fireEvent.focus(screen.getByTestId("SelectDropdownInput__input"));
			});

			await waitFor(() => expect(screen.getByTestId("select-list__toggle-option-1")).toBeInTheDocument());

			act(() => {
				fireEvent.mouseDown(screen.getByTestId("select-list__toggle-option-1"));
			});
			await waitFor(() => expect(queryByTestId("ImportWallet__address-input")).toBeInTheDocument());

			const addressInput = getByTestId("ImportWallet__address-input");
			expect(addressInput).toBeTruthy();

			await fireEvent.input(addressInput, { target: { value: identityAddress } });

			await waitFor(() => {
				expect(getByTestId("Input__error")).toBeVisible();
			});

			continueButton = getByTestId("ImportWallet__continue-button");

			expect(continueButton).toBeTruthy();
			await waitFor(() => {
				expect(continueButton).toBeDisabled();
			});
		});
	});

	it("should show an error message for duplicate name", async () => {
		const history = createMemoryHistory();
		history.push(route);

		let rendered: RenderResult;

		history.push(route);

		await actAsync(async () => {
			rendered = renderWithRouter(
				<Route path="/profiles/:profileId/wallets/import">
					<ImportWallet />
				</Route>,
				{
					routes: [route],
					history,
				},
			);
			await waitFor(() => expect(rendered.getByTestId("NetworkStep")).toBeTruthy());
		});

		const { getByTestId, asFragment, getByText } = rendered;

		expect(asFragment()).toMatchSnapshot();

		await actAsync(async () => {
			const selectNetworkInput = getByTestId("SelectNetworkInput__input");
			expect(selectNetworkInput).toBeTruthy();

			await fireEvent.change(selectNetworkInput, { target: { value: "ARK D" } });
			await fireEvent.keyDown(selectNetworkInput, { key: "Enter", code: 13 });

			expect(selectNetworkInput).toHaveValue("ARK Devnet");

			let continueButton = getByTestId("ImportWallet__continue-button");

			expect(continueButton).toBeTruthy();
			expect(continueButton).not.toHaveAttribute("disabled");

			await fireEvent.click(continueButton);

			await waitFor(() => {
				expect(getByTestId("ImportWallet__second-step")).toBeTruthy();
			});

			const passphraseInput = getByTestId("ImportWallet__mnemonic-input");
			expect(passphraseInput).toBeTruthy();

			await fireEvent.input(passphraseInput, { target: { value: "this is a top secret passphrase" } });

			continueButton = getByTestId("ImportWallet__continue-button");

			expect(continueButton).toBeTruthy();
			await waitFor(() => {
				expect(continueButton).not.toHaveAttribute("disabled");
			});

			await fireEvent.click(continueButton);

			await waitFor(() => {
				expect(getByTestId("EncryptPassword")).toBeTruthy();
			});

			await fireEvent.click(getByTestId("ImportWallet__skip-button"));

			await waitFor(() => {
				expect(getByTestId("ImportWallet__third-step")).toBeTruthy();
			});

			const walletNameInput = getByTestId("ImportWallet__name-input");
			expect(walletNameInput).toBeTruthy();

			await fireEvent.input(walletNameInput, { target: { value: profile.wallets().first().alias() } });

			const submitButton = getByTestId("ImportWallet__save-button");

			expect(submitButton).toBeTruthy();
			await waitFor(() => {
				expect(submitButton).toBeDisabled();
			});
		});
	});

	it("should render as ledger import", async () => {
		const transport: typeof Transport = createTransportReplayer(RecordStore.fromString(""));
		let observer: Observer<any>;
		jest.spyOn(transport, "listen").mockImplementationOnce((obv) => {
			observer = obv;
			return { unsubscribe: jest.fn() };
		});

		const history = createMemoryHistory();

		history.push({
			pathname: route,
			search: `?ledger=true`,
		});

		const { getByTestId, container } = renderWithRouter(
			<Route path="/profiles/:profileId/wallets/import">
				<LedgerProvider transport={transport}>
					<ImportWallet />
				</LedgerProvider>
			</Route>,
			{
				routes: [route],
				history,
			},
		);

		expect(container).toMatchSnapshot();
		await waitFor(() => expect(getByTestId("LedgerTabs")).toBeInTheDocument());
	});
});
