# Abre el menú de la bandeja con el ratón de verdad y lee lo que tiene: las entradas, cuáles llevan
# marca y, con -Pick, pulsa una (el texto vale para una entrada de un submenú).
# Mueve el cursor real un par de segundos y lo devuelve a su sitio.
#
# Uso: powershell -File tools/verify/tray.ps1 [-Pick "Pantalla 2"]
# Si el icono está entre los ocultos, despliega primero esa lista.
param(
    [string]$Tooltip = 'DesktopFriend',
    [string]$Pick = ''
)

Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes
Add-Type @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class Tray {
    [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X; public int Y; }
    [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
    [DllImport("user32.dll")] public static extern bool GetCursorPos(out POINT p);
    [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
    [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
    [DllImport("user32.dll")] public static extern void mouse_event(uint flags, uint dx, uint dy, uint data, UIntPtr extra);
    [DllImport("user32.dll")] public static extern void keybd_event(byte key, byte scan, uint flags, UIntPtr extra);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern IntPtr FindWindowExW(IntPtr parent, IntPtr after, string cls, string title);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hwnd);
    [DllImport("user32.dll")] public static extern IntPtr SendMessageW(IntPtr hwnd, uint message, IntPtr w, IntPtr l);
    [DllImport("user32.dll")] public static extern int GetMenuItemCount(IntPtr menu);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetMenuStringW(IntPtr menu, uint item, StringBuilder text, int max, uint flags);
    [DllImport("user32.dll")] public static extern uint GetMenuState(IntPtr menu, uint item, uint flags);
    [DllImport("user32.dll")] public static extern IntPtr GetSubMenu(IntPtr menu, int position);
    [DllImport("user32.dll")] public static extern bool GetMenuItemRect(IntPtr hwnd, IntPtr menu, uint item, out RECT rect);
}
'@

$MF_BYPOSITION = 0x400
$MF_CHECKED = 0x8
$MF_SEPARATOR = 0x800
$MN_GETHMENU = 0x1E1
$LEFT_DOWN = 0x2
$LEFT_UP = 0x4
$RIGHT_DOWN = 0x8
$RIGHT_UP = 0x10
$VK_ESCAPE = 0x1B

[void][Tray]::SetProcessDPIAware()

function Find-Icon {
    $root = [System.Windows.Automation.AutomationElement]::RootElement
    $byName = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::NameProperty, $Tooltip)
    foreach ($class in 'Shell_TrayWnd', 'TopLevelWindowForOverflowXamlIsland') {
        $byClass = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ClassNameProperty, $class)
        $bar = $root.FindFirst([System.Windows.Automation.TreeScope]::Children, $byClass)
        if (-not $bar) { continue }
        $icon = $bar.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $byName)
        if ($icon -and -not $icon.Current.IsOffscreen) { return $icon }
    }
    return $null
}

# Ventanas de menú desplegado que hay ahora mismo a la vista, con su menú.
function Get-Popups {
    $found = @()
    $hwnd = [IntPtr]::Zero
    while ($true) {
        $hwnd = [Tray]::FindWindowExW([IntPtr]::Zero, $hwnd, '#32768', [NullString]::Value)
        if ($hwnd -eq [IntPtr]::Zero) { break }
        if (-not [Tray]::IsWindowVisible($hwnd)) { continue }
        $menu = [Tray]::SendMessageW($hwnd, $MN_GETHMENU, [IntPtr]::Zero, [IntPtr]::Zero)
        if ($menu -ne [IntPtr]::Zero) { $found += [pscustomobject]@{ Window = $hwnd; Menu = $menu } }
    }
    return $found
}

function Get-Entries($popup) {
    $count = [Tray]::GetMenuItemCount($popup.Menu)
    for ($i = 0; $i -lt $count; $i++) {
        $state = [Tray]::GetMenuState($popup.Menu, $i, $MF_BYPOSITION)
        $text = New-Object System.Text.StringBuilder 256
        [void][Tray]::GetMenuStringW($popup.Menu, $i, $text, 256, $MF_BYPOSITION)
        $rect = New-Object Tray+RECT
        [void][Tray]::GetMenuItemRect($popup.Window, $popup.Menu, $i, [ref]$rect)
        [pscustomobject]@{
            Text      = $text.ToString()
            Checked   = ($state -band $MF_CHECKED) -ne 0
            Separator = ($state -band $MF_SEPARATOR) -ne 0 -and $text.Length -eq 0
            Submenu   = [Tray]::GetSubMenu($popup.Menu, $i) -ne [IntPtr]::Zero
            X         = [int](($rect.Left + $rect.Right) / 2)
            Y         = [int](($rect.Top + $rect.Bottom) / 2)
        }
    }
}

