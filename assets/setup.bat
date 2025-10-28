@echo off
title FFmpeg + Node Setup
color 0A
echo.
echo [i] Checking system...

for /f %%A in ('powershell -NoProfile -Command "[Environment]::Is64BitOperatingSystem"') do set IS64=%%A
if /i "%IS64%"=="True" (
    set "FFMPEG_URL=https://github.com/BtbN/FFmpeg-Builds/releases/latest/download/ffmpeg-master-latest-win64-gpl-shared.zip"
    set "ARCH=win64"
) else (
    set "FFMPEG_URL=https://github.com/BtbN/FFmpeg-Builds/releases/latest/download/ffmpeg-master-latest-winarm64-gpl-shared.zip"
    set "ARCH=winarm64"
)

echo [+] %ARCH%
echo [i] Downloading FFmpeg...
set "TMP=%TEMP%\ffmpeg.zip"
powershell -Command "(New-Object Net.WebClient).DownloadFile('%FFMPEG_URL%', '%TMP%')"

if not exist "%TMP%" (
    color 0C
    echo [-] Download fail
    pause
    exit /b
)

echo [+] Extracting...
powershell -Command "Expand-Archive -Force '%TMP%' 'C:\ffmpeg'"

echo [+] Locating FFmpeg binaries...
for /d %%D in (C:\ffmpeg\ffmpeg-*) do (
    if exist "%%D\bin\ffmpeg.exe" (
        set "FFMPEG_BIN=%%D\bin"
        goto :found
    )
)

:found
if not defined FFMPEG_BIN (
    color 0C
    echo [-] Extract fail - FFmpeg not found
    pause
    exit /b
)

echo [+] Adding PATH...
setx /M PATH "%PATH%;%FFMPEG_BIN%" >nul 2>&1
if errorlevel 1 (
    echo [i] Admin rights needed for system PATH. Adding to user PATH...
    setx PATH "%PATH%;%FFMPEG_BIN%" >nul
)

echo [+] FFmpeg done
echo [i] Setting up Node...
if not exist package.json (
    echo [i] Creating package.json...
    npm init -y >nul
)

echo [i] Installing dependencies...
npm install ffmpeg-static ffprobe-static

color 0B
echo.
echo [+] All Done!
echo [i] ffmpeg + node modules ready
echo [i] You can now use: node decoder.js [video_file.mp4]
echo.
pause
exit /b
