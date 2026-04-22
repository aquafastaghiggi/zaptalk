import { useEffect, useState } from 'react'
import api from '../services/api'
import QRCode from 'qrcode'
import ThemeToggle from '../components/ui/ThemeToggle'
import {
  Users, Building2, Smartphone, Plus, RefreshCw, QrCode,
  CheckCircle, XCircle, Loader2, ChevronLeft, ClipboardList, MessageSquarePlus, Trash2,
  BarChart3, Sparkles
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import clsx from 'clsx'

import UsersTab from '../components/admin/UsersTab'
import SectorsTab from '../components/admin/SectorsTab'
import QuickRepliesTab from '../components/admin/QuickRepliesTab'
import ReportsTab from '../components/admin/ReportsTab'
import AuditTab from '../components/admin/AuditTab'

const TABS = [
  { key: 'users', label: 'Atendentes', icon: Users },
  { key: 'sectors', label: 'Setores', icon: Building2 },
  { key: 'quick_replies', label: 'Respostas', icon: MessageSquarePlus },
  { key: 'reports', label: 'Relatorios', icon: BarChart3 },
  { key: 'instances', label: 'WhatsApp', icon: Smartphone },
  { key: 'audit', label: 'Auditoria', icon: ClipboardList },
  { key: 'ai', label: 'IA', icon: Sparkles, badge: 'Em breve' },
]

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-1 border border-surface rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface">
          <h2 className="text-white font-medium text-sm">{title}</h2>
          <button onClick={onClose} className="text-muted hover:text-white transition-colors">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

function Input({ label, ...props }) {
  return (
    <div>
      <label className="block text-xs text-subtle mb-1.5">{label}</label>
      <input
        className="w-full bg-surface-2 border border-surface rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 transition-colors"
        {...props}
      />
    </div>
  )
}

function Badge({ children, color = 'gray' }) {
  const colors = {
    green: 'bg-green-500/15 text-green-400',
    yellow: 'bg-yellow-500/15 text-yellow-400',
    red: 'bg-red-500/15 text-red-400',
    gray: 'bg-slate-500/15 text-slate-400',
    blue: 'bg-blue-500/15 text-blue-400',
  }
  return (
    <span className={clsx('text-[10px] font-medium px-2 py-0.5 rounded-full', colors[color])}>
      {children}
    </span>
  )
}

function InstancesTab() {
  const [instances, setInstances] = useState([])
  const [modal, setModal] = useState(false)
  const [instName, setInstName] = useState('')
  const [creating, setCreating] = useState(false)
  const [qrModal, setQrModal] = useState(null)
  const [error, setError] = useState('')
  const [busyInstance, setBusyInstance] = useState('')

  const load = async () => {
    try {
      const { data } = await api.get('/instances')
      setInstances(Array.isArray(data) ? data : [])
    } catch {
      setInstances([])
    }
  }

  useEffect(() => {
    load()
  }, [])

  const normalizeQrSource = (value) => {
    if (typeof value !== 'string') return null
    const trimmed = value.trim().replace(/\s+/g, '')
    if (!trimmed) return null
    if (trimmed.startsWith('data:image/')) return trimmed
    return `data:image/png;base64,${trimmed}`
  }

  const buildBlobQrSource = (value) => {
    if (typeof value !== 'string') return null
    const trimmed = value.trim().replace(/\s+/g, '')
    if (!trimmed) return null
    let base64Payload = trimmed
    let mimeType = 'image/png'
    if (trimmed.startsWith('data:')) {
      const commaIndex = trimmed.indexOf(',')
      if (commaIndex === -1) return null
      const header = trimmed.slice(0, commaIndex)
      base64Payload = trimmed.slice(commaIndex + 1)
      const mimeMatch = header.match(/^data:([^;]+);base64$/i)
      if (mimeMatch?.[1]) mimeType = mimeMatch[1]
    }
    try {
      const binary = atob(base64Payload)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
      const blob = new Blob([bytes], { type: mimeType })
      return URL.createObjectURL(blob)
    } catch {
      return null
    }
  }

  const buildGeneratedQrSource = async (value) => {
    if (typeof value !== 'string' || !value.trim()) return null
    try {
      return await QRCode.toDataURL(value.trim(), {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 320,
        color: { dark: '#ffffff', light: '#00000000' }
      })
    } catch {
      return null
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setCreating(true)
    try {
      const normalizedName = instName.trim().toLowerCase().replace(/\s+/g, '_')
      const { data } = await api.post('/instances', { name: normalizedName })
      setModal(false)
      setInstName('')
      await load()
      const base64 = data?.base64 || data?.qrcode?.base64 || null
      const pairingCode = data?.pairing_code || data?.pairingCode || data?.qrcode?.pairingCode || null
      const code = data?.code || data?.qrcode?.code || null
      const imageSource = buildBlobQrSource(base64) || normalizeQrSource(base64)
      const generatedSource = code ? await buildGeneratedQrSource(code) : null
      const status = data?.status || (imageSource ? 'qr' : pairingCode || code ? 'pairing_code' : 'pending')
      setQrModal({ name: normalizedName, base64, imageSource, generatedSource, pairingCode, code, status, raw: data })
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Erro ao criar instancia')
    } finally {
      setCreating(false)
    }
  }

  const handleQr = async (name) => {
    setQrModal({ name, base64: null, status: 'loading' })
    try {
      const { data } = await api.get(`/instances/${name}/qrcode`)
      const base64 = data?.base64 || data?.qrcode?.base64 || null
      const pairingCode = data?.pairing_code || data?.pairingCode || data?.qrcode?.pairingCode || null
      const code = data?.code || data?.qrcode?.code || null
      const imageSource = buildBlobQrSource(base64) || normalizeQrSource(base64)
      const generatedSource = code ? await buildGeneratedQrSource(code) : null
      const status = data?.status || (imageSource ? 'qr' : pairingCode || code ? 'pairing_code' : 'pending')
      setQrModal({ name, base64, imageSource, generatedSource, pairingCode, code, status, raw: data })
    } catch {
      setQrModal({ name, base64: null, status: 'error' })
    }
  }

  const handleLogout = async (name) => {
    if (!confirm(`Desconectar a instancia "${name}"?`)) return
    setBusyInstance(name)
    try {
      await api.delete(`/instances/${name}/logout`)
      await load()
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao desconectar instancia')
    } finally {
      setBusyInstance('')
    }
  }

  const handleRestart = async (name) => {
    if (!confirm(`Reiniciar a instancia "${name}"?`)) return
    setBusyInstance(name)
    try {
      await api.put(`/instances/${name}/restart`)
      await load()
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao reiniciar instancia')
    } finally {
      setBusyInstance('')
    }
  }

  const handleDelete = async (name) => {
    if (!confirm(`Excluir a instancia "${name}"? Isso remove a sessão da Evolution.`)) return
    setBusyInstance(name)
    try {
      await api.delete(`/instances/${name}`)
      await load()
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao excluir instancia')
    } finally {
      setBusyInstance('')
    }
  }

  const statusColor = (s) => s === 'open' ? 'green' : s === 'connecting' ? 'yellow' : 'red'
  const statusLabel = (s) => ({ open: 'Conectado', connecting: 'Conectando', close: 'Desconectado' }[s] || s || 'Desconhecido')

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-muted">{instances.length} instancia(s)</p>
        <button onClick={() => setModal(true)} className="flex items-center gap-1.5 text-xs bg-brand-600 hover:bg-brand-500 text-white px-3 py-2 rounded-lg transition-colors">
          <Plus className="w-3.5 h-3.5" /> Nova instancia
        </button>
      </div>
      <div className="space-y-2">
        {instances.length === 0 && (
          <div className="text-center py-10 text-muted text-sm">
            <Smartphone className="w-8 h-8 mx-auto mb-2 opacity-30" />
            Nenhuma instancia criada
          </div>
        )}
        {instances.map((inst) => {
          const name = inst.instance?.instanceName || inst.name || inst.instanceName
          const state = inst.instance?.state || inst.state || inst.connectionStatus
          return (
            <div key={name} className="flex items-center gap-3 bg-surface-2 border border-surface rounded-xl px-4 py-3">
              <div className="w-8 h-8 rounded-lg bg-surface-3 flex items-center justify-center flex-shrink-0">
                <Smartphone className="w-4 h-4 text-muted" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm text-white font-medium">{name}</p>
                  <Badge color={statusColor(state)}>{statusLabel(state)}</Badge>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => handleQr(name)} className="flex items-center gap-1 text-xs border border-surface text-slate-300 hover:border-brand-500 hover:text-brand-400 px-2.5 py-1.5 rounded-lg transition-colors">
                  <QrCode className="w-3.5 h-3.5" /> QR Code
                </button>
                <button onClick={() => handleRestart(name)} disabled={busyInstance === name} className="flex items-center gap-1 text-xs border border-surface text-slate-300 hover:border-brand-500 hover:text-brand-400 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                  <RefreshCw className="w-3.5 h-3.5" /> Reiniciar
                </button>
                <button onClick={() => load()} className="text-muted hover:text-white transition-colors p-1.5"><RefreshCw className="w-3.5 h-3.5" /></button>
                <button onClick={() => handleLogout(name)} disabled={busyInstance === name} className="text-muted hover:text-red-400 transition-colors p-1.5 disabled:opacity-50"><XCircle className="w-3.5 h-3.5" /></button>
                <button onClick={() => handleDelete(name)} disabled={busyInstance === name} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 border border-surface hover:border-red-400/40 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"><Trash2 className="w-3.5 h-3.5" /> Excluir</button>
              </div>
            </div>
          )
        })}
      </div>
      {modal && (
        <Modal title="Nova instancia WhatsApp" onClose={() => setModal(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <Input label="Nome da instancia" value={instName} onChange={e => setInstName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').replace(/\s/g, '_'))} required placeholder="ex: principal, suporte, vendas" />
            <p className="text-xs text-muted">Comece com letra. Use apenas letras minusculas, numeros e underscore. Minimo 3 caracteres.</p>
            {error && <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setModal(false)} className="flex-1 text-sm text-muted border border-surface rounded-xl py-2.5 hover:bg-surface-2 transition-colors">Cancelar</button>
              <button type="submit" disabled={creating} className="flex-1 text-sm bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-xl py-2.5 transition-colors flex items-center justify-center gap-2">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Criar
              </button>
            </div>
          </form>
        </Modal>
      )}
      {qrModal && (
        <Modal title={`QR Code - ${qrModal.name}`} onClose={() => setQrModal(null)}>
          <div className="flex flex-col items-center gap-4">
            {qrModal.status === 'loading' && <div className="py-8 flex flex-col items-center gap-3"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /><p className="text-sm text-muted">Gerando QR Code...</p></div>}
            {qrModal.status === 'connected' && <div className="py-8 flex flex-col items-center gap-3"><CheckCircle className="w-10 h-10 text-green-400" /><p className="text-sm text-white font-medium">WhatsApp ja conectado!</p></div>}
            {qrModal.status === 'qr' && (
              <>
                <div className="bg-white p-4 rounded-2xl shadow-inner"><img src={qrModal.generatedSource || qrModal.imageSource} alt="QR Code" className="w-64 h-64" /></div>
                <p className="text-xs text-muted text-center max-w-xs">Abra o WhatsApp no seu celular, vá em Aparelhos Conectados e escaneie o código acima.</p>
              </>
            )}
            {qrModal.status === 'pairing_code' && (
              <div className="py-6 flex flex-col items-center gap-4">
                <p className="text-sm text-white font-medium">Código de pareamento</p>
                <div className="bg-surface-2 border border-surface px-6 py-4 rounded-2xl text-2xl font-mono tracking-[0.3em] text-brand-400">{qrModal.pairingCode || qrModal.code}</div>
                <p className="text-xs text-muted text-center max-w-xs">Insira este código no seu WhatsApp para conectar.</p>
              </div>
            )}
            <button onClick={() => handleQr(qrModal.name)} className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1.5"><RefreshCw className="w-3 h-3" /> Atualizar QR Code</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('users')
  const [sectors, setSectors] = useState([])
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const loadSectors = async () => {
    try {
      const { data } = await api.get('/sectors')
      setSectors(Array.isArray(data) ? data : [])
    } catch {
      setSectors([])
    }
  }

  useEffect(() => {
    if (user && user.role === 'agent') navigate('/')
    loadSectors()
  }, [user, navigate])

  const TabIcon = TABS.find(t => t.key === activeTab)?.icon || Users

  return (
    <div className="flex h-screen bg-surface-0 overflow-hidden">
      <div className="w-64 border-r border-surface bg-surface-1 flex flex-col">
        <div className="p-6 border-b border-surface flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center text-white font-bold">Z</div>
            <h1 className="text-white font-semibold text-sm">ZapTalk Admin</h1>
          </div>
          <ThemeToggle />
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={clsx(
                'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all duration-200',
                activeTab === tab.key
                  ? 'bg-brand-600/10 text-brand-400 font-medium'
                  : 'text-muted hover:bg-surface-2 hover:text-white'
              )}
            >
              <div className="flex items-center gap-3">
                <tab.icon className={clsx('w-4 h-4', activeTab === tab.key ? 'text-brand-400' : 'text-subtle')} />
                {tab.label}
              </div>
              {tab.badge && <span className="text-[9px] bg-brand-500/20 text-brand-300 px-1.5 py-0.5 rounded-md uppercase font-bold tracking-wider">{tab.badge}</span>}
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-surface">
          <button onClick={() => navigate('/')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted hover:bg-surface-2 hover:text-white transition-colors">
            <ChevronLeft className="w-4 h-4" /> Voltar ao chat
          </button>
        </div>
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-surface bg-surface-1/50 backdrop-blur-sm flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-surface-2 border border-surface flex items-center justify-center">
              <TabIcon className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <h2 className="text-white font-medium text-sm">{TABS.find(t => t.key === activeTab)?.label}</h2>
              <p className="text-[11px] text-muted">Gerenciamento e configurações do sistema</p>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-8 bg-surface-0/50">
          <div className="max-w-5xl mx-auto">
            {activeTab === 'users' && <UsersTab sectors={sectors} />}
            {activeTab === 'sectors' && <SectorsTab sectors={sectors} reload={loadSectors} />}
            {activeTab === 'quick_replies' && <QuickRepliesTab sectors={sectors} />}
            {activeTab === 'reports' && <ReportsTab />}
            {activeTab === 'instances' && <InstancesTab />}
            {activeTab === 'audit' && <AuditTab />}
            {activeTab === 'ai' && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-3xl bg-brand-500/10 flex items-center justify-center mb-4"><Sparkles className="w-8 h-8 text-brand-400" /></div>
                <h3 className="text-white font-medium">Inteligência Artificial</h3>
                <p className="text-sm text-muted mt-2 max-w-xs">Estamos preparando recursos incríveis de IA para automatizar seus atendimentos.</p>
                <Badge color="blue" className="mt-4">Em breve</Badge>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
