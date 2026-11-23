// Sinh icon + splash cho app: con dấu triện đỏ son khắc chữ "俠" (hiệp) trên nền giấy.
//   swift scripts/make-icons.swift
// Ghi đè các file PNG trong assets/.
import AppKit

let paper = NSColor(red: 0xF3 / 255, green: 0xEF / 255, blue: 0xE6 / 255, alpha: 1)
let seal = NSColor(red: 0xB3 / 255, green: 0x30 / 255, blue: 0x2A / 255, alpha: 1)
let glyph = "俠"

func font(_ size: CGFloat) -> NSFont {
  for name in ["STSongti-SC-Black", "STSongti-SC-Bold", "STSong"] {
    if let f = NSFont(name: name, size: size) { return f }
  }
  return NSFontManager.shared.font(withFamily: "Songti SC", traits: .boldFontMask, weight: 9, size: size)
    ?? NSFont.boldSystemFont(ofSize: size)
}

/// Vẽ con dấu: khối đỏ hơi xoay, viền trong màu giấy, chữ "khắc" (màu nền) ở giữa.
/// - scale: tỉ lệ cạnh con dấu so với canvas
/// - monochrome: chỉ vẽ hình trắng (Android themed icon)
func drawSeal(in size: CGFloat, scale: CGFloat, background: NSColor?, monochrome: Bool = false) -> NSBitmapImageRep {
  let rep = NSBitmapImageRep(
    bitmapDataPlanes: nil, pixelsWide: Int(size), pixelsHigh: Int(size),
    bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
    colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
  NSGraphicsContext.saveGraphicsState()
  let ctx = NSGraphicsContext(bitmapImageRep: rep)!
  NSGraphicsContext.current = ctx
  let cg = ctx.cgContext

  if let bg = background {
    bg.setFill()
    NSRect(x: 0, y: 0, width: size, height: size).fill()
  } else {
    cg.clear(CGRect(x: 0, y: 0, width: size, height: size))
  }

  let side = size * scale
  let fill = monochrome ? NSColor.white : seal
  let carve = monochrome ? NSColor.clear : (background ?? paper)

  cg.saveGState()
  cg.translateBy(x: size / 2, y: size / 2)
  cg.rotate(by: -3 * .pi / 180)

  // khối con dấu
  let rect = CGRect(x: -side / 2, y: -side / 2, width: side, height: side)
  fill.setFill()
  NSBezierPath(roundedRect: rect, xRadius: side * 0.06, yRadius: side * 0.06).fill()

  // viền trong
  let inset = side * 0.075
  let inner = NSBezierPath(
    roundedRect: rect.insetBy(dx: inset, dy: inset), xRadius: side * 0.035, yRadius: side * 0.035)
  inner.lineWidth = side * 0.022
  if monochrome { cg.setBlendMode(.clear) }
  carve.setStroke()
  inner.stroke()

  // chữ khắc
  let f = font(side * 0.62)
  let attrs: [NSAttributedString.Key: Any] = [.font: f, .foregroundColor: monochrome ? NSColor.black : carve]
  let text = NSAttributedString(string: glyph, attributes: attrs)
  let bounds = text.boundingRect(with: .zero, options: [.usesLineFragmentOrigin, .usesFontLeading])
  let origin = CGPoint(x: -bounds.width / 2, y: -bounds.height / 2 - side * 0.01)
  text.draw(at: origin)
  cg.setBlendMode(.normal)
  cg.restoreGState()

  NSGraphicsContext.restoreGraphicsState()
  return rep
}

func save(_ rep: NSBitmapImageRep, _ path: String) {
  let data = rep.representation(using: .png, properties: [:])!
  try! data.write(to: URL(fileURLWithPath: path))
  print("✓ \(path)")
}

func solid(_ size: CGFloat, _ color: NSColor) -> NSBitmapImageRep {
  drawSeal(in: size, scale: 0, background: color)
}

let dir = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "assets"

save(drawSeal(in: 1024, scale: 0.64, background: paper), "\(dir)/icon.png")
// Android adaptive: foreground nằm trong vùng an toàn ~66%
save(drawSeal(in: 1024, scale: 0.44, background: nil), "\(dir)/android-icon-foreground.png")
save(solid(1024, paper), "\(dir)/android-icon-background.png")
save(drawSeal(in: 1024, scale: 0.44, background: nil, monochrome: true), "\(dir)/android-icon-monochrome.png")
save(drawSeal(in: 1024, scale: 0.7, background: nil), "\(dir)/splash-icon.png")
save(drawSeal(in: 48, scale: 0.86, background: paper), "\(dir)/favicon.png")
