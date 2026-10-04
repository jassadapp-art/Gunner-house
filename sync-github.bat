@echo off
set GIT_CMD="C:\Program Files\Microsoft Visual Studio\2022\Professional\Common7\IDE\CommonExtensions\Microsoft\TeamFoundation\Team Explorer\Git\cmd\git.exe"

echo ==================================================
echo   Syncing Gunner-House with GitHub & Cloud Host
echo ==================================================
%GIT_CMD% add .
if "%~1"=="" (
    %GIT_CMD% commit -m "Update savings tracker features and cloud config"
) else (
    %GIT_CMD% commit -m "%*"
)
%GIT_CMD% push origin main
echo ==================================================
echo   Done! Your cloud host (Vercel/Netlify) will auto-deploy!
echo ==================================================
pause
