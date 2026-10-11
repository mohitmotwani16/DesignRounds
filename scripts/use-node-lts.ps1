$ErrorActionPreference = "Stop"

$packageRoot = Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Packages"
$nodePackage = Get-ChildItem -Path $packageRoot -Directory -Filter "OpenJS.NodeJS.LTS*" |
  Sort-Object -Property LastWriteTime -Descending |
  Select-Object -First 1

if (-not $nodePackage) {
  throw "Node.js LTS was not found in WinGet packages. Install Node.js 22 or newer, then ensure it is first on PATH."
}

$runtimeDirectory = Get-ChildItem -Path $nodePackage.FullName -Directory -Filter "node-v*-win-x64" |
  Sort-Object -Property LastWriteTime -Descending |
  Select-Object -First 1

if (-not $runtimeDirectory -or -not (Test-Path (Join-Path $runtimeDirectory.FullName "node.exe"))) {
  throw "The installed Node.js LTS runtime could not be located under $($nodePackage.FullName)."
}

$env:Path = "$($runtimeDirectory.FullName);$env:Path"
Write-Output "Using Node.js at $($runtimeDirectory.FullName)"
node --version
