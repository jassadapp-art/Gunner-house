@echo off
title Household Savings Tracker
cd /d "%~dp0"
echo ===================================================
echo   Household Savings Tracker - กองกลางครัวเรือน
echo   กำลังเปิดหน้าเว็บที่ http://localhost:5173 ...
echo ===================================================
start http://localhost:5173
npm.cmd run dev
pause
