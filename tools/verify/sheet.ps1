# Une varias capturas PNG en un mosaico para revisarlas de un vistazo.
# Uso: powershell -File tools/verify/sheet.ps1 -Out mosaico.png -Cols 3 a.png b.png c.png
param(
    [Parameter(Mandatory = $true)][string]$Out,
    [int]$Cols = 3,
    [Parameter(ValueFromRemainingArguments = $true)][string[]]$Images
)

Add-Type -AssemblyName System.Drawing
$bitmaps = $Images | ForEach-Object { [System.Drawing.Image]::FromFile([System.IO.Path]::GetFullPath($_)) }
$width = ($bitmaps | Measure-Object Width -Maximum).Maximum
$height = ($bitmaps | Measure-Object Height -Maximum).Maximum
$rows = [int][Math]::Ceiling($bitmaps.Count / $Cols)
$sheetWidth = [int]($width * [Math]::Min($Cols, $bitmaps.Count))
$sheetHeight = [int]($height * $rows)
$sheet = New-Object System.Drawing.Bitmap $sheetWidth, $sheetHeight
$graphics = [System.Drawing.Graphics]::FromImage($sheet)
for ($i = 0; $i -lt $bitmaps.Count; $i++) {
    $x = [int](($i % $Cols) * $width)
    $y = [int]([Math]::Floor($i / $Cols) * $height)
    $graphics.DrawImage($bitmaps[$i], $x, $y, $bitmaps[$i].Width, $bitmaps[$i].Height)
}
$full = [System.IO.Path]::GetFullPath($Out)
$sheet.Save($full, [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose(); $sheet.Dispose(); $bitmaps | ForEach-Object { $_.Dispose() }
Write-Output "mosaico: $full"
