// Open the roaming page in WebKit (the engine of Safari) inside an off-screen window, play through it, and write what happened.
// build:  xcrun swiftc -O tools/webkit/webkit_test.swift -o <out>        run:  <out> <page.html or http address> <steps.js> <out.json> [w] [h]
// steps.js is an async function body; it runs in the page after load and returns a JSON-able value. Errors of the page are collected.
import Cocoa
import WebKit
let a = CommandLine.arguments
guard a.count >= 4 else { print("usage: webkit_test page.html steps.js out.json [w] [h]"); exit(2) }
let page = a[1].hasPrefix("http://") || a[1].hasPrefix("https://") ? URL(string: a[1])! : URL(fileURLWithPath: a[1]), steps = try! String(contentsOfFile: a[2], encoding: .utf8), outp = a[3]
let W = a.count > 4 ? Double(a[4])! : 960, H = a.count > 5 ? Double(a[5])! : 600
final class D: NSObject, NSApplicationDelegate, WKNavigationDelegate, WKUIDelegate {
  var win: NSWindow!, web: WKWebView!, t0 = Date()
  func applicationDidFinishLaunching(_ n: Notification) {
    let cfg = WKWebViewConfiguration(); cfg.mediaTypesRequiringUserActionForPlayback = []
    cfg.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs"); cfg.websiteDataStore = .nonPersistent()
    let js = "window.__err=[];addEventListener('error',e=>window.__err.push('error: '+e.message));addEventListener('unhandledrejection',e=>window.__err.push('rejection: '+(e.reason&&e.reason.message||e.reason)));for(const k of ['error','warn']){const f=console[k];console[k]=(...x)=>{window.__err.push(k+': '+x.map(y=>y&&y.message||String(y)).join(' ').slice(0,1500));f.apply(console,x)}}"
    cfg.userContentController.addUserScript(WKUserScript(source: js, injectionTime: .atDocumentStart, forMainFrameOnly: true))
    // a window under the desktop picture, never activated: nothing appears on the screen
    win = NSWindow(contentRect: NSRect(x: 0, y: 0, width: W, height: H), styleMask: [.borderless], backing: .buffered, defer: false)
    win.isReleasedWhenClosed = false; web = WKWebView(frame: NSRect(x: 0, y: 0, width: W, height: H), configuration: cfg); web.navigationDelegate = self
    win.level = NSWindow.Level(rawValue: Int(CGWindowLevelForKey(.desktopWindow)) - 1); win.ignoresMouseEvents = true; win.collectionBehavior = [.canJoinAllSpaces, .stationary, .ignoresCycle]; web.setValue(false, forKey: "windowOcclusionDetectionEnabled")
    win.contentView = web; win.orderBack(nil); if page.isFileURL { web.loadFileURL(page, allowingReadAccessTo: page.deletingLastPathComponent()) } else { web.load(URLRequest(url: page, cachePolicy: .reloadIgnoringLocalCacheData)) }
    DispatchQueue.main.asyncAfter(deadline: .now() + 600) { self.end(["timeout": true]) }
  }
  func webView(_ w: WKWebView, didFinish nav: WKNavigation!) {
    print("loaded", Date().timeIntervalSince(t0))
    web.callAsyncJavaScript(steps, arguments: [:], in: nil, in: .page) { r in
      switch r { case .success(let v): self.end(["result": v]); case .failure(let e): self.end(["failure": String(describing: e)]) }
    }
  }
  func webView(_ w: WKWebView, didFail nav: WKNavigation!, withError e: Error) { end(["failure": "\(e)"]) }
  func webView(_ w: WKWebView, didFailProvisionalNavigation nav: WKNavigation!, withError e: Error) { end(["failure": "\(e)"]) }
  func webViewWebContentProcessDidTerminate(_ w: WKWebView) { end(["failure": "web content process ended"]) }
  func end(_ d: [String: Any]) {
    web.evaluateJavaScript("JSON.stringify({ua:navigator.userAgent,err:window.__err})") { v, _ in
      var o = d; if let s = v as? String { o["page"] = try? JSONSerialization.jsonObject(with: s.data(using: .utf8)!) }
      let data = (try? JSONSerialization.data(withJSONObject: o, options: [.prettyPrinted, .sortedKeys])) ?? "{}".data(using: .utf8)!
      try? data.write(to: URL(fileURLWithPath: outp), options: .atomic); print("written", outp); exit(0)
    }
    DispatchQueue.main.asyncAfter(deadline: .now() + 8) { exit(3) }
  }
}
let app = NSApplication.shared; app.setActivationPolicy(.prohibited); let d = D(); app.delegate = d; app.run()
