'use client';
import { useEffect, useRef, useState, type ComponentType } from 'react';
import { activeEmergencyNotices } from '../../lib/notices/policy';
import { useNoticeStore } from '../../store/useNoticeStore';
import { useAuthStore } from '../../store/useAuthStore';

export interface EmergencySoundControl { enabled: boolean; error: string; enable: () => Promise<boolean>; hasEmergency: boolean }

export function EmergencyNoticeAlert({ SoundControl }: { SoundControl?: ComponentType<EmergencySoundControl> } = {}) {
  const notices = useNoticeStore(state => state.notices);
  const userId = useAuthStore(state => state.backendUser?.id ?? state.user?.id);
  const organizationId = useAuthStore(state => state.organizationId);
  const audio = useRef<AudioContext | null>(null);
  const sounded = useRef(new Set<string>());
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [soundError, setSoundError] = useState('');
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 15000); const unsubscribe = useNoticeStore.subscribe(() => setNow(Date.now())); return () => { window.clearInterval(timer); unsubscribe(); }; }, []);
  const emergencies = activeEmergencyNotices(notices, organizationId, now);
  const soundKey = userId && organizationId ? `societyos:emergency-sound:${userId}:${organizationId}` : null;
  useEffect(() => () => { if (audio.current && audio.current.state !== 'closed') void audio.current.close(); }, []);
  useEffect(() => {
    if (!soundEnabled || !soundKey || audio.current?.state !== 'running') return;
    let previous: unknown = null;
    try { previous = JSON.parse(localStorage.getItem(soundKey) ?? '[]'); } catch { /* Browser storage can be unavailable. */ }
    const seen = new Set(Array.isArray(previous) ? previous.filter((id): id is string => typeof id === 'string') : []);
    const fresh = emergencies.filter(notice => !sounded.current.has(notice.id) && !seen.has(notice.id));
    if (!fresh.length) return;
    for (const notice of fresh) { sounded.current.add(notice.id); seen.add(notice.id); }
    try { localStorage.setItem(soundKey, JSON.stringify([...seen].slice(-200))); } catch { /* Session deduplication remains active. */ }
    const context = audio.current;
    for (let index = 0; index < 3; index++) {
      const oscillator = context.createOscillator(); const gain = context.createGain(); const start = context.currentTime + index * 0.24;
      oscillator.frequency.value = 880; gain.gain.setValueAtTime(0.0001, start); gain.gain.exponentialRampToValueAtTime(0.18, start + 0.01); gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
      oscillator.connect(gain); gain.connect(context.destination); oscillator.start(start); oscillator.stop(start + 0.18);
    }
  }, [emergencies, soundEnabled, soundKey]);
  const enableSound = async () => {
    try {
      if (!audio.current || audio.current.state === 'closed') {
        audio.current = new AudioContext();
        audio.current.onstatechange = () => setSoundEnabled(audio.current?.state === 'running');
      }
      await audio.current.resume();
      if (audio.current.state !== 'running') throw new Error('Sound blocked');
      setSoundEnabled(true); setSoundError('');
      return true;
    } catch {
      setSoundError('Sound is blocked by browser or device settings. Emergency notices remain visible.');
      return false;
    }
  };
  return <div>
    {SoundControl ? <SoundControl enabled={soundEnabled} error={soundError} enable={enableSound} hasEmergency={emergencies.length > 0} /> : <>
      {!soundEnabled && <button className="btn btn-sm btn-ghost" onClick={() => void enableSound()}>Enable emergency alert sound</button>}
      {soundError && <p role="status">{soundError}</p>}
    </>}
    {emergencies.map(notice => <aside key={notice.id} role="alert" style={{ border: '2px solid #b91c1c', background: '#fff1f2', color: '#b91c1c', padding: 12, marginBottom: 12, borderRadius: 8 }}><strong>🚨 EMERGENCY: {notice.title}</strong><p style={{ whiteSpace: 'pre-wrap' }}>{notice.content}</p><p>See the Notices tab for details and attachments.</p></aside>)}
  </div>;
}
