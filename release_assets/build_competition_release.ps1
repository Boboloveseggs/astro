param(
  [string]$KeyFile = "",
  [string]$StageDir = "",
  [string]$OutputZip = ""
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptDir
$ContestRoot = Split-Path -Parent $RepoRoot

if (-not $KeyFile) {
  $KeyFile = Join-Path $ContestRoot "competition_key.local.json"
}
if (-not $StageDir) {
  $StageDir = Join-Path $ContestRoot "astro.release"
}
if (-not $OutputZip) {
  $OutputZip = Join-Path $ContestRoot "astro.release.zip"
}

if (-not (Test-Path -LiteralPath $KeyFile)) {
  throw "Missing key file: $KeyFile"
}

$keyConfig = Get-Content -LiteralPath $KeyFile -Raw | ConvertFrom-Json
$provider = if ($keyConfig.provider) { [string]$keyConfig.provider } else { "zhipu" }
$model = if ($keyConfig.model) { [string]$keyConfig.model } else { "glm-4-flash" }
$apiKey = if ($keyConfig.apiKey) { [string]$keyConfig.apiKey } else { "" }

if (-not $apiKey.Trim()) {
  throw "apiKey is empty in $KeyFile"
}
if ($apiKey -like "*__*" -or $apiKey -like "put-your-*") {
  throw "apiKey still looks like a placeholder."
}

$contestResolved = (Resolve-Path -LiteralPath $ContestRoot).Path
$stageParent = Split-Path -Parent $StageDir
if (-not (Test-Path -LiteralPath $stageParent)) {
  throw "Stage parent does not exist: $stageParent"
}
$stageParentResolved = (Resolve-Path -LiteralPath $stageParent).Path
if (-not $stageParentResolved.StartsWith($contestResolved, [StringComparison]::OrdinalIgnoreCase)) {
  throw "Refusing to stage outside contest root: $StageDir"
}

if (Test-Path -LiteralPath $StageDir) {
  $resolvedStage = (Resolve-Path -LiteralPath $StageDir).Path
  if (-not $resolvedStage.StartsWith($contestResolved, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to delete outside contest root: $resolvedStage"
  }
  Remove-Item -LiteralPath $resolvedStage -Recurse -Force
}
New-Item -ItemType Directory -Path $StageDir | Out-Null

$coreFiles = @(
  "manifest.json",
  "background.js",
  "content.js",
  "providers.js",
  "competition_defaults.js",
  "zhihu_content_api.js",
  "analyzer.js",
  "db.js",
  "map_math.js",
  "d3.min.js",
  "three.min.js",
  "panel.html",
  "panel.js",
  "options.html",
  "options.js",
  "README.md"
)

foreach ($file in $coreFiles) {
  $src = Join-Path $RepoRoot $file
  if (-not (Test-Path -LiteralPath $src)) {
    throw "Missing required file: $src"
  }
  Copy-Item -LiteralPath $src -Destination (Join-Path $StageDir $file) -Force
}

foreach ($dir in @("icons", "demo_data")) {
  $src = Join-Path $RepoRoot $dir
  if (Test-Path -LiteralPath $src) {
    Copy-Item -LiteralPath $src -Destination (Join-Path $StageDir $dir) -Recurse -Force
  }
}

function ConvertTo-JsString([string]$value) {
  return ($value | ConvertTo-Json -Compress)
}

$defaultsJs = @"
'use strict';

// Competition demo build only. This disposable key is embedded so judges can try the extension directly.
window.COMPETITION_DEFAULTS = {
  enabled: true,
  provider: $(ConvertTo-JsString $provider),
  model: $(ConvertTo-JsString $model),
  apiKey: $(ConvertTo-JsString $apiKey),
  note: 'competition-only disposable key',
};
"@

$defaultsPath = Join-Path $StageDir "competition_defaults.js"
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)
[System.IO.File]::WriteAllText($defaultsPath, $defaultsJs, $utf8NoBom)

if (Test-Path -LiteralPath $OutputZip) {
  Remove-Item -LiteralPath $OutputZip -Force
}
Compress-Archive -Path (Join-Path $StageDir "*") -DestinationPath $OutputZip -Force

$blocked = Get-ChildItem -LiteralPath $StageDir -Recurse -Force | Where-Object {
  $_.FullName -match "\\(tests|docs|node_modules|\.git)(\\|$)" -or
  $_.Name -match "\.env$|\.local$|\.ps1$"
}
if ($blocked) {
  throw "Blocked files were staged: $($blocked.FullName -join ', ')"
}

Write-Host "Competition release built:"
Write-Host "  Stage: $StageDir"
Write-Host "  Zip:   $OutputZip"
Write-Host "  Provider: $provider"
Write-Host "  Model:    $model"
