const fs = require("fs");
const path = require("path");
const { promisify } = require("util");
const { exec } = require("child_process");

let ffmpegPath = "ffmpeg";
let ffprobePath = "ffprobe";

try {
  ffmpegPath = require("ffmpeg-static");
  ffprobePath = require("ffprobe-static").path;
  console.log("Using embedded FFmpeg binaries");
} catch {
  console.log(
    "Using system FFmpeg (install ffmpeg-static for embedded version)"
  );
}

const execAsync = promisify(exec);
const readFileAsync = promisify(fs.readFile);
const mkdirAsync = promisify(fs.mkdir);
const readdirAsync = promisify(fs.readdir);
const unlinkAsync = promisify(fs.unlink);

class DualLayerVideoDecoder {
  constructor(config = {}) {
    this.workDir = config.workDir || "./temp_decode";
    this.frameInterval = config.frameInterval || 10;
    this.audioFrequency = config.audioFrequency || 18;
    this.sampleRate = config.sampleRate || 44100;
    this.bitDuration = config.bitDuration || 0.1;
  }

  async initialize() {
    const dirs = [
      this.workDir,
      path.join(this.workDir, "frames"),
      path.join(this.workDir, "audio"),
    ];
    for (const dir of dirs) await mkdirAsync(dir, { recursive: true });
  }

