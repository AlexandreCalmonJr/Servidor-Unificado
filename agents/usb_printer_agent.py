#!/usr/bin/env python3
"""
USB Printer Monitoring Agent
Monitora impressoras conectadas via USB e envia dados ao servidor central
"""

import os
import sys
import json
import base64
import subprocess
import time
import requests
import argparse
import logging
import random
import re
import shutil
from datetime import datetime
from typing import Dict, List, Optional
import socket
import threading

try:
    import tkinter as tk
    from tkinter import ttk, messagebox
except Exception:
    tk = None
    ttk = None
    messagebox = None

try:
    import pystray
    from PIL import Image, ImageDraw
except Exception:
    pystray = None
    Image = None
    ImageDraw = None

# Configuração de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def _config_file_path() -> str:
    if os.name == 'nt':
        base = os.getenv('APPDATA') or os.path.expanduser('~')
        folder = os.path.join(base, 'ServidorUnificado')
    else:
        folder = os.path.join(os.path.expanduser('~'), '.config', 'servidor-unificado')
    os.makedirs(folder, exist_ok=True)
    return os.path.join(folder, 'usb_printer_agent_config.json')


def _obfuscate_token(token: str, key_hint: str) -> str:
    raw = (token or '').encode('utf-8')
    key = (key_hint or 'usb-agent').encode('utf-8')
    out = bytes([raw[i] ^ key[i % len(key)] for i in range(len(raw))])
    return base64.urlsafe_b64encode(out).decode('ascii')


def _deobfuscate_token(token_obf: str, key_hint: str) -> str:
    try:
        raw = base64.urlsafe_b64decode((token_obf or '').encode('ascii'))
        key = (key_hint or 'usb-agent').encode('utf-8')
        out = bytes([raw[i] ^ key[i % len(key)] for i in range(len(raw))])
        return out.decode('utf-8')
    except Exception:
        return ''


def _windows_dpapi_protect(secret: str) -> str:
    if os.name != 'nt' or not secret:
        return ''
    try:
        import ctypes
        from ctypes import wintypes

        class DATA_BLOB(ctypes.Structure):
            _fields_ = [
                ('cbData', wintypes.DWORD),
                ('pbData', ctypes.POINTER(ctypes.c_char)),
            ]

        raw = secret.encode('utf-8')
        raw_buffer = ctypes.create_string_buffer(raw)
        in_blob = DATA_BLOB(len(raw), ctypes.cast(raw_buffer, ctypes.POINTER(ctypes.c_char)))
        out_blob = DATA_BLOB()

        ok = ctypes.windll.crypt32.CryptProtectData(
            ctypes.byref(in_blob),
            None,
            None,
            None,
            None,
            0,
            ctypes.byref(out_blob),
        )
        if not ok:
            return ''
        try:
            protected = ctypes.string_at(out_blob.pbData, out_blob.cbData)
            return base64.urlsafe_b64encode(protected).decode('ascii')
        finally:
            ctypes.windll.kernel32.LocalFree(out_blob.pbData)
    except Exception as exc:
        logger.warning(f"DPAPI nao disponivel para salvar token: {exc}")
        return ''


def _windows_dpapi_unprotect(secret_obf: str) -> str:
    if os.name != 'nt' or not secret_obf:
        return ''
    try:
        import ctypes
        from ctypes import wintypes

        class DATA_BLOB(ctypes.Structure):
            _fields_ = [
                ('cbData', wintypes.DWORD),
                ('pbData', ctypes.POINTER(ctypes.c_char)),
            ]

        raw = base64.urlsafe_b64decode(secret_obf.encode('ascii'))
        raw_buffer = ctypes.create_string_buffer(raw)
        in_blob = DATA_BLOB(len(raw), ctypes.cast(raw_buffer, ctypes.POINTER(ctypes.c_char)))
        out_blob = DATA_BLOB()

        ok = ctypes.windll.crypt32.CryptUnprotectData(
            ctypes.byref(in_blob),
            None,
            None,
            None,
            None,
            0,
            ctypes.byref(out_blob),
        )
        if not ok:
            return ''
        try:
            return ctypes.string_at(out_blob.pbData, out_blob.cbData).decode('utf-8')
        finally:
            ctypes.windll.kernel32.LocalFree(out_blob.pbData)
    except Exception as exc:
        logger.warning(f"DPAPI nao conseguiu ler token salvo: {exc}")
        return ''


