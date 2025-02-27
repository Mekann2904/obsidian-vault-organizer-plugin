import {
	App,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	SuggestModal,
	TAbstractFile,
	TFile,
	TFolder,
	normalizePath,
} from "obsidian";

// ---------------------------
// 設定インターフェース
// ---------------------------
interface PluginSettings {
	// 空文字列の場合は移動しない（設定されていない）
	fileRules: Record<string, string>;
}

// ---------------------------
// デフォルト設定
// ---------------------------
const DEFAULT_SETTINGS: PluginSettings = {
	fileRules: {
		".md": "",
		".png": "",
		".jpeg": "",
		".jpg": "",
		".gif": "",
		".bmp": "",
		".webp": "",
		".svg": "",
		".pdf": "",
		".mmd": "",
		".tex": "",
		".canvas": "",
	},
};

// ---------------------------
// フォルダサジェストモーダル（設定画面用）
// ---------------------------
class FolderSuggestModal extends SuggestModal<string> {
	allFolders: string[];
	onChoose: (folderPath: string) => void;

	constructor(app: App, onChoose: (folderPath: string) => void) {
		super(app);
		this.onChoose = onChoose;
		this.allFolders = this.getAllFolders(app.vault.getRoot());
	}

	getAllFolders(folder: TFolder): string[] {
		let results: string[] = [folder.path];
		folder.children.forEach(child => {
			if (child instanceof TFolder) {
				results = results.concat(this.getAllFolders(child));
			}
		});
		return results;
	}

	getSuggestions(query: string): string[] {
		return this.allFolders.filter(f => f.toLowerCase().includes(query.toLowerCase()));
	}

	renderSuggestion(item: string, el: HTMLElement) {
		el.createEl("div", { text: item });
	}

	onChooseSuggestion(item: string, evt: MouseEvent | KeyboardEvent): void {
		this.onChoose(item);
	}
}

// ---------------------------
// プラグイン本体
// ---------------------------
export default class FileMoverPlugin extends Plugin {
	settings: PluginSettings;
	// 移動履歴。Undo のため、各要素にはファイル、元のフォルダ、移動先、元のファイル名を記録
	moveHistory: Array<{ file: TFile, from: string, to: string, originalName: string }> = [];

	async onload() {
		console.log("Loading FileMoverPlugin");
		new Notice("Loading FileMoverPlugin");
		await this.loadSettings();

		// リボンアイコン（"folder" アイコン）を追加
		this.addRibbonIcon("folder", "Move Files", () => this.executeFileMove());
		this.addCommand({
			id: "execute-file-move",
			name: "Execute File Move",
			callback: () => this.executeFileMove(),
		});
		this.addCommand({
			id: "undo-file-move",
			name: "Undo File Move",
			callback: () => this.undoFileMove(),
		});
		this.addSettingTab(new FileMoverSettingTab(this.app, this));
	}

	onunload() {
		console.log("Unloading FileMoverPlugin");
		new Notice("Unloading FileMoverPlugin");
	}

	/**
	 * ルート直下のすべてのファイルについて、拡張子に対応する移動先フォルダへ移動する
	 */
	async executeFileMove() {
		const vault = this.app.vault;
		const root = vault.getRoot() as TFolder;
		const rootFiles: TFile[] = [];

		// ルート直下のファイルを収集
		root.children.forEach((child: TAbstractFile) => {
			if (child instanceof TFile) {
				rootFiles.push(child);
			}
		});

		new Notice(`Found ${rootFiles.length} root-level files.`);

		let movedCount = 0;
		for (const file of rootFiles) {
			// 拡張子に対応する移動先を取得
			const ext = file.extension ? `.${file.extension}` : "";
			let targetDir = this.settings.fileRules[ext];

			// 移動先が設定されていなければスキップ
			if (!targetDir) continue;

			// 指定された移動先フォルダの存在確認（自動作成は行わず、存在しなければエラー表示）
			const normalizedTarget = normalizePath(targetDir);
			const folder = this.app.vault.getAbstractFileByPath(normalizedTarget);
			if (!folder || !(folder instanceof TFolder)) {
				console.error(`Folder "${targetDir}" not found. Skipping file "${file.name}".`);
				new Notice(`Folder "${targetDir}" not found. Skipped "${file.name}".`);
				continue;
			}
			const resolvedDir = folder.path;

			// 元のパスとファイル名を記録（Undo 用）
			const originalFolder = file.parent ? file.parent.path : "";
			const originalName = file.name;

			// ファイル移動（同名ファイルがある場合は連番を付与）
			const newPath = await this.safeRenameFile(file, resolvedDir);
			if (newPath) {
				movedCount++;
				this.moveHistory.push({
					file,
					from: originalFolder,
					to: resolvedDir,
					originalName: originalName,
				});
				new Notice(`Moved "${originalName}" → "${resolvedDir}"`);
			}
		}

		new Notice(`File move completed. Moved ${movedCount} files.`);
	}

