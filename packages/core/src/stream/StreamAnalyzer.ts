import { PetHertz } from '../engine.js';
import { PetAcousticFeatures, PetAnalysisResult } from '../types/index.js';
import { calculateRms } from '../dsp/features.js';

export type StreamEventListener<T> = (data: T) => void;

export interface StreamAnalyzerOptions {
  windowDurationSec?: number;    // Rolling buffer duration in seconds (default: 1.5s)
  hopDurationSec?: number;       // Interval between analyses when active (default: 0.3s)
  silenceThresholdRms?: number;  // RMS threshold below which sound is considered silence (default: 0.015)
  debounceMs?: number;           // Cooldown between repeated intent triggers (default: 600ms)
  confidenceThreshold?: number;  // Minimum confidence threshold to trigger 'vocalization' event (default: 0.60)
}

export class PetStreamAnalyzer<TIntent = string, TVocalization = string> {
  private readonly engine: PetHertz<TIntent, TVocalization>;
  private readonly sampleRate: number;
  private readonly windowSamples: number;
  private readonly hopSamples: number;
  private readonly silenceThresholdRms: number;
  private readonly debounceMs: number;
  private readonly confidenceThreshold: number;

  private buffer: Float32Array;
  private sequentialBuffer: Float32Array;
  private writePointer = 0;
  private totalBufferedSamples = 0;
  private samplesSinceLastAnalysis = 0;
  private lastTriggerTime = 0;
  private wasInSilence = true;
  private paused = false;

  private listeners: {
    vocalization: StreamEventListener<PetAnalysisResult<TIntent, TVocalization>>[];
    silence: StreamEventListener<void>[];
    metrics: StreamEventListener<PetAcousticFeatures>[];
  } = {
    vocalization: [],
    silence: [],
    metrics: [],
  };

  constructor(
    engine: PetHertz<TIntent, TVocalization>,
    options: StreamAnalyzerOptions = {}
  ) {
    this.engine = engine;
    this.sampleRate = engine.defaultSampleRate;
    const windowSec = options.windowDurationSec ?? 1.5;
    const hopSec = options.hopDurationSec ?? 0.3;

    this.windowSamples = Math.floor(windowSec * this.sampleRate);
    this.hopSamples = Math.floor(hopSec * this.sampleRate);
    this.silenceThresholdRms = options.silenceThresholdRms ?? 0.015;
    this.debounceMs = options.debounceMs ?? 600;
    this.confidenceThreshold = options.confidenceThreshold ?? 0.60;

    this.buffer = new Float32Array(this.windowSamples);
    this.sequentialBuffer = new Float32Array(this.windowSamples);
  }

  /**
   * Register event listeners for streaming detections.
   */
  on(event: 'vocalization', listener: StreamEventListener<PetAnalysisResult<TIntent, TVocalization>>): this;
  on(event: 'silence', listener: StreamEventListener<void>): this;
  on(event: 'metrics', listener: StreamEventListener<PetAcousticFeatures>): this;
  on(event: string, listener: StreamEventListener<any>): this {
    if (event in this.listeners) {
      (this.listeners as any)[event].push(listener);
    }
    return this;
  }

  /**
   * Pause stream processing (useful for battery saving on IoT devices).
   */
  pause(): void {
    this.paused = true;
  }

  /**
   * Resume stream processing.
   */
  resume(): void {
    this.paused = false;
  }

  /**
   * Whether the stream analyzer is currently paused.
   */
  get isPaused(): boolean {
    return this.paused;
  }

  /**
   * Feed an incoming chunk of audio samples from microphone or continuous stream.
   */
  async push(chunk: Float32Array | number[]): Promise<void> {
    if (this.paused) return;

    const chunkLength = chunk.length;
    if (chunkLength === 0) return;

    // Append chunk into rolling circular buffer
    for (let i = 0; i < chunkLength; i++) {
      this.buffer[this.writePointer] = chunk[i] ?? 0;
      this.writePointer = (this.writePointer + 1) % this.windowSamples;
    }

    this.totalBufferedSamples += chunkLength;
    this.samplesSinceLastAnalysis += chunkLength;

    // Check if we have enough samples and interval reached
    if (
      this.totalBufferedSamples >= this.windowSamples / 2 &&
      this.samplesSinceLastAnalysis >= this.hopSamples
    ) {
      this.samplesSinceLastAnalysis = 0;
      await this.processWindow();
    }
  }

  private async processWindow(): Promise<void> {
    // Unroll circular buffer into pre-allocated sequential buffer without heap allocation
    const startIdx = this.writePointer;

    for (let i = 0; i < this.windowSamples; i++) {
      this.sequentialBuffer[i] = this.buffer[(startIdx + i) % this.windowSamples] ?? 0;
    }

    const currentRms = calculateRms(this.sequentialBuffer);

    if (currentRms < this.silenceThresholdRms) {
      if (!this.wasInSilence) {
        this.wasInSilence = true;
        this.emit('silence', undefined);
      }
      return;
    }

    this.wasInSilence = false;

    // Analyze active window
    const analysis = await this.engine.analyze(this.sequentialBuffer, {
      sampleRate: this.sampleRate,
    });

    this.emit('metrics', analysis.acousticMetrics);

    const now = Date.now();
    if (
      analysis.isAnimalVocalization &&
      analysis.confidence >= this.confidenceThreshold &&
      now - this.lastTriggerTime >= this.debounceMs
    ) {
      this.lastTriggerTime = now;
      this.emit('vocalization', analysis);
    }
  }

  private emit(event: 'vocalization' | 'silence' | 'metrics', data: any) {
    const list = this.listeners[event];
    if (list) {
      for (const listener of list) {
        listener(data);
      }
    }
  }

  /**
   * Clears the internal rolling buffer and resets activity states.
   */
  reset(): void {
    this.buffer.fill(0);
    this.sequentialBuffer.fill(0);
    this.writePointer = 0;
    this.totalBufferedSamples = 0;
    this.samplesSinceLastAnalysis = 0;
    this.wasInSilence = true;
    this.lastTriggerTime = 0;
  }
}
