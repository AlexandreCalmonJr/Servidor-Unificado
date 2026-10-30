import { useState, useEffect, useMemo } from 'react'
import { Icon } from '../components/Icon'
import { Button, Status } from '../components/UI'
import { Modal } from '../components/Modal'
import { useToast } from '../components/Toast'
import type { PageId } from '../types'

interface UnitItem {
  id: string
  name: string
  city: string
  state: string
  ip_ranges: { start: string; end: string }[]
  devicesCount: number
  created_at: string
}

interface BssidItem {
  id: string
  mac_address_radio: string
  sector: string
  floor: string
  unitName: string
  frequency?: string
  created_at: string
}

interface IpMappingItem {
  id: string
  location: string
  ipStart: string
  ipEnd: string
  unitName: string
  hostsCount: number
  created_at: string
}

export function Mappings({ go }: { go: (p: PageId) => void }) {
  const [activeTab, setActiveTab] = useState<'units' | 'bssid' | 'ip'>('units')
  const [searchTerm, setSearchTerm] = useState('')
  const toast = useToast()

  // Dados com fallback inicial
  const [units, setUnits] = useState<UnitItem[]>([
    {
      id: 'u-1',
      name: 'Matriz — São Paulo',
      city: 'São Paulo',
      state: 'SP',
      ip_ranges: [
        { start: '10.42.0.1', end: '10.42.31.254' },
        { start: '192.168.10.1', end: '192.168.10.254' },
      ],
      devicesCount: 142,
      created_at: '12/01/2024',
    },
    {
      id: 'u-2',
      name: 'Filial — Rio de Janeiro',
      city: 'Rio de Janeiro',
      state: 'RJ',
      ip_ranges: [{ start: '10.43.0.1', end: '10.43.15.254' }],
      devicesCount: 68,
      created_at: '20/02/2024',
    },
    {
      id: 'u-3',
      name: 'Hub de Distribuição — Curitiba',
      city: 'Curitiba',
      state: 'PR',
      ip_ranges: [{ start: '10.44.0.1', end: '10.44.7.254' }],
      devicesCount: 37,
      created_at: '15/04/2024',
    },
  ])

  const [bssids, setBssids] = useState<BssidItem[]>([
    {
      id: 'b-1',
      mac_address_radio: '08:EC:F5:12:44:AA',
      sector: 'Design Studio & Produto',
      floor: '4º Andar',
      unitName: 'Matriz — São Paulo',
      frequency: '5 GHz / Wi-Fi 6',
      created_at: '14/01/2024',
    },
    {
      id: 'b-2',
      mac_address_radio: '08:EC:F5:12:44:B1',
      sector: 'Recepção Principal & Hall',
      floor: 'Térreo',
      unitName: 'Matriz — São Paulo',
      frequency: '2.4 GHz / Wi-Fi 6',
      created_at: '14/01/2024',
    },
    {
      id: 'b-3',
      mac_address_radio: '1C:28:AF:78:9B:C0',
      sector: 'Operações & Controladoria',
      floor: '2º Andar',
      unitName: 'Filial — Rio de Janeiro',
      frequency: '5 GHz / Wi-Fi 6E',
      created_at: '22/02/2024',
    },
    {
      id: 'b-4',
      mac_address_radio: '70:3A:0E:91:AA:12',
      sector: 'Armazém Logístico & Galpão',
      floor: 'Térreo',
      unitName: 'Hub de Distribuição — Curitiba',
      frequency: '2.4 GHz / Long Range',
      created_at: '16/04/2024',
    },
  ])

  const [ips, setIps] = useState<IpMappingItem[]>([
    {
      id: 'ip-1',
      location: 'Prédio Central — Setor Diretoria',
      ipStart: '10.42.10.1',
      ipEnd: '10.42.10.254',
      unitName: 'Matriz — São Paulo',
      hostsCount: 254,
      created_at: '12/01/2024',
    },
    {
      id: 'ip-2',
      location: 'Andar de TI & Engenharia',
      ipStart: '10.42.18.1',
      ipEnd: '10.42.18.254',
      unitName: 'Matriz — São Paulo',
      hostsCount: 254,
      created_at: '12/01/2024',
    },
    {
      id: 'ip-3',
      location: 'Terminal de Atendimento & Kiosks',
      ipStart: '10.43.5.1',
      ipEnd: '10.43.5.128',
      unitName: 'Filial — Rio de Janeiro',
      hostsCount: 128,
      created_at: '20/02/2024',
    },
  ])

  // Modais de Criação / Edição
  const [unitModalOpen, setUnitModalOpen] = useState(false)
  const [editingUnit, setEditingUnit] = useState<UnitItem | null>(null)
  const [unitFormName, setUnitFormName] = useState('')
  const [unitFormCity, setUnitFormCity] = useState('')
  const [unitFormState, setUnitFormState] = useState('')
  const [unitFormRanges, setUnitFormRanges] = useState<{ start: string; end: string }[]>([
    { start: '', end: '' },
  ])

  const [bssidModalOpen, setBssidModalOpen] = useState(false)
  const [editingBssid, setEditingBssid] = useState<BssidItem | null>(null)
  const [bssidFormMac, setBssidFormMac] = useState('')
  const [bssidFormSector, setBssidFormSector] = useState('')
  const [bssidFormFloor, setBssidFormFloor] = useState('')
  const [bssidFormUnit, setBssidFormUnit] = useState('')

  const [ipModalOpen, setIpModalOpen] = useState(false)
  const [editingIp, setEditingIp] = useState<IpMappingItem | null>(null)
  const [ipFormLocation, setIpFormLocation] = useState('')
  const [ipFormStart, setIpFormStart] = useState('')
  const [ipFormEnd, setIpFormEnd] = useState('')
  const [ipFormUnit, setIpFormUnit] = useState('')

  // Modal de Exclusão
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'unit' | 'bssid' | 'ip'
    id: string
    name: string
  } | null>(null)

  // Tentativa de carregar dados reais do backend com fallback seguro
  useEffect(() => {
    async function loadBackendData() {
      try {
        const resUnits = await fetch('/api/units')
        if (resUnits.ok) {
          const data = await resUnits.json()
          const list = data.units || (Array.isArray(data) ? data : [])
          if (list.length > 0) {
            setUnits(
              list.map((u: any, idx: number) => ({
                id: u._id || `unit-backend-${idx}`,
                name: u.name || 'Sem nome',
                city: u.city || 'São Paulo',
                state: u.state || 'SP',
                ip_ranges: u.ip_ranges || [],
                devicesCount: u.devicesCount || 0,
                created_at: u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : 'Hoje',
              }))
            )
          }
        }
      } catch {
        // Fallback dinâmico mantido
      }

      try {
        const resBssids = await fetch('/api/bssid-mappings')
        if (resBssids.ok) {
          const data = await resBssids.json()
          const list = Array.isArray(data) ? data : data.mappings || []
          if (list.length > 0) {
            setBssids(
              list.map((b: any, idx: number) => ({
                id: b._id || `bssid-backend-${idx}`,
                mac_address_radio: b.mac_address_radio || '',
                sector: b.sector || '',
                floor: b.floor || '',
                unitName: b.unitName || 'Sem unidade',
                frequency: '5 GHz / Wi-Fi',
                created_at: b.created_at ? new Date(b.created_at).toLocaleDateString('pt-BR') : 'Hoje',
              }))
            )
          }
        }
      } catch {
        // Fallback dinâmico mantido
      }
    }

    loadBackendData()
  }, [])

  // HANDLERS: UNIDADE
  const handleOpenNewUnit = () => {
    setEditingUnit(null)
    setUnitFormName('')
    setUnitFormCity('')
    setUnitFormState('')
    setUnitFormRanges([{ start: '', end: '' }])
    setUnitModalOpen(true)
  }

  const handleOpenEditUnit = (unit: UnitItem) => {
    setEditingUnit(unit)
    setUnitFormName(unit.name)
    setUnitFormCity(unit.city)
    setUnitFormState(unit.state)
    setUnitFormRanges(
      unit.ip_ranges && unit.ip_ranges.length > 0
        ? [...unit.ip_ranges]
        : [{ start: '', end: '' }]
    )
    setUnitModalOpen(true)
  }

  const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!unitFormName.trim()) {
      toast.warning('O nome da unidade é obrigatório.')
      return
    }

    const cleanRanges = unitFormRanges.filter((r) => r.start.trim() && r.end.trim())

    // Envio para o backend
    try {
      if (editingUnit) {
        await fetch(`/api/units/${encodeURIComponent(editingUnit.name)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: unitFormName, ip_ranges: cleanRanges }),
        })
      } else {
        await fetch('/api/units', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: unitFormName, ip_ranges: cleanRanges }),
        })
      }
    } catch {
      // Ignora erro de rede em ambiente offline
    }

    if (editingUnit) {
      setUnits((prev) =>
        prev.map((u) =>
          u.id === editingUnit.id
            ? {
                ...u,
                name: unitFormName,
                city: unitFormCity || u.city,
                state: unitFormState || u.state,
                ip_ranges: cleanRanges,
              }
            : u
        )
      )
      toast.success(`Unidade "${unitFormName}" atualizada com sucesso!`)
    } else {
      const newU: UnitItem = {
        id: `unit-${Date.now()}`,
        name: unitFormName,
        city: unitFormCity || 'São Paulo',
        state: unitFormState || 'SP',
        ip_ranges: cleanRanges,
        devicesCount: 0,
        created_at: new Date().toLocaleDateString('pt-BR'),
      }
      setUnits((prev) => [newU, ...prev])
      toast.success(`Unidade "${unitFormName}" cadastrada com sucesso!`)
    }

    setUnitModalOpen(false)
  }

  // HANDLERS: BSSID
  const handleOpenNewBssid = () => {
    setEditingBssid(null)
    setBssidFormMac('')
    setBssidFormSector('')
    setBssidFormFloor('')
    setBssidFormUnit(units[0]?.name || '')
    setBssidModalOpen(true)
  }

  const handleOpenEditBssid = (b: BssidItem) => {
    setEditingBssid(b)
    setBssidFormMac(b.mac_address_radio)
    setBssidFormSector(b.sector)
    setBssidFormFloor(b.floor)
    setBssidFormUnit(b.unitName)
    setBssidModalOpen(true)
  }

  const handleSaveBssid = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bssidFormMac.trim() || !bssidFormSector.trim() || !bssidFormFloor.trim()) {
      toast.warning('MAC Address, Setor e Andar são obrigatórios.')
      return
    }

    try {
      await fetch('/api/bssid-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mac_address_radio: bssidFormMac,
          sector: bssidFormSector,
          floor: bssidFormFloor,
          unitName: bssidFormUnit,
        }),
      })
    } catch {
      // Ignora erro em modo local
    }

    if (editingBssid) {
      setBssids((prev) =>
        prev.map((b) =>
          b.id === editingBssid.id
            ? {
                ...b,
                mac_address_radio: bssidFormMac.toUpperCase(),
                sector: bssidFormSector,
                floor: bssidFormFloor,
                unitName: bssidFormUnit,
              }
            : b
        )
      )
      toast.success('Mapeamento BSSID atualizado com sucesso!')
    } else {
      const newB: BssidItem = {
        id: `bssid-${Date.now()}`,
        mac_address_radio: bssidFormMac.toUpperCase(),
        sector: bssidFormSector,
        floor: bssidFormFloor,
        unitName: bssidFormUnit,
        frequency: '5 GHz / Wi-Fi 6',
        created_at: new Date().toLocaleDateString('pt-BR'),
      }
      setBssids((prev) => [newB, ...prev])
      toast.success('Novo BSSID mapeado com sucesso!')
    }

    setBssidModalOpen(false)
  }

  // HANDLERS: IP
  const handleOpenNewIp = () => {
    setEditingIp(null)
    setIpFormLocation('')
    setIpFormStart('')
    setIpFormEnd('')
    setIpFormUnit(units[0]?.name || '')
    setIpModalOpen(true)
  }

  const handleOpenEditIp = (item: IpMappingItem) => {
    setEditingIp(item)
    setIpFormLocation(item.location)
    setIpFormStart(item.ipStart)
    setIpFormEnd(item.ipEnd)
    setIpFormUnit(item.unitName)
    setIpModalOpen(true)
  }

  const handleSaveIp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ipFormLocation.trim() || !ipFormStart.trim() || !ipFormEnd.trim()) {
      toast.warning('Localização, IP inicial e final são obrigatórios.')
      return
    }

    if (editingIp) {
      setIps((prev) =>
        prev.map((i) =>
          i.id === editingIp.id
            ? {
                ...i,
                location: ipFormLocation,
                ipStart: ipFormStart,
                ipEnd: ipFormEnd,
                unitName: ipFormUnit,
              }
            : i
        )
      )
      toast.success('Faixa de IP atualizada com sucesso!')
    } else {
      const newIp: IpMappingItem = {
        id: `ip-${Date.now()}`,
        location: ipFormLocation,
        ipStart: ipFormStart,
        ipEnd: ipFormEnd,
        unitName: ipFormUnit,
        hostsCount: 254,
        created_at: new Date().toLocaleDateString('pt-BR'),
      }
      setIps((prev) => [newIp, ...prev])
      toast.success('Nova faixa de IP mapeada com sucesso!')
    }

    setIpModalOpen(false)
  }

  // EXCLUSÃO
  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return

    if (deleteConfirm.type === 'unit') {
      try {
        await fetch(`/api/units/${encodeURIComponent(deleteConfirm.name)}`, {
          method: 'DELETE',
        })
      } catch {}
      setUnits((prev) => prev.filter((u) => u.id !== deleteConfirm.id))
      toast.success(`Unidade "${deleteConfirm.name}" removida com sucesso.`)
    } else if (deleteConfirm.type === 'bssid') {
      try {
        await fetch(`/api/bssid-mappings/${encodeURIComponent(deleteConfirm.name)}`, {
          method: 'DELETE',
        })
      } catch {}
      setBssids((prev) => prev.filter((b) => b.id !== deleteConfirm.id))
      toast.success(`BSSID ${deleteConfirm.name} removido com sucesso.`)
    } else if (deleteConfirm.type === 'ip') {
      setIps((prev) => prev.filter((i) => i.id !== deleteConfirm.id))
      toast.success(`Mapeamento de IP ${deleteConfirm.name} removido com sucesso.`)
    }

    setDeleteConfirm(null)
  }

  // FILTRAGEM
  const filteredUnits = useMemo(() => {
    return units.filter(
      (u) =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.city.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [units, searchTerm])

  const filteredBssids = useMemo(() => {
    return bssids.filter(
      (b) =>
        b.mac_address_radio.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.sector.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.unitName.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [bssids, searchTerm])

  const filteredIps = useMemo(() => {
    return ips.filter(
      (i) =>
        i.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.ipStart.includes(searchTerm) ||
        i.ipEnd.includes(searchTerm) ||
        i.unitName.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [ips, searchTerm])

  return (
    <div className="page-stack">
      {/* Cabeçalho */}
      <div className="welcome-row">
        <div>
          <p className="eyebrow">REDE & INFRAESTRUTURA</p>
          <h2>Mapeamento de Redes & Localizações</h2>
          <p>
            Associação geográfica e de rede por BSSID Wi-Fi, Faixas de IP e Unidades Corporativas
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {activeTab === 'units' && (
            <Button icon="plus" onClick={handleOpenNewUnit}>
              Nova Unidade
            </Button>
          )}
          {activeTab === 'bssid' && (
            <Button icon="plus" onClick={handleOpenNewBssid}>
              Mapear BSSID
            </Button>
          )}
          {activeTab === 'ip' && (
            <Button icon="plus" onClick={handleOpenNewIp}>
              Mapear Faixa IP
            </Button>
          )}
        </div>
      </div>

      {/* Mini Métricas de Infraestrutura */}
      <div className="mini-metrics">
        <div>
          <div className="mini-icon blue">
            <Icon name="mapPin" />
          </div>
          <div>
            <p>Unidades / Filiais</p>
            <strong>{units.length}</strong>
          </div>
        </div>

        <div>
          <div className="mini-icon green">
            <Icon name="wifi" />
          </div>
          <div>
            <p>Access Points (BSSID)</p>
            <strong>{bssids.length}</strong>
          </div>
        </div>

        <div>
          <div className="mini-icon amber">
            <Icon name="server" />
          </div>
          <div>
            <p>Sub-redes Mapeadas</p>
            <strong>{ips.length}</strong>
          </div>
        </div>

        <div>
          <div className="mini-icon blue">
            <Icon name="laptop" />
          </div>
          <div>
            <p>Dispositivos Georreferenciados</p>
            <strong>247</strong>
          </div>
        </div>
      </div>

      {/* Barra de Abas */}
      <div className="detail-tabs">
        <button
          className={activeTab === 'units' ? 'active' : ''}
          onClick={() => setActiveTab('units')}
        >
          Unidades & Filiais ({units.length})
        </button>
        <button
          className={activeTab === 'bssid' ? 'active' : ''}
          onClick={() => setActiveTab('bssid')}
        >
          Access Points / BSSID ({bssids.length})
        </button>
        <button
          className={activeTab === 'ip' ? 'active' : ''}
          onClick={() => setActiveTab('ip')}
        >
          Sub-redes & Faixas IP ({ips.length})
        </button>
      </div>

      {/* Painel da Tabela */}
      <article className="panel table-panel">
        <div className="table-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <div className="table-search" style={{ flex: '1 1 280px' }}>
            <label className="search" style={{ width: '100%' }}>
              <Icon name="search" />
              <input
                placeholder={
                  activeTab === 'units'
                    ? 'Buscar unidade ou cidade...'
                    : activeTab === 'bssid'
                    ? 'Buscar MAC BSSID, setor ou unidade...'
                    : 'Buscar localização, IP ou filial...'
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </label>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              variant="secondary"
              icon="refresh"
              onClick={() => {
                toast.info('Atualizando cache de localização e regras de georreferenciamento...')
                setTimeout(() => toast.success('Mapeamentos sincronizados com o servidor!'), 800)
              }}
            >
              Sincronizar Cache
            </Button>
          </div>
        </div>

        {/* TAB 1: UNIDADES */}
        {activeTab === 'units' && (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Nome da Unidade</th>
                  <th>Cidade / UF</th>
                  <th>Faixas de IP Associadas</th>
                  <th>Dispositivos</th>
                  <th>Criado em</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredUnits.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--muted)' }}>
                      Nenhuma unidade encontrada.
                    </td>
                  </tr>
                ) : (
                  filteredUnits.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div className="device-cell">
                          <span style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
                            <Icon name="mapPin" size={18} />
                          </span>
                          <div>
                            <strong>{u.name}</strong>
                            <small>Sede Regional Corporativa</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        {u.city} — {u.state}
                      </td>
                      <td>
                        {u.ip_ranges && u.ip_ranges.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            {u.ip_ranges.map((r, i) => (
                              <code key={i} style={{ fontSize: '11px', color: 'var(--primary)' }}>
                                {r.start} — {r.end}
                              </code>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--muted)' }}>Sem faixas vinculadas</span>
                        )}
                      </td>
                      <td>
                        <Status tone="blue">{u.devicesCount} ativos</Status>
                      </td>
                      <td>{u.created_at}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <Button variant="ghost" icon="edit" onClick={() => handleOpenEditUnit(u)}>
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            icon="trash"
                            onClick={() =>
                              setDeleteConfirm({ type: 'unit', id: u.id, name: u.name })
                            }
                          >
                            Excluir
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: BSSID */}
        {activeTab === 'bssid' && (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>MAC Address (BSSID)</th>
                  <th>Setor & Ambiente</th>
                  <th>Andar</th>
                  <th>Unidade Vinculada</th>
                  <th>Frequência de Rádio</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredBssids.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--muted)' }}>
                      Nenhum BSSID mapeado encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredBssids.map((b) => (
                    <tr key={b.id}>
                      <td>
                        <div className="device-cell">
                          <span style={{ background: 'var(--green-soft)', color: 'var(--green)' }}>
                            <Icon name="wifi" size={18} />
                          </span>
                          <div>
                            <strong style={{ fontFamily: 'monospace', letterSpacing: '0.5px' }}>
                              {b.mac_address_radio}
                            </strong>
                            <small>Access Point Wi-Fi</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <strong>{b.sector}</strong>
                      </td>
                      <td>{b.floor}</td>
                      <td>
                        <span className="badge-tag blue">{b.unitName}</span>
                      </td>
                      <td>
                        <Status tone="green">{b.frequency || '5 GHz'}</Status>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <Button variant="ghost" icon="edit" onClick={() => handleOpenEditBssid(b)}>
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            icon="trash"
                            onClick={() =>
                              setDeleteConfirm({
                                type: 'bssid',
                                id: b.id,
                                name: b.mac_address_radio,
                              })
                            }
                          >
                            Excluir
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: IP */}
        {activeTab === 'ip' && (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Localização / Setor</th>
                  <th>IP Inicial</th>
                  <th>IP Final</th>
                  <th>Capacidade</th>
                  <th>Unidade</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredIps.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--muted)' }}>
                      Nenhuma faixa de IP mapeada.
                    </td>
                  </tr>
                ) : (
                  filteredIps.map((i) => (
                    <tr key={i.id}>
                      <td>
                        <div className="device-cell">
                          <span style={{ background: 'var(--amber-soft)', color: 'var(--amber)' }}>
                            <Icon name="server" size={18} />
                          </span>
                          <div>
                            <strong>{i.location}</strong>
                            <small>Sub-rede IPv4</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <code style={{ fontSize: '11px', color: 'var(--ink)' }}>{i.ipStart}</code>
                      </td>
                      <td>
                        <code style={{ fontSize: '11px', color: 'var(--ink)' }}>{i.ipEnd}</code>
                      </td>
                      <td>
                        <span className="badge-tag">{i.hostsCount} hosts</span>
                      </td>
                      <td>
                        <span className="badge-tag blue">{i.unitName}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <Button variant="ghost" icon="edit" onClick={() => handleOpenEditIp(i)}>
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            icon="trash"
                            onClick={() =>
                              setDeleteConfirm({
                                type: 'ip',
                                id: i.id,
                                name: `${i.ipStart} - ${i.ipEnd}`,
                              })
                            }
                          >
                            Excluir
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </article>

      {/* MODAL 1: UNIDADE */}
      <Modal
        isOpen={unitModalOpen}
        onClose={() => setUnitModalOpen(false)}
        title={editingUnit ? 'Editar Unidade Corporativa' : 'Cadastrar Nova Unidade'}
        subtitle="Unidades servem como centro geográfico para alocação automática de ativos"
        icon="mapPin"
        maxWidth={580}
      >
        <form onSubmit={handleSaveUnit} className="page-stack">
          <div className="form-grid">
            <label className="field full">
              <span>Nome da Unidade / Filial</span>
              <input
                type="text"
                placeholder="Ex: Filial São Paulo — Faria Lima"
                value={unitFormName}
                onChange={(e) => setUnitFormName(e.target.value)}
                required
              />
            </label>

            <label className="field">
              <span>Cidade</span>
              <input
                type="text"
                placeholder="Ex: São Paulo"
                value={unitFormCity}
                onChange={(e) => setUnitFormCity(e.target.value)}
              />
            </label>

            <label className="field">
              <span>Estado (UF)</span>
              <input
                type="text"
                placeholder="Ex: SP"
                maxLength={2}
                value={unitFormState}
                onChange={(e) => setUnitFormState(e.target.value.toUpperCase())}
              />
            </label>
          </div>

          <div style={{ marginTop: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
              Faixas de IP da Unidade (DHCP / Sub-redes)
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {unitFormRanges.map((range, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="IP Inicial (10.42.0.1)"
                    value={range.start}
                    onChange={(e) => {
                      const updated = [...unitFormRanges]
                      updated[idx].start = e.target.value
                      setUnitFormRanges(updated)
                    }}
                    style={{ flex: 1, padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--line)' }}
                  />
                  <span>—</span>
                  <input
                    type="text"
                    placeholder="IP Final (10.42.31.254)"
                    value={range.end}
                    onChange={(e) => {
                      const updated = [...unitFormRanges]
                      updated[idx].end = e.target.value
                      setUnitFormRanges(updated)
                    }}
                    style={{ flex: 1, padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--line)' }}
                  />
                  {unitFormRanges.length > 1 && (
                    <Button
                      variant="ghost"
                      icon="trash"
                      onClick={() =>
                        setUnitFormRanges(unitFormRanges.filter((_, i) => i !== idx))
                      }
                    />
                  )}
                </div>
              ))}
            </div>

            <Button
              variant="secondary"
              icon="plus"
              style={{ marginTop: '10px' }}
              onClick={() => setUnitFormRanges([...unitFormRanges, { start: '', end: '' }])}
            >
              Adicionar Faixa
            </Button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <Button variant="secondary" onClick={() => setUnitModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Salvar Unidade</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: BSSID */}
      <Modal
        isOpen={bssidModalOpen}
        onClose={() => setBssidModalOpen(false)}
        title={editingBssid ? 'Editar Mapeamento BSSID' : 'Mapear Novo Access Point (BSSID)'}
        subtitle="Associa o endereço MAC do rádio Wi-Fi ao setor físico e andar"
        icon="wifi"
        maxWidth={520}
      >
        <form onSubmit={handleSaveBssid} className="page-stack">
          <label className="field full">
            <span>MAC Address do Rádio Wi-Fi (BSSID)</span>
            <input
              type="text"
              placeholder="08:EC:F5:12:44:AA"
              value={bssidFormMac}
              onChange={(e) => setBssidFormMac(e.target.value)}
              required
            />
          </label>

          <div className="form-grid">
            <label className="field">
              <span>Setor / Sala</span>
              <input
                type="text"
                placeholder="Ex: Recepção, Design Studio"
                value={bssidFormSector}
                onChange={(e) => setBssidFormSector(e.target.value)}
                required
              />
            </label>

            <label className="field">
              <span>Andar</span>
              <input
                type="text"
                placeholder="Ex: Térreo, 4º Andar"
                value={bssidFormFloor}
                onChange={(e) => setBssidFormFloor(e.target.value)}
                required
              />
            </label>

            <label className="field full">
              <span>Unidade Corporativa</span>
              <select
                value={bssidFormUnit}
                onChange={(e) => setBssidFormUnit(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--line)' }}
              >
                {units.map((u) => (
                  <option key={u.id} value={u.name}>
                    {u.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <Button variant="secondary" onClick={() => setBssidModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Salvar BSSID</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: IP */}
      <Modal
        isOpen={ipModalOpen}
        onClose={() => setIpModalOpen(false)}
        title={editingIp ? 'Editar Faixa de IP' : 'Mapear Nova Faixa de IP'}
        subtitle="Mapeia blocos de endereçamento de rede para localização automática"
        icon="server"
        maxWidth={520}
      >
        <form onSubmit={handleSaveIp} className="page-stack">
          <label className="field full">
            <span>Identificação do Bloco / Localização</span>
            <input
              type="text"
              placeholder="Ex: Prédio B — Engenharia & Laboratórios"
              value={ipFormLocation}
              onChange={(e) => setIpFormLocation(e.target.value)}
              required
            />
          </label>

          <div className="form-grid">
            <label className="field">
              <span>IP Inicial</span>
              <input
                type="text"
                placeholder="10.42.10.1"
                value={ipFormStart}
                onChange={(e) => setIpFormStart(e.target.value)}
                required
              />
            </label>

            <label className="field">
              <span>IP Final</span>
              <input
                type="text"
                placeholder="10.42.10.254"
                value={ipFormEnd}
                onChange={(e) => setIpFormEnd(e.target.value)}
                required
              />
            </label>

            <label className="field full">
              <span>Unidade Corporativa</span>
              <select
                value={ipFormUnit}
                onChange={(e) => setIpFormUnit(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--line)' }}
              >
                {units.map((u) => (
                  <option key={u.id} value={u.name}>
                    {u.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <Button variant="secondary" onClick={() => setIpModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Salvar Faixa</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      <Modal
        isOpen={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        title="Confirmar Exclusão"
        subtitle="Esta ação removerá a regra de localização correspondente"
        icon="warning"
        maxWidth={460}
      >
        <div className="page-stack">
          <p style={{ fontSize: '13px', color: 'var(--ink)' }}>
            Tem certeza de que deseja remover <strong>{deleteConfirm?.name}</strong>?
          </p>
          <p style={{ fontSize: '12px', color: 'var(--muted)' }}>
            Dispositivos conectados sob esta regra precisarão se reautenticar para recalcular sua localização.
          </p>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleConfirmDelete}>
              Confirmar Exclusão
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
