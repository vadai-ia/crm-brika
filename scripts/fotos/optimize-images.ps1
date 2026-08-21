# Genera, para cada foto descargada de Drive (<id>.json + archivo) bajo -Root:
#   <id>.web.jpg    versión web: máx. 1600 px por lado, JPG calidad 80 (~200-400 KB)
#   <id>.thumb.jpg  miniatura: máx. 640 px por lado, JPG calidad 75 (~50 KB)
#   <id>.opt.json   resultado { width, height, webBytes, thumbBytes } o { error }
# Decodifica JPG/PNG/BMP/TIFF con System.Drawing y HEIC/WebP con WIC (requiere las
# extensiones de imagen HEIF/WebP de Windows). Aplica la orientación EXIF.
# Lo invoca sync-fotos.cjs; también se puede correr a mano. -Force regenera todo.
param(
  [Parameter(Mandatory = $true)][string]$Root,
  [switch]$Force
)

Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName PresentationCore

$WebSide = 1600; $WebQuality = 80
$ThumbSide = 640; $ThumbQuality = 75
$JpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }

function Load-Bitmap([string]$file) {
  $ext = [System.IO.Path]::GetExtension($file).ToLowerInvariant()
  if ($ext -in '.heic', '.heif', '.webp') {
    # WIC → Bitmap de System.Drawing (pasando por PNG en memoria)
    $stream = [System.IO.File]::OpenRead($file)
    try {
      $decoder = [System.Windows.Media.Imaging.BitmapDecoder]::Create($stream, [System.Windows.Media.Imaging.BitmapCreateOptions]::PreservePixelFormat, [System.Windows.Media.Imaging.BitmapCacheOption]::OnLoad)
      $encoder = New-Object System.Windows.Media.Imaging.PngBitmapEncoder
      $encoder.Frames.Add([System.Windows.Media.Imaging.BitmapFrame]::Create($decoder.Frames[0]))
      $mem = New-Object System.IO.MemoryStream
      $encoder.Save($mem)
      $mem.Position = 0
      return [System.Drawing.Bitmap]::FromStream($mem)
    } finally { $stream.Dispose() }
  }
  $bmp = [System.Drawing.Bitmap]::FromFile($file)
  # Orientación EXIF (tag 0x0112): fotos de celular guardadas "de lado"
  if ($bmp.PropertyIdList -contains 0x0112) {
    $o = $bmp.GetPropertyItem(0x0112).Value[0]
    switch ($o) {
      3 { $bmp.RotateFlip([System.Drawing.RotateFlipType]::Rotate180FlipNone) }
      6 { $bmp.RotateFlip([System.Drawing.RotateFlipType]::Rotate90FlipNone) }
      8 { $bmp.RotateFlip([System.Drawing.RotateFlipType]::Rotate270FlipNone) }
      2 { $bmp.RotateFlip([System.Drawing.RotateFlipType]::RotateNoneFlipX) }
      4 { $bmp.RotateFlip([System.Drawing.RotateFlipType]::RotateNoneFlipY) }
      5 { $bmp.RotateFlip([System.Drawing.RotateFlipType]::Rotate90FlipX) }
      7 { $bmp.RotateFlip([System.Drawing.RotateFlipType]::Rotate270FlipX) }
    }
    $bmp.RemovePropertyItem(0x0112)
  }
  return $bmp
}

function Save-Resized([System.Drawing.Bitmap]$bmp, [string]$out, [int]$maxSide, [int]$quality) {
  $w = $bmp.Width; $h = $bmp.Height
  $scale = [Math]::Min(1.0, $maxSide / [Math]::Max($w, $h))
  $nw = [Math]::Max(1, [int][Math]::Round($w * $scale)); $nh = [Math]::Max(1, [int][Math]::Round($h * $scale))
  $dst = New-Object System.Drawing.Bitmap($nw, $nh)
  $g = [System.Drawing.Graphics]::FromImage($dst)
  try {
    $g.Clear([System.Drawing.Color]::White)   # fondo para PNG con transparencia
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($bmp, 0, 0, $nw, $nh)
    $params = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]$quality)
    $dst.Save($out, $JpegCodec, $params)
  } finally { $g.Dispose(); $dst.Dispose() }
}

$done = 0; $failed = 0; $skipped = 0
Get-ChildItem -Path $Root -Recurse -Filter '*.json' | Where-Object { $_.Name -notmatch '\.opt\.json$' } | ForEach-Object {
  $meta = Get-Content $_.FullName -Raw | ConvertFrom-Json
  if (-not $meta.localName) { return }
  $dir = $_.DirectoryName
  $src = Join-Path $dir $meta.localName
  if (-not (Test-Path $src)) { return }
  $web = Join-Path $dir ($meta.id + '.web.jpg')
  $thumb = Join-Path $dir ($meta.id + '.thumb.jpg')
  $opt = Join-Path $dir ($meta.id + '.opt.json')
  if (-not $Force -and (Test-Path $web) -and (Test-Path $thumb) -and (Test-Path $opt)) { $skipped++; return }
  try {
    $bmp = Load-Bitmap $src
    try {
      Save-Resized $bmp $web $WebSide $WebQuality
      Save-Resized $bmp $thumb $ThumbSide $ThumbQuality
      $result = @{ width = $bmp.Width; height = $bmp.Height; webBytes = (Get-Item $web).Length; thumbBytes = (Get-Item $thumb).Length }
    } finally { $bmp.Dispose() }
    $result | ConvertTo-Json -Compress | Set-Content -Path $opt -Encoding utf8
    Write-Host ("  {0}: {1}x{2}, {3} KB -> web {4} KB, thumb {5} KB" -f $meta.name, $result.width, $result.height, [int]($meta.size / 1KB), [int]($result.webBytes / 1KB), [int]($result.thumbBytes / 1KB))
    $done++
  } catch {
    @{ error = $_.Exception.Message } | ConvertTo-Json -Compress | Set-Content -Path $opt -Encoding utf8
    Write-Host ("  FALLO {0}: {1}" -f $meta.name, $_.Exception.Message)
    $failed++
  }
}
Write-Host "optimizadas: $done, ya existían: $skipped, fallidas: $failed"
if ($failed -gt 0) { exit 1 }
