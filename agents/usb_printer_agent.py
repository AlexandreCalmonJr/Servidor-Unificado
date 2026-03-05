#!/usr/bin/env python3
"""
USB Printer Monitoring Agent
Monitora impressoras conectadas via USB e envia dados ao servidor central
"""

import os
import sys
import json
import subprocess
import time
import requests
import argparse
import logging
from datetime import datetime
from typing import Dict, List, Optional
import socket

# Configuração de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class USBPrinterAgent:
    """Agente para monitorar impressoras USB"""
    
    def __init__(self, server_url: str, device_token: str, device_id: str = None):
        """
        Inicializa o agente
        
        Args:
            server_url: URL do servidor (ex: http://192.168.1.100:3000)
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
    
    def discover_usb_printers(self) -> List[Dict]:
        """
        Descobre impressoras USB conectadas
        
        Returns:
            Lista de impressoras encontradas
        """
        printers = []
        
        try:
            # Tenta usar lsusb
            output = subprocess.check_output(['lsusb'], text=True)
            
            for line in output.split('\n'):
                if not line.strip():
                    continue
                
                # Procura por fabricantes conhecidos
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
            # Verifica se o dispositivo ainda está conectado
            vendor_id = printer['connection_details']['vendor_id']
            output = subprocess.check_output(['lsusb'], text=True)
            
            if vendor_id in output:
                status['status'] = 'online'
            else:
                status['status'] = 'offline'
        except Exception as e:
            logger.debug(f"Erro ao verificar status: {e}")
            status['status'] = 'unknown'
        
        return status
    
    def get_toner_levels(self, printer: Dict) -> Optional[Dict]:
        """
        Tenta obter níveis de toner via SNMP (para impressoras de rede)
        
        Para USB, geralmente não é possível obter via SNMP
        """
        # USB geralmente não expõe toner via SNMP
        # Seria necessário usar protocolos específicos do fabricante
        return None
    
    def send_printer_data(self, printers: List[Dict]) -> bool:
        """
        Envia dados de impressoras para o servidor
        
        Args:
            printers: Lista de impressoras com status
            
        Returns:
            True se enviado com sucesso
        """
        if not printers:
            logger.debug("Nenhuma impressora para enviar")
            return True
        
        try:
            # Prepara payload
            payload = {
                'asset_type': 'printer',
                'device_id': self.device_id,
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
                return True
            else:
                logger.warning(f"Erro ao enviar dados: {response.status_code} - {response.text}")
                return False
                
        except requests.exceptions.ConnectionError:
            logger.warning(f"Erro de conexão com servidor: {self.server_url}")
            return False
        except Exception as e:
            logger.error(f"Erro ao enviar dados: {e}")
            return False
    
    def run(self):
        """Executa o agente em loop contínuo"""
        logger.info(f"Iniciando agente USB Printer (ID: {self.device_id})")
        logger.info(f"Servidor: {self.server_url}")
        logger.info(f"Intervalo de verificação: {self.interval}s")
        
        try:
            while True:
                try:
                    # Descobre impressoras
                    printers = self.discover_usb_printers()
                    
                    if printers:
                        # Obtém status de cada impressora
                        for printer in printers:
                            status = self.get_printer_status(printer)
                            printer.update(status)
                        
                        # Envia dados
                        self.send_printer_data(printers)
                    
                    # Aguarda próxima verificação
                    time.sleep(self.interval)
                    
                except KeyboardInterrupt:
                    logger.info("Agente interrompido pelo usuário")
                    break
                except Exception as e:
                    logger.error(f"Erro no loop principal: {e}")
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
            
            self.send_printer_data(printers)
            
            # Exibe resultado
            print(json.dumps(printers, indent=2, ensure_ascii=False))
        else:
            print("Nenhuma impressora USB encontrada")


def main():
    """Função principal"""
    parser = argparse.ArgumentParser(
        description='Agente de monitoramento de impressoras USB',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Exemplos de uso:

  # Executar em modo contínuo
  python3 usb_printer_agent.py --server http://192.168.1.100:3000 --token seu_token

  # Executar uma única verificação
  python3 usb_printer_agent.py --server http://192.168.1.100:3000 --token seu_token --once

  # Com ID de dispositivo customizado
  python3 usb_printer_agent.py --server http://192.168.1.100:3000 --token seu_token --device-id meu-computador
        '''
    )
    
    parser.add_argument('--server', required=True, help='URL do servidor (ex: http://192.168.1.100:3000)')
    parser.add_argument('--token', required=True, help='Token de autenticação do dispositivo')
    parser.add_argument('--device-id', help='ID único do dispositivo (opcional)')
    parser.add_argument('--once', action='store_true', help='Executar uma única verificação e sair')
    parser.add_argument('--interval', type=int, default=60, help='Intervalo de verificação em segundos (padrão: 60)')
    
    args = parser.parse_args()
    
    # Cria e executa agente
    agent = USBPrinterAgent(
        server_url=args.server,
        device_token=args.token,
        device_id=args.device_id
    )
    
    agent.interval = args.interval
    
    if args.once:
        agent.run_once()
    else:
        agent.run()


if __name__ == '__main__':
    main()
