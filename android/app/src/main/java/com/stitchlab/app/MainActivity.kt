package com.stitchlab.app

import android.annotation.SuppressLint
import android.os.Bundle
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Initialize WebView programmatically for clean rendering
        webView = WebView(this)
        setContentView(webView)

        val settings = webView.settings

        // 1. Enable JavaScript - absolutely critical for React/Vite single-page applications
        settings.javaScriptEnabled = true

        // 2. Enable DOM Storage - critical for standard Web APIs like localStorage and sessionStorage
        settings.domStorageEnabled = true

        // 3. Optimize local files / cache settings
        settings.cacheMode = WebSettings.LOAD_DEFAULT
        settings.databaseEnabled = true

        // 4. File access setups for file:///android_asset/ local offline directories
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        
        // Prevent external web links from breaking out to default browser; keep them in WebView
        webView.webViewClient = object : WebViewClient() {
            @Deprecated("Deprecated in Java")
            override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                // Return false to let the WebView load the URL locally
                return false
            }
        }

        // 5. Load the local offline entrypoint from mainassets
        webView.loadUrl("file:///android_asset/index.html")
    }

    // Support device back button navigation inside the web history context
    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
