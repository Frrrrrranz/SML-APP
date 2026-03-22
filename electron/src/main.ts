import { app, BrowserWindow, ipcMain, shell, Menu, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import Database from 'better-sqlite3';
import { initAutoUpdater } from './auto-updater';
import { getPreferredRendererEntry, initDesktopWebBundleUpdater } from './web-bundle-updater';

const LEGACY_USER_DATA_DIR_NAME = 'opus---sheet-music-manager';
const DESKTOP_USER_DATA_DIR_NAME = 'SML';

const configureDesktopUserDataPath = (): void => {
    const appDataRoot = app.getPath('appData');
    const targetUserDataDir = path.join(appDataRoot, DESKTOP_USER_DATA_DIR_NAME);
    const legacyUserDataDir = path.join(appDataRoot, LEGACY_USER_DATA_DIR_NAME);

    if (app.getPath('userData') !== targetUserDataDir) {
        app.setPath('userData', targetUserDataDir);
    }

    // Migrate old folder name to the new one once, so existing users keep their local data.
    if (!fs.existsSync(targetUserDataDir) && fs.existsSync(legacyUserDataDir)) {
        try {
            fs.renameSync(legacyUserDataDir, targetUserDataDir);
        } catch (error) {
            console.warn('[Electron] Failed to migrate legacy userData directory:', error);
        }
    }
};

configureDesktopUserDataPath();
app.setName('SML');

/**
 * SML Desktop — Electron 主进程
 * NOTE: 负责创建窗口、管理 SQLite 数据库、处理文件系统 IPC 调用
 */

// =============================================
// 常量与全局变量
// =============================================

// NOTE: 数据目录配置文件仅保存路径本身，体积极小
const STORAGE_CONFIG_PATH = path.join(app.getPath('userData'), 'storage-config.json');

// NOTE: 真正业务数据目录（数据库 + 乐谱 + 录音 + 头像）
let appDataDir = path.join(app.getPath('userData'), 'SML');

let mainWindow: BrowserWindow | null = null;
let db: Database.Database | null = null;

const getDbPath = (): string => path.join(appDataDir, 'sml_local.db');

const getSystemDrive = (): string =>
    (process.env.SystemDrive || 'C:').toUpperCase();

const isOnSystemDrive = (targetPath: string): boolean => {
    const normalized = path.resolve(targetPath);
    const rootDrive = path.parse(normalized).root.replace(/\\+$/, '').toUpperCase();
    return rootDrive === getSystemDrive();
};

const readStorageConfig = (): string | null => {
    try {
        if (!fs.existsSync(STORAGE_CONFIG_PATH)) return null;
        const raw = fs.readFileSync(STORAGE_CONFIG_PATH, 'utf-8');
        const parsed = JSON.parse(raw) as { dataDir?: string };
        return parsed.dataDir || null;
    } catch (error) {
        console.warn('[Electron] Failed to read storage config:', error);
        return null;
    }
};

const writeStorageConfig = (dataDir: string): void => {
    const payload = JSON.stringify({ dataDir }, null, 2);
    fs.writeFileSync(STORAGE_CONFIG_PATH, payload, 'utf-8');
};

const ensureStorageDirSelected = async (): Promise<boolean> => {
    const configured = readStorageConfig();
    if (configured && !isOnSystemDrive(configured)) {
        appDataDir = configured;
        fs.mkdirSync(appDataDir, { recursive: true });
        return true;
    }

    // 无有效配置时，首次启动强制选择数据目录（禁止 C 盘）
    while (true) {
        const result = await dialog.showOpenDialog({
            title: '选择 SML 数据存储目录（请勿选择 C 盘）',
            properties: ['openDirectory', 'createDirectory', 'promptToCreate'],
            message: '乐谱、录音和数据库将存储在你选择的目录下',
            buttonLabel: '选择此目录',
        });

        if (result.canceled || result.filePaths.length === 0) {
            const confirm = await dialog.showMessageBox({
                type: 'warning',
                buttons: ['退出应用', '继续选择'],
                defaultId: 1,
                cancelId: 0,
                title: '未选择数据目录',
                message: '必须先选择非 C 盘的数据目录，应用才能继续使用。',
            });
            if (confirm.response === 0) return false;
            continue;
        }

        const selectedRoot = result.filePaths[0];
        if (isOnSystemDrive(selectedRoot)) {
            await dialog.showMessageBox({
                type: 'error',
                title: '不支持 C 盘',
                message: '为避免占用系统盘空间，请选择非 C 盘目录。',
            });
            continue;
        }

        appDataDir = path.join(selectedRoot, 'SML');
        fs.mkdirSync(appDataDir, { recursive: true });
        writeStorageConfig(appDataDir);
        return true;
    }
};

// =============================================
// 数据库初始化
// =============================================

/**
 * 初始化 SQLite 数据库
 * NOTE: 使用 better-sqlite3，同步 API，性能优于异步方案
 */
const initDatabase = (): void => {
    // 确保数据目录存在
    fs.mkdirSync(appDataDir, { recursive: true });

    db = new Database(getDbPath());

    // 启用 WAL 模式提升并发性能
    db.pragma('journal_mode = WAL');
    // 启用外键约束
    db.pragma('foreign_keys = ON');

    console.log('[Electron] Database initialized at:', getDbPath());
};

// =============================================
// IPC Handlers：SQLite
// =============================================

const registerDbHandlers = (): void => {
    /** 查询：返回结果行数组 */
    ipcMain.handle('db:query', (_event, sql: string, params?: unknown[]) => {
        if (!db) throw new Error('Database not initialized');
        const stmt = db.prepare(sql);
        return params ? stmt.all(...params) : stmt.all();
    });

    /** 写入：返回 changes 和 lastInsertRowid */
    ipcMain.handle('db:run', (_event, sql: string, params?: unknown[]) => {
        if (!db) throw new Error('Database not initialized');
        const stmt = db.prepare(sql);
        const result = params ? stmt.run(...params) : stmt.run();
        return { changes: result.changes, lastInsertRowid: Number(result.lastInsertRowid) };
    });

    /** 执行多条 SQL（用于建表等 DDL） */
    ipcMain.handle('db:execute', (_event, sql: string) => {
        if (!db) throw new Error('Database not initialized');
        db.exec(sql);
    });
};

// =============================================
// IPC Handlers：文件系统
// =============================================

/**
 * 将相对路径解析为当前数据目录下的绝对路径
 * NOTE: 防止路径遍历攻击，确保文件操作不会逃出应用目录
 */
const resolveFilePath = (relativePath: string): string => {
    const resolved = path.resolve(appDataDir, relativePath);
    if (!resolved.startsWith(appDataDir)) {
        throw new Error('Path traversal detected');
    }
    return resolved;
};

const registerFsHandlers = (): void => {
    /** 写入文件，自动创建父目录 */
    ipcMain.handle('fs:writeFile', (_event, relativePath: string, base64Data: string) => {
        const fullPath = resolveFilePath(relativePath);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, Buffer.from(base64Data, 'base64'));
        return relativePath;
    });

    /** 读取文件，返回 base64 */
    ipcMain.handle('fs:readFile', (_event, relativePath: string) => {
        const fullPath = resolveFilePath(relativePath);
        const buffer = fs.readFileSync(fullPath);
        return buffer.toString('base64');
    });

    /** 删除文件 */
    ipcMain.handle('fs:deleteFile', (_event, relativePath: string) => {
        const fullPath = resolveFilePath(relativePath);
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
        }
    });

    /** 获取文件的 file:// URI */
    ipcMain.handle('fs:getUri', (_event, relativePath: string) => {
        const fullPath = resolveFilePath(relativePath);
        // NOTE: 将反斜杠转为正斜杠，构造合法的 file:// URI
        return `file:///${fullPath.replace(/\\/g, '/')}`;
    });

    /** 用系统默认应用打开文件 */
    ipcMain.handle('fs:openWith', async (_event, relativePath: string) => {
        // 支持 HTTP URL 直接打开
        if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
            await shell.openExternal(relativePath);
            return;
        }
        const fullPath = resolveFilePath(relativePath);
        if (!fs.existsSync(fullPath)) {
            throw new Error(`File not found: ${fullPath}`);
        }
        await shell.openPath(fullPath);
    });

    /** 列出目录中的文件 */
    ipcMain.handle('fs:readdir', (_event, relativePath: string) => {
        const fullPath = resolveFilePath(relativePath);
        if (!fs.existsSync(fullPath)) {
            return [];
        }
        const entries = fs.readdirSync(fullPath, { withFileTypes: true });
        return entries
            .filter(e => e.isFile())
            .map(e => {
                const filePath = path.join(fullPath, e.name);
                const stat = fs.statSync(filePath);
                return { name: e.name, size: stat.size };
            });
    });

    /** 创建目录（递归） */
    ipcMain.handle('fs:mkdir', (_event, relativePath: string) => {
        const fullPath = resolveFilePath(relativePath);
        fs.mkdirSync(fullPath, { recursive: true });
    });
};

