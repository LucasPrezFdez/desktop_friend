# Simula gestos reales del ratón sobre la mascota: frotar (acariciar), clic y arrastrar.
# Mueve el cursor de verdad durante un par de segundos y luego lo devuelve a su sitio.
#
# Uso: powershell -File tools/verify/input.ps1 -Action rub|click|drag [-X 0.5 -Y 0.66]
# X e Y son la posición dentro de la ventana, de 0 a 1.
# Para soltarlo en la cama, que sale a 300 px hacia el lado con más sitio: -Action drag -DX -300 -DY -150
param(
    [Parameter(Mandatory = $true)][ValidateSet('rub', 'click', 'drag')][string]$Action,
    [string]$Title = 'DesktopFriend',
    [double]$X = 0.5,
    [double]$Y = 0.66,
    # Solo para 'drag': cuánto se sostiene al perro en el aire antes de soltarlo.
    [int]$HoldMs = 400,
    # Solo para 'drag': hasta dónde se lleva el cursor, en píxeles desde donde se pulsa.
    [int]$DX = -150,
    [int]$DY = -200
)

Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class In {
    [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X; public int Y; }
    [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern IntPtr FindWindowW(string cls, string title);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hwnd, out RECT rect);
    [DllImport("user32.dll")] public static extern bool GetCursorPos(out POINT p);
    [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
    [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
    [DllImport("user32.dll")] public static extern void mouse_event(uint flags, uint dx, uint dy, uint data, UIntPtr extra);
    [DllImport("user32.dll")] public static extern IntPtr WindowFromPoint(POINT p);
    [DllImport("user32.dll")] public static extern IntPtr GetAncestor(IntPtr hwnd, uint flags);
    [DllImport("user32.dll")] public static extern IntPtr GetWindow(IntPtr hwnd, uint command);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hwnd);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
}
'@

$LEFT_DOWN = 0x2
$LEFT_UP = 0x4

[void][In]::SetProcessDPIAware()
$hwnd = [In]::FindWindowW([NullString]::Value, $Title)
if ($hwnd -eq [IntPtr]::Zero) {
    Write-Output "FALLO: no se encuentra la ventana '$Title'"
    exit 2
}
$rect = New-Object In+RECT
[void][In]::GetWindowRect($hwnd, [ref]$rect)
$px = [int]($rect.Left + ($rect.Right - $rect.Left) * $X)
$py = [int]($rect.Top + ($rect.Bottom - $rect.Top) * $Y)

$saved = New-Object In+POINT
[void][In]::GetCursorPos([ref]$saved)
try {
    [void][In]::SetCursorPos($px, $py)
    # Margen para que la ventana detecte el cursor y empiece a capturar el ratón.
    Start-Sleep -Milliseconds 500
    # Antes de pulsar se comprueba que el clic lo recibiría la mascota. Si el cursor ha caído en un
    # hueco transparente, el clic llegaría a la ventana de debajo: en ese caso no se pulsa.
    if ($Action -ne 'rub') {
        $here = New-Object In+POINT
        $here.X = $px
        $here.Y = $py
        if ([In]::GetAncestor([In]::WindowFromPoint($here), 2) -ne $hwnd) {
            Write-Output "NO SE PULSA: en ($px, $py) no está el perro; el clic llegaría a otra ventana"
            exit 3
        }
    }
    switch ($Action) {
        'rub' {
            for ($i = 0; $i -lt 60; $i++) {
                [void][In]::SetCursorPos($px + [int](28 * [Math]::Sin($i * 0.6)), $py + [int](6 * [Math]::Cos($i * 0.9)))
                Start-Sleep -Milliseconds 25
            }
        }
        'click' {
            [In]::mouse_event($LEFT_DOWN, 0, 0, 0, [UIntPtr]::Zero)
            Start-Sleep -Milliseconds 80
            [In]::mouse_event($LEFT_UP, 0, 0, 0, [UIntPtr]::Zero)
            Start-Sleep -Milliseconds 300
        }
        'drag' {
            [In]::mouse_event($LEFT_DOWN, 0, 0, 0, [UIntPtr]::Zero)
            for ($i = 1; $i -le 25; $i++) {
                [void][In]::SetCursorPos($px + [int]($DX * $i / 25), $py + [int]($DY * $i / 25))
                Start-Sleep -Milliseconds 25
            }
            Start-Sleep -Milliseconds $HoldMs
            [void][In]::GetWindowRect($hwnd, [ref]$rect)
            Write-Output "en el aire: ventana en ($($rect.Left), $($rect.Top))"
            # La cama sale en otra ventana: el perro tiene que pasar por delante de ella, y sacarla
            # no debe quitarle el foco a la ventana que se está arrastrando.
            $bed = [In]::FindWindowW([NullString]::Value, "$Title (cama)")
            if ($bed -ne [IntPtr]::Zero -and [In]::IsWindowVisible($bed)) {
                $bedRect = New-Object In+RECT
                [void][In]::GetWindowRect($bed, [ref]$bedRect)
                $above = $false
                # GW_HWNDNEXT (2) recorre las ventanas de arriba abajo.
                for ($next = [In]::GetWindow($hwnd, 2); $next -ne [IntPtr]::Zero; $next = [In]::GetWindow($next, 2)) {
                    if ($next -eq $bed) { $above = $true; break }
                }
                Write-Output "cama en ($($bedRect.Left), $($bedRect.Top)); el perro por delante de la cama: $above; la cama tiene el foco: $([In]::GetForegroundWindow() -eq $bed)"
            } else {
                Write-Output 'la ventana de la cama no está a la vista'
            }
            [In]::mouse_event($LEFT_UP, 0, 0, 0, [UIntPtr]::Zero)
            Start-Sleep -Milliseconds 1500
        }
    }
}
finally {
    [In]::mouse_event($LEFT_UP, 0, 0, 0, [UIntPtr]::Zero)
    [void][In]::SetCursorPos($saved.X, $saved.Y)
}
[void][In]::GetWindowRect($hwnd, [ref]$rect)
Write-Output "$Action hecho en ($px, $py); ventana ahora en ($($rect.Left), $($rect.Top))"
