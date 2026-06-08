@echo off
cd /d "C:\Controller-Skin-Uploader\Controller-Skin-Uploader\artifacts\controller-skin-studio\dist\public"
start "" http://localhost:3001
python -m http.server 3001