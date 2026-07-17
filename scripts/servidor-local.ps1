# Servidor local simples para rodar o Dashboard Admin (e o app de campo,
# se precisar) neste computador. Nao exige Node nem instalar nada.
#
# Uso: clique duas vezes em "Iniciar Dashboard.bat" na raiz do projeto
# (ele chama este script). Ou rode manualmente:
#   powershell -ExecutionPolicy Bypass -File scripts\servidor-local.ps1

param(
    [int]$Port = 8080
)

$Root = Split-Path -Parent $PSScriptRoot

$mimeMap = @{
    ".html" = "text/html; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
    ".webmanifest" = "application/manifest+json"
}

$listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Any, $Port)
$listener.Start()
Write-Host "Servidor local rodando. Dashboard Admin em:"
Write-Host "  http://localhost:$Port/admin-dashboard/index.html"
Write-Host ""
Write-Host "Deixe esta janela aberta enquanto estiver usando o Dashboard."
Write-Host "Para parar, feche esta janela ou pressione Ctrl+C."

while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
        $stream = $client.GetStream()
        $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::ASCII)
        $requestLine = $reader.ReadLine()
        while (($headerLine = $reader.ReadLine()) -ne $null -and $headerLine -ne '') {}

        $statusLine = "HTTP/1.1 400 Bad Request"
        $body = [byte[]]@()
        $contentType = "text/plain; charset=utf-8"

        if ($requestLine -match '^(GET|HEAD)\s+(\S+)\s+HTTP') {
            $rawPath = $Matches[2]
            $relPath = [System.Uri]::UnescapeDataString($rawPath.Split('?')[0])
            if ($relPath -eq "/") { $relPath = "/index.html" }
            $candidate = [System.IO.Path]::GetFullPath((Join-Path $Root ($relPath.TrimStart("/"))))
            $rootFull = [System.IO.Path]::GetFullPath($Root)

            if (-not $candidate.StartsWith($rootFull)) {
                $statusLine = "HTTP/1.1 403 Forbidden"
                $body = [System.Text.Encoding]::UTF8.GetBytes("403 Forbidden")
            } elseif (Test-Path $candidate -PathType Leaf) {
                $ext = [System.IO.Path]::GetExtension($candidate).ToLower()
                if ($mimeMap.ContainsKey($ext)) { $contentType = $mimeMap[$ext] } else { $contentType = "application/octet-stream" }
                $body = [System.IO.File]::ReadAllBytes($candidate)
                $statusLine = "HTTP/1.1 200 OK"
            } else {
                $statusLine = "HTTP/1.1 404 Not Found"
                $body = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
            }
        }

        $headerText = "$statusLine`r`nContent-Type: $contentType`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n"
        $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($headerText)
        $stream.Write($headerBytes, 0, $headerBytes.Length)
        if ($body.Length -gt 0) { $stream.Write($body, 0, $body.Length) }
        $stream.Flush()
    } catch {
    } finally {
        $client.Close()
    }
}