def load_ui_config(key_hint: str) -> Dict:
    path = _config_file_path()
    if not os.path.exists(path):
        return {}
    try:
        with open(path, 'r', encoding='utf-8') as fh:
            data = json.load(fh)
        token = _windows_dpapi_unprotect(data.get('token_dpapi', ''))
        if not token:
            token = _deobfuscate_token(data.get('token_obf', ''), key_hint)
        return {
            'server': data.get('server', ''),
            'port': str(data.get('port', '3000')),
            'device_id': data.get('device_id', ''),
            'interval': str(data.get('interval', 60)),
            'token': token,
            'remember': bool(data.get('remember', True)),
        }
    except Exception:
        return {}


def save_ui_config(server: str, port: str, token: str, device_id: str, interval: int, remember: bool, key_hint: str) -> None:
    path = _config_file_path()
    payload = {
        'server': server,
        'port': port,
        'device_id': device_id,
        'interval': int(interval),
        'remember': bool(remember),
    }
    if remember and token:
        token_dpapi = _windows_dpapi_protect(token)
        if token_dpapi:
            payload['token_dpapi'] = token_dpapi
            payload['token_protection'] = 'dpapi'
        else:
            payload['token_obf'] = _obfuscate_token(token, key_hint)
            payload['token_protection'] = 'xor-fallback'
            logger.warning("Token salvo com fallback legado; prefira Windows DPAPI quando disponivel.")
    else:
        payload['token_protection'] = 'none'
    with open(path, 'w', encoding='utf-8') as fh:
        json.dump(payload, fh, indent=2, ensure_ascii=False)


def clear_ui_config() -> None:
    path = _config_file_path()
    if os.path.exists(path):
        os.remove(path)


