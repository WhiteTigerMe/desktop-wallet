import { Contracts, Environment } from "@arkecosystem/platform-sdk-profiles";

type WalletImportTypes = {
	profile: Contracts.IProfile;
	env: Environment;
};

export const useWalletSync = ({ profile, env }: WalletImportTypes) => {
	const syncFees = async (wallet: Contracts.IReadWriteWallet) => {
		const network = wallet.network();
		try {
			env.fees().all(network.coin(), network.id());
		} catch {
			// Sync network fees for the first time
			await env.fees().sync(network.coin(), network.id());
		}
	};

	const syncRates = (profile: Contracts.IProfile, wallet: Contracts.IReadWriteWallet) =>
		env.exchangeRates().syncAll(profile, wallet.currency());

	const syncVotes = async (wallet: Contracts.IReadWriteWallet) => {
		const network = wallet.network();

		if (network.allowsVoting()) {
			try {
				env.delegates().all(network.coin(), network.id());
			} catch {
				// Sync network delegates for the first time
				await env.delegates().sync(network.coin(), network.id());
			}
			await wallet.syncVotes();
		}
	};

	const syncAll = async (wallet: Contracts.IReadWriteWallet) =>
		Promise.allSettled([syncVotes(wallet), syncRates(profile, wallet), syncFees(wallet)]);

	return { syncAll };
};
