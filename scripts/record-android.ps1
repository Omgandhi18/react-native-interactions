<#
.SYNOPSIS
Records the connected Android phone or emulator with scrcpy, for one interaction.

.DESCRIPTION
Saves media/<slug>.mp4 (H.264 video + AAC audio, which LinkedIn and iPhones play).
Recording stops when you close the scrcpy window, or after -Seconds.
With -Gif it also writes media/<slug>.gif for the README (needs ffmpeg).

.EXAMPLE
pnpm record:android spring-tap
pnpm record:android spring-tap -Seconds 15 -ShowTouches -Gif
#>
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [ValidatePattern('^[a-z0-9]+(-[a-z0-9]+)*$')]
    [string]$Slug,

    # 0 means record until the scrcpy window is closed.
    [int]$Seconds = 0,

    # Shows Android's touch dots, so viewers can see where the finger is.
    [switch]$ShowTouches,

    [switch]$Gif
)

$ErrorActionPreference = 'Stop'

$VideoBitRate = '16M'
$AudioCodec = 'aac'
$GifWidth = 480
$GifFps = 30

$MediaDir = Join-Path (Split-Path $PSScriptRoot -Parent) 'media'
$VideoPath = Join-Path $MediaDir "$Slug.mp4"
$GifPath = Join-Path $MediaDir "$Slug.gif"

if (-not (Get-Command scrcpy -ErrorAction SilentlyContinue)) {
    throw 'scrcpy is not installed. Install it with: winget install Genymobile.scrcpy'
}

New-Item -ItemType Directory -Force -Path $MediaDir | Out-Null

$scrcpyArgs = @(
    "--record=$VideoPath",
    "--video-bit-rate=$VideoBitRate",
    "--audio-codec=$AudioCodec",
    '--stay-awake',
    "--window-title=Recording $Slug (close this window to stop)"
)
if ($Seconds -gt 0) { $scrcpyArgs += "--time-limit=$Seconds" }
if ($ShowTouches) { $scrcpyArgs += '--show-touches' }

Write-Host "Recording to $VideoPath"
& scrcpy @scrcpyArgs
if ($LASTEXITCODE -ne 0) { throw "scrcpy exited with code $LASTEXITCODE" }

if ($Gif) {
    if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
        Write-Warning 'Skipping GIF: ffmpeg is not installed. Install it with: winget install Gyan.FFmpeg'
        return
    }
    $filter = "fps=$GifFps,scale=${GifWidth}:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse"
    & ffmpeg -y -loglevel error -i $VideoPath -vf $filter $GifPath
    if ($LASTEXITCODE -ne 0) { throw "ffmpeg exited with code $LASTEXITCODE" }
    Write-Host "GIF saved to $GifPath"
}
