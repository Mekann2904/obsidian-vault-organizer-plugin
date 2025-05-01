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
	TextComponent, // TextComponent をインポート
	ToggleComponent, // ToggleComponent をインポート
} from "obsidian";

// ---------------------------
// 型定義
// ---------------------------
/**
 * ファイル移動履歴の1レコード
 */
interface MoveHistoryRecord {
	movedFilePath: string; // 移動後のファイルのフルパス
	originalFolderPath: string; // 移動元のフォルダパス
	originalName: string; // 移動前のファイル名
}

/**
 * プラグイン設定
 */
interface FileMoverPluginSettings {
	// キー: 拡張子 (例: ".md"), 値: 移動先フォルダパス (空文字列の場合は移動しない)
	fileRules: Record<string, string>;
	// 移動履歴 (Undo用)
	moveHistory: MoveHistoryRecord[];
	// 移動先フォルダが存在しない場合に自動作成するかどうか
	createTargetFolder: boolean;
	// 保存する移動履歴の最大件数
	maxHistoryItems: number;
}

// ---------------------------
// デフォルト設定
// ---------------------------
const DEFAULT_SETTINGS: FileMoverPluginSettings = {
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
	moveHistory: [],
	createTargetFolder: false, // デフォルトは自動作成しない
	maxHistoryItems: 100,      // デフォルトの履歴上限
};

// ---------------------------
// 定数
// ---------------------------
/** 同名ファイルが存在する場合のリネーム試行回数上限 */
const MAX_RENAME_ATTEMPTS = 1000;

// ---------------------------
// フォルダサジェストモーダル（設定画面用）
// ---------------------------
class FolderSuggestModal extends SuggestModal<TFolder> {
	onChoose: (folderPath: string) => void;

	constructor(app: App, onChoose: (folderPath: string) => void) {
		super(app);
		this.onChoose = onChoose;
		this.setPlaceholder("Select target folder...");
	}

	/**
	 * Vault内のすべてのフォルダを取得します。
	 * @returns {TFolder[]} フォルダの配列
	 */
	getAllFolders(): TFolder[] {
		const folders: TFolder[] = [];
		const root = this.app.vault.getRoot();
		folders.push(root); // ルートフォルダも候補に含める
		function traverse(folder: TFolder) {
			for (const child of folder.children) {
				if (child instanceof TFolder) {
					folders.push(child);
					traverse(child);
				}
			}
		}
		traverse(root);
		return folders;
	}

	/**
	 * クエリに一致するフォルダ候補を返します。
	 * @param {string} query 検索クエリ
	 * @returns {TFolder[]} フォルダ候補の配列
	 */
	getSuggestions(query: string): TFolder[] {
		const lowerCaseQuery = query.toLowerCase();
		return this.getAllFolders().filter(folder =>
			folder.path.toLowerCase().includes(lowerCaseQuery)
		);
	}

	/**
	 * フォルダ候補をリストにレンダリングします。
	 * @param {TFolder} folder フォルダオブジェクト
	 * @param {HTMLElement} el レンダリング先のHTML要素
	 */
	renderSuggestion(folder: TFolder, el: HTMLElement) {
		el.createEl("div", { text: folder.path });
	}

	/**
	 * フォルダが選択されたときの処理。
	 * @param {TFolder} folder 選択されたフォルダ
	 * @param {MouseEvent | KeyboardEvent} evt イベントオブジェクト
	 */
	onChooseSuggestion(folder: TFolder, evt: MouseEvent | KeyboardEvent): void {
		this.onChoose(folder.path);
	}
}

// ---------------------------
// プラグイン本体
// ---------------------------
export default class FileMoverPlugin extends Plugin {
	settings: FileMoverPluginSettings;

	async onload() {
		console.log("Loading FileMoverPlugin");
		await this.loadSettings();

		// リボンアイコン
		this.addRibbonIcon("folder-up", "Move Root Files", (evt: MouseEvent) => {
			this.executeFileMove();
		});

		// コマンドパレット用コマンド
		this.addCommand({
			id: "execute-file-move",
			name: "Execute Root File Move",
			callback: () => {
				this.executeFileMove();
			},
		});

		this.addCommand({
			id: "undo-last-file-move-batch",
			name: "Undo Last File Move Batch",
			callback: () => {
				this.undoLastMoveBatch();
			},
		});

		// 設定タブ
		this.addSettingTab(new FileMoverSettingTab(this.app, this));

		new Notice("FileMoverPlugin loaded.");
	}

