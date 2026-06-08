@echo off
cd /d "C:\Controller-Skin-Uploader\Controller-Skin-Uploader\artifacts\controller-skin-studio"
echo Starting Controller Skin Studio (preview mode)...
echo.
echo If port 3001 is blocked, it will try 3002, 3003, etc.
echo.
npx serve dist/public -p 3001
pause