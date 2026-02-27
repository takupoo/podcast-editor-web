'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '@/lib/store';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function CutEditor() {
  const { files, config, addCutRegion, removeCutRegion, clearCutRegions } = useAppStore();
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const [activeTrack, setActiveTrack] = useState<'A' | 'B'>('A');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [markIn, setMarkIn] = useState<number | null>(null);

  const fileA = files[0] ?? null;
  const fileB = files[1] ?? null;
  const activeFile = activeTrack === 'A' ? fileA : fileB;

  // オーディオURLの管理
  useEffect(() => {
    if (!activeFile) {
      setAudioUrl(null);
      return;
    }
    const url = URL.createObjectURL(activeFile);
    setAudioUrl(url);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    return () => URL.revokeObjectURL(url);
  }, [activeFile]);

  // 再生時刻の更新
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
    };
  }, [audioUrl]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const bar = progressRef.current;
    if (!audio || !bar || !duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * duration;
    setCurrentTime(audio.currentTime);
  };

  const handleMarkIn = () => {
    setMarkIn(currentTime);
  };

  const handleMarkOut = () => {
    if (markIn === null) return;
    const start = Math.min(markIn, currentTime);
    const end = Math.max(markIn, currentTime);
    if (end - start < 0.1) return; // 最低0.1秒

    // 重複チェック
    const overlapping = config.cut_regions.some(
      r => start < r.endTime && end > r.startTime
    );
    if (overlapping) {
      alert('既存のカット区間と重複しています');
      return;
    }

    addCutRegion({ startTime: start, endTime: end });
    setMarkIn(null);
  };

  const handleCancelMark = () => {
    setMarkIn(null);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

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

      {/* Track switch */}
      <div className="tg-grp">
        <div style={{
          padding: '9px 16px 5px',
          fontSize: 11, fontWeight: 600,
          color: 'var(--tg-t3)',
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          プレーヤー
        </div>
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Track selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--tg-t2)', minWidth: 50 }}>トラック</span>
            <div className="tg-seg">
              <button
                className={`tg-seg-btn${activeTrack === 'A' ? ' active' : ''}`}
                onClick={() => setActiveTrack('A')}
              >
                Track A
              </button>
              <button
                className={`tg-seg-btn${activeTrack === 'B' ? ' active' : ''}`}
                onClick={() => setActiveTrack('B')}
              >
                Track B
              </button>
            </div>
            <span style={{ fontSize: 11, color: 'var(--tg-t3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {activeFile?.name}
            </span>
          </div>

          {/* Audio element */}
          {audioUrl && <audio ref={audioRef} src={audioUrl} preload="metadata" />}

          {/* Progress bar */}
          <div
            ref={progressRef}
            onClick={handleProgressClick}
            style={{
              position: 'relative',
              height: 32,
              background: 'rgba(255,255,255,0.06)',
              borderRadius: 6,
              cursor: 'pointer',
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.09)',
            }}
          >
            {/* Cut region overlays */}
            {duration > 0 && config.cut_regions.map(region => {
              const left = (region.startTime / duration) * 100;
              const width = ((region.endTime - region.startTime) / duration) * 100;
              return (
                <div
                  key={region.id}
                  style={{
                    position: 'absolute',
                    left: `${left}%`,
                    width: `${width}%`,
                    top: 0,
                    bottom: 0,
                    background: 'rgba(255,59,48,0.3)',
                    borderLeft: '1px solid rgba(255,59,48,0.6)',
                    borderRight: '1px solid rgba(255,59,48,0.6)',
                    zIndex: 1,
                  }}
                />
              );
            })}

            {/* Mark-in indicator */}
            {markIn !== null && duration > 0 && (
              <div
                style={{
                  position: 'absolute',
                  left: `${(markIn / duration) * 100}%`,
                  width: `${((currentTime - markIn) / duration) * 100}%`,
                  top: 0,
                  bottom: 0,
                  background: 'rgba(255,159,10,0.2)',
                  borderLeft: '2px solid rgba(255,159,10,0.8)',
                  zIndex: 1,
                }}
              />
            )}

            {/* Progress fill */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: `${progress}%`,
                background: 'rgba(255,255,255,0.1)',
                zIndex: 0,
              }}
            />

            {/* Playhead */}
            <div
              style={{
                position: 'absolute',
                left: `${progress}%`,
                top: 0,
                bottom: 0,
                width: 2,
                background: 'var(--tg-accent)',
                zIndex: 2,
              }}
            />

            {/* Time display */}
            <div style={{
              position: 'absolute',
              left: 8, top: '50%', transform: 'translateY(-50%)',
              fontSize: 11, color: 'var(--tg-t1)', fontFamily: 'var(--font-mono, monospace)',
              zIndex: 3,
            }}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Play/Pause */}
            <button
              className="tg-btn"
              onClick={togglePlay}
              disabled={!audioUrl}
              style={{ minWidth: 80 }}
            >
              {isPlaying ? (
                <svg style={{ width: 13, height: 13 }} viewBox="0 0 16 16" fill="currentColor">
                  <rect x="3" y="2" width="4" height="12" rx="1"/>
                  <rect x="9" y="2" width="4" height="12" rx="1"/>
                </svg>
              ) : (
                <svg style={{ width: 13, height: 13 }} viewBox="0 0 16 16" fill="currentColor">
                  <path d="M6 3.5l7 4.5-7 4.5V3.5z"/>
                </svg>
              )}
              {isPlaying ? '一時停止' : '再生'}
            </button>

            <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)' }} />

            {/* Mark In/Out */}
            {markIn === null ? (
              <button
                className="tg-btn"
                onClick={handleMarkIn}
                disabled={!audioUrl || !duration}
                style={{ background: 'rgba(255,159,10,0.12)', borderColor: 'rgba(255,159,10,0.25)' }}
              >
                <svg style={{ width: 13, height: 13 }} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M4 2v12M4 8h8"/>
                </svg>
                ここから
              </button>
            ) : (
              <>
                <button
                  className="tg-btn"
                  onClick={handleMarkOut}
                  style={{ background: 'rgba(255,59,48,0.12)', borderColor: 'rgba(255,59,48,0.25)' }}
                >
                  <svg style={{ width: 13, height: 13 }} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M12 2v12M4 8h8"/>
                  </svg>
                  ここまで
                </button>
                <button
                  className="tg-btn"
                  onClick={handleCancelMark}
                  style={{ fontSize: 11 }}
                >
                  キャンセル
                </button>
                <span style={{ fontSize: 11, color: 'var(--tg-orange)' }}>
                  開始: {formatTime(markIn)}
                </span>
              </>
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
                    onClick={() => {
                      // シークしてカット区間の開始位置に移動
                      const audio = audioRef.current;
                      if (audio) {
                        audio.currentTime = region.startTime;
                        setCurrentTime(region.startTime);
                      }
                    }}
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
        <span>カット区間は両トラック（A・B）に同時に適用されます。時間座標はアップロードした生ファイル基準です。</span>
      </div>
    </div>
  );
}