class USBPrinterAgent:
    """Agente para monitorar impressoras USB"""
    
    def __init__(self, server_url: str, device_token: str, device_id: str = None):
        """
        Inicializa o agente
        
        Args:
            server_url: URL do servidor (ex: https://192.168.1.100:3000)
            device_token: Token de autenticação do dispositivo
            device_id: ID único do dispositivo (gerado automaticamente se não fornecido)
        """
        self.server_url = server_url.rstrip('/')
        self.device_token = device_token
        self.device_id = device_id or self._generate_device_id()
        self.headers = {
            'Authorization': f'Bearer {device_token}',
            'Content-Type': 'application/json'
        }
        self.interval = 60  # Intervalo de verificação em segundos
        
    def _generate_device_id(self) -> str:
        """Gera um ID único para o dispositivo"""
        try:
            hostname = socket.gethostname()
            return f"usb-printer-agent-{hostname}"
        except:
            return "usb-printer-agent-unknown"

    def detect_brand_from_text(self, text: str) -> str:
        value = str(text or '').lower()
        if 'hp' in value or 'hewlett' in value:
            return 'HP'
        if 'samsung' in value and any(tag in value for tag in ['4020', '4080', 'm4020', 'm4080', 'proxpress']):
            return 'HP'
        if 'samsung' in value:
            return 'Samsung'
        if 'brother' in value:
            return 'Brother'
        if 'xerox' in value:
            return 'Xerox'
        if 'canon' in value:
            return 'Canon'
        if 'ricoh' in value:
            return 'Ricoh'
        return 'Unknown'
    
    def discover_usb_printers(self) -> List[Dict]:
        """
        Descobre impressoras USB conectadas
        
        Returns:
            Lista de impressoras encontradas
        """
        if os.name == 'nt':
            return self._discover_usb_printers_windows()

        printers = []
        try:
            output = subprocess.check_output(['lsusb'], text=True)

            for line in output.split('\n'):
                if not line.strip():
                    continue
                if any(brand in line for brand in ['HP', 'Samsung', 'Xerox', 'Brother', 'Canon', 'Ricoh']):
                    printer = self._parse_lsusb_line(line)
                    if printer:
                        printers.append(printer)

            logger.info(f"Descobertas {len(printers)} impressoras USB")

        except FileNotFoundError:
            logger.warning("lsusb não encontrado. Tente instalar com: sudo apt-get install usbutils")
        except Exception as e:
            logger.error(f"Erro ao descobrir impressoras: {e}")

        return printers

    def _discover_usb_printers_windows(self) -> List[Dict]:
        printers = []
        command = (
            "Get-CimInstance Win32_Printer "
            "| Select-Object Name,DriverName,PortName,WorkOffline,PrinterStatus,DeviceID "
            "| ConvertTo-Json -Depth 4"
        )
        try:
            output = subprocess.check_output(
                ['powershell', '-NoProfile', '-Command', command],
                text=True,
                timeout=12,
            )
            if not output.strip():
                return []

            parsed = json.loads(output)
            items = parsed if isinstance(parsed, list) else [parsed]
            for idx, item in enumerate(items):
                port_name = str(item.get('PortName') or '').strip()
                if 'usb' not in port_name.lower():
                    continue

                manufacturer = self.detect_brand_from_text(
                    f"{item.get('Name') or ''} {item.get('DriverName') or ''}"
                )
                model = item.get('DriverName') or item.get('Name') or 'Unknown'
                manufacturer, model = self.normalize_printer_brand(manufacturer, model)

                printers.append({
                    'id': item.get('DeviceID') or f"WIN-USB-{idx}",
                    'serial_number': item.get('DeviceID') or f"WIN-USB-{idx}",
                    'asset_name': item.get('Name') or f"USB Printer {idx + 1}",
                    'manufacturer': manufacturer,
                    'model': model,
                    'connection_type': 'usb',
                    'usb_path': port_name or None,
                    'status': 'offline' if item.get('WorkOffline') else 'online',
                    'last_check': datetime.now().isoformat(),
                    'connection_details': {
                        'port_name': port_name or None,
                        'printer_status': item.get('PrinterStatus'),
                        'device_id': item.get('DeviceID'),
                    },
                })
            logger.info(f"Descobertas {len(printers)} impressoras USB (Windows)")
        except Exception as e:
            logger.error(f"Erro ao descobrir impressoras USB no Windows: {e}")
        return printers
    
    def _parse_lsusb_line(self, line: str) -> Optional[Dict]:
        """
        Faz parse de uma linha do lsusb
        
        Formato: Bus 001 Device 002: ID 03f0:1004 Hewlett-Packard DeskJet 970c
        """
        try:
            parts = line.split()
            
            # Extrai informações
            bus_idx = parts.index('Bus') + 1
            device_idx = parts.index('Device') + 1
            id_idx = parts.index('ID') + 1
            
            bus = parts[bus_idx].rstrip(':')
            device = parts[device_idx].rstrip(':')
            vendor_id, product_id = parts[id_idx].split(':')
            
            # Descrição é tudo após "ID xxxx:xxxx"
            description = ' '.join(parts[id_idx + 1:])
            
            # Extrai fabricante e modelo
            desc_parts = description.split()
            manufacturer = desc_parts[0] if desc_parts else 'Unknown'
            model = ' '.join(desc_parts[1:]) if len(desc_parts) > 1 else 'Unknown'
            manufacturer, model = self.normalize_printer_brand(manufacturer, model)
            
            return {
                'id': f"usb-{vendor_id}-{product_id}",
                'asset_name': f"{manufacturer} {model}",
                'manufacturer': manufacturer,
                'model': model,
                'connection_type': 'usb',
                'connection_details': {
                    'bus': bus,
                    'device': device,
                    'vendor_id': vendor_id,
                    'product_id': product_id
                },
                'status': 'online',
                'last_check': datetime.now().isoformat()
            }
        except Exception as e:
            logger.debug(f"Erro ao fazer parse de linha lsusb: {e}")
            return None

    def normalize_printer_brand(self, manufacturer: str, model: str):
        """
        Regra de ambiente: modelos Samsung 4020/4080/ProXpress são tratados como HP.
        """
        mfg_raw = str(manufacturer or '').strip()
        model_raw = str(model or '').strip()
        joined = f"{mfg_raw} {model_raw}".lower()

        if 'samsung' in joined and any(tag in joined for tag in ['4020', '4080', 'm4020', 'm4080', 'proxpress']):
            return 'HP', model_raw

        return (mfg_raw or 'Unknown', model_raw or 'Unknown')
    
    def get_printer_status(self, printer: Dict) -> Dict:
        """
        Obtém o status atual de uma impressora USB
        
        Args:
            printer: Dicionário com informações da impressora
            
        Returns:
            Dicionário com status atualizado
        """
        status = printer.copy()
        status['last_check'] = datetime.now().isoformat()
        
        try:
            if os.name == 'nt':
                port_name = str((printer.get('connection_details') or {}).get('port_name') or printer.get('usb_path') or '')
                if port_name:
                    command = (
                        "Get-CimInstance Win32_Printer "
                        f"| Where-Object {{ $_.PortName -eq '{port_name}' }} "
                        "| Select-Object -First 1 Name,WorkOffline "
                        "| ConvertTo-Json -Depth 2"
                    )
                    output = subprocess.check_output(
                        ['powershell', '-NoProfile', '-Command', command],
                        text=True,
                        timeout=8,
                    )
                    if output.strip():
                        obj = json.loads(output)
                        status['status'] = 'offline' if obj.get('WorkOffline') else 'online'
                    else:
                        status['status'] = 'offline'
                else:
                    status['status'] = status.get('status') or 'unknown'
            else:
                vendor_id = (printer.get('connection_details') or {}).get('vendor_id')
                if not vendor_id:
                    status['status'] = status.get('status') or 'unknown'
                    return status
                output = subprocess.check_output(['lsusb'], text=True)
                status['status'] = 'online' if vendor_id in output else 'offline'
        except Exception as e:
            logger.debug(f"Erro ao verificar status: {e}")
            status['status'] = 'unknown'
        
        return status
    
    def get_toner_levels(self, printer: Dict) -> Optional[Dict]:
        """
        Tenta obter níveis de toner para USB.
        Suporte real:
          - HP: via utilitários HPLIP (hp-levels/hp-info), quando instalados.
        Demais fabricantes:
          - retorna None (sem SDK/driver específico disponível no host).
        """
        manufacturer = str(printer.get('manufacturer') or '').strip().lower()
        if 'hp' in manufacturer or 'hewlett' in manufacturer:
            return self._get_toner_hp_usb(printer)
        if 'samsung' in manufacturer:
            if self._is_samsung_hp_like(printer):
                return self._get_toner_hp_usb(printer)
            return self._get_toner_samsung_usb(printer)
        return None

    def _is_samsung_hp_like(self, printer: Dict) -> bool:
        model = str(printer.get('model') or '').lower()
        name = str(printer.get('asset_name') or '').lower()
        joined = f"{model} {name}"
        return any(tag in joined for tag in ['4020', '4080', 'm4020', 'm4080', 'proxpress'])

    def _extract_first_percent(self, text: str, color_hint: str = 'black') -> Optional[int]:
        if not text:
            return None

        color_patterns = {
            'black': [
                r'(?i)(black|preto)[^\n\r%]{0,80}?(\d{1,3})\s*%',
                r'(?i)(k toner|k cartridge)[^\n\r%]{0,80}?(\d{1,3})\s*%',
            ],
        }
        for pattern in color_patterns.get(color_hint, []):
            match = re.search(pattern, text)
            if match:
                pct = int(match.group(2))
                return max(0, min(100, pct))

        generic = re.search(r'(\d{1,3})\s*%', text)
        if generic:
            pct = int(generic.group(1))
            return max(0, min(100, pct))
        return None

    def _run_command_capture(self, command: List[str], timeout: int = 10) -> str:
        try:
            output = subprocess.check_output(command, text=True, timeout=timeout, stderr=subprocess.STDOUT)
            return output or ''
        except Exception:
            return ''

    def _get_toner_hp_usb(self, printer: Dict) -> Optional[Dict]:
        # Tentativa 1: hp-levels (HPLIP)
        if shutil.which('hp-levels'):
            out = self._run_command_capture(['hp-levels'])
            pct = self._extract_first_percent(out, color_hint='black')
            if pct is not None:
                return {'black': pct}

        # Tentativa 2: hp-info (HPLIP)
        if shutil.which('hp-info'):
            out = self._run_command_capture(['hp-info', '-i'])
            pct = self._extract_first_percent(out, color_hint='black')
            if pct is not None:
                return {'black': pct}

        return None

    def _get_toner_samsung_usb(self, printer: Dict) -> Optional[Dict]:
        # Samsung USB sem utilitário padrão universal no host.
        # Mantém fallback None até integração com tool/SDK específico.
        return None
    
    def send_printer_data(self, printers: List[Dict]) -> Dict:
        """
        Envia dados de impressoras para o servidor
        
        Args:
            printers: Lista de impressoras com status
            
        Returns:
            Dict com status da tentativa e resposta do servidor
        """
        if not printers:
            logger.debug("Nenhuma impressora para enviar")
            return {
                'success': True,
                'status_code': 200,
                'message': 'Nenhuma impressora para enviar',
                'response_json': None,
            }
        
        try:
            # Prepara payload
            payload = {
                'asset_type': 'printer',
                'device_id': self.device_id,
                'source': 'usb-agent',
                'agent_hostname': socket.gethostname(),
                'printers': printers,
                'timestamp': datetime.now().isoformat()
            }
            
            # Envia para o servidor
            url = f"{self.server_url}/api/printers/sync"
            response = requests.post(
                url,
                json=payload,
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code in [200, 201]:
                logger.info(f"Dados de {len(printers)} impressoras enviados com sucesso")
                parsed = None
                try:
                    parsed = response.json()
                except Exception:
                    parsed = {'raw': response.text}
                return {
                    'success': True,
                    'status_code': response.status_code,
                    'message': 'Dados enviados com sucesso',
                    'response_json': parsed,
                }
            else:
                logger.warning(f"Erro ao enviar dados: {response.status_code} - {response.text}")
                return {
                    'success': False,
                    'status_code': response.status_code,
                    'message': f'Falha HTTP: {response.status_code}',
                    'response_json': {'raw': response.text},
                }
                
        except requests.exceptions.ConnectionError:
            logger.warning(f"Erro de conexão com servidor: {self.server_url}")
            return {
                'success': False,
                'status_code': 0,
                'message': f'Erro de conexão com servidor: {self.server_url}',
                'response_json': None,
            }
        except Exception as e:
            logger.error(f"Erro ao enviar dados: {e}")
            return {
                'success': False,
                'status_code': 0,
                'message': f'Erro ao enviar dados: {e}',
                'response_json': None,
            }

    def enrich_usb_telemetry(self, printer: Dict) -> Dict:
        """
        Enriquecimento de dados USB.
        Toner via USB é limitado por SO/fabricante; quando indisponível, marcamos explicitamente.
        """
        enriched = printer.copy()
        toner_levels = self.get_toner_levels(printer)
        custom_data = enriched.get('custom_data') or {}
        custom_data['usb_toner_supported'] = toner_levels is not None
        manufacturer = str(enriched.get('manufacturer') or '').lower()
        if toner_levels is not None:
            custom_data['toner_source'] = 'usb_hplip' if 'hp' in manufacturer else 'usb_vendor_tool'
            custom_data['toner_message'] = 'Nível de toner obtido via utilitário local.'
        else:
            if 'hp' in manufacturer:
                custom_data['toner_source'] = 'usb_hplip_not_available'
                custom_data['toner_message'] = 'Instale HPLIP (hp-levels/hp-info) para leitura de toner USB HP.'
            elif 'samsung' in manufacturer:
                custom_data['toner_source'] = 'usb_samsung_tool_not_available'
                custom_data['toner_message'] = 'Samsung USB requer utilitário específico do fabricante para toner.'
            else:
                custom_data['toner_source'] = 'not_supported_generic_usb'
                custom_data['toner_message'] = 'Leitura de toner USB não suportada genericamente.'
        enriched['custom_data'] = custom_data
        if toner_levels is not None:
            enriched['toner_levels'] = toner_levels
        return enriched
    
    def run(self, stop_event: Optional[threading.Event] = None):
        """Executa o agente em loop contínuo"""
        logger.info(f"Iniciando agente USB Printer (ID: {self.device_id})")
        logger.info(f"Servidor: {self.server_url}")
        logger.info(f"Intervalo de verificação: {self.interval}s")
        
        try:
            while True:
                if stop_event and stop_event.is_set():
                    logger.info("Sinal de parada recebido para o agente USB")
                    break
                try:
                    # Descobre impressoras
                    printers = self.discover_usb_printers()
                    
                    if printers:
                        # Obtém status de cada impressora
                        for printer in printers:
                            status = self.get_printer_status(printer)
                            printer.update(status)
                            printer.update(self.enrich_usb_telemetry(printer))
                        
                        # Envia dados
                        self.send_printer_data(printers)
                    
                    # Aguarda próxima verificação
                    if stop_event:
                        stop_event.wait(self.interval)
                    else:
                        time.sleep(self.interval)
                    
                except KeyboardInterrupt:
                    logger.info("Agente interrompido pelo usuário")
                    break
                except Exception as e:
                    logger.error(f"Erro no loop principal: {e}")
                    if stop_event:
                        stop_event.wait(self.interval)
                    else:
                        time.sleep(self.interval)
                    
        except KeyboardInterrupt:
            logger.info("Encerrando agente...")
        finally:
            logger.info("Agente encerrado")
    
    def run_once(self):
        """Executa uma única verificação"""
        logger.info(f"Executando verificação única (ID: {self.device_id})")
        
        printers = self.discover_usb_printers()
        
        if printers:
            for printer in printers:
                status = self.get_printer_status(printer)
                printer.update(status)
                printer.update(self.enrich_usb_telemetry(printer))
            
            result = self.send_printer_data(printers)
            
            # Exibe resultado
            output = {
                'result': result,
                'printers': printers
            }
            print(json.dumps(output, indent=2, ensure_ascii=False))
            return output
        else:
            print("Nenhuma impressora USB encontrada")
            return {
                'result': {
                    'success': True,
                    'status_code': 200,
                    'message': 'Nenhuma impressora USB encontrada'
                },
                'printers': []
            }

    def build_simulated_printers(self, count: int = 2) -> List[Dict]:
        """Gera impressoras USB simuladas para teste de integração com o servidor."""
        hostname = socket.gethostname()
        manufacturers = ['HP', 'Samsung', 'Brother']
        models = {
            'HP': ['LaserJet Pro M404n', 'LaserJet MFP M428fdw'],
            'Samsung': ['M4080FX', 'ProXpress M4020ND'],
            'Brother': ['HL-L5102DW', 'DCP-L5652DN'],
        }
        printers = []

        for idx in range(max(1, count)):
            manufacturer = random.choice(manufacturers)
            model = random.choice(models[manufacturer])
            manufacturer, model = self.normalize_printer_brand(manufacturer, model)
            serial = f"SIM-USB-{manufacturer[:2].upper()}-{idx + 1:03d}"
            printer_hostname = f"{hostname}-usb-prn-{idx + 1}"

            printers.append({
                'id': serial,
                'serial_number': serial,
                'asset_name': printer_hostname,
                'hostname': printer_hostname,
                'manufacturer': manufacturer,
                'model': model,
                'connection_type': 'usb',
                'usb_path': f"USB{idx + 1:03d}",
                'status': 'online',
                'toner_levels': {
                    'black': random.randint(20, 95),
                    'imaging_unit': random.randint(30, 99),
                },
                'last_check': datetime.now().isoformat(),
                'connection_details': {
                    'bus': f"{idx + 1:03d}",
                    'device': f"{idx + 10:03d}",
                    'vendor_id': 'FFFF',
                    'product_id': f"{1000 + idx}",
                    'simulated': True
                },
                'mac_address': f"02:00:00:AA:{idx + 1:02X}:{idx + 10:02X}",
            })

        return printers

    def run_simulation(self, count: int = 2):
        """Executa envio simulado para validar integração com /api/printers/sync."""
        logger.info(f"Executando simulação USB com {count} impressora(s)")
        printers = self.build_simulated_printers(count=count)
        result = self.send_printer_data(printers)
        output = {
            'simulated': True,
            'result': result,
            'count': len(printers),
            'printers': printers
        }
        print(json.dumps(output, indent=2, ensure_ascii=False))
        return output


def _resolve_tray_icon_path() -> Optional[str]:
    script_dir = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        os.path.normpath(os.path.join(script_dir, '..', 'frontend', 'favicon.png')),
        os.path.normpath(os.path.join(script_dir, '..', 'clients', 'desktop', 'src', 'assets', 'icon.png')),
    ]
    for icon_path in candidates:
        if os.path.exists(icon_path):
            return icon_path
    return None


