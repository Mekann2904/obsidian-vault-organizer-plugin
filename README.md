# obsidian-vault-organizer-plugin
Below is an example README in Markdown format that provides both Japanese and English documentation for your Obsidian File Mover Plugin.

---

# File Mover Plugin / ファイルムーバープラグイン

A plugin for Obsidian that automatically moves files from the vault’s root folder into designated directories based on file extension rules.  
拡張子ルールに基づいて、Vault のルートフォルダから指定されたディレクトリへファイルを自動移動する Obsidian プラグインです。

---

## Features / 特徴

- **Automatic File Movement**  
  Moves files from the vault’s root folder into target folders based on their extensions.  
  ルートフォルダ内のファイルを、拡張子に応じたフォルダへ自動で移動します。

- **Undo Functionality**  
  Provides an undo command to revert file moves, restoring files to their original location.  
  ファイル移動を元に戻す「Undo」機能により、ファイルを元の位置に復元できます。

- **Customizable Settings**  
  Configure target directories for different file extensions using an intuitive settings page.  
  各拡張子ごとに移動先フォルダを設定できる、使いやすい設定画面を備えています。

- **User Interface Integration**  
  Access the file move commands via a ribbon icon and the command palette.  
  リボンアイコンやコマンドパレットから直接操作できる UI を提供しています。

---

## Installation / インストール

1. **Download the Plugin**  
   Copy the plugin code into your Obsidian plugins folder.

2. **Enable Community Plugins**  
   In Obsidian, navigate to **Settings → Community Plugins** and enable third-party plugins if you haven’t already.

3. **Activate File Mover Plugin**  
   Find “File Mover Plugin” in the list of community plugins and click **Enable**.

1. **プラグインのダウンロード**  
   プラグインのコードを Obsidian のプラグインフォルダにコピーします。

2. **サードパーティプラグインの有効化**  
   Obsidian の **設定 → Community Plugins** から、サードパーティ製プラグインを有効にしてください。

3. **File Mover Plugin の起動**  
   プラグイン一覧から「File Mover Plugin」を探し、有効化します。

---

## Usage / 使い方

- **Moving Files**  
  Click the ribbon icon (folder icon) or run the command “Execute File Move” from the command palette to move files from the vault’s root folder to their designated directories.  
  リボンアイコン（フォルダアイコン）をクリックするか、コマンドパレットから「Execute File Move」コマンドを実行することで、ルートフォルダ内のファイルを指定のフォルダへ移動します。

- **Undo File Movement**  
  Run the “Undo File Move” command to revert all file moves and restore files to their original locations.  
  「Undo File Move」コマンドを実行すると、全ての移動を元に戻し、ファイルを元の位置に復元します。

- **Configuring Settings**  
  Open the plugin settings from **Settings → Community Plugins → File Mover Plugin**. Set the target folder for each file extension. Leaving a field empty means files with that extension will not be moved.  
  **設定 → Community Plugins → File Mover Plugin** から設定画面を開き、各拡張子に対応する移動先フォルダを設定してください。設定が空の場合、その拡張子のファイルは移動されません。

---

## Code Overview / コード概要

The plugin is built using Obsidian's API and includes the following key components:

- **File Rules Configuration**  
  A mapping object (`fileRules`) defines which file extensions should be moved and to which folders.

- **File Movement Execution**  
  The `executeFileMove()` function scans the vault’s root folder for files, determines their target directory based on extension, and moves them.  
  `executeFileMove()` 関数は、ルートフォルダ内のファイルをスキャンし、拡張子に基づいて移動先を決定、ファイルを移動します。

- **Safe Renaming**  
  The `safeRenameFile()` function handles name conflicts by appending a counter to the file name if necessary.  
  `safeRenameFile()` 関数は、同名ファイルが存在する場合に連番を付与して名前の衝突を回避します。

- **Undo Functionality**  
  A move history is maintained so that the `undoFileMove()` function can revert the file moves.  
  移動履歴を保持し、`undoFileMove()` 関数でファイルの移動を元に戻すことができます。

- **Settings UI**  
  A custom settings tab allows users to configure file movement rules with a folder suggestion modal for easy folder selection.  
  カスタム設定画面では、フォルダサジェストモーダルを使用して、簡単に移動先フォルダを設定できます。

---

## License / ライセンス

This project is licensed under the MIT License.  
本プロジェクトは MIT ライセンスの下で公開されています。

---

Feel free to adjust this README to better suit your project details or add any additional information you consider important.  
この README はプロジェクトの詳細に合わせて適宜調整してください。