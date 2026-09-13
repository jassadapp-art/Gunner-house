@echo off
set GIT_CMD="C:\Program Files\Microsoft Visual Studio\2022\Professional\Common7\IDE\CommonExtensions\Microsoft\TeamFoundation\Team Explorer\Git\cmd\git.exe"
if "%~1"=="" (
    echo Usage: push-github.bat https://github.com/USERNAME/REPO_NAME.git
    exit /b 1
)
%GIT_CMD% remote remove origin 2>nul
%GIT_CMD% remote add origin %1
%GIT_CMD% branch -M main
%GIT_CMD% push -u origin main
echo Done!