	onunload() {
		console.log("Unloading FileMoverPlugin");
	}

	/**
	 * ルートディレクトリ直下のファイルをルールに基づいて移動します。
	 */
	async executeFileMove() {
		const vault = this.app.vault;
		const root = vault.getRoot();
		const rootFiles: TFile[] = root.children.filter(
			(child): child is TFile => child instanceof TFile
		);

		if (rootFiles.length === 0) {
			new Notice("No files found in the root directory.");
			return;
		}

		new Notice(`Checking ${rootFiles.length} root-level files...`);

		let movedCount = 0;
		let errorCount = 0;
		const currentBatchHistory: MoveHistoryRecord[] = []; // 今回の移動バッチの履歴

		for (const file of rootFiles) {
			const ext = file.extension ? `.${file.extension.toLowerCase()}` : ""; // 拡張子を小文字で統一
			let targetDirPath = this.settings.fileRules[ext];

			// ルールが存在しない、または移動先が指定されていない場合はスキップ
			if (!targetDirPath) {
				continue;
			}

			// 移動先フォルダの正規化と存在確認/作成
			const normalizedTargetDir = normalizePath(targetDirPath);
			let targetFolder = vault.getAbstractFileByPath(normalizedTargetDir);

			if (!targetFolder) {
				if (this.settings.createTargetFolder) {
					try {
						await vault.createFolder(normalizedTargetDir);
						targetFolder = vault.getAbstractFileByPath(normalizedTargetDir);
						new Notice(`Created folder: "${normalizedTargetDir}"`);
						if (!targetFolder) throw new Error("Folder creation failed unexpectedly.");
					} catch (error) {
						console.error(`Error creating folder "${normalizedTargetDir}" for file "${file.name}":`, error);
						new Notice(`Failed to create folder "${normalizedTargetDir}". Skipping "${file.name}".`);
						errorCount++;
						continue; // フォルダ作成に失敗したらスキップ
					}
				} else {
					console.warn(`Target folder "${normalizedTargetDir}" not found for file "${file.name}". Skipping.`);
					// Notice は多数表示される可能性があるので、ここではログのみに留めるか、最後にまとめて通知する
					errorCount++;
					continue; // フォルダが存在せず、自動作成もしない場合はスキップ
				}
			}

			// フォルダでない場合はエラー
			if (!(targetFolder instanceof TFolder)) {
				console.error(`Target path "${normalizedTargetDir}" is not a folder. Skipping file "${file.name}".`);
				new Notice(`Target path "${normalizedTargetDir}" is not a folder. Skipped "${file.name}".`);
				errorCount++;
				continue;
			}

			// 元の情報を記録 (Undo用)
			const originalFolderPath = file.parent ? file.parent.path : "/"; // ルートの場合は "/"
			const originalName = file.name;

			// ファイルを安全に移動（リネーム）
			const moveResult = await this.safeMoveFile(file, targetFolder);

			if (moveResult.success && moveResult.newPath) {
				movedCount++;
				// 履歴に追加
				currentBatchHistory.push({
					movedFilePath: moveResult.newPath,
					originalFolderPath: originalFolderPath,
					originalName: originalName,
				});
				console.log(`Moved "${originalName}" to "${moveResult.newPath}"`);
			} else {
				errorCount++;
				// エラー通知は safeMoveFile 内で行う
			}
		}

		// 今回の移動履歴を全体の履歴に追加し、上限を超えたら古いものを削除
		if (currentBatchHistory.length > 0) {
			this.settings.moveHistory.push(...currentBatchHistory); // 個別のレコードとして追加
			// 上限を超えた履歴を削除
			const overflow = this.settings.moveHistory.length - this.settings.maxHistoryItems;
			if (overflow > 0) {
				this.settings.moveHistory.splice(0, overflow); // 先頭から古いものを削除
			}
			await this.saveSettings(); // 履歴を保存
		}

		// 最終結果を通知
		let summary = `File move finished. Moved: ${movedCount}`;
		if (errorCount > 0) {
			summary += `, Skipped/Errors: ${errorCount}`;
		}
		if (movedCount === 0 && errorCount === 0) {
			summary = "No files matched the rules to be moved.";
		}
		new Notice(summary);
		console.log(summary);
		if (errorCount > 0) {
			console.warn("Some files were skipped due to errors or missing folders. Check the console logs for details.");
		}
	}

