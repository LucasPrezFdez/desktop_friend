# Verifica que los clics atraviesan la ventana donde no hay mascota y se capturan donde sí la hay.
#
# Mueve el cursor un instante a dos puntos de la ventana y pregunta a Windows qué ventana
# recibiría un clic en cada uno. Al terminar devuelve el cursor a su sitio.
#
# Uso: powershell -File tools/verify/clickthrough.ps1 [-SolidX 0.5 -SolidY 0.5 -EmptyX 0.06 -EmptyY 0.06]
param(
    [string]$Title = 'DesktopFriend',
    [double]$SolidX = 0.5,
    [double]$SolidY = 0.5,
    [double]$EmptyX = 0.06,
    [double]$EmptyY = 0.06,
    [int]$SettleMs = 1000
)

Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class Win {
    [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X; public int Y; }
    [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern IntPtr FindWindowW(string cls, string title);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hwnd, out RECT rect);
    [DllImport("user32.dll")] public static extern IntPtr WindowFromPoint(POINT p);
    [DllImport("user32.dll")] public static extern IntPtr GetAncestor(IntPtr hwnd, uint flags);
    [DllImport("user32.dll")] public static extern bool GetCursorPos(out POINT p);
    [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
    [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hwnd);
    [DllImport("user32.dll", EntryPoint = "GetWindowLongPtrW")] public static extern IntPtr GetWindowLongPtr(IntPtr hwnd, int index);
}
'@

# Sin esto las coordenadas vendrían escaladas en monitores con zoom.
[void][Win]::SetProcessDPIAware()

# PowerShell convierte $null en cadena vacía al llamar a código nativo; NullString pasa un nulo real.
$hwnd = [Win]::FindWindowW([NullString]::Value, $Title)
if ($hwnd -eq [IntPtr]::Zero) {
    Write-Output "FALLO: no se encuentra la ventana '$Title'"
    exit 2
}

$rect = New-Object Win+RECT
[void][Win]::GetWindowRect($hwnd, [ref]$rect)
$width = $rect.Right - $rect.Left
$height = $rect.Bottom - $rect.Top
$ex = [Win]::GetWindowLongPtr($hwnd, -20).ToInt64()
Write-Output "ventana: ($($rect.Left), $($rect.Top)) ${width}x${height} visible=$([Win]::IsWindowVisible($hwnd))"
Write-Output ("siempre encima: {0}" -f [bool]($ex -band 0x8))

# Espera hasta $SettleMs a que la ventana alcance el estado esperado y mide cuánto tarda.
# Si el cursor ya no está donde se puso, alguien movió el ratón y la medida no vale.
function Test-Point([double]$fx, [double]$fy, [bool]$expected) {
    $p = New-Object Win+POINT
    $p.X = [int]($rect.Left + $width * $fx)
    $p.Y = [int]($rect.Top + $height * $fy)
    [void][Win]::SetCursorPos($p.X, $p.Y)
    $watch = [System.Diagnostics.Stopwatch]::StartNew()
    $captured = -not $expected
    while ($watch.ElapsedMilliseconds -lt $SettleMs) {
        Start-Sleep -Milliseconds 10
        $captured = ([Win]::GetAncestor([Win]::WindowFromPoint($p), 2) -eq $hwnd)
        if ($captured -eq $expected) { break }
    }
    $now = New-Object Win+POINT
    [void][Win]::GetCursorPos([ref]$now)
    $moved = ($now.X -ne $p.X) -or ($now.Y -ne $p.Y)
    return [pscustomobject]@{ Captured = $captured; Ms = $watch.ElapsedMilliseconds; Moved = $moved }
}

$saved = New-Object Win+POINT
[void][Win]::GetCursorPos([ref]$saved)
try {
    $solid = Test-Point $SolidX $SolidY $true
    $empty = Test-Point $EmptyX $EmptyY $false
    # Segunda pasada: comprueba que vuelve a capturar después de haber soltado.
    $again = Test-Point $SolidX $SolidY $true
}
finally {
    [void][Win]::SetCursorPos($saved.X, $saved.Y)
}

Write-Output "sobre la mascota  -> captura el clic: $($solid.Captured) (esperado True) en $($solid.Ms) ms"
Write-Output "zona transparente -> captura el clic: $($empty.Captured) (esperado False) en $($empty.Ms) ms"
Write-Output "de vuelta encima  -> captura el clic: $($again.Captured) (esperado True) en $($again.Ms) ms"

if ($solid.Moved -or $empty.Moved -or $again.Moved) {
    Write-Output "INTERFERENCIA: el ratón se movió durante la prueba; repítela sin tocarlo"
    exit 3
}
if ($solid.Captured -and -not $empty.Captured -and $again.Captured) {
    Write-Output 'OK'
    exit 0
}
Write-Output 'FALLO'
exit 1
