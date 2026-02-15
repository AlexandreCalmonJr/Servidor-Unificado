@echo off
echo Cleaning node_modules...
if exist node_modules rd /s /q node_modules
if exist package-lock.json del package-lock.json

echo Installing dependencies...
call npm install --no-audit

echo Validating Expo installation (Direct Path)...
if exist "node_modules\.bin\expo.cmd" (
    call "node_modules\.bin\expo.cmd" install --fix
) else (
    echo ERROR: Expo binary not found in node_modules\.bin\expo.cmd
    echo Please check npm install output above.
)

pause
