@echo off
echo Cleaning node_modules...
if exist node_modules rd /s /q node_modules
if exist package-lock.json del package-lock.json

echo Installing dependencies...
call npm install --no-audit

echo Installing Babel Preset...
call npm install babel-preset-expo

echo Installing EAS CLI locally...
call npm install eas-cli

echo Dependencies installed.
echo.
echo Now attempting build directly...
if exist "node_modules\.bin\eas.cmd" (
    call "node_modules\.bin\eas.cmd" build -p android --profile preview
) else (
    echo ERROR: EAS binary not found!
    pause
)

pause
