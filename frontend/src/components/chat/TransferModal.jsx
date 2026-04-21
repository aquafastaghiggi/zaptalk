import { useEffect, useState } from 'react'
import { ArrowRightLeft, X, Loader2 } from 'lucide-react'
import api from '../../services/api'
import { useChatStore } from '../../stores/chatStore'
import clsx from 'clsx'

export default function TransferModal({ conversationId, onClose }) {
  const [agents, setAgents] = useState([])
  const [sectors, setSectors] = useState([])
  const [selectedAgent, setSelectedAgent] = useState('')
  const [selectedSector, setSelectedSector] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const { transferConversation, updateConversation } = useChatStore()

  useEffect(() => {
    Promise.all([
      api.get('/users').then(r => setAgents(r.data.filter(u => u.is_active))),
      api.get('/sectors').then(r => setSectors(r.data)),
    ])
  }, [])

  const handleTransfer = async () => {
    if (!selectedAgent && !selectedSector) {
      setError('Selecione um atendente ou setor de destino')
      return
    }
    setSaving(true)
    setError('')
    try {
      await transferConversation(
        conversationId,
        selectedAgent || null,
        selectedSector || null,
        reason.trim(),
      )
      updateConversation(conversationId, {
        agent_id: selectedAgent || null,
        sector_id: selectedSector || null,
        status: selectedAgent ? 'in_progress' : 'waiting',
      })
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao transferir')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-1 border border-surface rounded-2xl w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-brand-400" />
            <h2 className="text-white font-medium text-sm">Transferir conversa</h2>
          </div>
          <button onClick={onClose} className="text-muted hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Setor */}
          <div>
            <label className="block text-xs text-muted mb-2">Transferir para o setor</label>
            <div className="space-y-1.5">
              <button
                onClick={() => setSelectedSector('')}
                className={clsx(
                  'w-full text-left text-sm px-3 py-2 rounded-lg border transition-colors',
                  !selectedSector
                    ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                    : 'border-surface text-muted hover:border-surface hover:text-slate-300'
                )}
              >
                Manter setor atual
              </button>
              {sectors.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSector(s.id)}
                  className={clsx(
                    'w-full text-left text-sm px-3 py-2 rounded-lg border transition-colors',
                    selectedSector === s.id
                      ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                      : 'border-surface text-slate-300 hover:border-surface hover:text-white'
                  )}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          {/* Atendente */}
          <div>
            <label className="block text-xs text-muted mb-2">Atribuir a um atendente</label>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              <button
                onClick={() => setSelectedAgent('')}
                className={clsx(
                  'w-full text-left text-sm px-3 py-2 rounded-lg border transition-colors',
                  !selectedAgent
                    ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                    : 'border-surface text-muted hover:text-slate-300'
                )}
              >
                Sem atendente (fila)
              </button>
              {agents.map(a => (
                <button
                  key={a.id}
                  onClick={() => setSelectedAgent(a.id)}
                  className={clsx(
                    'w-full flex items-center gap-2 text-left text-sm px-3 py-2 rounded-lg border transition-colors',
                    selectedAgent === a.id
                      ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                      : 'border-surface text-slate-300 hover:border-surface hover:text-white'
                  )}
                >
                  <div className="w-6 h-6 rounded-full bg-brand-700 flex items-center justify-center text-white text-[10px] font-medium uppercase flex-shrink-0">
                    {a.name[0]}
                  </div>
                  <span className="truncate">{a.name}</span>
                  {a.is_online && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-muted mb-2">Motivo da transferência</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Ex.: necessidade de especialista, troca de setor, continuidade do atendimento"
              className="w-full bg-surface-2 border border-surface rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 transition-colors resize-none"
            />
          </div>

          {error && (
            <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 text-sm text-muted border border-surface rounded-xl py-2.5 hover:bg-surface-2 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleTransfer}
              disabled={saving}
              className="flex-1 text-sm bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-xl py-2.5 transition-colors flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
              Transferir
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
