# Guia de Build dos Clientes

Este diretório contém os códigos-fonte dos Agentes Visuais. Abaixo, instruções para gerar os executáveis.

## 1. Desktop Agent (Windows .exe)

O agente desktop usa **Electron**. Para gerar o instalador `.exe`:

### Pré-requisitos
- Node.js instalado.

### Passos
1. Abra o terminal na pasta `clients/desktop`:
   ```bash
   cd clients/desktop
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Gere o executável:
   ```bash
   npm run dist
   ```
4. O arquivo gerado estará na pasta `dist/`:
   - `Unified Agent Setup 1.0.0.exe` (Instalador)
   - `Unified Agent 1.0.0.exe` (Portátil)

---

## 2. Mobile Agent (Android .apk)

O agente mobile usa **React Native (Expo)**. Para gerar o `.apk`, a maneira mais fácil é usando o **EAS Build** (serviço de nuvem da Expo).

### Pré-requisitos
- Conta na [Expo.dev](https://expo.dev) (gratuito).
- `eas-cli`: Instalei localmente para você. Use `npx eas ...`.

### Passos
1. Abra o terminal na pasta `clients/mobile`:
   ```bash
   cd clients/mobile
   ```
2. Faça login no EAS:
   ```bash
   npx eas login
   ```
3. Configure o projeto (primeira vez):
   ```bash
   npx eas build:configure
   ```
4. Gere o APK (para testes/instalação direta):
   ```bash
   npx eas build -p android --profile preview
   ```
   *Isso irá gerar um link para download do APK após o build na nuvem.*

### Rodando Localmente (Emulador/USB)
Se quiser apenas testar sem gerar APK final:
```bash
npx expo start
```
- Pressione `a` para abrir no Android (Emulador ou USB com depuração ativada).
- Ou instale o app **Expo Go** no seu celular e escaneie o QR Code.

### Modo Kiosk
O app possui um botão "Enter Kiosk Mode" que bloqueia o botão voltar e esconde a barra de status.
Para um bloqueio total (Kiosk real), no Android:
1.  Vá em **Configurações > Segurança > Fixação de App** (App Pinning).
2.  Abra o Agente, abra a visão de multitarefa e toque no ícone do app > **Fixar**.
3.  Isso impede sair do app sem uma senha/padrão.
