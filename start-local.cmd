@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

if not exist ".env.local" (
  echo ERREUR : le fichier .env.local est introuvable.
  echo Ajoutez les variables Discord et Neon avant de lancer le site.
  pause
  exit /b 1
)

for /f "usebackq eol=# tokens=1,* delims==" %%A in (".env.local") do (
  set "taskEnvValue=%%B"
  set "taskEnvValue=!taskEnvValue:"=!"
  set "%%A=!taskEnvValue!"
)

echo Demarrage du portail CPD avec les variables locales...
npx.cmd --yes vercel@latest dev --listen 3000 --yes
