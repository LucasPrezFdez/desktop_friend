# Mide el consumo de la app en marcha: memoria y CPU de su proceso y de los de WebView2 que cuelgan de él.
# Uso: powershell -File tools/verify/usage.ps1 [-Seconds 15] [-Label "texto"]
param(
    [int]$Seconds = 15,
    [string]$Label = ''
)

$root = Get-Process desktopfriend -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $root) {
    Write-Output 'FALLO: la app no está en marcha'
    exit 2
}

# Todos los descendientes del proceso principal.
$all = Get-CimInstance Win32_Process
$ids = New-Object System.Collections.Generic.List[int]
$ids.Add($root.Id)
do {
    $added = $false
    foreach ($process in $all) {
        if ($ids -contains [int]$process.ParentProcessId -and -not ($ids -contains [int]$process.ProcessId)) {
            $ids.Add([int]$process.ProcessId)
            $added = $true
        }
    }
} while ($added)

$kind = @{}
foreach ($process in $all) {
    if ($ids -contains [int]$process.ProcessId) {
        $type = if ($process.CommandLine -match '--type=([\w-]+)') { $Matches[1] } elseif ($process.Name -eq 'desktopfriend.exe') { 'app' } else { 'webview' }
        $kind[[int]$process.ProcessId] = $type
    }
}

$before = @{}
Get-Process -Id $ids | ForEach-Object { $before[$_.Id] = $_.CPU }
Start-Sleep -Seconds $Seconds
$after = Get-Process -Id $ids

$total = 0
$rows = foreach ($process in $after) {
    $cpu = ($process.CPU - $before[$process.Id]) / $Seconds * 100
    $total += $cpu
    [pscustomobject]@{ Tipo = $kind[$process.Id]; CPU = $cpu; Privada = $process.PrivateMemorySize64 / 1MB }
}
$threads = (Get-CimInstance Win32_Processor).NumberOfLogicalProcessors
if ($Label) { Write-Output "== $Label ==" }
$rows | Sort-Object CPU -Descending | ForEach-Object { '{0,-12} CPU {1,5:N1} %   memoria privada {2,4:N0} MB' -f $_.Tipo, $_.CPU, $_.Privada }
Write-Output ('TOTAL        CPU {0,5:N1} % de un núcleo ({1:N2} % del equipo)   memoria privada {2:N0} MB' -f $total, ($total / $threads), ($rows | Measure-Object Privada -Sum).Sum)
