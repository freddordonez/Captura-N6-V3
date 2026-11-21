"""Agrega los permisos de Bluetooth al AndroidManifest generado por Capacitor."""
import re, sys
p = "android/app/src/main/AndroidManifest.xml"
s = open(p, encoding="utf8").read()
perms = """
    <uses-permission android:name="android.permission.BLUETOOTH" android:maxSdkVersion="30" />
    <uses-permission android:name="android.permission.BLUETOOTH_ADMIN" android:maxSdkVersion="30" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" android:maxSdkVersion="30" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" android:maxSdkVersion="30" />
    <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
    <uses-permission android:name="android.permission.BLUETOOTH_SCAN" android:usesPermissionFlags="neverForLocation" />
    <uses-feature android:name="android.hardware.bluetooth" android:required="false" />
"""
if "BLUETOOTH_CONNECT" in s:
    print("permisos ya presentes"); sys.exit(0)
s2 = re.sub(r"(\s*<application)", perms + r"\1", s, count=1)
if s2 == s:
    sys.exit("No se encontró <application> en el manifiesto")
open(p, "w", encoding="utf8").write(s2)
print("permisos agregados")
