import { calculateRms } from './features.js';

export interface BurstSegment {
  startSample: number;
  endSample: number;
  durationMs: number;
}

export interface SegmenterOptions {
  sampleRate: number;
  frameSizeMs?: number;      // e.g. 25ms
  hopSizeMs?: number;        // e.g. 10ms
  silenceThresholdRms?: number; // Manual override or adaptive if omitted
  minBurstDurationMs?: number;  // ignore clicks shorter than e.g. 35ms
}

export interface SegmentationAnalysis {
  bursts: BurstSegment[];
  burstCount: number;
  averageBurstIntervalMs: number;
  totalActiveDurationMs: number;
  estimatedNoiseFloorRms: number;
  adaptiveThresholdRms: number;
}

export function segmentVocalizations(
  audioData: Float32Array | number[],
  options: SegmenterOptions
): SegmentationAnalysis {
  const sampleRate = options.sampleRate;
  const frameSize = Math.floor((options.frameSizeMs ?? 25) * (sampleRate / 1000));
  const hopSize = Math.floor((options.hopSizeMs ?? 10) * (sampleRate / 1000));
  const minBurstSamples = Math.floor((options.minBurstDurationMs ?? 35) * (sampleRate / 1000));

  // 1. First Pass: Compute all frame RMS values to calculate adaptive noise floor
  const frameRmsList: number[] = [];
  for (let i = 0; i + frameSize <= audioData.length; i += hopSize) {
    const frame = audioData.slice(i, i + frameSize);
    frameRmsList.push(calculateRms(frame));
  }

  let noiseFloor = 0.005;
  let adaptiveThreshold = options.silenceThresholdRms ?? 0.012;

  if (frameRmsList.length > 5) {
    const sortedRms = [...frameRmsList].sort((a, b) => a - b);
    const p15Idx = Math.floor(sortedRms.length * 0.15);
    noiseFloor = sortedRms[p15Idx] ?? 0.005;

    // If no manual threshold provided, dynamically calibrate relative to noise floor
    if (options.silenceThresholdRms === undefined) {
      adaptiveThreshold = Math.max(0.004, Math.min(0.045, noiseFloor * 2.2 + 0.002));
    }
  }

  // 2. Second Pass: Segment vocal bursts based on adaptive threshold
  const bursts: BurstSegment[] = [];
  let inBurst = false;
  let burstStart = 0;

  for (let i = 0; i + frameSize <= audioData.length; i += hopSize) {
    const frameIdx = Math.floor(i / hopSize);
    const rms = frameRmsList[frameIdx] ?? 0;

    if (rms >= adaptiveThreshold) {
      if (!inBurst) {
        inBurst = true;
        burstStart = i;
      }
    } else {
      if (inBurst) {
        inBurst = false;
        const burstEnd = i;
        if (burstEnd - burstStart >= minBurstSamples) {
          bursts.push({
            startSample: burstStart,
            endSample: burstEnd,
            durationMs: Math.round(((burstEnd - burstStart) / sampleRate) * 1000),
          });
        }
      }
    }
  }

  // Handle segment that reaches the end of buffer
  if (inBurst) {
    const burstEnd = audioData.length;
    if (burstEnd - burstStart >= minBurstSamples) {
      bursts.push({
        startSample: burstStart,
        endSample: burstEnd,
        durationMs: Math.round(((burstEnd - burstStart) / sampleRate) * 1000),
      });
    }
  }

  // 3. Calculate Burst Intervals
  let totalIntervalMs = 0;
  let intervalCount = 0;
  for (let b = 1; b < bursts.length; b++) {
    const prevBurst = bursts[b - 1]!;
    const currBurst = bursts[b]!;
    const intervalSamples = currBurst.startSample - prevBurst.endSample;
    const intervalMs = (intervalSamples / sampleRate) * 1000;
    if (intervalMs >= 0) {
      totalIntervalMs += intervalMs;
      intervalCount++;
    }
  }

  const averageBurstIntervalMs =
    intervalCount > 0 ? Math.round(totalIntervalMs / intervalCount) : 0;

  const totalActiveDurationMs = bursts.reduce((acc, b) => acc + b.durationMs, 0);

  return {
    bursts,
    burstCount: bursts.length,
    averageBurstIntervalMs,
    totalActiveDurationMs:
      totalActiveDurationMs > 0
        ? totalActiveDurationMs
        : Math.round((audioData.length / sampleRate) * 1000),
    estimatedNoiseFloorRms: Math.round(noiseFloor * 10000) / 10000,
    adaptiveThresholdRms: Math.round(adaptiveThreshold * 10000) / 10000,
  };
}
