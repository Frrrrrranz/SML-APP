/**
 * 生成作曲家首字母头像 URL（使用 ui-avatars.com 外部服务）
 * NOTE: 与设置页的账号头像逻辑一致，但使用预设浅色背景而非 random，
 * 避免深色背景在 grayscale + mix-blend-multiply 滤镜下字母不可读。
 * 浅色背景在滤镜处理后会呈现统一的暖金色调，视觉效果一致。
 */

// 预设一组高亮度（浅色）背景，经过 grayscale+sepia 后均呈现暖米色调
const LIGHT_BACKGROUNDS = [
    'E8D5C4', // 暖桃色
    'D4E8C2', // 浅绿色
    'C4D5E8', // 浅蓝色
    'E8C4D4', // 浅粉色
    'E8E0C4', // 暖黄色
    'C4E8E6', // 浅青色
    'D4C4E8', // 浅紫色
    'E8D9C4', // 暖米色
    'C8E8C4', // 薄荷绿
    'E8C4C4', // 浅珊瑚色
];

/**
 * 根据字符串生成稳定的非负整数哈希
 */
function hashName(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0; // 转 32 位整数
    }
    return Math.abs(hash);
}

export function getComposerAvatarUrl(name: string): string {
    const safeName = name || '?';
    // NOTE: 使用名字哈希选取浅色背景，保证同一作曲家颜色稳定
    const bg = LIGHT_BACKGROUNDS[hashName(safeName) % LIGHT_BACKGROUNDS.length];
    // 深色文字（555555）在浅色背景上清晰可读，经滤镜后呈暗金色
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(safeName)}&background=${bg}&color=555555&size=128&bold=true`;
}
