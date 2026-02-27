'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useAppStore } from '@/lib/store';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function parseTime(str: string): number | null {
  const match = str.match(/^(\d+):(\d{1,2})$/);
  if (!match) return null;
  return parseInt(match[1]) * 60 + parseInt(match[2]);
}

/**
 * クラップ音を検出（trim.ts と同じアルゴリズム、メモリ効率化版）
 * 先頭300秒のみ分析し、RMSを逐次計算して早期リターン
 */
function detectClap(audioBuffer: AudioBuffer, thresholdDb: number = -10.0): number {
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const maxSamples = Math.min(channelData.length, Math.floor(sampleRate * 300));
  const windowSize = Math.floor((5 * sampleRate) / 1000);

  // 分析範囲内のピーク振幅を検出
  let peak = 0;
  for (let i = 0; i < maxSamples; i++) {
    const abs = Math.abs(channelData[i]);
    if (abs > peak) peak = abs;
  }

  const threshold = peak * Math.pow(10, thresholdDb / 20);

  // RMS を逐次計算し、閾値を超えた時点で即リターン
  const searchEnd = Math.min(maxSamples, channelData.length - windowSize);
  for (let i = 0; i < searchEnd; i++) {
    let sum = 0;
    for (let j = 0; j < windowSize; j++) {
      sum += channelData[i + j] ** 2;
    }
    if (Math.sqrt(sum / windowSize) > threshold) {
      return i / sampleRate;
    }
  }
  return 0; // クラップ未検出時は先頭から
}

const RULER_HEIGHT = 24;
const TRACK_HEIGHT = 60;
const TRACK_LABEL_WIDTH = 60;
const PPS = 20;

