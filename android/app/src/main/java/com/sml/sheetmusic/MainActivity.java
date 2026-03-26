package com.sml.sheetmusic;

import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // NOTE: 禁用 WebView 原生 overscroll 拉伸动画
        // 避免底部导航栏在 overscroll 时跟随整个 WebView 一起形变
        WebView webView = getBridge().getWebView();
        webView.setOverScrollMode(WebView.OVER_SCROLL_NEVER);
    }
}