// =============================================
// 窗口创建
// =============================================

const createWindow = (): void => {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 900,
        minHeight: 600,
        title: 'SML — Sheet Music Library',
        // NOTE: 使用 SML logo 作为窗口图标
        icon: path.join(__dirname, '..', 'icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            // NOTE: 安全配置，禁止渲染进程直接访问 Node.js API
            nodeIntegration: false,
            contextIsolation: true,
        },
        // 启动时不显示窗口，等加载完成后再显示，避免白屏闪烁
        show: false,
    });

    // 加载渲染资源：优先已安装的桌面 Web bundle，回退到内置 dist
    const entryPath = getPreferredRendererEntry();
    mainWindow.loadFile(entryPath);

    // Ensure preview windows spawned from window.open use the product title on desktop.
    mainWindow.webContents.setWindowOpenHandler(() => ({
        action: 'allow',
        overrideBrowserWindowOptions: {
            title: 'SML',
            autoHideMenuBar: true,
        },
    }));

    // 窗口准备好后再显示
    mainWindow.once('ready-to-show', () => {
        mainWindow?.show();
    });

    // 开发环境自动打开 DevTools
    if (process.argv.includes('--dev')) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
};

// =============================================
// 原生菜单栏
// =============================================

/**
 * 创建 Electron 原生菜单
 * NOTE: 通过 webContents.executeJavaScript 触发前端路由导航
 */
