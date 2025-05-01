# obsidian-vault-organizer-plugin
This repository contains the File Mover Plugin for Obsidian.

---

# File Mover Plugin / ファイルムーバープラグイン

A plugin for Obsidian that automatically moves files from the vault’s root folder into designated directories based on customizable file extension rules.
カスタマイズ可能な拡張子ルールに基づいて、Vault のルートフォルダから指定されたディレクトリへファイルを自動移動する Obsidian プラグインです。

---

## Features / 特徴

-   **Automatic File Movement Based on Rules:**
    Moves files located *only* in the vault's root folder to target folders based on their file extensions.
    Vaultの**ルートフォルダ直下にあるファイルのみ**を、拡張子に基づいて指定のフォルダへ自動で移動します。
-   **Customizable Rules:**
    Easily add, edit, or remove rules for any file extension via the settings page. Specify a target folder for each rule.
    設定画面から、任意の拡張子に対するルールを簡単に追加、編集、削除できます。各ルールに移動先フォルダを指定します。
-   **Optional Folder Creation:**
    Choose whether the plugin should automatically create target folders if they don't exist.
    移動先フォルダが存在しない場合に、プラグインが自動でフォルダを作成するかどうかを選択できます。
-   **Persistent Undo Functionality:**
    Revert the last batch of file moves using the "Undo" command. The move history is saved across Obsidian sessions. Configure the maximum number of history records to keep.
    「Undo」コマンドを使用して、直前のファイル移動バッチ（一括移動）を元に戻せます。移動履歴はObsidianセッションを跨いで保存されます。保持する履歴の最大件数を設定できます。
-   **Safe File Renaming:**
    Automatically handles file name conflicts by appending a number if a file with the same name already exists in the target directory.
    移動先に同名のファイルが既に存在する場合、ファイル名に番号を付加して名前の衝突を自動的に回避します。
-   **User Interface Integration:**
    Access file move and undo commands via a ribbon icon and the command palette.
    リボンアイコンやコマンドパレットからファイル移動やUndoコマンドにアクセスできます。

---

## Installation / インストール

**Manual Installation / 手動インストール:**

