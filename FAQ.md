# 疑难解答

## “找不到蓝牙硬件，或浏览器不支持。”
请首先检查是否授予相关权限。但多数情况下是浏览器不支持所致。

我们推荐使用**最新的** Google Chrome 或 Microsoft Edge 浏览器。您也可以自行试验其他您常用的浏览器。

注意，受 Apple 限制， iOS 上的 Chrome 仍无法使用蓝牙功能。  
您需要前往 App Store 下载 [Path Browser](https://apps.apple.com/us/app/id1519521388) 浏览器以使用蓝牙水控器 FOSS。

- 如果您准备在 iOS 上使用蓝牙水控器 FOSS，您不需要将 Path Browser 作为您的日用浏览器。  
在 Path Browser 打开蓝牙水控器 FOSS 后，点击右上角 “ ⋮ ” 符号，点击 Add to Home Screen，根据提示操作，可将蓝牙水控器 FOSS 添加到桌面。

## 快速启动（“直连上次使用设备”）
目前，若要使用快速启动，需要满足以下几个条件。
- 电脑或 Android（即除了 iOS 以外的任意平台）
- Chrome 或 Edge 浏览器
- 浏览器版本号大于等于 85
- 开启“实验性 Web 平台特性”

> 开启方式：打开以下链接，从 Disable 或 Default 改为 Enable，重启浏览器即可。  
Chrome： chrome://flags/#enable-experimental-web-platform-features  
Edge： edge://flags/#enable-experimental-web-platform-features

## “蓝牙权限遭拒。”
在 Android 平台上，访问蓝牙设备的权限被归类在“位置信息”权限当中。因此，我们需要您授予这一权限。

默认情况下，浏览器会提示用户授权位置信息权限。但在一部分定制的 Android 系统中，这一权限默认是“否”，需要用户手动到系统设置中授权。

我们承诺不会利用这一权限对您进行跟踪或定位。
