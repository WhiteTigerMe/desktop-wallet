import { Contracts } from "@arkecosystem/platform-sdk-profiles";
import { sortByDesc } from "@arkecosystem/utils";
import { snakeCase } from "@arkecosystem/utils";
import { Button } from "app/components/Button";
import { EmptyBlock } from "app/components/EmptyBlock";
import { Header } from "app/components/Header";
import { HeaderSearchBar } from "app/components/Header/HeaderSearchBar";
import { Icon } from "app/components/Icon";
import { Page, Section } from "app/components/Layout";
import { useEnvironmentContext } from "app/contexts";
import { useActiveProfile } from "app/hooks";
import { InstallPlugin } from "domains/plugin/components/InstallPlugin";
import { PluginGrid } from "domains/plugin/components/PluginGrid";
import { PluginList } from "domains/plugin/components/PluginList";
import { PluginManagerNavigationBar } from "domains/plugin/components/PluginManagerNavigationBar";
import { PluginManualInstallModal } from "domains/plugin/components/PluginManualInstallModal/PluginManualInstallModal";
import { PluginUninstallConfirmation } from "domains/plugin/components/PluginUninstallConfirmation/PluginUninstallConfirmation";
import { PluginUpdatesConfirmation } from "domains/plugin/components/PluginUpdatesConfirmation";
import { usePluginUpdateQueue } from "domains/plugin/hooks/use-plugin-update-queue";
import { PluginController, usePluginManagerContext } from "plugins";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";

const categories = ["gaming", "utility", "exchange", "other"];

type LatestPluginsProps = {
	onCurrentViewChange: (view: string) => void;
	onDelete: any;
	onSelect: (pluginId: string) => void;
	onEnable: (plugin: any) => void;
	onDisable: (plugin: any) => void;
	onInstall: any;
	onLaunch: (plugin: any) => void;
	viewType: string;
	isLoading?: boolean;
	pluginsByCategory: Record<string, any[]>;
};

const LatestPlugins = ({
	onCurrentViewChange,
	onDelete,
	onSelect,
	onInstall,
	onLaunch,
	viewType,
	pluginsByCategory,
	onEnable,
	onDisable,
	isLoading,
}: LatestPluginsProps) => {
	const { t } = useTranslation();

	const renderPlugins = (plugins: any[], category: string) => {
		if (viewType === "grid") {
			return (
				<PluginGrid
					category={category}
					plugins={plugins}
					onSelect={onSelect}
					onEnable={onEnable}
					onDisable={onDisable}
					onDelete={onDelete}
					onInstall={onInstall}
					onLaunch={onLaunch}
					showPagination={false}
					isLoading={isLoading}
				/>
			);
		}

		return (
			<PluginList
				plugins={plugins}
				onClick={onSelect}
				onLaunch={onLaunch}
				onInstall={onInstall}
				onEnable={onEnable}
				onDisable={onDisable}
				onDelete={onDelete}
				showPagination={false}
			/>
		);
	};

	return (
		<>
			{categories.map((category: string) => {
				const plugins: any[] = sortByDesc(pluginsByCategory[category] || [], "date").slice(0, 3);

				if (plugins.length < 3 && viewType === "grid") {
					plugins.push(...new Array(3 - plugins.length).fill(undefined));
				}

				return (
					<Section key={category}>
						<div data-testid={`PluginManager__latest__${category}`}>
							<div className="flex justify-between items-center mb-6">
								<h2 className="font-bold mb-0">{t(`PLUGINS.CATEGORIES.${category.toUpperCase()}`)}</h2>

								<span
									className="flex items-center font-semibold link space-x-2"
									data-testid={`PluginManager__latest__${category}__view-more`}
									onClick={() => onCurrentViewChange(category)}
								>
									<span>{t("COMMON.VIEW_MORE")}</span>
									<Icon name="ChevronRight" width={8} height={8} />
								</span>
							</div>

							{renderPlugins(plugins, category)}
						</div>
					</Section>
				);
			})}
		</>
	);
};

const UpdateAllBanner = ({
	hasUpdateAvailableCount,
	isUpdatingAll,
	handleUpdateAll,
}: {
	hasUpdateAvailableCount: number;
	isUpdatingAll: boolean;
	handleUpdateAll: () => void;
}) => {
	const { t } = useTranslation();

	if (hasUpdateAvailableCount === 0) {
		return null;
	}

	return (
		<EmptyBlock size="sm" className="mb-6">
			<div className="flex items-center w-full justify-between">
				<span>{t("PLUGINS.UPDATE_ALL_NOTICE", { count: hasUpdateAvailableCount })}</span>
				<Button
					disabled={isUpdatingAll}
					className="-mr-1"
					data-testid="PluginManager__update-all"
					onClick={handleUpdateAll}
				>
					{isUpdatingAll ? t("COMMON.UPDATING") : t("PLUGINS.UPDATE_ALL")}
				</Button>
			</div>
		</EmptyBlock>
	);
};

