import AppKit
import ApplicationServices
import CoreGraphics
import Foundation

struct WindowInfo: Codable {
    let height: Int
    let title: String
    let width: Int
    let windowId: UInt32
    let x: Int
    let y: Int
}

struct ProcessInfo: Codable {
    let bundleIdentifier: String?
    let executablePath: String?
    let localizedName: String?
    let pid: Int32
}

func fail(_ message: String) -> Never {
    FileHandle.standardError.write(Data("Tauri window helper failed: \(message)\n".utf8))
    exit(1)
}

func encode<T: Encodable>(_ value: T) {
    let encoder = JSONEncoder()
    encoder.outputFormatting = [.sortedKeys]

    do {
        let data = try encoder.encode(value)
        FileHandle.standardOutput.write(data)
        FileHandle.standardOutput.write(Data("\n".utf8))
    } catch {
        fail("could not encode JSON output: \(error)")
    }
}

func parsePid(_ rawValue: String?) -> pid_t {
    guard let rawValue, let pid = pid_t(rawValue), pid > 0 else {
        fail("expected a positive PID")
    }

    return pid
}

func parseDouble(_ rawValue: String?, label: String) -> Double {
    guard let rawValue, let value = Double(rawValue) else {
        fail("expected numeric \(label)")
    }

    return value
}

func copyAttribute(_ element: AXUIElement, _ attribute: String) -> CFTypeRef? {
    var value: CFTypeRef?
    let result = AXUIElementCopyAttributeValue(element, attribute as CFString, &value)
    return result == .success ? value : nil
}

func elementAttribute(_ element: AXUIElement, _ attribute: String) -> AXUIElement? {
    guard let value = copyAttribute(element, attribute),
          CFGetTypeID(value) == AXUIElementGetTypeID() else {
        return nil
    }

    return unsafeBitCast(value, to: AXUIElement.self)
}

func appElement(_ pid: pid_t) -> AXUIElement {
    guard AXIsProcessTrusted() else {
        fail("Accessibility permission is required for the calling terminal or Codex app")
    }

    return AXUIElementCreateApplication(pid)
}

func activate(_ pid: pid_t) {
    guard let app = NSRunningApplication(processIdentifier: pid) else {
        fail("PID \(pid) is not a running macOS application")
    }

    app.activate(options: [.activateAllWindows])
}

func performPress(_ element: AXUIElement, label: String) {
    let result = AXUIElementPerformAction(element, kAXPressAction as CFString)

    if result != .success {
        fail("could not press \(label): AX error \(result.rawValue)")
    }
}

func windowsForPid(_ pid: pid_t) -> [[String: Any]] {
    guard let windows = CGWindowListCopyWindowInfo(
        [.optionOnScreenOnly, .excludeDesktopElements],
        kCGNullWindowID
    ) as? [[String: Any]] else {
        return []
    }

    return windows.filter { window in
        (window[kCGWindowOwnerPID as String] as? Int32) == pid &&
            (window[kCGWindowLayer as String] as? Int) == 0
    }
}

func mainWindowInfo(_ pid: pid_t) -> WindowInfo {
    guard let window = windowsForPid(pid).first,
          let boundsDictionary = window[kCGWindowBounds as String] as? NSDictionary,
          let bounds = CGRect(dictionaryRepresentation: boundsDictionary),
          let windowId = window[kCGWindowNumber as String] as? UInt32 else {
        fail("could not find an on-screen layer-0 window for PID \(pid)")
    }

    return WindowInfo(
        height: Int(bounds.height.rounded()),
        title: window[kCGWindowName as String] as? String ?? "",
        width: Int(bounds.width.rounded()),
        windowId: windowId,
        x: Int(bounds.minX.rounded()),
        y: Int(bounds.minY.rounded())
    )
}

func closeMainWindow(_ pid: pid_t) {
    activate(pid)

    guard let windows = copyAttribute(appElement(pid), kAXWindowsAttribute) as? [AXUIElement],
          let mainWindow = windows.first,
          let closeButton = elementAttribute(mainWindow, kAXCloseButtonAttribute) else {
        fail("could not find the native close button for PID \(pid)")
    }

    performPress(closeButton, label: "native close button")
}

func clickWindowLocal(_ pid: pid_t, x: Double, y: Double) {
    activate(pid)

    let window = mainWindowInfo(pid)
    let point = CGPoint(x: Double(window.x) + x, y: Double(window.y) + y)
    let source = CGEventSource(stateID: .hidSystemState)

    func post(_ type: CGEventType) {
        guard let event = CGEvent(mouseEventSource: source, mouseType: type, mouseCursorPosition: point, mouseButton: .left) else {
            fail("could not create mouse event \(type.rawValue)")
        }

        event.post(tap: .cghidEventTap)
    }

    post(.mouseMoved)
    usleep(80_000)
    post(.leftMouseDown)
    usleep(80_000)
    post(.leftMouseUp)
}

func dragWindowLocal(_ pid: pid_t, startX: Double, startY: Double, deltaX: Double, deltaY: Double) {
    let window = mainWindowInfo(pid)
    let start = CGPoint(x: Double(window.x) + startX, y: Double(window.y) + startY)
    let source = CGEventSource(stateID: .hidSystemState)

    func post(_ type: CGEventType, _ point: CGPoint) {
        guard let event = CGEvent(mouseEventSource: source, mouseType: type, mouseCursorPosition: point, mouseButton: .left) else {
            fail("could not create mouse event \(type.rawValue)")
        }

        event.post(tap: .cghidEventTap)
    }

    post(.mouseMoved, start)
    usleep(80_000)
    post(.leftMouseDown, start)

    for step in 1...12 {
        let progress = Double(step) / 12
        let point = CGPoint(x: start.x + deltaX * progress, y: start.y + deltaY * progress)
        post(.leftMouseDragged, point)
        usleep(24_000)
    }

    let end = CGPoint(x: start.x + deltaX, y: start.y + deltaY)
    post(.leftMouseUp, end)
}

guard CommandLine.arguments.count >= 3 else {
    fail("expected a command and PID")
}

let command = CommandLine.arguments[1]
let pid = parsePid(CommandLine.arguments[2])

switch command {
case "process-info":
    let app = NSRunningApplication(processIdentifier: pid)
    encode(ProcessInfo(
        bundleIdentifier: app?.bundleIdentifier,
        executablePath: app?.executableURL?.path,
        localizedName: app?.localizedName,
        pid: pid
    ))
case "window-info":
    encode(mainWindowInfo(pid))
case "close-main-window":
    closeMainWindow(pid)
case "click-window-local":
    guard CommandLine.arguments.count == 5 else {
        fail("click-window-local expects x y")
    }
    clickWindowLocal(
        pid,
        x: parseDouble(CommandLine.arguments[3], label: "x"),
        y: parseDouble(CommandLine.arguments[4], label: "y")
    )
case "drag-window-local":
    guard CommandLine.arguments.count == 7 else {
        fail("drag-window-local expects startX startY deltaX deltaY")
    }
    dragWindowLocal(
        pid,
        startX: parseDouble(CommandLine.arguments[3], label: "startX"),
        startY: parseDouble(CommandLine.arguments[4], label: "startY"),
        deltaX: parseDouble(CommandLine.arguments[5], label: "deltaX"),
        deltaY: parseDouble(CommandLine.arguments[6], label: "deltaY")
    )
default:
    fail("unknown command \(command.debugDescription)")
}