def _build_fallback_tray_icon():
    if Image is None or ImageDraw is None:
        return None
    img = Image.new('RGB', (64, 64), (16, 83, 166))
    draw = ImageDraw.Draw(img)
    draw.rectangle((8, 8, 56, 56), outline=(255, 255, 255), width=3)
    draw.rectangle((18, 16, 46, 32), fill=(255, 255, 255))
    draw.rectangle((16, 36, 48, 48), fill=(255, 255, 255))
    return img


def run_agent_with_tray(agent: USBPrinterAgent):
    if pystray is None or Image is None:
        logger.warning("pystray/Pillow não disponíveis. Instale com: pip install pystray pillow")
        agent.run()
        return

    stop_event = threading.Event()

    def worker_loop():
        try:
            agent.run(stop_event=stop_event)
        except Exception as exc:
            logger.error(f"Erro no loop do agente (tray): {exc}")

    worker = threading.Thread(target=worker_loop, daemon=True)
    worker.start()

    icon_img = None
    icon_path = _resolve_tray_icon_path()
    try:
        if icon_path:
            icon_img = Image.open(icon_path)
    except Exception:
        icon_img = None
    if icon_img is None:
        icon_img = _build_fallback_tray_icon()

    def on_send_now(icon, item):
        threading.Thread(target=agent.run_once, daemon=True).start()

    def on_exit(icon, item):
        stop_event.set()
        icon.stop()

    def status_label(item):
        return "USB Printer Agent - Rodando" if worker.is_alive() else "USB Printer Agent - Parado"

    tray_menu = pystray.Menu(
        pystray.MenuItem(status_label, None, enabled=False),
        pystray.MenuItem("Enviar agora", on_send_now),
        pystray.MenuItem("Sair", on_exit),
    )

    tray = pystray.Icon("usb_printer_agent", icon_img, "USB Printer Agent", tray_menu)
    logger.info("Iniciando USB Printer Agent em tray")
    tray.run()
    stop_event.set()
    worker.join(timeout=5)


