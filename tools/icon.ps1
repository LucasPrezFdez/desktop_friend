# Saca el icono de la app de una foto: recorta un cuadrado, lo deja en 1024 px y lo enmarca en un
# círculo con el fondo transparente, como el icono anterior. El resultado es la fuente de
# `npx tauri icon`, que genera todos los tamaños de src-tauri/icons/.
#
# Uso: powershell -File tools/icon.ps1 -In foto.jpg -X 338 -Y 205 -Side 1198 [-Out assets/icon.png]
#      npx tauri icon assets/icon.png
# -X, -Y y -Side son la esquina superior izquierda y el lado del cuadrado, en píxeles de la foto.
param(
    [Parameter(Mandatory = $true)][string]$In,
    [Parameter(Mandatory = $true)][int]$X,
    [Parameter(Mandatory = $true)][int]$Y,
    [Parameter(Mandatory = $true)][int]$Side,
    [string]$Out = 'assets/icon.png',
    [int]$Size = 1024
)

Add-Type -AssemblyName System.Drawing
$photo = [System.Drawing.Image]::FromFile([System.IO.Path]::GetFullPath($In))
if ($X -lt 0 -or $Y -lt 0 -or $X + $Side -gt $photo.Width -or $Y + $Side -gt $photo.Height) {
    Write-Output "FALLO: el cuadrado se sale de la foto, que mide $($photo.Width) x $($photo.Height)"
    $photo.Dispose()
    exit 2
}

# El cuadrado recortado, ya al tamaño final.
$square = New-Object System.Drawing.Bitmap $Size, $Size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($square)
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$from = New-Object System.Drawing.Rectangle $X, $Y, $Side, $Side
$to = New-Object System.Drawing.Rectangle 0, 0, $Size, $Size
$graphics.DrawImage($photo, $to, $from, [System.Drawing.GraphicsUnit]::Pixel)
$graphics.Dispose()
$photo.Dispose()

# Pintar un círculo con la foto como relleno suaviza el borde; recortar con una máscara, no.
$icon = New-Object System.Drawing.Bitmap $Size, $Size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($icon)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.Clear([System.Drawing.Color]::Transparent)
$fill = New-Object System.Drawing.TextureBrush $square
$graphics.FillEllipse($fill, 0, 0, $Size - 1, $Size - 1)
$fill.Dispose()
$graphics.Dispose()
$square.Dispose()

$full = [System.IO.Path]::GetFullPath($Out)
$icon.Save($full, [System.Drawing.Imaging.ImageFormat]::Png)
$icon.Dispose()
Write-Output "icono: $full ($Size x $Size)"