1.  Download `main.js`, `styles.css`, and `manifest.json` from the [latest release](https://github.com/your-username/obsidian-vault-organizer-plugin/releases/latest). *(Replace with your actual repository link)*
    [最新リリース](https://github.com/your-username/obsidian-vault-organizer-plugin/releases/latest) から `main.js`, `styles.css`, `manifest.json` をダウンロードします。*(実際のあなたのリポジトリリンクに置き換えてください)*
2.  Navigate to your Obsidian vault's configuration folder: `<YourVault>/.obsidian/plugins/`.
    Obsidian Vaultの設定フォルダ `<YourVault>/.obsidian/plugins/` に移動します。
3.  Create a new folder named `file-mover-plugin` (or similar).
    `file-mover-plugin` (または類似の名前) という名前で新しいフォルダを作成します。
4.  Place the downloaded files into this new folder.
    ダウンロードしたファイルをこの新しいフォルダに配置します。
5.  Go to **Settings** → **Community plugins** in Obsidian.
    Obsidianの **設定** → **コミュニティプラグイン** に移動します。
6.  Refresh the list and enable "File Mover Plugin".
    リストを更新し、「File Mover Plugin」を有効化します。

---

## Usage / 使い方

-   **Moving Files / ファイルの移動:**
    Click the ribbon icon (folder with an up arrow) or run the command "**Execute Root File Move**" from the command palette (Ctrl/Cmd+P). This will move files currently in your vault's root folder according to the rules defined in the settings.
    リボンアイコン（上矢印付きのフォルダ）をクリックするか、コマンドパレット（Ctrl/Cmd+P）から「**Execute Root File Move**」コマンドを実行します。これにより、現在Vaultのルートフォルダにあるファイルが、設定で定義されたルールに従って移動されます。

-   **Undoing File Movement / ファイル移動の取り消し:**
    Run the "**Undo Last File Move Batch**" command from the command palette. This will revert the most recent set of file moves performed by the "Execute Root File Move" command, restoring the files to the root folder with their original names.
    コマンドパレットから「**Undo Last File Move Batch**」コマンドを実行します。「Execute Root File Move」コマンドによって実行された直近のファイル移動一式を元に戻し、ファイルを元の名前でルートフォルダに復元します。

-   **Configuring Settings / 設定の構成:**
    1.  Go to **Settings** → **Community Plugins** → **File Mover Plugin**.
        **設定** → **コミュニティプラグイン** → **File Mover Plugin** に移動します。
    2.  **General Settings / 一般設定:**
        *   **Create target folder if not exists:** Enable this toggle if you want the plugin to automatically create destination folders.
            **Create target folder if not exists:** 移動先フォルダを自動作成させたい場合は、このトグルを有効にします。
        *   **Maximum history items:** Set the maximum number of move operations to keep for the undo functionality.
            **Maximum history items:** Undo機能のために保持する移動操作の最大数を設定します。
    3.  **File Moving Rules / ファイル移動ルール:**
        *   **Add New Rule / 新規ルール追加:**
            1.  Enter the file extension (e.g., `.png`, `.pdf`) in the "Enter extension" field. The leading dot (`.`) is optional.
                「Enter extension」フィールドにファイル拡張子（例：`.png`, `.pdf`）を入力します。先頭のドット（`.`）は任意です。
            2.  Click the "Select Folder" button and choose the target directory for this extension.
                「Select Folder」ボタンをクリックし、この拡張子の移動先ディレクトリを選択します。
            3.  Click the "Add Rule" button to save the new rule.
                「Add Rule」ボタンをクリックして新しいルールを保存します。
        *   **Existing Rules / 既存のルール:**
            *   The list shows all defined rules, sorted by extension.
                定義されているすべてのルールが拡張子順に表示されます。
            *   **Change Target Folder:** Click the "folder-cog" icon (⚙️📁) to select a different target folder for an existing rule.
                **ターゲットフォルダ変更:** 「folder-cog」アイコン（⚙️📁）をクリックして、既存ルールの移動先フォルダを変更します。
            *   **Clear Target Folder:** Click the "trash" icon (🗑️) to clear the target folder setting (effectively disabling the rule without deleting it).
                **ターゲットフォルダクリア:** 「trash」アイコン（🗑️）をクリックしてターゲットフォルダの設定をクリアします（ルールを削除せずに無効化します）。
            *   **Remove Rule:** Click the "cross" icon (❌) to permanently delete the rule for that extension.
                **ルール削除:** 「cross」アイコン（❌）をクリックして、その拡張子のルールを完全に削除します。
        *   *Note: If a target folder is not set for an extension (empty), files with that extension will not be moved.*
            *注意: 拡張子にターゲットフォルダが設定されていない（空欄の）場合、その拡張子のファイルは移動されません。*

---

## Code Overview / コード概要

The plugin utilizes Obsidian's API and includes these main components:

-   **Settings Management (`FileMoverPluginSettings`, `loadSettings`, `saveSettings`):**
    Handles loading and saving plugin settings, including `fileRules` (extension-to-folder mapping), `createTargetFolder` (boolean), `maxHistoryItems` (number), and `moveHistory` (array of `MoveHistoryRecord` for undo).
    `fileRules`（拡張子とフォルダのマッピング）、`createTargetFolder`（ブール値）、`maxHistoryItems`（数値）、`moveHistory`（Undo用の`MoveHistoryRecord`の配列）を含むプラグイン設定の読み込みと保存を管理します。
-   **File Movement Logic (`executeFileMove`):**
    Scans the vault's root folder, checks files against `fileRules`, potentially creates target folders (if `createTargetFolder` is true), calls `safeMoveFile` for actual moving, and records moves in `moveHistory`.
    Vaultのルートフォルダをスキャンし、ファイルを`fileRules`と照合し、必要に応じてターゲットフォルダを作成し（`createTargetFolder`がtrueの場合）、実際の移動のために`safeMoveFile`を呼び出し、移動を`moveHistory`に記録します。
-   **Safe File Moving (`safeMoveFile`):**
    Moves a single file using `app.vault.rename` (which updates links). Handles potential file name collisions by appending sequential numbers.
    単一のファイルを`app.vault.rename`（リンクも更新される）を使用して移動します。連番を付加することで、ファイル名の衝突の可能性を処理します。
-   **Undo Logic (`undoLastMoveBatch`):**
    Retrieves records from the end of `settings.moveHistory`, attempts to move files back to their original location (`originalFolderPath`/`originalName`) using `app.vault.rename`, and removes the record from history upon successful undo.
    `settings.moveHistory`の末尾からレコードを取得し、`app.vault.rename`を使用してファイルを元の場所（`originalFolderPath`/`originalName`）に戻そうと試み、成功時に履歴からレコードを削除します。
-   **Settings UI (`FileMoverSettingTab`):**
    Provides the user interface in Obsidian's settings to manage general options and file rules (add, edit, clear target, remove). Uses `FolderSuggestModal` for easy folder selection.
    Obsidianの設定内で、一般オプションとファイルルール（追加、編集、ターゲットクリア、削除）を管理するためのユーザーインターフェースを提供します。簡単なフォルダ選択のために`FolderSuggestModal`を使用します。
-   **Folder Suggestion Modal (`FolderSuggestModal`):**
    A specialized modal that suggests existing folders within the vault when selecting target directories in the settings.
    設定で移動先ディレクトリを選択する際に、Vault内の既存フォルダを提案する専用のモーダルです。

---

## License / ライセンス

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
本プロジェクトは MIT ライセンスの下で公開されています。詳細は [LICENSE](LICENSE) ファイルをご覧ください。
*(You should add a LICENSE file with the MIT license text to your repository)*
*(リポジトリにMITライセンステキストを含むLICENSEファイルを追加してください)*

---

Feel free to contribute, report issues, or suggest features!
貢献、問題報告、機能提案を歓迎します！