def main():
    """Função principal"""
    parser = argparse.ArgumentParser(
        description='Agente de monitoramento de impressoras USB',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Exemplos de uso:

  # Executar em modo contínuo
  python3 usb_printer_agent.py --server https://192.168.1.100:3000 --token seu_token

  # Executar uma única verificação
  python3 usb_printer_agent.py --server https://192.168.1.100:3000 --token seu_token --once

  # Com ID de dispositivo customizado
  python3 usb_printer_agent.py --server https://192.168.1.100:3000 --token seu_token --device-id meu-computador
        '''
    )
    
    parser.add_argument('--server', help='URL do servidor (ex: https://192.168.1.100:3000)')
    parser.add_argument('--token', help='Token de autenticação do dispositivo')
    parser.add_argument('--ui', action='store_true', help='Abre interface para informar IP, porta e token')
    parser.add_argument('--device-id', help='ID único do dispositivo (opcional)')
    parser.add_argument('--once', action='store_true', help='Executar uma única verificação e sair')
    parser.add_argument('--tray', action='store_true', help='Executar em segundo plano com ícone na bandeja')
    parser.add_argument('--simulate', action='store_true', help='Enviar impressoras USB simuladas para teste')
    parser.add_argument('--simulate-count', type=int, default=2, help='Quantidade de impressoras simuladas (padrão: 2)')
    parser.add_argument('--interval', type=int, default=60, help='Intervalo de verificação em segundos (padrão: 60)')
    
    args = parser.parse_args()

    def build_server_url(host_or_url: str, port: str) -> str:
        host_or_url = (host_or_url or '').strip()
        port = (port or '').strip()
        if not host_or_url:
            return ''
        if host_or_url.startswith('http://') or host_or_url.startswith('https://'):
            return host_or_url.rstrip('/')
        host_only = host_or_url
        if ':' in host_or_url and host_or_url.count(':') == 1 and host_or_url.split(':')[1].isdigit():
            host_only = host_or_url.split(':')[0]
        allow_http = os.getenv('MDM_ALLOW_HTTP', '').lower() == 'true'
        is_loopback = host_only.lower() in ('localhost', '127.0.0.1', '::1', '[::1]')
        protocol = 'http://' if allow_http or is_loopback else 'https://'
        if ':' in host_or_url and host_or_url.count(':') == 1 and host_or_url.split(':')[1].isdigit():
            return f"{protocol}{host_or_url}".rstrip('/')
        if not port:
            port = '3000'
        return f"{protocol}{host_or_url}:{port}".rstrip('/')

    if args.ui:
        if tk is None:
            print("Tkinter não está disponível neste Python. Rode sem --ui ou instale suporte Tk.")
            sys.exit(1)

        config_hint = socket.gethostname()
        saved = load_ui_config(config_hint)

        root = tk.Tk()
        root.title("USB Printer Agent")
        root.geometry("560x380")
        root.resizable(False, False)

        frame = ttk.Frame(root, padding=16)
        frame.pack(fill=tk.BOTH, expand=True)

        ttk.Label(frame, text="Servidor (IP ou URL):").grid(row=0, column=0, sticky=tk.W, pady=4)
        server_var = tk.StringVar(value=saved.get('server') or args.server or "localhost")
        ttk.Entry(frame, textvariable=server_var, width=44).grid(row=0, column=1, sticky=tk.W, pady=4)

        ttk.Label(frame, text="Porta:").grid(row=1, column=0, sticky=tk.W, pady=4)
        port_var = tk.StringVar(value=saved.get('port') or "3000")
        ttk.Entry(frame, textvariable=port_var, width=14).grid(row=1, column=1, sticky=tk.W, pady=4)

        ttk.Label(frame, text="Token:").grid(row=2, column=0, sticky=tk.W, pady=4)
        token_var = tk.StringVar(value=saved.get('token') or args.token or "")
        ttk.Entry(frame, textvariable=token_var, width=44, show="*").grid(row=2, column=1, sticky=tk.W, pady=4)

        ttk.Label(frame, text="Device ID:").grid(row=3, column=0, sticky=tk.W, pady=4)
        device_id_var = tk.StringVar(value=saved.get('device_id') or args.device_id or socket.gethostname())
        ttk.Entry(frame, textvariable=device_id_var, width=44).grid(row=3, column=1, sticky=tk.W, pady=4)

        ttk.Label(frame, text="Intervalo (s):").grid(row=4, column=0, sticky=tk.W, pady=4)
        interval_var = tk.StringVar(value=saved.get('interval') or str(args.interval or 60))
        ttk.Entry(frame, textvariable=interval_var, width=14).grid(row=4, column=1, sticky=tk.W, pady=4)

        remember_var = tk.BooleanVar(value=saved.get('remember', True))
        ttk.Checkbutton(frame, text="Salvar credenciais neste computador", variable=remember_var).grid(row=5, column=1, sticky=tk.W, pady=4)

        status_var = tk.StringVar(value="Pronto.")
        ttk.Label(frame, textvariable=status_var).grid(row=7, column=0, columnspan=2, sticky=tk.W, pady=12)

        ttk.Label(frame, text="Resposta do servidor:").grid(row=8, column=0, sticky=tk.NW, pady=4)
        response_box = tk.Text(frame, height=5, width=56, wrap=tk.WORD)
        response_box.grid(row=8, column=1, sticky=tk.W, pady=4)
        response_box.insert("1.0", "Aguardando execução...")
        response_box.config(state=tk.DISABLED)

        def set_response_text(payload: str):
            response_box.config(state=tk.NORMAL)
            response_box.delete("1.0", tk.END)
            response_box.insert("1.0", payload)
            response_box.config(state=tk.DISABLED)

        def build_agent_from_ui():
            server_url = build_server_url(server_var.get(), port_var.get())
            token = token_var.get().strip()
            device_id = device_id_var.get().strip() or None
            interval = int(interval_var.get().strip() or "60")
            if not server_url or not token:
                raise ValueError("Informe servidor e token.")
            if remember_var.get():
                save_ui_config(
                    server=server_var.get().strip(),
                    port=port_var.get().strip(),
                    token=token,
                    device_id=device_id or '',
                    interval=interval,
                    remember=True,
                    key_hint=config_hint
                )
            agent = USBPrinterAgent(server_url=server_url, device_token=token, device_id=device_id)
            agent.interval = max(10, interval)
            return agent

        def save_config_ui():
            try:
                token = token_var.get().strip()
                interval = int(interval_var.get().strip() or "60")
                save_ui_config(
                    server=server_var.get().strip(),
                    port=port_var.get().strip(),
                    token=token,
                    device_id=device_id_var.get().strip(),
                    interval=interval,
                    remember=remember_var.get(),
                    key_hint=config_hint
                )
                status_var.set("Configuração salva.")
                if messagebox:
                    messagebox.showinfo("USB Agent", "Configuração salva com sucesso.")
            except Exception as exc:
                status_var.set(f"Erro: {exc}")
                if messagebox:
                    messagebox.showerror("USB Agent", str(exc))

        def clear_config_ui():
            try:
                clear_ui_config()
                status_var.set("Configuração local removida.")
                if messagebox:
                    messagebox.showinfo("USB Agent", "Configuração local removida.")
            except Exception as exc:
                status_var.set(f"Erro: {exc}")
                if messagebox:
                    messagebox.showerror("USB Agent", str(exc))

        def run_once_ui():
            try:
                agent = build_agent_from_ui()
                status_var.set("Executando envio único...")
                root.update_idletasks()
                result = agent.run_once()
                set_response_text(json.dumps(result, indent=2, ensure_ascii=False))
                status_var.set("Envio único finalizado.")
                if messagebox:
                    messagebox.showinfo("USB Agent", "Execução única finalizada.")
            except Exception as exc:
                status_var.set(f"Erro: {exc}")
                if messagebox:
                    messagebox.showerror("USB Agent", str(exc))

        def run_simulated_ui():
            try:
                agent = build_agent_from_ui()
                status_var.set("Enviando simulação...")
                root.update_idletasks()
                result = agent.run_simulation(count=max(1, args.simulate_count))
                set_response_text(json.dumps(result, indent=2, ensure_ascii=False))
                status_var.set("Simulação enviada.")
                if messagebox:
                    messagebox.showinfo("USB Agent", "Simulação enviada com sucesso.")
            except Exception as exc:
                status_var.set(f"Erro: {exc}")
                if messagebox:
                    messagebox.showerror("USB Agent", str(exc))

        def run_background_ui():
            def target():
                try:
                    agent = build_agent_from_ui()
                    status_var.set("Monitoramento contínuo iniciado.")
                    agent.run()
                except Exception as exc:
                    status_var.set(f"Erro: {exc}")
                    set_response_text(str(exc))

            threading.Thread(target=target, daemon=True).start()

        buttons = ttk.Frame(frame)
        buttons.grid(row=6, column=0, columnspan=2, sticky=tk.W, pady=12)
        ttk.Button(buttons, text="Testar (uma vez)", command=run_once_ui).pack(side=tk.LEFT, padx=4)
        ttk.Button(buttons, text="Simular envio", command=run_simulated_ui).pack(side=tk.LEFT, padx=4)
        ttk.Button(buttons, text="Iniciar contínuo", command=run_background_ui).pack(side=tk.LEFT, padx=4)
        ttk.Button(buttons, text="Salvar", command=save_config_ui).pack(side=tk.LEFT, padx=4)
        ttk.Button(buttons, text="Limpar", command=clear_config_ui).pack(side=tk.LEFT, padx=4)

        root.mainloop()
        return

    if not args.server or not args.token:
        parser.error("Sem --ui, os argumentos --server e --token são obrigatórios.")
    
    # Cria e executa agente
    agent = USBPrinterAgent(
        server_url=build_server_url(args.server, ''),
        device_token=args.token,
        device_id=args.device_id
    )
    
    agent.interval = args.interval
    
    if args.simulate:
        agent.run_simulation(count=args.simulate_count)
    elif args.tray:
        run_agent_with_tray(agent)
    elif args.once:
        agent.run_once()
    else:
        agent.run()


if __name__ == '__main__':
    main()
