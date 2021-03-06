/* eslint-disable @typescript-eslint/require-await */
import { Contracts } from "@arkecosystem/platform-sdk-profiles";
import { env } from "utils/testing-library";

import { authentication } from "./Authentication";

let translationMock: any;
let wallet: Contracts.IReadWriteWallet;
let walletWithPassword: Contracts.IReadWriteWallet;

describe("Authentication", () => {
	beforeAll(async () => {
		jest.useFakeTimers();

		translationMock = jest.fn((i18nString: string) => i18nString);

		wallet = await env.profiles().first().wallets().importByMnemonic("test", "ARK", "ark.devnet");
		walletWithPassword = await env
			.profiles()
			.first()
			.wallets()
			.importByMnemonicWithEncryption("test2", "ARK", "ark.devnet", "password");
	});

	afterAll(() => {
		jest.clearAllTimers();
	});

	it("should validate mnemonic", () => {
		const fromWifMock = jest
			.spyOn(wallet.coin().identity().address(), "fromWIF")
			.mockResolvedValue(wallet.address());

		const mnemonic = authentication(translationMock).mnemonic(wallet.coin(), wallet.address());
		expect(mnemonic.validate.matchSenderAddress("test")).resolves.toBe(true);

		fromWifMock.mockRestore();
	});

	it("should fail mnemonic validation", () => {
		const mnemonic = authentication(translationMock).mnemonic(wallet.coin(), wallet.address());
		expect(mnemonic.validate.matchSenderAddress("test2")).resolves.toBe(
			"COMMON.INPUT_PASSPHRASE.VALIDATION.MNEMONIC_NOT_MATCH_WALLET",
		);
	});

	it("should validate encryption password", () => {
		const wif = "SCoAuLqLrD6rfSBVhgcLqbdLKz2Gum2j4JR7pvLyiKaK9oiUfobg";
		const walletWifMock = jest.spyOn(walletWithPassword, "wif").mockResolvedValue(wif);

		const encryptionPassword = authentication(translationMock).encryptionPassword(walletWithPassword);
		expect(encryptionPassword.validate("password")).resolves.toBe(true);
		jest.runAllTimers();

		walletWifMock.mockRestore();
	});

	it("should fail validation for encryption password", () => {
		const walletWifMock = jest
			.spyOn(walletWithPassword, "wif")
			.mockImplementation(() => Promise.reject(new Error("failed")));

		const fromWifMock = jest
			.spyOn(walletWithPassword.coin().identity().address(), "fromWIF")
			.mockImplementation(() => Promise.resolve(walletWithPassword.address()));

		const encryptionPassword = authentication(translationMock).encryptionPassword(walletWithPassword);
		expect(encryptionPassword.validate(walletWithPassword.address())).resolves.toBe(
			"COMMON.INPUT_PASSPHRASE.VALIDATION.PASSWORD_NOT_MATCH_WALLET",
		);
		jest.runAllTimers();

		expect(encryptionPassword.validate("wrong password")).resolves.toBe(
			"COMMON.INPUT_PASSPHRASE.VALIDATION.PASSWORD_NOT_MATCH_WALLET",
		);

		jest.runAllTimers();

		fromWifMock.mockRestore();
		walletWifMock.mockRestore();
	});

	it("should validate second mnemonic", () => {
		const secondMnemonic = authentication(translationMock).secondMnemonic(
			wallet.coin(),
			//@ts-ignore
			wallet.publicKey()?.toString(),
		);
		expect(secondMnemonic.validate.matchSenderPublicKey("test")).resolves.toBe(true);
	});

	it("should fail validation for second mnemonic", () => {
		const secondMnemonic = authentication(translationMock).secondMnemonic(wallet.coin(), wallet.address());
		expect(secondMnemonic.validate.matchSenderPublicKey("test")).resolves.toBe(
			"COMMON.INPUT_PASSPHRASE.VALIDATION.MNEMONIC_NOT_MATCH_WALLET",
		);
	});
});