export function CutEditor() {
  const { files, config, addCutRegion, removeCutRegion, clearCutRegions } = useAppStore();

  const audioRefA = useRef<HTMLAudioElement>(null);
  const audioRefB = useRef<HTMLAudioElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioUrlA, setAudioUrlA] = useState<string | null>(null);
  const [audioUrlB, setAudioUrlB] = useState<string | null>(null);
  const [markIn, setMarkIn] = useState<number | null>(null);
  const [timeInput, setTimeInput] = useState('0:00');
  // クラップ同期オフセット（各トラックの開始位置）
  const syncOffsetA = useRef(0);
  const syncOffsetB = useRef(0);

  const fileA = files[0] ?? null;
  const fileB = files[1] ?? null;

  const timelineWidth = useMemo(
    () => Math.max(duration * PPS, 1),
    [duration],
  );

  // Audio URL management
  useEffect(() => {
    if (!fileA) { setAudioUrlA(null); return; }
    const url = URL.createObjectURL(fileA);
    setAudioUrlA(url);
    return () => URL.revokeObjectURL(url);
  }, [fileA]);

  useEffect(() => {
    if (!fileB) { setAudioUrlB(null); return; }
    const url = URL.createObjectURL(fileB);
    setAudioUrlB(url);
    return () => URL.revokeObjectURL(url);
  }, [fileB]);

  // Clap detection → sync offsets + duration
  useEffect(() => {
    if (!fileA || !fileB) { setDuration(0); return; }
    let cancelled = false;
    (async () => {
      try {
        const ctx = new AudioContext();
        const [bufA, bufB] = await Promise.all([
          fileA.arrayBuffer().then(b => ctx.decodeAudioData(b)),
          fileB.arrayBuffer().then(b => ctx.decodeAudioData(b)),
        ]);
        if (cancelled) { ctx.close(); return; }

        // クラップ検出 → 同期オフセット計算（trim.ts と同じロジック）
        const clapA = detectClap(bufA, config.clap_threshold_db);
        const clapB = detectClap(bufB, config.clap_threshold_db);
        let offA: number, offB: number;
        if (config.post_clap_cut > 0) {
          offA = clapA + config.post_clap_cut;
          offB = clapB + config.post_clap_cut;
        } else {
          offA = Math.max(0, clapA - config.pre_clap_margin);
          offB = Math.max(0, clapB - config.pre_clap_margin);
        }
        syncOffsetA.current = offA;
        syncOffsetB.current = offB;
        console.log(`[CutEditor] クラップ検出: A=${clapA.toFixed(3)}s→offset ${offA.toFixed(3)}s, B=${clapB.toFixed(3)}s→offset ${offB.toFixed(3)}s`);

        // 同期後の長さ（短い方に合わせる）
        const syncDur = Math.min(bufA.duration - offA, bufB.duration - offB);

        if (!cancelled) {
          setDuration(syncDur);
        }
        ctx.close();
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileA, fileB]);

  // Audio events from track A
  useEffect(() => {
    const audio = audioRefA.current;
    if (!audio) return;
    const onEnded = () => setIsPlaying(false);
    audio.addEventListener('ended', onEnded);
    return () => audio.removeEventListener('ended', onEnded);
  }, [audioUrlA]);

  // rAF-based time update for smooth playhead (synced time = raw time - offset)
  useEffect(() => {
    const tick = () => {
      const audio = audioRefA.current;
      if (audio && !audio.paused) {
        const syncTime = Math.max(0, audio.currentTime - syncOffsetA.current);
        setCurrentTime(syncTime);
        setTimeInput(formatTime(syncTime));
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // Auto-scroll to keep playhead visible
  useEffect(() => {
    if (!isPlaying) return;
    const container = scrollContainerRef.current;
    if (!container) return;
    const headX = currentTime * PPS + TRACK_LABEL_WIDTH;
    const { scrollLeft, clientWidth } = container;
    const margin = clientWidth * 0.2;
    if (headX < scrollLeft + margin || headX > scrollLeft + clientWidth - margin) {
      container.scrollLeft = headX - clientWidth / 2;
    }
  }, [currentTime, isPlaying]);

  const seekTo = useCallback((time: number) => {
    const clamped = Math.max(0, Math.min(time, duration));
    // 同期時間 → 各トラックの生ファイル時間に変換
    if (audioRefA.current) audioRefA.current.currentTime = syncOffsetA.current + clamped;
    if (audioRefB.current) audioRefB.current.currentTime = syncOffsetB.current + clamped;
    setCurrentTime(clamped);
    setTimeInput(formatTime(clamped));
  }, [duration]);

  const togglePlay = useCallback(() => {
    const a = audioRefA.current;
    const b = audioRefB.current;
    if (!a || !duration) return;
    if (isPlaying) {
      a.pause();
      b?.pause();
      setIsPlaying(false);
    } else {
      // 同期オフセットを反映した位置で再生開始
      const syncTime = Math.max(0, a.currentTime - syncOffsetA.current);
      a.currentTime = syncOffsetA.current + syncTime;
      if (b) b.currentTime = syncOffsetB.current + syncTime;
      a.play();
      b?.play();
      setIsPlaying(true);
    }
  }, [isPlaying, duration]);

  const skip = useCallback((delta: number) => {
    seekTo(currentTime + delta);
  }, [currentTime, seekTo]);

  // スペースキーで再生/停止
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        // テキスト入力中は無視
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        e.preventDefault();
        togglePlay();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay]);

  const handleTimeInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const t = parseTime(timeInput);
      if (t !== null) seekTo(t);
    }
  };

  const handleTimeInputBlur = () => {
    const t = parseTime(timeInput);
    if (t !== null) seekTo(t);
    else setTimeInput(formatTime(currentTime));
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = scrollContainerRef.current;
    if (!container || !duration) return;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left + container.scrollLeft - TRACK_LABEL_WIDTH;
    const time = x / PPS;
    seekTo(time);
  };

  const handleMarkIn = () => setMarkIn(currentTime);

  const handleMarkOut = () => {
    if (markIn === null) return;
    const start = Math.min(markIn, currentTime);
    const end = Math.max(markIn, currentTime);
    if (end - start < 0.1) return;
    const overlapping = config.cut_regions.some(
      r => start < r.endTime && end > r.startTime,
    );
    if (overlapping) {
      alert('既存のカット区間と重複しています');
      return;
    }
    addCutRegion({ startTime: start, endTime: end });
    setMarkIn(null);
  };

  const handleCancelMark = () => setMarkIn(null);

  // Ruler tick marks (fixed 10s interval)
  const rulerTicks = useMemo(() => {
    if (!duration) return [];
    const interval = 10;
    const ticks: { time: number; x: number }[] = [];
    for (let t = 0; t <= duration; t += interval) {
      ticks.push({ time: t, x: t * PPS });
    }
    return ticks;
  }, [duration]);

  if (!fileA || !fileB) {
    return (
      <div className="p-6 flex flex-col gap-4">
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--tg-t1)', letterSpacing: '-0.3px' }}>手動カット</h2>
          <p style={{ fontSize: 12, color: 'var(--tg-t2)', marginTop: 2 }}>2つの音声ファイルをアップロードしてください</p>
        </div>
        <div className="tg-notice warn">
          <svg style={{ width: 14, height: 14, color: 'var(--tg-orange)', flexShrink: 0, marginTop: 1 }} viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm-.5 3.5h1V9h-1V4.5zm.5 6.5a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5z"/>
          </svg>
          <span>「音声ファイル」セクションで話者A・Bの2ファイルをアップロードしてください。</span>
        </div>
      </div>
    );
  }

  const playheadX = currentTime * PPS;

  return (
    <div className="p-6 flex flex-col gap-4">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 4 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 16px rgba(0,0,0,0.4)',
        }}>
          <svg style={{ width: 21, height: 21, color: '#fff' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
            <path d="M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12"/>
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--tg-t1)', letterSpacing: '-0.3px' }}>手動カット</div>
          <div style={{ fontSize: 12, color: 'var(--tg-t2)', marginTop: 2 }}>再生しながら不要な区間をマークしてカット</div>
        </div>
        {config.cut_regions.length > 0 && (
          <span style={{
            marginLeft: 'auto',
            fontSize: 11, fontWeight: 600,
            padding: '3px 9px', borderRadius: 100,
            background: 'rgba(255,59,48,0.15)',
            color: 'var(--tg-red)',
            border: '1px solid rgba(255,59,48,0.2)',
          }}>
            {config.cut_regions.length} 区間
          </span>
        )}
      </div>

      {/* Hidden audio elements */}
      {audioUrlA && <audio ref={audioRefA} src={audioUrlA} preload="metadata" />}
      {audioUrlB && <audio ref={audioRefB} src={audioUrlB} preload="metadata" />}

      {/* Timeline group */}
      <div className="tg-grp">
        <div style={{
          padding: '9px 16px 5px',
          fontSize: 11, fontWeight: 600,
          color: 'var(--tg-t3)',
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          タイムライン
        </div>

        {/* Toolbar */}
        <div style={{
          padding: '8px 16px',
          display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          {/* Play/Pause */}
          <button className="tg-btn" onClick={togglePlay} disabled={!audioUrlA} style={{ minWidth: 40, padding: '4px 8px' }}>
            {isPlaying ? (
              <svg style={{ width: 12, height: 12 }} viewBox="0 0 16 16" fill="currentColor">
                <rect x="3" y="2" width="4" height="12" rx="1"/>
                <rect x="9" y="2" width="4" height="12" rx="1"/>
              </svg>
            ) : (
              <svg style={{ width: 12, height: 12 }} viewBox="0 0 16 16" fill="currentColor">
                <path d="M6 3.5l7 4.5-7 4.5V3.5z"/>
              </svg>
            )}
          </button>

          {/* Skip buttons */}
          <button className="tg-btn" onClick={() => skip(-10)} style={{ fontSize: 10, padding: '4px 6px' }}>-10s</button>
          <button className="tg-btn" onClick={() => skip(-5)} style={{ fontSize: 10, padding: '4px 6px' }}>-5s</button>
          <button className="tg-btn" onClick={() => skip(5)} style={{ fontSize: 10, padding: '4px 6px' }}>+5s</button>
          <button className="tg-btn" onClick={() => skip(10)} style={{ fontSize: 10, padding: '4px 6px' }}>+10s</button>

          {/* Time input */}
          <input
            value={timeInput}
            onChange={e => setTimeInput(e.target.value)}
            onKeyDown={handleTimeInputKeyDown}
            onBlur={handleTimeInputBlur}
            style={{
              width: 56, padding: '3px 6px',
              fontSize: 11, fontFamily: 'var(--font-mono, monospace)',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 5, color: 'var(--tg-t1)',
              textAlign: 'center',
            }}
          />
          <span style={{ fontSize: 11, color: 'var(--tg-t3)' }}>/ {formatTime(duration)}</span>
        </div>

        {/* Mark controls */}
        <div style={{
          padding: '6px 16px',
          display: 'flex', alignItems: 'center', gap: 8,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          {markIn === null ? (
            <button
              className="tg-btn"
              onClick={handleMarkIn}
              disabled={!audioUrlA || !duration}
              style={{ background: 'rgba(255,159,10,0.12)', borderColor: 'rgba(255,159,10,0.25)', fontSize: 11, padding: '3px 10px' }}
            >
              ここから
            </button>
          ) : (
            <>
              <button
                className="tg-btn"
                onClick={handleMarkOut}
                style={{ background: 'rgba(255,59,48,0.12)', borderColor: 'rgba(255,59,48,0.25)', fontSize: 11, padding: '3px 10px' }}
              >
                ここまで
              </button>
              <button className="tg-btn" onClick={handleCancelMark} style={{ fontSize: 11, padding: '3px 10px' }}>
                キャンセル
              </button>
              <span style={{ fontSize: 11, color: 'var(--tg-orange)' }}>
                開始: {formatTime(markIn)}
              </span>
            </>
          )}
        </div>

        {/* Scrollable timeline area */}
        <div
          ref={scrollContainerRef}
          style={{
            overflowX: 'auto',
            overflowY: 'hidden',
            position: 'relative',
            background: 'rgba(0,0,0,0.2)',
          }}
        >
          {/* Timeline content */}
          <div
            style={{
              position: 'relative',
              width: timelineWidth + TRACK_LABEL_WIDTH,
              minWidth: '100%',
            }}
            onClick={handleTimelineClick}
          >
            {/* Ruler */}
            <div style={{
              height: RULER_HEIGHT,
              position: 'relative',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              marginLeft: TRACK_LABEL_WIDTH,
              width: timelineWidth,
              cursor: 'pointer',
            }}>
              {rulerTicks.map(tick => (
                <div key={tick.time} style={{ position: 'absolute', left: tick.x, top: 0, bottom: 0 }}>
                  <div style={{
                    position: 'absolute', left: 0, bottom: 0,
                    width: 1, height: 10,
                    background: 'rgba(255,255,255,0.2)',
                  }} />
                  <span style={{
                    position: 'absolute', left: 3, top: 2,
                    fontSize: 9, color: 'var(--tg-t3)',
                    fontFamily: 'var(--font-mono, monospace)',
                    whiteSpace: 'nowrap',
                  }}>
                    {formatTime(tick.time)}
                  </span>
                </div>
              ))}
            </div>

            {/* Single merged track */}
            <div style={{
              display: 'flex', height: TRACK_HEIGHT,
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{
                width: TRACK_LABEL_WIDTH, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 600, color: 'rgba(50,180,255,0.8)',
                background: 'rgba(50,180,255,0.05)',
                borderRight: '1px solid rgba(255,255,255,0.06)',
                flexDirection: 'column', gap: 2,
              }}>
                <span>Mix</span>
              </div>
              <div style={{
                position: 'relative', width: timelineWidth, height: TRACK_HEIGHT, cursor: 'pointer',
                background: 'rgba(50,180,255,0.06)',
              }}>
                {/* Cut region overlays */}
                {duration > 0 && config.cut_regions.map(region => (
                  <div
                    key={region.id}
                    style={{
                      position: 'absolute',
                      left: region.startTime * PPS,
                      width: (region.endTime - region.startTime) * PPS,
                      top: 0, bottom: 0,
                      background: 'rgba(255,59,48,0.25)',
                      borderLeft: '1px solid rgba(255,59,48,0.6)',
                      borderRight: '1px solid rgba(255,59,48,0.6)',
                      pointerEvents: 'none',
                    }}
                  />
                ))}
                {/* Mark-in overlay */}
                {markIn !== null && duration > 0 && (
                  <div style={{
                    position: 'absolute',
                    left: Math.min(markIn, currentTime) * PPS,
                    width: Math.abs(currentTime - markIn) * PPS,
                    top: 0, bottom: 0,
                    background: 'rgba(255,159,10,0.2)',
                    borderLeft: '2px solid rgba(255,159,10,0.8)',
                    pointerEvents: 'none',
                  }} />
                )}
              </div>
            </div>

            {/* Playhead line (spans ruler + track) */}
            {duration > 0 && (
              <div style={{
                position: 'absolute',
                left: playheadX + TRACK_LABEL_WIDTH,
                top: 0,
                bottom: 0,
                width: 2,
                background: 'rgba(50,140,255,0.9)',
                pointerEvents: 'none',
                zIndex: 10,
              }}>
                {/* Playhead triangle */}
                <div style={{
                  position: 'absolute',
                  top: 0, left: -4,
                  width: 0, height: 0,
                  borderLeft: '5px solid transparent',
                  borderRight: '5px solid transparent',
                  borderTop: '7px solid rgba(50,140,255,0.9)',
                }} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cut regions list */}
      <div className="tg-grp">
        <div style={{
          padding: '9px 16px 5px',
          fontSize: 11, fontWeight: 600,
          color: 'var(--tg-t3)',
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span>カット区間</span>
          {config.cut_regions.length > 0 && (
            <button
              onClick={clearCutRegions}
              style={{
                fontSize: 11, color: 'var(--tg-red)', cursor: 'pointer',
                background: 'none', border: 'none', textTransform: 'none',
                letterSpacing: 'normal', fontWeight: 400,
              }}
            >
              全て削除
            </button>
          )}
        </div>
        <div style={{ padding: '8px 16px' }}>
          {config.cut_regions.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--tg-t3)', padding: '8px 0' }}>
              カット区間なし。再生しながら「ここから」→「ここまで」でマークしてください。
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {config.cut_regions.map((region, i) => (
                <div
                  key={region.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '6px 10px', borderRadius: 8,
                    background: 'rgba(255,59,48,0.08)',
                    border: '1px solid rgba(255,59,48,0.15)',
                  }}
                >
                  <span style={{ fontSize: 11, color: 'var(--tg-t3)', minWidth: 20 }}>#{i + 1}</span>
                  <span style={{
                    fontSize: 12, color: 'var(--tg-t1)',
                    fontFamily: 'var(--font-mono, monospace)',
                  }}>
                    {formatTime(region.startTime)} — {formatTime(region.endTime)}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--tg-t3)' }}>
                    ({(region.endTime - region.startTime).toFixed(1)}秒)
                  </span>
                  <button
                    onClick={() => seekTo(region.startTime)}
                    style={{
                      marginLeft: 'auto',
                      fontSize: 11, color: 'var(--tg-accent)', cursor: 'pointer',
                      background: 'none', border: 'none',
                    }}
                  >
                    再生
                  </button>
                  <button
                    onClick={() => removeCutRegion(region.id)}
                    style={{
                      fontSize: 11, color: 'var(--tg-red)', cursor: 'pointer',
                      background: 'none', border: 'none',
                    }}
                  >
                    削除
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Info notice */}
      <div className="tg-notice">
        <svg style={{ width: 14, height: 14, color: 'var(--tg-accent)', flexShrink: 0, marginTop: 1 }} viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm-.5 3.5h1V9h-1V4.5zm.5 6.5a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5z"/>
        </svg>
        <span>クラップ音で自動同期済みの音声を表示しています。カット区間は両トラックに同時に適用されます。スペースキーで再生/停止。</span>
      </div>
    </div>
  );
}
