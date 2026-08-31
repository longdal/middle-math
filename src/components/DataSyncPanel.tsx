import { useEffect, useMemo, useState } from 'react'
import { GeminiSession } from '../services/GeminiSession'
import { GoogleDriveAttemptStore } from '../services/GoogleDriveAttemptStore'
import { GoogleDriveLearningStore } from '../services/GoogleDriveLearningStore'
import { GoogleOAuthSession } from '../services/googleIdentity'
import { getLearningBridge, type PrototypeAttempt } from '../services/LearningBridge'

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

function statusText(account: { email?: string; name?: string } | null, connected: boolean) {
  if (!connected) return 'Google 미연결'
  return account?.email || account?.name || 'Google 연결됨'
}

export default function DataSyncPanel() {
  const oauth = useMemo(() => new GoogleOAuthSession(googleClientId), [])
  const drive = useMemo(() => new GoogleDriveLearningStore(() => oauth.getAccessToken()), [oauth])
  const attemptDrive = useMemo(() => new GoogleDriveAttemptStore(() => oauth.getAccessToken()), [oauth])
  const gemini = useMemo(() => new GeminiSession(), [])

  const [connected, setConnected] = useState(false)
  const [account, setAccount] = useState<{ email?: string; name?: string } | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [syncingAttempt, setSyncingAttempt] = useState(false)
  const [geminiKey, setGeminiKey] = useState('')
  const [geminiStatus, setGeminiStatus] = useState('미설정')
  const [expanded, setExpanded] = useState(false)
  const [attemptStats, setAttemptStats] = useState({ attempts: 0, photos: 0 })


  const refreshAttemptStats = () => {
    try {
      const state = getLearningBridge().exportState() as { attempts?: Array<{ photo?: { id?: string } | null }> }
      const attempts = Array.isArray(state.attempts) ? state.attempts : []
      setAttemptStats({ attempts: attempts.length, photos: attempts.filter((item) => item.photo?.id).length })
    } catch {
      setAttemptStats({ attempts: 0, photos: 0 })
    }
  }

  const run = async (task: () => Promise<void>) => {
    setBusy(true)
    setMessage('')
    try {
      await task()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    window.middleMathHost = {
      onAttempt: async (attempt: PrototypeAttempt) => {
        if (!oauth.isConnected()) return null
        setSyncingAttempt(true)
        try {
          let photo = null
          if (attempt.photoFile) {
            photo = await attemptDrive.uploadPhoto({
              attemptId: attempt.attemptId,
              problemId: attempt.problemId,
              file: attempt.photoFile,
              originalName: attempt.photoFile.name,
            })
            getLearningBridge().attachAttemptPhoto(attempt.attemptId, photo)
          }
          const state = getLearningBridge().exportState()
          await drive.save(state)
          refreshAttemptStats()
          setMessage(photo ? '답안과 풀이 사진을 Google Drive에 자동 저장했습니다.' : '답안 기록을 Google Drive에 자동 저장했습니다.')
          return photo
        } catch (error) {
          setMessage(error instanceof Error ? `자동 저장 실패: ${error.message}` : `자동 저장 실패: ${String(error)}`)
          return null
        } finally {
          setSyncingAttempt(false)
        }
      },
    }
    return () => {
      delete window.middleMathHost
    }
  }, [attemptDrive, drive, oauth])

  const connect = () => run(async () => {
    const info = await oauth.connect()
    setConnected(oauth.isConnected())
    setAccount(info)
    setMessage('Google Drive 연결 완료 · 학습 상태와 풀이 사진을 저장할 수 있습니다.')
  })

  const disconnect = () => run(async () => {
    await oauth.disconnect()
    setConnected(false)
    setAccount(null)
    setMessage('Google 연결을 해제했습니다.')
  })

  const save = () => run(async () => {
    const state = getLearningBridge().exportState()
    const result = await drive.save(state)
    refreshAttemptStats()
    setMessage(`저장 완료 · ${result.modifiedTime || new Date().toLocaleString()}`)
  })

  const load = () => run(async () => {
    const snapshot = await drive.load()
    if (!snapshot) {
      setMessage('Google Drive에 저장된 학습 데이터가 없습니다.')
      return
    }
    getLearningBridge().importState(snapshot.state)
    refreshAttemptStats()
    setMessage(`불러오기 완료 · ${new Date(snapshot.savedAt).toLocaleString()}`)
  })

  const updateGeminiKey = (value: string) => {
    setGeminiKey(value)
    gemini.setApiKey(value)
    setGeminiStatus(value ? '입력됨 · 아직 확인 안 함' : '미설정')
  }

  const testGemini = () => run(async () => {
    gemini.setApiKey(geminiKey)
    const model = await gemini.testConnection()
    setGeminiStatus(`연결 성공 · ${model}`)
    setMessage('Gemini 키는 브라우저 저장소에 저장하지 않고 현재 페이지 메모리에서만 사용합니다.')
  })

  const clearGemini = () => {
    gemini.clear()
    setGeminiKey('')
    setGeminiStatus('미설정')
    setMessage('Gemini 키를 메모리에서 제거했습니다.')
  }

  return (
    <section className={`sync-panel ${expanded ? 'expanded' : ''}`}>
      <button className="sync-toggle" type="button" onClick={() => setExpanded((value) => !value)}>
        ☁️ 저장 / AI 설정
      </button>
      {expanded && (
        <div className="sync-body">
          <div className="sync-section">
            <div className="sync-title">Google Drive 학습 데이터</div>
            <div className="sync-status">{statusText(account, connected)}{syncingAttempt ? ' · 저장 중…' : ''}</div>
            {!googleClientId && (
              <div className="sync-warning">VITE_GOOGLE_CLIENT_ID 설정이 필요합니다.</div>
            )}
            <div className="sync-actions">
              {!connected ? (
                <button type="button" onClick={connect} disabled={busy || !oauth.isConfigured()}>Google 연결</button>
              ) : (
                <button type="button" className="secondary-action" onClick={disconnect} disabled={busy}>연결 해제</button>
              )}
              <button type="button" onClick={save} disabled={busy || !connected}>Drive 저장</button>
              <button type="button" onClick={load} disabled={busy || !connected}>Drive 불러오기</button>
            </div>
            <div className="sync-status">누적 답안 {attemptStats.attempts}개 · Drive 사진 {attemptStats.photos}개</div>
            <div className="sync-help">
              답안·점수·취약 개념·진행 상태는 앱 전용 appDataFolder에 JSON으로 저장됩니다. 풀이 사진은 Google Drive의 <b>Middle Math - 풀이 사진</b> 폴더에 저장되고, JSON에는 사진 file ID/링크가 연결됩니다. Google 연결 상태에서 문제를 제출하면 자동 저장됩니다.
            </div>
          </div>

          <div className="sync-section">
            <div className="sync-title">Gemini API 키 · 임시 사용</div>
            <input
              className="secret-input"
              type="password"
              value={geminiKey}
              onChange={(event) => updateGeminiKey(event.target.value)}
              placeholder="Gemini API key"
              autoComplete="off"
              spellCheck={false}
            />
            <div className="sync-status">{geminiStatus}</div>
            <div className="sync-actions">
              <button type="button" onClick={testGemini} disabled={busy || !geminiKey}>Gemini 연결 테스트</button>
              <button type="button" className="secondary-action" onClick={clearGemini} disabled={!geminiKey}>키 지우기</button>
            </div>
            <div className="sync-warning">Google OAuth와 Gemini API 키는 별개입니다. 키는 localStorage/sessionStorage/Drive에 저장하지 않습니다. 개인 테스트 용도로만 사용하고 공개 서비스에서는 서버측 프록시를 권장합니다.</div>
          </div>

          {message && <div className="sync-message">{message}</div>}
        </div>
      )}
    </section>
  )
}
