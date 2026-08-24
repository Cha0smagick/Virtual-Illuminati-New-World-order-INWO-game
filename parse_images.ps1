$content = Get-Content 'D:\Illuminati NWO\game\js\images.js' -Raw
$json = $content -replace '^.*?\[', '['
$data = $json | ConvertFrom-Json
$data | Select-Object file, folder, name, id, version | Format-Table -AutoSize
$data.Count