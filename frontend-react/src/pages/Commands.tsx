import { useState } from 'react'
import { Icon } from '../components/Icon'
import { Button, Status } from '../components/UI'
import type { IconName } from '../types'

interface CommandDef {
  name: string
  icon: IconName
  desc: string
}

const commandOptions: CommandDef[] = [
  { name: 'Bloquear tela', icon: 'lock', desc: 'Bloqueia imediatamente a sessão ativa do usuário.' },
  { name: 'Reiniciar', icon: 'clock', desc: 'Reinicia o dispositivo de forma segura com aviso prévio.' },
  { name: 'Sincronizar', icon: 'pulse', desc: 'Força a sincronização imediata de inventário e políticas.' },
  { name: 'Instalar app', icon: 'download', desc: 'Envia silenciosamente um aplicativo do catálogo corporativo.' },
  { name: 'Limpar dados (Wipe)', icon: 'warning', desc: 'Remove credenciais e dados corporativos em caso de perda.' },
  { name: 'Terminal Bash / PowerShell', icon: 'terminal', desc: 'Executa um script de comando administrativo seguro com log.' },
]

export function Commands() {
  const [selected, setSelected] = useState('Bloquear tela')
  const [script, setScript] = useState('#!/bin/bash\n# Script de verificação e inventário\nsoftwareupdate -l')
  const [sent, setSent] = useState(false)

  const handleExecute = () => {
    setSent(true)
    setTimeout(() => setSent(false), 3000)
  }

  return (
    <div className="command-layout">
      <section className="page-stack">
        <article className="panel command-builder">
          <div className="form-heading">
            <span>AÇÃO REMOTA MDM</span>
            <h3>Executar comando no dispositivo</h3>
            <p>Selecione o ativo de destino e a rotina administrativa desejada.</p>
          </div>

          <label className="field">
            <span>Dispositivo de destino</span>
            <div className="device-select">
              <span>
                <Icon name="laptop" />
              </span>
              <div>
                <strong>MacBook Pro — Mariana Costa</strong>
                <small>NVR-MAC-0142 · macOS 15.5 · Online via WebSocket</small>
              </div>
              <Icon name="chevron" size={16} />
            </div>
          </label>

          <div className="command-options">
            {commandOptions.map((c) => (
              <button
                type="button"
                className={selected === c.name ? 'selected' : ''}
                onClick={() => {
                  setSelected(c.name)
                  setSent(false)
                }}
                key={c.name}
              >
                <span>
                  <Icon name={c.icon} />
                </span>
                <div>
                  <strong>{c.name}</strong>
                  <small>{c.desc}</small>
                </div>
                {selected === c.name && (
                  <i>
                    <Icon name="check" size={12} />
                  </i>
                )}
              </button>
            ))}
          </div>

          {selected.includes('Terminal') && (
            <label className="field terminal-field">
              <span>Script administrativo</span>
              <textarea
                value={script}
                onChange={(e) => setScript(e.target.value)}
                rows={4}
              />
            </label>
          )}

          <div className="command-warning">
            <Icon name="shield" />
            <p>Esta ação será registrada na trilha imutável de auditoria com seu usuário, IP, data e dispositivo.</p>
          </div>

          <div className="form-actions">
            <span>
              {sent && <Status tone="green">Comando transmitido com sucesso ao agente!</Status>}
            </span>
            <Button icon="terminal" onClick={handleExecute}>
              Executar {selected.toLowerCase()}
            </Button>
          </div>
        </article>
      </section>

      <aside className="panel command-history">
        <div className="panel-head">
          <div>
            <h3>Comandos recentes</h3>
            <p>Últimas ações disparadas na frota</p>
          </div>
          <button className="text-link">Ver histórico</button>
        </div>

        {[
          ['Sincronizar telemetria', 'Dell Latitude 7440', 'Concluído', 'green', 'Há 4 min'],
          ['Bloquear tela', 'MacBook Pro — Vendas', 'Concluído', 'green', 'Há 18 min'],
          ['Reiniciar Kiosk', 'Totem Recepção 01', 'Concluído', 'green', 'Há 25 min'],
          ['Reiniciar SO', 'WIN-FIN-084', 'Agendado', 'blue', 'Há 32 min'],
          ['Instalar app', 'Equipe Design (12 ativos)', 'Em execução', 'amber', 'Há 1 h'],
          ['Limpar dados (Wipe)', 'iPhone — ex-colaborador', 'Concluído', 'green', 'Ontem'],
        ].map((x) => (
          <div className="history-row" key={x[0] + x[1]}>
            <span>
              <Icon name="terminal" size={15} />
            </span>
            <div>
              <strong>{x[0]}</strong>
              <p>{x[1]}</p>
            </div>
            <div>
              <Status tone={x[3] as 'green' | 'blue' | 'amber'}>{x[2]}</Status>
              <small>{x[4]}</small>
            </div>
          </div>
        ))}
      </aside>
    </div>
  )
}
