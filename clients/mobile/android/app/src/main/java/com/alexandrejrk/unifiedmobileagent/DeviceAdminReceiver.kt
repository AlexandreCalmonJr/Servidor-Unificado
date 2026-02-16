// android/app/src/main/java/com/yourapp/DeviceAdminReceiver.kt
// Necessário para Device Owner / Lock Task Mode sem popup de confirmação
// Sem Device Owner, o usuário ainda pode sair do kiosk com 3 toques em "voltar"

package com.yourapp

import android.app.admin.DeviceAdminReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class DeviceAdminReceiver : DeviceAdminReceiver() {

    override fun onEnabled(context: Context, intent: Intent) {
        Log.i("MDM", "Device Admin habilitado")
    }

    override fun onDisabled(context: Context, intent: Intent) {
        Log.i("MDM", "Device Admin desabilitado")
    }

    override fun onLockTaskModeEntering(context: Context, intent: Intent, pkg: String) {
        Log.i("MDM", "Lock Task Mode iniciado para: $pkg")
    }

    override fun onLockTaskModeExiting(context: Context, intent: Intent) {
        Log.i("MDM", "Lock Task Mode encerrado")
    }
}
