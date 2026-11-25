// What AVFoundation (QuickTime, Safari, iPhone) shows: the named frames of a film as sRGB pictures.
// frames film.mp4 outdir n1 n2 …
import AVFoundation
import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers
let a = CommandLine.arguments
let gen = AVAssetImageGenerator(asset: AVURLAsset(url: URL(fileURLWithPath: a[1])))
gen.requestedTimeToleranceBefore = .zero; gen.requestedTimeToleranceAfter = .zero
let sem = DispatchSemaphore(value: 0); var code: Int32 = 0
Task {
  do {
    for s in a[3...] {
      let n = Int(s)!
      let (img, t) = try await gen.image(at: CMTime(value: CMTimeValue(n), timescale: 24))
      let w = 1920, h = 1080
      let c = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: 0, space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
      c.interpolationQuality = .high
      c.draw(img, in: CGRect(x: 0, y: 0, width: w, height: h))
      let d = CGImageDestinationCreateWithURL(URL(fileURLWithPath: a[2] + "/av_\(n).png") as CFURL, UTType.png.identifier as CFString, 1, nil)!
      CGImageDestinationAddImage(d, c.makeImage()!, nil); CGImageDestinationFinalize(d)
      print(n, Int((t.seconds * 24).rounded()))
    }
  } catch { print("error", error); code = 1 }
  sem.signal()
}
sem.wait(); exit(code)
