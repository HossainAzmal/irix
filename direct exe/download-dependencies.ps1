<#
    IRIS "direct exe" dependency downloader (Windows / PowerShell).

    Reads .\manifest.json and downloads every Windows executable / model that
    IRIS depends on into .\bin, extracting archives in place.

    Usage:
        powershell -ExecutionPolicy Bypass -File ".\direct exe\download-dependencies.ps1"
        powershell -ExecutionPolicy Bypass -File ".\direct exe\download-dependencies.ps1" -Only adb,ffmpeg
        powershell -ExecutionPolicy Bypass -File ".\direct exe\download-dependencies.ps1" -Force
#>
param(
    [string[]]$Only = @(),
    [switch]$Force
)

$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$manifest = Get-Content (Join-Path $here 'manifest.json') -Raw | ConvertFrom-Json
$installDir = Join-Path $here ($(if ($manifest.installDir) { $manifest.installDir } else { 'bin' }))
$platform = 'win32'

function Log([string]$msg) { Write-Host "[iris:deps] $msg" }

$ok = 0; $skipped = 0; $failed = @()

foreach ($dep in $manifest.dependencies) {
    if ($Only.Count -gt 0 -and ($Only -notcontains $dep.id)) { continue }

    $target = $dep.targets.$platform
    if (-not $target) { $target = $dep.targets.all }
    if (-not $target) { Log "- $($dep.id): no Windows target, skipping"; $skipped++; continue }

    $depDir = Join-Path $installDir $dep.id
    $checkPath = if ($target.check) { Join-Path $depDir $target.check } else { $null }

    if (-not $Force -and $checkPath -and (Test-Path $checkPath)) {
        Log "OK $($dep.id): already installed"; $ok++; continue
    }

    $fileName = ($target.url -split '/')[-1] -split '\?' | Select-Object -First 1
    $archive = Join-Path $depDir $fileName
    New-Item -ItemType Directory -Force -Path $depDir | Out-Null

    try {
        Log "downloading $($dep.id): $($dep.name)"
        Invoke-WebRequest -Uri $target.url -OutFile $archive -UseBasicParsing
        if ($dep.extract) {
            if ($fileName -match '\.zip$') {
                Expand-Archive -Force -LiteralPath $archive -DestinationPath $depDir
            } elseif ($fileName -match '\.(tar\.xz|tar\.gz|tgz)$') {
                tar -xf $archive -C $depDir
            }
            Remove-Item $archive -Force -ErrorAction SilentlyContinue
        }
        if ($checkPath -and -not (Test-Path $checkPath)) {
            Log "! $($dep.id): downloaded but expected '$($target.check)' not found (layout may differ)"
        }
        Log "ready $($dep.id): $depDir"; $ok++
    } catch {
        Write-Host "[iris:deps] ERROR: $($dep.id): $($_.Exception.Message)" -ForegroundColor Red
        $failed += $dep.id
    }
}

Log "done. ok=$ok skipped=$skipped failed=$($failed.Count)"
if ($failed.Count -gt 0) {
    Write-Host "[iris:deps] failed: $($failed -join ', '). See README.md for manual links." -ForegroundColor Red
    exit 1
}
