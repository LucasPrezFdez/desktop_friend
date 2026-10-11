# Captura la zona del escritorio que ocupa la ventana de la mascota (con un margen),
# para comprobar que no hay fondo, borde ni marco.
#
# Uso: powershell -File tools/verify/screenshot.ps1 -Out captura.png [-Margin 40]
param(
    [Parameter(Mandatory = $true)][string]$Out,
    [string]$Title = 'DesktopFriend',
    [int]$Margin = 40
)

Add-Type -AssemblyName System.Drawing
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class Shot {
    [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern IntPtr FindWindowW(string cls, string title);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hwnd, out RECT rect);
    [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
}
'@

[void][Shot]::SetProcessDPIAware()
# PowerShell convierte $null en cadena vacía al llamar a código nativo; NullString pasa un nulo real.
$hwnd = [Shot]::FindWindowW([NullString]::Value, $Title)
if ($hwnd -eq [IntPtr]::Zero) {
    Write-Output "FALLO: no se encuentra la ventana '$Title'"
    exit 2
}
$rect = New-Object Shot+RECT
[void][Shot]::GetWindowRect($hwnd, [ref]$rect)

$x = $rect.Left - $Margin
$y = $rect.Top - $Margin
$width = $rect.Right - $rect.Left + 2 * $Margin
$height = $rect.Bottom - $rect.Top + 2 * $Margin

$bitmap = New-Object System.Drawing.Bitmap $width, $height
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($x, $y, 0, 0, $bitmap.Size)
$full = [System.IO.Path]::GetFullPath($Out)
[void][System.IO.Directory]::CreateDirectory([System.IO.Path]::GetDirectoryName($full))
$bitmap.Save($full, [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bitmap.Dispose()
Write-Output "captura: $full (${width}x${height}) ventana en ($($rect.Left), $($rect.Top))"
