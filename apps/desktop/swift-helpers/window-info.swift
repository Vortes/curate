import CoreGraphics
import Foundation
import AppKit

// Parse CLI arguments: x y width height
guard CommandLine.arguments.count == 5,
      let x = Double(CommandLine.arguments[1]),
      let y = Double(CommandLine.arguments[2]),
      let w = Double(CommandLine.arguments[3]),
      let h = Double(CommandLine.arguments[4]) else {
    fputs("Usage: window-info <x> <y> <width> <height>\n", stderr)
    exit(1)
}

let selectedRect = CGRect(x: x, y: y, width: w, height: h)
let selectedArea = selectedRect.width * selectedRect.height

// Fetch all visible on-screen windows
guard let windowList = CGWindowListCopyWindowInfo(.optionOnScreenOnly, kCGNullWindowID) as? [[String: Any]] else {
    fputs("Failed to get window list\n", stderr)
    exit(1)
}

struct WindowMatch {
    let appName: String
    let bundleId: String?
    let windowTitle: String?
    let overlapRatio: CGFloat
}

// CGWindowListCopyWindowInfo returns windows in front-to-back z-order.
// We take the frontmost window that covers at least 25% of the selected region.
// If nothing meets the threshold, fall back to the frontmost window with any overlap.
let overlapThreshold: CGFloat = 0.25
var bestMatch: WindowMatch? = nil
var fallbackMatch: WindowMatch? = nil

for window in windowList {
    // Filter: layer must be 0 (normal windows only)
    guard let layer = window[kCGWindowLayer as String] as? Int, layer == 0 else {
        continue
    }

    // Filter: must have a non-empty owner name
    guard let ownerName = window[kCGWindowOwnerName as String] as? String,
          !ownerName.isEmpty else {
        continue
    }

    // Filter: exclude our own app
    if ownerName == "Synthesis" {
        continue
    }

    // Parse window bounds
    guard let boundsDict = window[kCGWindowBounds as String] as? [String: Any] else {
        continue
    }

    var windowRect = CGRect.zero
    let boundsRef = boundsDict as CFDictionary
    guard CGRectMakeWithDictionaryRepresentation(boundsRef, &windowRect) else {
        continue
    }

    // Compute intersection area as ratio of the selected region
    let intersection = selectedRect.intersection(windowRect)
    guard !intersection.isNull && !intersection.isEmpty else {
        continue
    }
    let area = intersection.width * intersection.height
    guard area > 0, selectedArea > 0 else {
        continue
    }
    let ratio = area / selectedArea

    // Resolve bundle ID from PID
    var bundleId: String? = nil
    if let pid = window[kCGWindowOwnerPID as String] as? Int32 {
        bundleId = NSRunningApplication(processIdentifier: pid)?.bundleIdentifier
    }

    // Window title (may be absent or empty)
    let windowTitle = window[kCGWindowName as String] as? String

    let match = WindowMatch(
        appName: ownerName,
        bundleId: bundleId,
        windowTitle: (windowTitle?.isEmpty == false) ? windowTitle : nil,
        overlapRatio: ratio
    )

    // Take the first (frontmost) window that meets the threshold
    if ratio >= overlapThreshold {
        bestMatch = match
        break
    }

    // Track the frontmost window with any overlap as fallback
    if fallbackMatch == nil {
        fallbackMatch = match
    }
}

// Use threshold match if found, otherwise fall back to frontmost overlapping window
let finalMatch = bestMatch ?? fallbackMatch

// --- Firefox-based browser URL reading via Accessibility API ---
// For Firefox-based browsers, read the URL bar combo box value directly.
let firefoxBundleIds: Set<String> = [
    "org.mozilla.firefox",
    "org.mozilla.firefoxdeveloperedition",
    "app.zen-browser.zen",
    "net.waterfox.waterfox",
    "io.gitlab.librewolf-community",
]

func readFirefoxUrl(pid: Int32) -> String? {
    let axApp = AXUIElementCreateApplication(pid)

    var windowValue: CFTypeRef?
    guard AXUIElementCopyAttributeValue(axApp, kAXWindowsAttribute as CFString, &windowValue) == .success,
          let windows = windowValue as? [AXUIElement],
          let window = windows.first else {
        return nil
    }

    // Walk: window -> group(s) -> toolbar with description "Navigation" -> group -> combo box -> value
    func getChildren(_ element: AXUIElement) -> [AXUIElement] {
        var value: CFTypeRef?
        AXUIElementCopyAttributeValue(element, kAXChildrenAttribute as CFString, &value)
        return (value as? [AXUIElement]) ?? []
    }

    func getRole(_ element: AXUIElement) -> String {
        var value: CFTypeRef?
        AXUIElementCopyAttributeValue(element, kAXRoleAttribute as CFString, &value)
        return (value as? String) ?? ""
    }

    func getDescription(_ element: AXUIElement) -> String {
        var value: CFTypeRef?
        AXUIElementCopyAttributeValue(element, kAXDescriptionAttribute as CFString, &value)
        return (value as? String) ?? ""
    }

    func getValue(_ element: AXUIElement) -> String? {
        var value: CFTypeRef?
        AXUIElementCopyAttributeValue(element, kAXValueAttribute as CFString, &value)
        return value as? String
    }

    // window -> first group
    let groups = getChildren(window).filter { getRole($0) == "AXGroup" }
    guard let group1 = groups.first else { return nil }

    // group -> toolbar with description "Navigation"
    let toolbars = getChildren(group1).filter { getRole($0) == "AXToolbar" }
    var navToolbar: AXUIElement? = nil
    for tb in toolbars {
        if getDescription(tb) == "Navigation" {
            navToolbar = tb
            break
        }
    }
    // Fallback to first toolbar if none has "Navigation" description
    guard let toolbar = navToolbar ?? toolbars.first else { return nil }

    // toolbar -> group -> combo box
    let tbGroups = getChildren(toolbar).filter { getRole($0) == "AXGroup" }
    guard let tbGroup = tbGroups.first else { return nil }

    let comboBoxes = getChildren(tbGroup).filter { getRole($0) == "AXComboBox" }
    guard let comboBox = comboBoxes.first else { return nil }

    guard let urlValue = getValue(comboBox), !urlValue.isEmpty else { return nil }
    return urlValue
}

// Build output dictionary
var output: [String: Any] = [:]

if let match = finalMatch {
    output["appName"] = match.appName
    output["bundleId"] = match.bundleId as Any
    output["windowTitle"] = match.windowTitle as Any

    // If the matched window is a Firefox-based browser, read the URL bar
    if let bundleId = match.bundleId, firefoxBundleIds.contains(bundleId) {
        // Need the PID to create an AXUIElement
        // Re-scan to find it (we already have it from the window list)
        for window in windowList {
            guard let ownerName = window[kCGWindowOwnerName as String] as? String,
                  ownerName == match.appName,
                  let pid = window[kCGWindowOwnerPID as String] as? Int32 else {
                continue
            }
            if let url = readFirefoxUrl(pid: pid) {
                output["browserUrl"] = url
            }
            break
        }
    }
} else {
    output["appName"] = NSNull()
    output["bundleId"] = NSNull()
    output["windowTitle"] = NSNull()
}

// Serialize and print JSON
do {
    let data = try JSONSerialization.data(withJSONObject: output, options: [.sortedKeys])
    if let jsonString = String(data: data, encoding: .utf8) {
        print(jsonString)
    } else {
        fputs("Failed to encode JSON string\n", stderr)
        exit(1)
    }
} catch {
    fputs("JSON serialization error: \(error)\n", stderr)
    exit(1)
}