	/**
	 * ファイルを指定されたフォルダに安全に移動（リネーム）します。
	 * 同名ファイルが存在する場合は、名前に連番を付与します。
	 * @param {TFile} file 移動するファイル
	 * @param {TFolder} targetFolder 移動先フォルダ
	 * @returns {Promise<{success: boolean, newPath: string | null}>} 移動結果と新しいパス
	 */
	private async safeMoveFile(file: TFile, targetFolder: TFolder): Promise<{success: boolean, newPath: string | null}> {
		const targetFolderPath = targetFolder.path;
		let baseName = file.basename;
		const ext = file.extension ? `.${file.extension}` : ""; // 拡張子を保持
		let newPath = normalizePath(`${targetFolderPath}/${file.name}`);
		let counter = 1;

		try {
			// 移動先に同名ファイルが存在するかチェック
			while (await this.app.vault.adapter.exists(newPath)) {
                // Note: getAbstractFileByPath は大文字小文字を区別しない場合があるため、adapter.exists でチェックする方が確実な場合がある
				newPath = normalizePath(`${targetFolderPath}/${baseName}-${counter}${ext}`);
				counter++;
				if (counter > MAX_RENAME_ATTEMPTS) {
					const message = `Too many conflicts trying to move "${file.name}" to "${targetFolderPath}". Aborting move for this file.`;
					console.error(message);
					new Notice(message);
					return { success: false, newPath: null };
				}
			}

			// ファイルを移動 (Obsidian APIの rename を使うことでリンクも更新される)
			await this.app.vault.rename(file, newPath);
			return { success: true, newPath: newPath };

		} catch (error) {
			console.error(`Error moving file "${file.name}" to "${newPath}":`, error);
			new Notice(`Error moving "${file.name}". Check console for details.`);
			return { success: false, newPath: null };
		}
	}

	/**
	 * 直前のファイル移動バッチ（executeFileMoveの1回の実行分）を元に戻します。
	 * 注意: この関数は履歴の最後の要素をUndoする想定ですが、現在の実装では
	 * executeFileMove で追加された全ての履歴を一度に戻します。
	 * より厳密なバッチUndoが必要な場合は、executeFileMoveでバッチIDなどを履歴に含める必要があります。
	 * ここでは、シンプルに履歴の最後から順に戻せるだけ戻します。
	 */
	async undoLastMoveBatch() {
		if (this.settings.moveHistory.length === 0) {
			new Notice("No move history found to undo.");
			return;
		}

		new Notice("Starting undo operation...");
		let undoneCount = 0;
		let errorCount = 0;

		// 履歴の末尾から処理していく
		while (this.settings.moveHistory.length > 0) {
			const record = this.settings.moveHistory.pop(); // 末尾の履歴を取得して削除
			if (!record) continue; // 万が一空ならスキップ

			const fileToUndo = this.app.vault.getAbstractFileByPath(record.movedFilePath);

			if (fileToUndo instanceof TFile) {
				const targetPath = normalizePath(`${record.originalFolderPath}/${record.originalName}`);
				try {
                    // 元の位置に同名ファイルがないか一応確認 (safeMoveFileのような連番付与はUndoでは通常しない)
                    const existingFile = this.app.vault.getAbstractFileByPath(targetPath);
                    if (existingFile && existingFile.path !== fileToUndo.path) {
                        // 厳密には、Undo対象のファイル自身が既に元の位置にあるケースを除外
                        throw new Error(`File already exists at the original location: "${targetPath}"`);
                    }

					await this.app.vault.rename(fileToUndo, targetPath);
					console.log(`Undo: Moved "${fileToUndo.name}" back to "${record.originalFolderPath}" as "${record.originalName}"`);
					undoneCount++;
				} catch (error) {
					console.error(`Undo failed for "${record.originalName}" (originally at "${record.movedFilePath}"):`, error);
					// 失敗した場合は履歴を戻さず（popされたまま）、エラーカウント
					errorCount++;
				}
			} else {
				console.warn(`Undo skipped: File "${record.movedFilePath}" not found or is not a file. It might have been moved, renamed, or deleted.`);
				// ファイルが見つからない場合も履歴は戻さず、エラーカウント
				errorCount++;
			}
		}

		// 履歴の変更を保存
		await this.saveSettings();

		let summary = `Undo operation finished. Restored: ${undoneCount}`;
		if (errorCount > 0) {
			summary += `, Failed/Skipped: ${errorCount}`;
			new Notice(summary + ". Check console for details.");
		} else if (undoneCount > 0) {
			new Notice(summary);
		} else {
            new Notice("Undo finished, but no files were restored (possibly due to errors or missing files).");
        }
	}

