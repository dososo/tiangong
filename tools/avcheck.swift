// A second, independent decoder: open the film with AVFoundation (what QuickTime, Safari and iPhones use) and read every frame and every sample.
// swiftc -O tools/avcheck.swift -o out/avcheck && out/avcheck delivery/tiangong_4k.mp4 4032 > evidence/avfoundation_4k.json
import AVFoundation
import CryptoKit
import Foundation

func fourcc(_ v: FourCharCode) -> String { String(bytes: [UInt8(v >> 24 & 255), UInt8(v >> 16 & 255), UInt8(v >> 8 & 255), UInt8(v & 255)], encoding: .ascii) ?? "?" }

let args = CommandLine.arguments
guard args.count >= 3, let want = Int(args[2]) else { print("usage: avcheck film.mp4 frames"); exit(2) }
let url = URL(fileURLWithPath: args[1])
let asset = AVURLAsset(url: url, options: [AVURLAssetPreferPreciseDurationAndTimingKey: true])
let done = DispatchSemaphore(value: 0)
func sha256(_ u: URL) -> String {
  guard let h = try? FileHandle(forReadingFrom: u) else { return "" }
  var d = SHA256()
  while let b = try? h.read(upToCount: 1 << 22), !b.isEmpty { d.update(data: b) }
  return d.finalize().map { String(format: "%02x", $0) }.joined()
}
var out: [String: Any] = ["schema_version": 1, "file": url.lastPathComponent, "sha256": sha256(url)]
var checks: [[String: Any]] = []
func ok(_ name: String, _ pass: Bool, _ info: Any) { checks.append(["name": name, "passed": pass, "info": info]) }

Task {
  do {
    let (playable, readable, exportable, duration) = try await asset.load(.isPlayable, .isReadable, .isExportable, .duration)
    ok("AVFoundation says it can play the file", playable && readable, ["playable": playable, "readable": readable, "exportable": exportable, "seconds": duration.seconds])
    let vt = try await asset.loadTracks(withMediaType: .video), at = try await asset.loadTracks(withMediaType: .audio)
    ok("one picture track and one sound track", vt.count == 1 && at.count == 1, ["video": vt.count, "audio": at.count])
    let v = vt[0]
    let (size, fps, formats, range) = try await v.load(.naturalSize, .nominalFrameRate, .formatDescriptions, .timeRange)
    let f = formats[0]
    let ext = CMFormatDescriptionGetExtensions(f) as? [String: Any] ?? [:]
    let prim = ext[kCMFormatDescriptionExtension_ColorPrimaries as String] as? String ?? "-", tran = ext[kCMFormatDescriptionExtension_TransferFunction as String] as? String ?? "-", mat = ext[kCMFormatDescriptionExtension_YCbCrMatrix as String] as? String ?? "-"
    ok("picture format", formats.count == 1 && size.width > 0, ["codec": fourcc(CMFormatDescriptionGetMediaSubType(f)), "size": [Int(size.width), Int(size.height)], "fps": fps, "start": range.start.seconds, "seconds": range.duration.seconds])
    ok("colour tags: Rec.709 primaries and matrix, sRGB curve", prim == "ITU_R_709_2" && tran == (kCMFormatDescriptionTransferFunction_sRGB as String) && mat == "ITU_R_709_2", [prim, tran, mat])
    let meta = try await asset.load(.commonMetadata)
    var title = "", cover = 0
    for m in meta {
      if m.commonKey == .commonKeyTitle { title = (try? await m.load(.stringValue)) ?? "" }
      if m.commonKey == .commonKeyArtwork { cover = ((try? await m.load(.dataValue))??.count) ?? 0 }
    }
    ok("title and cover picture are stored in the file", title == "天宫" && cover > 1000, ["title": title, "cover_bytes": cover])
    // pictures
    let t0 = Date()
    let r = try AVAssetReader(asset: asset)
    let vo = AVAssetReaderTrackOutput(track: v, outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: size.width > 2000 ? kCVPixelFormatType_420YpCbCr10BiPlanarVideoRange : kCVPixelFormatType_420YpCbCr8BiPlanarVideoRange])
    vo.alwaysCopiesSampleData = false
    r.add(vo)
    guard r.startReading() else { throw r.error ?? NSError(domain: "reader", code: 1) }
    var n = 0, bad = 0, last = CMTime.invalid, step = Set<String>()
    while let s = vo.copyNextSampleBuffer() {
      guard CMSampleBufferGetImageBuffer(s) != nil else { if CMSampleBufferGetNumSamples(s) > 0 { bad += 1 }; continue }
      let p = CMSampleBufferGetPresentationTimeStamp(s)
      if last.isValid { let d = CMTimeSubtract(p, last); step.insert(String(format: "%.6f", d.seconds)) }
      last = p; n += 1
    }
    ok("every picture decodes", r.status == .completed && n == want && bad == 0, ["frames": n, "expected": want, "undecoded": bad, "status": r.status.rawValue, "error": r.error?.localizedDescription ?? "", "seconds": Double(Int(Date().timeIntervalSince(t0) * 10)) / 10])
    ok("even frame steps of 1/24 s", step.count == 1 && step.first == "0.041667", Array(step).sorted())
    // sound
    let r2 = try AVAssetReader(asset: asset)
    let ao = AVAssetReaderTrackOutput(track: at[0], outputSettings: [AVFormatIDKey: kAudioFormatLinearPCM, AVLinearPCMBitDepthKey: 16, AVLinearPCMIsFloatKey: false, AVLinearPCMIsBigEndianKey: false, AVLinearPCMIsNonInterleaved: false])
    r2.add(ao)
    guard r2.startReading() else { throw r2.error ?? NSError(domain: "reader", code: 2) }
    var samples = 0, first = -1.0
    while let s = ao.copyNextSampleBuffer() { if first < 0 { first = CMSampleBufferGetPresentationTimeStamp(s).seconds }; samples += CMSampleBufferGetNumSamples(s) }
    let secs = Double(samples) / 48000
    ok("every sound sample decodes", r2.status == .completed && abs(secs - Double(want) / 24) < 0.08, ["seconds": secs, "first_pts": first, "status": r2.status.rawValue])
  } catch { ok("no error", false, "\(error)") }
  done.signal()
}
done.wait()
out["checks"] = checks; out["passed"] = checks.filter { $0["passed"] as! Bool }.count; out["total"] = checks.count
let d = try! JSONSerialization.data(withJSONObject: out, options: [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes])
print(String(data: d, encoding: .utf8)!)
exit((out["passed"] as! Int) == checks.count ? 0 : 1)
