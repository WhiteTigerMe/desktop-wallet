import { act, renderHook } from "@testing-library/react-hooks";
import { EnvironmentProvider } from "app/contexts";
import { PluginManager, PluginManagerProvider } from "plugins";
import React from "react";
import { env, waitFor } from "utils/testing-library";

import { useEnvSynchronizer } from "./use-env-synchronizer";

describe("useEnvSynchronizer", () => {
	it("should sync env scope jobs", async () => {
		const wrapper = ({ children }: any) => (
			<EnvironmentProvider env={env}>
				<PluginManagerProvider services={[]} manager={new PluginManager()}>
					{children}
				</PluginManagerProvider>
			</EnvironmentProvider>
		);
		const { result } = renderHook(() => useEnvSynchronizer(), { wrapper });

		await waitFor(() => expect(result.current.start).toBeDefined());
		await waitFor(() => expect(result.current.stop).toBeDefined());
		await waitFor(() => expect(result.current.runAll).toBeDefined());

		const consoleSpy = jest.spyOn(console, "log").mockReturnValue(undefined);
		await act(async () => {
			await waitFor(() => expect(result.current.runAll()).resolves);
		});

		consoleSpy.mockRestore();
	});
});