	/**
	 * 設定を読み込みます。
	 */
	async loadSettings() {
		const loadedData = await this.loadData();
		// デフォルト設定と読み込みデータをマージ
		this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedData, {
			// fileRules はネストされているので、個別にマージする
			fileRules: Object.assign({}, DEFAULT_SETTINGS.fileRules, loadedData?.fileRules),
            // maxHistoryItems が 0 や負数にならないようにガード
            maxHistoryItems: Math.max(1, loadedData?.maxHistoryItems ?? DEFAULT_SETTINGS.maxHistoryItems),
		});
        // 読み込み後に履歴が上限を超えている可能性があればトリム
        const overflow = this.settings.moveHistory.length - this.settings.maxHistoryItems;
		if (overflow > 0) {
			this.settings.moveHistory.splice(0, overflow);
		}
	}

	/**
	 * 現在の設定を保存します。
	 */
	async saveSettings() {
		// 保存前に履歴が上限を超えていないか確認・トリム
		const overflow = this.settings.moveHistory.length - this.settings.maxHistoryItems;
		if (overflow > 0) {
			this.settings.moveHistory.splice(0, overflow);
		}
		await this.saveData(this.settings);
	}
}

// ---------------------------
// 設定画面タブ
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

		// --- 一般設定 ---
		containerEl.createEl("h3", { text: "General Settings" });

		new Setting(containerEl)
			.setName("Create target folder if not exists")
			.setDesc("If enabled, the plugin will automatically create the target folder when moving files if it doesn't exist.")
			.addToggle((toggle: ToggleComponent) => {
				toggle
					.setValue(this.plugin.settings.createTargetFolder)
					.onChange(async (value) => {
						this.plugin.settings.createTargetFolder = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("Maximum history items")
			.setDesc("The maximum number of move operations to keep in the undo history.")
			.addText((text: TextComponent) => {
				text.inputEl.type = "number"; // 数値入力に設定
                text.inputEl.min = "1"; // 最小値を1に
				text
					.setValue(String(this.plugin.settings.maxHistoryItems))
					.onChange(async (value) => {
                        const numValue = parseInt(value, 10);
                        // 有効な数値か、1以上かチェック
						this.plugin.settings.maxHistoryItems = isNaN(numValue) || numValue < 1 ? 1 : numValue;
						await this.plugin.saveSettings();
                        // 不正な値が入力された場合に、実際の値を再表示する
                        text.setValue(String(this.plugin.settings.maxHistoryItems));
					});
			});

		// --- ファイル移動ルール ---
		containerEl.createEl("h3", { text: "File Moving Rules" });
		containerEl.createEl("p", { text: "Define target folders for specific file extensions. Files with extensions not listed here, or with an empty target folder, will not be moved." });

		// ルール追加セクション
		const addRuleContainer = containerEl.createDiv("file-mover-add-rule");
		addRuleContainer.addClass("file-mover-setting-item"); // スタイル用クラス

		const extensionInput = new TextComponent(addRuleContainer)
			.setPlaceholder("Enter extension (e.g., .txt)");
		extensionInput.inputEl.addClass("file-mover-extension-input"); // スタイル用クラス

		const targetFolderInput = new TextComponent(addRuleContainer)
			.setPlaceholder("Select target folder ->")
			.setDisabled(true); // 初期状態は無効、フォルダ選択後に有効化＆パス表示
		targetFolderInput.inputEl.addClass("file-mover-target-folder-input"); // スタイル用クラス

		let selectedTargetFolder = ""; // 一時的に選択されたフォルダを保持

		new Setting(addRuleContainer) // ボタンをSetting内に配置してレイアウトを整える
			.addButton(button => button
				.setButtonText("Select Folder")
				.onClick(() => {
					new FolderSuggestModal(this.app, (folderPath) => {
						selectedTargetFolder = folderPath === "/" ? "/" : normalizePath(folderPath); // ルートは "/" のまま
						targetFolderInput.setValue(selectedTargetFolder);
						targetFolderInput.setDisabled(false); // フォルダが選択されたら有効化（表示用）
					}).open();
				})
			)
			.addButton(button => button
				.setButtonText("Add Rule")
                .setCta() // 強調表示
				.onClick(async () => {
					let ext = extensionInput.getValue().trim().toLowerCase();
					const targetDir = selectedTargetFolder;

					if (!ext) {
						new Notice("Please enter a file extension.");
						return;
					}
					if (!ext.startsWith(".")) {
						ext = "." + ext; // . がなければ追加
					}
					if (!targetDir) {
						new Notice("Please select a target folder.");
						return;
					}
                    if (this.plugin.settings.fileRules[ext] !== undefined) {
                        new Notice(`Rule for extension "${ext}" already exists. Please remove the existing rule first or edit it.`);
                        return;
                    }

					this.plugin.settings.fileRules[ext] = targetDir;
					await this.plugin.saveSettings();
					new Notice(`Rule added: "${ext}" -> "${targetDir}"`);
                    // フォームをリセット
                    extensionInput.setValue("");
                    targetFolderInput.setValue("").setPlaceholder("Select target folder ->").setDisabled(true);
                    selectedTargetFolder = "";
					// 設定画面を再描画して新しいルールを表示
					this.display();
				})
			);

		// --- 既存のルール一覧 ---
		containerEl.createEl("h4", { text: "Existing Rules" });
		const rulesContainer = containerEl.createDiv("file-mover-rules-list"); // ルールリストのコンテナ

        if (Object.keys(this.plugin.settings.fileRules).length === 0) {
            rulesContainer.createEl('p', { text: 'No rules defined yet.' });
        } else {
            // 拡張子でソートして表示
            const sortedExtensions = Object.keys(this.plugin.settings.fileRules).sort();

            for (const ext of sortedExtensions) {
                const targetDir = this.plugin.settings.fileRules[ext];
                const ruleSetting = new Setting(rulesContainer)
                    .setName(ext)
                    // 説明部分に現在のターゲットフォルダを表示、空なら "Not set"
                    .setDesc(`Target: ${targetDir || "Not set (will not be moved)"}`);

                // フォルダ選択ボタン
                ruleSetting.addButton(button => button
                    .setIcon("folder-cog") // フォルダ設定アイコン
                    .setTooltip("Change target folder")
                    .onClick(() => {
                        new FolderSuggestModal(this.app, async (folderPath) => {
							const newTarget = folderPath === "/" ? "/" : normalizePath(folderPath);
                            this.plugin.settings.fileRules[ext] = newTarget;
                            await this.plugin.saveSettings();
                            this.display(); // 画面を再描画して変更を反映
                        }).open();
                    })
                );

                // ターゲットフォルダクリアボタン
                if (targetDir) { // ターゲットが設定されている場合のみクリアボタンを表示
                    ruleSetting.addButton(button => button
                        .setIcon("trash") // ゴミ箱アイコン（クリア）
                        .setTooltip("Clear target folder (disable rule)")
                        .onClick(async () => {
                            this.plugin.settings.fileRules[ext] = ""; // ターゲットを空に
                            await this.plugin.saveSettings();
                            this.display(); // 再描画
                        })
                    );
                }

                // ルール削除ボタン
                ruleSetting.addButton(button => button
                    .setIcon("cross") // バツアイコン（削除）
                    .setTooltip(`Remove rule for "${ext}"`)
					.setClass('mod-warning') // 警告色
                    .onClick(async () => {
                        delete this.plugin.settings.fileRules[ext]; // ルールを削除
                        await this.plugin.saveSettings();
                        this.display(); // 再描画
                    })
                );
            }
        }
	}
}