  async cleanup() {
    const deleteRecursive = async (dir) => {
      if (!fs.existsSync(dir)) return;
      const files = await readdirAsync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) await deleteRecursive(filePath);
        else await unlinkAsync(filePath);
      }
      fs.rmSync(dir, { force: true, recursive: true });
    };
    await deleteRecursive(this.workDir);
  }

  binaryToString(binary) {
    return (binary.match(/.{8}/g) || [])
      .map((b) => String.fromCharCode(parseInt(b, 2)))
      .join("");
  }

  async extractFrames(videoPath) {
    const framesDir = path.join(this.workDir, "frames").replace(/\\/g, "/");
    const command = `"${ffmpegPath}" -i "${videoPath}" -vf fps=30 "${framesDir}/frame_%05d.png"`;
    console.log("   Extracting frames...");
    await execAsync(command);
    const frames = (await readdirAsync(framesDir))
      .filter((f) => f.endsWith(".png"))
      .sort();
    return frames;
  }

  async extractFromFrame(framePath) {
    const imageData = await readFileAsync(framePath);
    const buffer = Buffer.from(imageData);
    let dataStart = -1;

    for (let i = 8; i < buffer.length - 4; i++) {
      if (buffer.toString("ascii", i, i + 4) === "IDAT") {
        dataStart = i + 8;
        break;
      }
    }

    if (dataStart === -1 || dataStart >= buffer.length) return "";

    const bits = [];
    let byteIndex = dataStart;

    while (byteIndex < buffer.length - 100 && bits.length < 10000) {
      const bit = buffer[byteIndex] & 0x01;
      bits.push(bit.toString());
      byteIndex += 7;
    }

    return bits.join("");
  }

  async extractFromFrames(frames) {
    let allBits = "";
    const targetFrames = frames.filter(
      (_, idx) => idx % this.frameInterval === 0
    );

    console.log(`   Analyzing ${targetFrames.length} encoded frames...`);

    for (const frame of targetFrames) {
      const framePath = path.join(this.workDir, "frames", frame);
      const bits = await this.extractFromFrame(framePath);
      allBits += bits;
    }

    if (allBits.length < 32) {
      console.log("   [i] Not enough data found in frames");
      return null;
    }

    const lengthBits = allBits.substring(0, 32);
    const messageLength = parseInt(lengthBits, 2);

    if (
      isNaN(messageLength) ||
      messageLength <= 0 ||
      messageLength > allBits.length - 32
    ) {
      console.log("   [i] Invalid message length detected");
      return null;
    }

    const messageBits = allBits.substring(32, 32 + messageLength);
    return this.binaryToString(messageBits);
  }

  async extractAudio(videoPath) {
    const audioPath = path
      .join(this.workDir, "audio", "extracted.wav")
      .replace(/\\/g, "/");
    const command = `"${ffmpegPath}" -i "${videoPath}" -vn -acodec pcm_s16le -ar ${this.sampleRate} -ac 1 "${audioPath}"`;

    try {
      await execAsync(command);
      return audioPath;
    } catch (error) {
      console.log("   No audio stream found");
      return null;
    }
  }

  async extractAudioWatermark(audioPath) {
    const audioData = await readFileAsync(audioPath);
    const samples = [];

    for (let i = 44; i < audioData.length; i += 2) {
      samples.push(audioData.readInt16LE(i) / 32768.0);
    }

    const samplesPerBit = Math.floor(this.sampleRate * this.bitDuration);
    const bits = [];

    for (let i = 0; i < samples.length; i += samplesPerBit) {
      if (i + samplesPerBit > samples.length) break;

      const segment = samples.slice(i, i + samplesPerBit);
      let lowFreqEnergy = 0;
      let highFreqEnergy = 0;

      for (let j = 0; j < segment.length; j++) {
        const t = j / this.sampleRate;
        const lowSample = Math.sin(
          2 * Math.PI * (this.audioFrequency * 0.5) * t
        );
        const highSample = Math.sin(2 * Math.PI * this.audioFrequency * t);

        lowFreqEnergy += segment[j] * lowSample;
        highFreqEnergy += segment[j] * highSample;
      }

      bits.push(Math.abs(highFreqEnergy) > Math.abs(lowFreqEnergy) ? "1" : "0");
    }

    const allBits = bits.join("");

    if (allBits.length < 32) {
      console.log("   [i] Not enough audio data");
      return null;
    }

    const lengthBits = allBits.substring(0, 32);
    const messageLength = parseInt(lengthBits, 2);

    if (
      isNaN(messageLength) ||
      messageLength <= 0 ||
      messageLength > allBits.length - 32
    ) {
      console.log("   [i] Invalid audio watermark length");
      return null;
    }

    const messageBits = allBits.substring(32, 32 + messageLength);
    return this.binaryToString(messageBits);
  }

  async extractMetadata(videoPath) {
    try {
      const command = `"${ffprobePath}" -v quiet -print_format json -show_format "${videoPath}"`;
      const { stdout } = await execAsync(command);
      const data = JSON.parse(stdout);

      if (data.format && data.format.tags) {
        const tags = data.format.tags;
        const metadata = {
          title: tags.title || tags.Title || null,
          comment: tags.comment || tags.Comment || null,
          description: tags.description || tags.Description || null,
        };

        if (metadata.comment) {
          try {
            const decoded = metadata.comment
              .match(/.{1,2}/g)
              .map((hex) => String.fromCharCode(parseInt(hex, 16)))
              .join("");
            return decoded;
          } catch (e) {
            console.log("   [i] Could not decode metadata");
          }
        }
      }
    } catch (error) {
      console.log("   [i] Could not extract metadata");
    }
    return null;
  }

  async decode(inputVideo) {
    console.log("[+] Starting dual-layer decoding...");
    await this.initialize();

    const results = {
      visual: null,
      audio: null,
      metadata: null,
    };

    console.log("[i] Extracting frames...");
    const frames = await this.extractFrames(inputVideo);
    console.log(`   Found ${frames.length} frames`);

    console.log("[i] Decoding visual steganography...");
    results.visual = await this.extractFromFrames(frames);
    if (results.visual) {
      console.log(`   [+] Visual layer: "${results.visual}"`);
    } else {
      console.log("   [-] Visual layer: No data found");
    }

    console.log("[i] Decoding audio watermark...");
    const audioPath = await this.extractAudio(inputVideo);
    if (audioPath) {
      results.audio = await this.extractAudioWatermark(audioPath);
      if (results.audio) {
        console.log(`   [+] Audio layer: "${results.audio}"`);
      } else {
        console.log("   [-] Audio layer: No data found");
      }
    }

    console.log("[i] Extracting metadata...");
    results.metadata = await this.extractMetadata(inputVideo);
    if (results.metadata) {
      console.log(`   [+] Metadata layer: "${results.metadata}"`);
    } else {
      console.log("   [-] Metadata layer: No data found");
    }

    console.log("[i] Cleaning up...");
    await this.cleanup();

    console.log("\n" + "=".repeat(60));
    console.log("[i] DECODING RESULTS");
    console.log("=".repeat(60));

    if (results.visual || results.audio || results.metadata) {
      console.log("\n[+] Successfully decoded secret message from:");
      if (results.visual)
        console.log(`   [i] Visual Layer:  ${results.visual}`);
      if (results.audio) console.log(`   [i] Audio Layer:   ${results.audio}`);
      if (results.metadata)
        console.log(`   [i] Metadata Layer: ${results.metadata}`);

      const allMatch =
        results.visual === results.audio && results.audio === results.metadata;
      const someMatch =
        results.visual === results.audio ||
        results.visual === results.metadata ||
        results.audio === results.metadata;

      if (allMatch && results.visual) {
        console.log("\n[+] All layers match! Message verified.");
      } else if (someMatch) {
        console.log(
          "\n[i] Some layers don't match - this is often a false detection and can be ignored."
        );
      }
    } else {
      console.log("\n[-] No hidden message found in any layer");
    }

    console.log("=".repeat(60));

    return results;
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log("\n[!] Usage: node decoder.js <video_file.mp4>\n");
    console.log("Example: node decoder.js output_encoded1.mp4\n");
    process.exit(1);
  }

  const videoFile = args[0];
  
  if (!fs.existsSync(videoFile)) {
    console.error(`\n[!] Error: File "${videoFile}" not found!\n`);
    process.exit(1);
  }

  const decoder = new DualLayerVideoDecoder();
  decoder.decode(videoFile)
    .then(() => {
      console.log("\n[+] Decoding complete!\n");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n[!] Error during decoding:", error.message);
      console.error(error.stack);
      process.exit(1);
    });
}

module.exports = { DualLayerVideoDecoder };
