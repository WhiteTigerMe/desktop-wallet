/* eslint-disable @typescript-eslint/require-await */
import { Contracts } from "@arkecosystem/platform-sdk-profiles";
import { translations as commonTranslations } from "app/i18n/common/i18n";
import { createMemoryHistory } from "history";
import nock from "nock";
import React from "react";
import { Route } from "react-router-dom";
import {
	act,
	env,
	fireEvent,
	getDefaultProfileId,
	renderWithRouter,
	syncDelegates,
	useDefaultNetMocks,
	waitFor,
	within,
} from "utils/testing-library";

import { Transactions } from "./Transactions";

const history = createMemoryHistory();
let profile: Contracts.IProfile;

const fixtureProfileId = getDefaultProfileId();
let dashboardURL: string;

describe("Transactions", () => {
	beforeAll(async () => {
		useDefaultNetMocks();

		nock("https://neoscan.io/api/main_net/v1/")
			.get("/get_last_transactions_by_address/AdVSe37niA3uFUPgCgMUH2tMsHF4LpLoiX/1")
			.reply(200, []);

		const emptyResponse = {
			meta: {},
			data: [],
		};

		nock("https://dwallets.ark.io")
			.get("/api/transactions?limit=30&address=D8rr7B1d6TL6pf14LgMz4sKp1VBMs6YUYD&type=5&typeGroup=2")
			.reply(200, () => emptyResponse)
			.get("/api/transactions?limit=30&address=D5sRKWckH4rE1hQ9eeMeHAepgyC3cvJtwb&type=5&typeGroup=2")
			.reply(200, () => emptyResponse)
			.persist();

		nock("https://dwallets.ark.io")
			.get("/api/transactions?page=2&limit=30&address=D8rr7B1d6TL6pf14LgMz4sKp1VBMs6YUYD")
			.reply(200, () => emptyResponse)
			.get("/api/transactions?page=2&limit=30&address=D5sRKWckH4rE1hQ9eeMeHAepgyC3cvJtwb")
			.reply(200, () => emptyResponse)
			.persist();

		nock("https://dwallets.ark.io")
			.get("/api/transactions")
			.query(true)
			.reply(200, () => {
				const { meta, data } = require("tests/fixtures/coins/ark/devnet/transactions.json");
				return {
					meta,
					data: data.slice(0, 2),
				};
			})
			.persist();

		profile = env.profiles().findById(fixtureProfileId);

		await syncDelegates();
	});

	beforeEach(() => {
		dashboardURL = `/profiles/${fixtureProfileId}/dashboard`;
		history.push(dashboardURL);
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.clearAllTimers();
	});

	it("should render", async () => {
		const { asFragment, getByTestId } = renderWithRouter(
			<Route path="/profiles/:profileId/dashboard">
				<Transactions profile={profile} wallets={profile.wallets().values()} />
			</Route>,
			{
				routes: [dashboardURL],
				history,
			},
		);

		await waitFor(
			() => expect(within(getByTestId("TransactionTable")).getAllByTestId("TableRow")).toHaveLength(4),
			{ timeout: 4000 },
		);
		expect(asFragment()).toMatchSnapshot();
	});

	it("should render hidden", async () => {
		const { asFragment } = renderWithRouter(
			<Route path="/profiles/:profileId/dashboard" isVisible={false}>
				<Transactions profile={profile} wallets={profile.wallets().values()} isVisible={false} />
			</Route>,
			{
				routes: [dashboardURL],
				history,
			},
		);

		expect(asFragment()).toMatchSnapshot();
	});

	it("should filter by type", async () => {
		const { getByRole, getByTestId } = renderWithRouter(
			<Route path="/profiles/:profileId/dashboard">
				<Transactions profile={profile} wallets={profile.wallets().values()} />
			</Route>,
			{
				routes: [dashboardURL],
				history,
			},
		);

		await waitFor(
			() => expect(within(getByTestId("TransactionTable")).getAllByTestId("TableRow")).toHaveLength(4),
			{ timeout: 4000 },
		);

		expect(getByRole("button", { name: /Type/ })).toBeInTheDocument();

		act(() => {
			fireEvent.click(getByRole("button", { name: /Type/ }));
		});

		await waitFor(() => expect(getByTestId("dropdown__option--core-0")).toBeInTheDocument());

		act(() => {
			fireEvent.click(getByTestId("dropdown__option--core-0"));
		});

		await waitFor(() => expect(within(getByTestId("TransactionTable")).getAllByTestId("TableRow")).toHaveLength(4));
	});

	it("should filter by type and see empty screen", async () => {
		const emptyProfile = env.profiles().create("test");
		await emptyProfile.wallets().importByMnemonic("test", "ARK", "ark.devnet");

		const { getByRole, getByTestId } = renderWithRouter(
			<Route path="/profiles/:profileId/dashboard">
				<Transactions profile={profile} wallets={profile.wallets().values()} />
			</Route>,
			{
				routes: [dashboardURL],
				history,
			},
		);

		expect(getByRole("button", { name: /Type/ })).toBeInTheDocument();

		act(() => {
			fireEvent.click(getByRole("button", { name: /Type/ }));
		});

		await waitFor(() => expect(getByTestId("dropdown__option--core-2")).toBeInTheDocument());

		act(() => {
			fireEvent.click(getByTestId("dropdown__option--core-2"));
		});

		await waitFor(() => expect(getByTestId("EmptyResults")).toBeInTheDocument());
	});

	it("should open detail modal on transaction row click", async () => {
		const { asFragment, getByTestId } = renderWithRouter(
			<Route path="/profiles/:profileId/dashboard">
				<Transactions profile={profile} wallets={profile.wallets().values()} />
			</Route>,
			{
				routes: [dashboardURL],
				history,
			},
		);

		await waitFor(
			() => expect(within(getByTestId("TransactionTable")).getAllByTestId("TableRow")).toHaveLength(4),
			{ timeout: 4000 },
		);

		act(() => {
			fireEvent.click(within(getByTestId("TransactionTable")).getAllByTestId("TableRow")[0]);
		});

		await waitFor(() => {
			expect(getByTestId("modal__inner")).toBeInTheDocument();
		});

		act(() => {
			fireEvent.click(getByTestId("modal__close-btn"));
		});

		expect(asFragment()).toMatchSnapshot();
	});

	it("should fetch more transactions", async () => {
		const { asFragment, getByTestId } = renderWithRouter(
			<Route path="/profiles/:profileId/dashboard">
				<Transactions profile={profile} isLoading={false} wallets={profile.wallets().values()} />
			</Route>,
			{
				routes: [dashboardURL],
				history,
			},
		);

		await waitFor(() => {
			expect(getByTestId("transactions__fetch-more-button")).toHaveTextContent(commonTranslations.VIEW_MORE);
			expect(within(getByTestId("TransactionTable")).getAllByTestId("TableRow")).toHaveLength(4);
		});

		act(() => {
			fireEvent.click(getByTestId("transactions__fetch-more-button"));
		});

		expect(getByTestId("transactions__fetch-more-button")).toHaveTextContent(commonTranslations.LOADING);

		await waitFor(() => {
			expect(getByTestId("transactions__fetch-more-button")).toHaveTextContent(commonTranslations.VIEW_MORE);
			expect(within(getByTestId("TransactionTable")).getAllByTestId("TableRow")).toHaveLength(4);
		});

		expect(asFragment()).toMatchSnapshot();
	});

	it("should show loading state if set", async () => {
		const { getByTestId } = renderWithRouter(
			<Route path="/profiles/:profileId/dashboard">
				<Transactions isLoading={true} profile={profile} wallets={profile.wallets().values()} />
			</Route>,
			{
				routes: [dashboardURL],
				history,
			},
		);

		await waitFor(() => {
			expect(within(getByTestId("TransactionTable")).getAllByTestId("TableRow")).toHaveLength(8);
		});
	});

	it("should abort previous request", async () => {
		nock.cleanAll();
		const { meta, data } = require("tests/fixtures/coins/ark/devnet/transactions.json");

		const scope = nock("https://dwallets.ark.io")
			.get("/api/transactions")
			.query(true)
			.reply(200, () => ({
				meta,
				data: data.slice(0, 4),
			}))
			.get("/api/transactions")
			.query((params) => !!params.senderId)
			.delayBody(500)
			.reply(200, () => ({
				meta,
				data: data.slice(0, 1),
			}))
			.get("/api/transactions")
			.query((params) => !!params.recipientId)
			.reply(200, () => ({
				meta,
				data: data.slice(0, 3),
			}));

		const { getAllByTestId, getByTestId } = renderWithRouter(
			<Route path="/profiles/:profileId/dashboard">
				<Transactions profile={profile} isLoading={false} wallets={profile.wallets().values()} />
			</Route>,
			{
				routes: [dashboardURL],
				history,
			},
		);

		await waitFor(() => expect(getAllByTestId("TableRow")).toHaveLength(4), { timeout: 500 });

		fireEvent.click(getByTestId("tabs__tab-button-received"));
		fireEvent.click(getByTestId("tabs__tab-button-sent"));

		await waitFor(() => expect(getAllByTestId("TableRow")).toHaveLength(1), { timeout: 1000 });
	});

	it("should filter by mode", async () => {
		const { getByTestId } = renderWithRouter(
			<Route path="/profiles/:profileId/dashboard">
				<Transactions profile={profile} wallets={profile.wallets().values()} />
			</Route>,
			{
				routes: [dashboardURL],
				history,
			},
		);

		await waitFor(() => expect(within(getByTestId("TransactionTable")).getAllByTestId("TableRow")).toHaveLength(4));

		act(() => {
			fireEvent.click(getByTestId("tabs__tab-button-sent"));
		});

		await waitFor(() => expect(within(getByTestId("TransactionTable")).getAllByTestId("TableRow")).toHaveLength(1));
	});

	it("should ignore tab change on loading state", async () => {
		const { getByTestId } = renderWithRouter(
			<Route path="/profiles/:profileId/dashboard">
				<Transactions profile={profile} wallets={profile.wallets().values()} isLoading={true} />
			</Route>,
			{
				routes: [dashboardURL],
				history,
			},
		);

		await waitFor(() => expect(within(getByTestId("TransactionTable")).getAllByTestId("TableRow")).toHaveLength(8));

		act(() => {
			fireEvent.click(getByTestId("tabs__tab-button-sent"));
		});

		await waitFor(() => expect(within(getByTestId("TransactionTable")).getAllByTestId("TableRow")).toHaveLength(8));
	});

	it("should show empty message", async () => {
		const emptyProfile = env.profiles().create("test-empty");
		const emptyProfileURL = `/profiles/${emptyProfile.id()}/dashboard`;

		history.push(emptyProfileURL);
		const { getByTestId } = renderWithRouter(
			<Route path="/profiles/:profileId/dashboard">
				<Transactions profile={emptyProfile} wallets={[]} />
			</Route>,
			{
				routes: [emptyProfileURL],
				history,
			},
		);

		await waitFor(() => expect(getByTestId("EmptyBlock")).toBeInTheDocument());
	});
});
