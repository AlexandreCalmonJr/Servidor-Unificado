package com.alexandrejrk.unifiedmobileagent

import android.content.Context
import android.content.Intent
import android.util.Log

class DeviceAdminReceiver : android.app.admin.DeviceAdminReceiver() {

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
