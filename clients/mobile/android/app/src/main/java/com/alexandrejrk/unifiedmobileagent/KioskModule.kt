// android/app/src/main/java/com/yourapp/KioskModule.kt
// Módulo nativo para:
//   - startLockTask()  / stopLockTask()  (Kiosk Mode)
//   - setPreferredLauncher()             (definir como launcher padrão via Device Owner)
//   - hideStatusBar() / showStatusBar()  (imersão total)
//   - isLockTaskActive()                 (verificar estado)

package com.yourapp

import android.app.ActivityManager
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class KioskModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "KioskModule"

    private val dpm: DevicePolicyManager by lazy {
        reactContext.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
    }

    private val adminComponent: ComponentName by lazy {
        ComponentName(reactContext, DeviceAdminReceiver::class.java)
    }

    // ── LOCK TASK (Kiosk) ──────────────────────────────────────────────

    @ReactMethod
    fun startKioskMode(promise: Promise) {
        try {
            val activity = currentActivity ?: run {
                promise.reject("NO_ACTIVITY", "Activity não disponível")
                return
            }

            // Device Owner: configura pacotes permitidos no lock task
            if (dpm.isDeviceOwnerApp(reactContext.packageName)) {
                dpm.setLockTaskPackages(
                    adminComponent,
                    arrayOf(reactContext.packageName)
                )
            }

            activity.runOnUiThread {
                activity.startLockTask()
                hideSystemUI()
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.reject("KIOSK_ERROR", e.message)
        }
    }

    @ReactMethod
    fun stopKioskMode(promise: Promise) {
        try {
            val activity = currentActivity ?: run {
                promise.reject("NO_ACTIVITY", "Activity não disponível")
                return
            }

            activity.runOnUiThread {
                activity.stopLockTask()
                showSystemUI()
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.reject("KIOSK_ERROR", e.message)
        }
    }

    @ReactMethod
    fun isKioskActive(promise: Promise) {
        try {
            val am = reactContext.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
            val isLocked = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                am.lockTaskModeState != ActivityManager.LOCK_TASK_MODE_NONE
            } else {
                @Suppress("DEPRECATION")
                am.isInLockTaskMode
            }
            promise.resolve(isLocked)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    // ── LAUNCHER PADRÃO (Device Owner) ────────────────────────────────

    @ReactMethod
    fun setAsDefaultLauncher(promise: Promise) {
        try {
            if (dpm.isDeviceOwnerApp(reactContext.packageName)) {
                // Device Owner: define este app como launcher padrão
                val intentFilter = android.content.IntentFilter(Intent.ACTION_MAIN).apply {
                    addCategory(Intent.CATEGORY_HOME)
                    addCategory(Intent.CATEGORY_DEFAULT)
                }
                val activity = ComponentName(reactContext, MainActivity::class.java)
                dpm.addPersistentPreferredActivity(adminComponent, intentFilter, activity)
                promise.resolve(true)
            } else {
                // Sem Device Owner: abre seletor de launcher do sistema
                val intent = Intent(Intent.ACTION_MAIN).apply {
                    addCategory(Intent.CATEGORY_HOME)
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                reactContext.startActivity(intent)
                promise.resolve(false) // false = abriu seletor, não definiu automaticamente
            }
        } catch (e: Exception) {
            promise.reject("LAUNCHER_ERROR", e.message)
        }
    }

    @ReactMethod
    fun clearDefaultLauncher(promise: Promise) {
        try {
            if (dpm.isDeviceOwnerApp(reactContext.packageName)) {
                dpm.clearPackagePersistentPreferredActivities(adminComponent, reactContext.packageName)
                promise.resolve(true)
            } else {
                promise.resolve(false)
            }
        } catch (e: Exception) {
            promise.reject("LAUNCHER_ERROR", e.message)
        }
    }

    // ── SYSTEM UI ─────────────────────────────────────────────────────

    @ReactMethod
    fun hideStatusBar(promise: Promise) {
        currentActivity?.runOnUiThread {
            hideSystemUI()
            promise.resolve(true)
        } ?: promise.reject("NO_ACTIVITY", "Activity não disponível")
    }

    @ReactMethod
    fun showStatusBar(promise: Promise) {
        currentActivity?.runOnUiThread {
            showSystemUI()
            promise.resolve(true)
        } ?: promise.reject("NO_ACTIVITY", "Activity não disponível")
    }

    // ── APPS INSTALADOS ───────────────────────────────────────────────

    @ReactMethod
    fun getInstalledApps(promise: Promise) {
        try {
            val pm = reactContext.packageManager
            val intent = Intent(Intent.ACTION_MAIN).apply {
                addCategory(Intent.CATEGORY_LAUNCHER)
            }
            val apps = pm.queryIntentActivities(intent, 0)
            val result = WritableNativeArray()

            for (resolveInfo in apps) {
                val app = WritableNativeMap()
                val appInfo = resolveInfo.activityInfo.applicationInfo
                app.putString("packageName", appInfo.packageName)
                app.putString("appName", pm.getApplicationLabel(appInfo).toString())
                // Versão
                try {
                    val pkgInfo = pm.getPackageInfo(appInfo.packageName, 0)
                    app.putString("versionName", pkgInfo.versionName ?: "N/A")
                } catch (_: Exception) {
                    app.putString("versionName", "N/A")
                }
                result.pushMap(app)
            }

            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("APP_LIST_ERROR", e.message)
        }
    }

    @ReactMethod
    fun launchApp(packageName: String, promise: Promise) {
        try {
            val pm = reactContext.packageManager
            val launchIntent = pm.getLaunchIntentForPackage(packageName)
                ?: run {
                    promise.reject("APP_NOT_FOUND", "App não encontrado: $packageName")
                    return
                }
            launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            reactContext.startActivity(launchIntent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("LAUNCH_ERROR", e.message)
        }
    }

    // ── HELPERS ───────────────────────────────────────────────────────

    private fun hideSystemUI() {
        val window = currentActivity?.window ?: return
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.insetsController?.let { controller ->
                controller.hide(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
                controller.systemBarsBehavior =
                    WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            }
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = (
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_FULLSCREEN
                or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            )
        }
    }

    private fun showSystemUI() {
        val window = currentActivity?.window ?: return
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.insetsController?.show(
                WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars()
            )
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_VISIBLE
        }
    }
}
