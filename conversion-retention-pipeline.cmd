@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0conversion-retention-pipeline.ps1" %*