function Write-Entries($entries, $indent) {
    foreach ($entry in $entries) {
        if ($entry.Separator) { Write-Output "$indent---"; continue }
        $mark = if ($entry.Checked) { '[x]' } else { '[ ]' }
        $more = if ($entry.Submenu) { ' >' } else { '' }
        Write-Output "$indent$mark $($entry.Text)$more"
    }
}

function Click($x, $y, $down, $up) {
    [void][Tray]::SetCursorPos($x, $y)
    Start-Sleep -Milliseconds 350
    [Tray]::mouse_event($down, 0, 0, 0, [UIntPtr]::Zero)
    # Lo que tarda una mano en soltar el botón.
    Start-Sleep -Milliseconds 120
    [Tray]::mouse_event($up, 0, 0, 0, [UIntPtr]::Zero)
    Start-Sleep -Milliseconds 600
}

# El botón que despliega los iconos ocultos: el primero de la bandeja que no es de ninguna aplicación.
function Open-Overflow {
    $root = [System.Windows.Automation.AutomationElement]::RootElement
    $byClass = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ClassNameProperty, 'Shell_TrayWnd')
    $bar = $root.FindFirst([System.Windows.Automation.TreeScope]::Children, $byClass)
    if (-not $bar) { return }
    $isButton = New-Object System.Windows.Automation.AndCondition(
        (New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ClassNameProperty, 'SystemTray.NormalButton')),
        (New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::AutomationIdProperty, 'SystemTrayIcon')))
    $chevron = $bar.FindAll([System.Windows.Automation.TreeScope]::Descendants, $isButton) |
        Sort-Object { $_.Current.BoundingRectangle.Left } | Select-Object -First 1
    if (-not $chevron) { return }
    $chevron.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern).Invoke()
    Start-Sleep -Milliseconds 800
}

$saved = New-Object Tray+POINT
[void][Tray]::GetCursorPos([ref]$saved)
$picked = $false
try {
    $popups = @()
    # La lista de iconos ocultos a veces se cierra sola antes del clic: se intenta hasta tres veces.
    for ($attempt = 0; $attempt -lt 3 -and $popups.Count -eq 0; $attempt++) {
        $icon = Find-Icon
        # El botón abre la lista y también la cierra: si estaba a medio cerrar, hay que pulsarlo dos veces.
        for ($try = 0; $try -lt 2 -and -not $icon; $try++) {
            Open-Overflow
            $icon = Find-Icon
        }
        if (-not $icon) { continue }
        $box = $icon.Current.BoundingRectangle
        Click ([int]($box.Left + $box.Width / 2)) ([int]($box.Top + $box.Height / 2)) $RIGHT_DOWN $RIGHT_UP
        $popups = @(Get-Popups)
    }
    if ($popups.Count -eq 0) {
        Write-Output "FALLO: no se ha podido abrir el menú del icono '$Tooltip' (no está en la bandeja ni entre los iconos ocultos, o no responde)"
        exit 2
    }
    $main = $popups[0]
    $entries = @(Get-Entries $main)
    Write-Entries $entries ''
    foreach ($entry in $entries | Where-Object Submenu) {
        # Al posar el cursor sobre la entrada se despliega su submenú.
        [void][Tray]::SetCursorPos($entry.X, $entry.Y)
        Start-Sleep -Milliseconds 700
        $sub = @(Get-Popups | Where-Object { $_.Window -ne $main.Window })
        if ($sub.Count -eq 0) { Write-Output '    FALLO: el submenú no se ha desplegado'; continue }
        $inner = @(Get-Entries $sub[0])
        Write-Entries $inner '    '
        $target = $inner | Where-Object { $Pick -and $_.Text -like "*$Pick*" } | Select-Object -First 1
        if ($target -and -not $picked) {
            Click $target.X $target.Y $LEFT_DOWN $LEFT_UP
            $picked = $true
            Write-Output "pulsado: $($target.Text)"
            break
        }
    }
    if ($Pick -and -not $picked) {
        $target = $entries | Where-Object { $_.Text -like "*$Pick*" } | Select-Object -First 1
        if ($target) {
            Click $target.X $target.Y $LEFT_DOWN $LEFT_UP
            $picked = $true
            Write-Output "pulsado: $($target.Text)"
        } else {
            Write-Output "FALLO: no hay ninguna entrada con '$Pick'"
        }
    }
}
finally {
    if (-not $picked) {
        [Tray]::keybd_event($VK_ESCAPE, 0, 0, [UIntPtr]::Zero)
        [Tray]::keybd_event($VK_ESCAPE, 0, 2, [UIntPtr]::Zero)
        Start-Sleep -Milliseconds 100
        [Tray]::keybd_event($VK_ESCAPE, 0, 0, [UIntPtr]::Zero)
        [Tray]::keybd_event($VK_ESCAPE, 0, 2, [UIntPtr]::Zero)
    }
    [void][Tray]::SetCursorPos($saved.X, $saved.Y)
}