export const PluginManager = () => {
	const { t } = useTranslation();
	const {
		allPlugins,
		isFetchingPackages,
		trigger,
		updatingStats,
		filters,
		filterBy,
		fetchPluginPackages,
	} = usePluginManagerContext();

	const activeProfile = useActiveProfile();
	const history = useHistory();
	const { pluginManager, mapConfigToPluginData, updatePlugin } = usePluginManagerContext();
	const { persist } = useEnvironmentContext();
	const { startUpdate, isUpdating: isUpdatingAll } = usePluginUpdateQueue();

	const [currentView, setCurrentView] = useState("latest");
	const [viewType, setViewType] = useState("grid");

	const [updatesConfirmationPlugins, setUpdatesConfirmationPlugins] = useState<any[] | undefined>(undefined);
	const [isManualInstallModalOpen, setIsManualInstallModalOpen] = useState(false);
	const [uninstallSelectedPlugin, setUninstallSelectedPlugin] = useState<PluginController | undefined>(undefined);
	const [installSelectedPlugin, setInstallSelectedPlugin] = useState<PluginController | undefined>(undefined);

	const plugins = allPlugins.map(mapConfigToPluginData.bind(null, activeProfile));

	const isAdvancedMode = activeProfile.settings().get<boolean>(Contracts.ProfileSetting.AdvancedMode, false)!;
	const hasUpdateAvailableCount = plugins.filter((item) => item.hasUpdateAvailable).length;

	const pluginsByCategory = useMemo(() => {
		const result: Record<string, any[]> = {};

		for (const plugin of plugins) {
			/* istanbul ignore else */
			if (!result[plugin.category]) {
				result[plugin.category] = [];
			}

			result[plugin.category].push(plugin);
		}

		return result;
	}, [plugins]);

	useEffect(() => {
		fetchPluginPackages();
	}, [fetchPluginPackages]);

	// eslint-disable-next-line react-hooks/exhaustive-deps
	const filteredPackages = useMemo(() => pluginsByCategory[currentView] || [], [
		currentView,
		filters,
		pluginsByCategory,
	]);

	const installedPlugins = pluginManager
		.plugins()
		.all()
		.map((item) => item.config())
		.map(mapConfigToPluginData.bind(null, activeProfile));

	const handleSelectPlugin = (pluginData: any) =>
		history.push(`/profiles/${activeProfile.id()}/plugins/details?pluginId=${pluginData.id}`);

	const handleEnablePlugin = (pluginData: any) => {
		pluginManager.plugins().findById(pluginData.id)?.enable(activeProfile, { autoRun: true });
		persist();
	};

	const handleDisablePlugin = (pluginData: any) => {
		pluginManager.plugins().findById(pluginData.id)?.disable(activeProfile);
		persist();
	};

	const handleDeletePlugin = (pluginData: any) => {
		setUninstallSelectedPlugin(pluginManager.plugins().findById(pluginData.id));
	};

	const handleLaunchPlugin = (pluginData: any) => {
		history.push(`/profiles/${activeProfile.id()}/plugins/view?pluginId=${pluginData.id}`);
		persist();
	};

	const handleManualInstall = (result: { pluginId: string; repositoryURL: string }) => {
		setIsManualInstallModalOpen(false);
		history.push(
			`/profiles/${activeProfile.id()}/plugins/details?pluginId=${result.pluginId}&repositoryURL=${
				result.repositoryURL
			}`,
		);
	};

	const handleUpdate = (pluginData: any) => {
		updatePlugin(pluginData.name);
	};

	const openInstallModalPlugin = (pluginData: any) => {
		setInstallSelectedPlugin(pluginData);
	};

	const onDeletePlugin = () => {
		setUninstallSelectedPlugin(undefined);
		trigger();
	};

	const viewPlugins = useMemo(() => {
		switch (currentView) {
			case "my-plugins":
				return installedPlugins;
			case "all":
				return plugins;
			default:
				return filteredPackages;
		}
	}, [currentView, installedPlugins, plugins, filteredPackages]);

	const onUpdateAll = () => {
		const notSatisfiedPlugins = plugins.filter(
			(item) => item.hasUpdateAvailable && !item.isMinimumVersionSatisfied,
		);

		setUpdatesConfirmationPlugins(notSatisfiedPlugins);
	};

	const handleUpdateAll = () => {
		setUpdatesConfirmationPlugins(undefined);

		const availablePackages = plugins.filter((pluginData) => pluginData.hasUpdateAvailable);

		startUpdate(availablePackages.map((item) => item.id));
	};

	const menu = ["latest", "all", ...categories].map((name: string) => ({
		title: t(`PLUGINS.PAGE_PLUGIN_MANAGER.VIEW.${name.toUpperCase()}`),
		name,
	}));

	return (
		<>
			<Page profile={activeProfile} isBackDisabled={true}>
				<Section>
					<Header
						title={t("PLUGINS.PAGE_PLUGIN_MANAGER.TITLE")}
						subtitle={t("PLUGINS.PAGE_PLUGIN_MANAGER.DESCRIPTION")}
						extra={
							<div className="flex justify-end items-top text-theme-primary-200">
								<HeaderSearchBar
									defaultQuery={filters.query}
									label={t("COMMON.SEARCH")}
									onSearch={(query) => {
										filterBy({ query });
									}}
								/>

								{isAdvancedMode && (
									<>
										<div className="pl-8 my-auto ml-5 h-10 border-l border-theme-secondary-300 dark:border-theme-secondary-800" />
										<Button
											data-testid="PluginManager_header--install"
											onClick={() => setIsManualInstallModalOpen(true)}
										>
											<div className="flex items-center space-x-2 whitespace-nowrap">
												<Icon name="File" width={15} height={15} />
												<span>{t("PLUGINS.MODAL_MANUAL_INSTALL_PLUGIN.TITLE")}</span>
											</div>
										</Button>
									</>
								)}
							</div>
						}
					/>
				</Section>

				<PluginManagerNavigationBar
					hasUpdatesAvailable={hasUpdateAvailableCount > 0}
					installedPluginsCount={installedPlugins.length}
					menu={menu}
					selectedView={currentView}
					selectedViewType={viewType}
					onChange={setCurrentView}
					onSelectGridView={() => setViewType("grid")}
					onSelectListView={() => setViewType("list")}
				/>

				{currentView === "latest" && (
					<LatestPlugins
						isLoading={isFetchingPackages}
						viewType={viewType}
						pluginsByCategory={pluginsByCategory}
						onCurrentViewChange={setCurrentView}
						onInstall={openInstallModalPlugin}
						onEnable={handleEnablePlugin}
						onDisable={handleDisablePlugin}
						onDelete={handleDeletePlugin}
						onSelect={handleSelectPlugin}
						onLaunch={handleLaunchPlugin}
					/>
				)}

				<Section>
					{currentView !== "latest" && (
						<>
							<h2 className="font-bold mb-6">
								{t(`PLUGINS.PAGE_PLUGIN_MANAGER.VIEW.${snakeCase(currentView)?.toUpperCase()}`)}
							</h2>

							{currentView === "my-plugins" && (
								<UpdateAllBanner
									hasUpdateAvailableCount={hasUpdateAvailableCount}
									isUpdatingAll={isUpdatingAll}
									handleUpdateAll={onUpdateAll}
								/>
							)}

							<div data-testid={`PluginManager__container--${currentView}`}>
								{viewType === "grid" && (
									<PluginGrid
										plugins={viewPlugins}
										updatingStats={updatingStats}
										emptyMessage={
											currentView === "my-plugins"
												? t("PLUGINS.PAGE_PLUGIN_MANAGER.NO_PLUGINS_INSTALLED")
												: undefined
										}
										isLoading={isFetchingPackages}
										onDelete={handleDeletePlugin}
										onDisable={handleDisablePlugin}
										onEnable={handleEnablePlugin}
										onInstall={openInstallModalPlugin}
										onLaunch={handleLaunchPlugin}
										onSelect={handleSelectPlugin}
										onUpdate={handleUpdate}
									/>
								)}

								{viewType === "list" && (
									<PluginList
										emptyMessage={
											currentView === "my-plugins"
												? t("PLUGINS.PAGE_PLUGIN_MANAGER.NO_PLUGINS_INSTALLED")
												: undefined
										}
										onUpdate={handleUpdate}
										plugins={viewPlugins}
										showCategory={currentView === "my-plugins" || currentView === "all"}
										updatingStats={updatingStats}
										onClick={handleSelectPlugin}
										onDelete={handleDeletePlugin}
										onDisable={handleDisablePlugin}
										onEnable={handleEnablePlugin}
										onInstall={openInstallModalPlugin}
										onLaunch={handleLaunchPlugin}
									/>
								)}
							</div>
						</>
					)}
				</Section>
			</Page>

			{installSelectedPlugin && (
				<InstallPlugin
					plugin={installSelectedPlugin}
					isOpen={true}
					onClose={() => setInstallSelectedPlugin(undefined)}
					onCancel={() => setInstallSelectedPlugin(undefined)}
				/>
			)}

			<PluginManualInstallModal
				isOpen={isManualInstallModalOpen}
				onClose={() => setIsManualInstallModalOpen(false)}
				onSuccess={handleManualInstall}
			/>

			<PluginUpdatesConfirmation
				isOpen={!!updatesConfirmationPlugins}
				plugins={updatesConfirmationPlugins!}
				onClose={() => setUpdatesConfirmationPlugins(undefined)}
				onContinue={handleUpdateAll}
			/>

			{uninstallSelectedPlugin && (
				<PluginUninstallConfirmation
					isOpen={true}
					plugin={uninstallSelectedPlugin}
					profile={activeProfile}
					onClose={() => setUninstallSelectedPlugin(undefined)}
					onDelete={onDeletePlugin}
				/>
			)}
		</>
	);
};