const createMenu = (): void => {
    const shouldShowAppMenu =
        process.argv.includes('--dev') || process.env.SML_DESKTOP_SHOW_MENU === '1';

    // 默认隐藏桌面菜单栏；仅在开发调试或显式开关下显示
    if (!shouldShowAppMenu) {
        Menu.setApplicationMenu(null);
        return;
    }

    const template: Electron.MenuItemConstructorOptions[] = [
        {
            label: '文件',
            submenu: [
                {
                    label: '新建作曲家',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => {
                        // NOTE: 触发前端的"新建作曲家"按钮
                        mainWindow?.webContents.executeJavaScript(
                            'window.location.hash = "#/"; document.querySelector("[data-add-composer]")?.click()'
                        );
                    },
                },
                { type: 'separator' },
                {
                    label: '退出',
                    accelerator: 'CmdOrCtrl+Q',
                    click: () => app.quit(),
                },
            ],
        },
        {
            label: '编辑',
            submenu: [
                { role: 'undo', label: '撤销' },
                { role: 'redo', label: '重做' },
                { type: 'separator' },
                { role: 'cut', label: '剪切' },
                { role: 'copy', label: '复制' },
                { role: 'paste', label: '粘贴' },
                { role: 'selectAll', label: '全选' },
            ],
        },
        {
            label: '视图',
            submenu: [
                {
                    label: '搜索',
                    accelerator: 'CmdOrCtrl+F',
                    click: () => {
                        mainWindow?.webContents.executeJavaScript(
                            'window.location.hash = "#/search"'
                        );
                    },
                },
                { type: 'separator' },
                { role: 'reload', label: '刷新' },
                { role: 'toggleDevTools', label: '开发者工具' },
                { type: 'separator' },
                { role: 'togglefullscreen', label: '全屏' },
                { role: 'zoomIn', label: '放大' },
                { role: 'zoomOut', label: '缩小' },
                { role: 'resetZoom', label: '重置缩放' },
            ],
        },
        {
            label: '帮助',
            submenu: [
                {
                    label: '关于 SML',
                    click: () => {
                        mainWindow?.webContents.executeJavaScript(
                            'window.location.hash = "#/settings"'
                        );
                    },
                },
                {
                    label: 'GitHub 仓库',
                    click: () => shell.openExternal('https://github.com/Frrrrrranz/SML'),
                },
            ],
        },
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
};

// =============================================
// 应用生命周期
// =============================================

app.whenReady().then(async () => {
    const storageReady = await ensureStorageDirSelected();
    if (!storageReady) {
        app.quit();
        return;
    }

    // NOTE: 数据库初始化失败不应阻塞窗口启动，IPC handlers 会在调用时检查 db 是否可用
    try {
        initDatabase();
    } catch (error) {
        console.error('[Electron] Database initialization failed (non-fatal):', error);
    }
    registerDbHandlers();
    registerFsHandlers();
    createMenu();
    createWindow();

    // NOTE: 桌面端 Web 热更新在开发/生产都可初始化；electron-updater 仅生产启用
    if (mainWindow) {
        initDesktopWebBundleUpdater(mainWindow);
    }
    if (mainWindow && !process.argv.includes('--dev')) {
        initAutoUpdater(mainWindow);
    }

    app.on('activate', () => {
        // macOS 惯例：点击 dock 图标时如果没有窗口则重新创建
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    // 关闭数据库连接
    if (db) {
        db.close();
        db = null;
    }
    // Windows / Linux：所有窗口关闭时退出应用
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
