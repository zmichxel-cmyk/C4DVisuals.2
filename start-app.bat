@echo off
cd /d "C:\Controller-Skin-Uploader\Controller-Skin-Uploader\artifacts\controller-skin-studio"
echo Starting Controller Skin Studio...
echo.
echo If firewall blocks it, run this as Administrator once:
echo   netsh advfirewall firewall add rule name="Allow Port 3001" dir=in action=allow protocol=TCP localport=3001
echo.
pnpm run dev -- --port 3001 --host
pause