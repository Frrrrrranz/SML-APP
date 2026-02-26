import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.sml.sheetmusic',
    appName: 'SML',
    webDir: 'dist',
    // NOTE: 生产环境使用打包后的 Web 资源，开发时可指向 dev server
    server: {
        // 开发调试时取消注释以下行，指向本地 dev server
        // url: 'http://192.168.1.49:3000',
        // cleartext: true,
    },
    // NOTE: 阻止键盘弹出时推动页面内容，解决 Modal 中输入框弹键盘时整体上移的问题
    plugins: {
        Keyboard: {
            resize: 'none',
            scrollDisabled: true,
        },
    },
};

export default config;