	/**
	 * 同名ファイルがある場合は連番を付与して移動する
	 */
	private async safeRenameFile(file: TFile, targetFolder: string): Promise<string | null> {
		let baseName = file.basename;
		const ext = file.extension;
		let newPath = normalizePath(`${targetFolder}/${file.name}`);
		let counter = 1;
		while (this.app.vault.getAbstractFileByPath(newPath)) {
			newPath = normalizePath(`${targetFolder}/${baseName}-${counter}.${ext}`);
			counter++;
			if (counter > 1000) {
				console.error(`Too many conflicts for "${file.name}"`);
				return null;
			}
		}
		try {
			await this.app.vault.rename(file, newPath);
			return newPath;
		} catch (error) {
			console.error(`Error moving "${file.name}"`, error);
			return null;
		}
	}

	/**
	 * 移動したすべてのファイルの移動を元に戻す（Undo）
	 */
	async undoFileMove() {
		if (this.moveHistory.length === 0) {
			new Notice("No moves to undo");
			return;
		}
		while (this.moveHistory.length > 0) {
			const record = this.moveHistory.pop();
			if (!record) continue;
			const { file, from, originalName } = record;
			const targetPath = normalizePath(`${from}/${originalName}`);
			try {
				await this.app.vault.rename(file, targetPath);
				new Notice(`Undo: Moved "${file.name}" back to "${from}"`);
			} catch (error) {
				console.error(`Undo failed for "${file.name}"`, error);
				new Notice(`Undo failed for "${file.name}"`);
			}
		}
		new Notice("Undo operation completed.");
	}

	async loadSettings() {
		const loadedSettings = await this.loadData();
		this.settings = {
			...DEFAULT_SETTINGS,
			...loadedSettings,
			fileRules: {
				...DEFAULT_SETTINGS.fileRules,
				...(loadedSettings?.fileRules || {})
			}
		};
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

// ---------------------------
// 設定画面
// ---------------------------
class FileMoverSettingTab extends PluginSettingTab {
	plugin: FileMoverPlugin;

	constructor(app: App, plugin: FileMoverPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl("h2", { text: "File Mover Settings" });

		for (const ext in this.plugin.settings.fileRules) {
			const setting = new Setting(containerEl)
				.setName(`Target directory for ${ext} files`)
				.setDesc("設定が空の場合、その拡張子のファイルは移動されません。");

			const currentValue = this.plugin.settings.fileRules[ext];
			const valueSpan = setting.settingEl.createEl("span", {
				text: currentValue ? currentValue : "Not set",
			});

			setting.addButton(btn =>
				btn.setButtonText("Select Folder")
					.onClick(() => {
						new FolderSuggestModal(this.app, (folderPath: string) => {
							this.plugin.settings.fileRules[ext] = folderPath;
							valueSpan.setText(folderPath);
							this.plugin.saveSettings();
						}).open();
					})
			);

			setting.addExtraButton(btn =>
				btn.setIcon("cross")
					.setTooltip("Clear selection")
					.onClick(async () => {
						this.plugin.settings.fileRules[ext] = "";
						valueSpan.setText("Not set");
						await this.plugin.saveSettings();
					})
			);
		}
	}
}
