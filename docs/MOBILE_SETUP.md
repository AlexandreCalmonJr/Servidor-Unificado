# Guia de Configuração e Compilação do Cliente Mobile (MDM Kiosk)
> **Projeto:** MDM Corporativo - Servidor Unificado  
> **Target:** Dispositivos Android Corporativos, Terminais e Totens Mobile

---

## 1. Visão Geral da Arquitetura Mobile

O cliente mobile está localizado em [`clients/mobile/`](file:///c:/Users/Administrator/Documents/GitHub/Servidor-Unificado/clients/mobile) e foi desenvolvido sobre **React Native / Expo** para atuar como Kiosk Launcher corporativo e coletor de telemetria (status de bateria, nível de sinal Wi-Fi, serial do dispositivo e execução de comandos remotos).

---

## 2. Pré-requisitos de Ambiente (Windows Host)

Para compilação ou depuração local física via cabo USB:

### 2.1. Android SDK Platform-Tools (ADB)
1. Baixe o pacote oficial do Google: [Android SDK Platform-Tools for Windows](https://developer.android.com/tools/releases/platform-tools).
2. Extraia o conteúdo (ex: `C:\Android\platform-tools`).
3. Adicione `C:\Android\platform-tools` à variável de ambiente `PATH` do Windows.
4. Valide a instalação no terminal:
   ```powershell
   adb version
   ```

### 2.2. Habilitação de Depuração no Dispositivo
1. No dispositivo Android corporativo, vá em **Configurações > Sobre o telefone**.
2. Toque 7 vezes em **Número da versão** para habilitar o modo de desenvolvedor.
3. Acesse **Opções do desenvolvedor** e ative **Depuração USB**.
4. Conecte o dispositivo via cabo USB e confirme a autorização RSA na tela do aparelho.
5. Verifique a listagem no terminal:
   ```powershell
   adb devices
   ```

---

## 3. Fluxos de Compilação

### 3.1. Modo A: Compilação Remota via Expo Cloud (EAS Build - Recomendado)
Evita a necessidade de instalar 15 GB do Android Studio no computador:
```bash
cd clients/mobile
npm install -g eas-cli
eas login
eas build -p android --profile preview
```
O arquivo APK pronto para instalação corporativa será gerado e disponibilizado para download no painel do Expo.

### 3.2. Modo B: Compilação Nativa Local (Gradle)
Requer JDK 17 ou 21 e `ANDROID_HOME` configurado:
```powershell
cd clients/mobile/android
./gradlew assembleRelease
```
O binário será gerado em: `clients/mobile/android/app/build/outputs/apk/release/app-release.apk`.

---

## 4. Provisionamento e Pareamento com o Servidor Central

1. O cliente mobile deve apontar para o endereço IP e porta do Servidor Unificado (ex: `http://192.168.1.81:3000`).
2. Utilize a tela de configurações para inserir o token de dispositivo gerado no painel administrativo (`/panel/index.html`).
3. O status de conexão em tempo real pode ser validado no log do backend ou via WebSocket.
