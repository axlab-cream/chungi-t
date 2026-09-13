param([string]$Archive = 'C:/Users/user/Desktop/UMSH_톤앤보이스_인계_20260910.zip')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'source'))
$zip = [IO.Compression.ZipFile]::OpenRead($Archive)
$results = @()
$seen = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
try {
    foreach ($entry in $zip.Entries) {
        $relative = $entry.FullName.Replace('\', '/').TrimEnd('/')
        if (!$entry.Name) { continue }
        $target = [IO.Path]::GetFullPath((Join-Path $root $relative))
        if (!$target.StartsWith($root + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Archive path escapes source root' }
        if (!$seen.Add($relative)) { throw "Duplicate archive entry: $relative" }
        $stream = $entry.Open()
        $sha = [Security.Cryptography.SHA256]::Create()
        try { $expected = [Convert]::ToHexString($sha.ComputeHash($stream)).ToLowerInvariant() }
        finally { $stream.Dispose(); $sha.Dispose() }
        $actual = if (Test-Path -LiteralPath $target -PathType Leaf) { (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant() } else { $null }
        $results += [PSCustomObject]@{ path=$relative; bytes=$entry.Length; archiveSha256=$expected; extractedSha256=$actual; passed=($expected -eq $actual) }
    }
} finally { $zip.Dispose() }
$extras = @(Get-ChildItem -LiteralPath $root -File -Recurse | Where-Object { !$seen.Contains([IO.Path]::GetRelativePath($root,$_.FullName).Replace('\','/')) })
$passed = @($results | Where-Object passed).Count
$report = [ordered]@{ archive=$Archive; archiveSha256=(Get-FileHash -LiteralPath $Archive -Algorithm SHA256).Hash.ToLowerInvariant(); total=$results.Count; passed=$passed; unexpectedFiles=@($extras | ForEach-Object FullName); files=$results }
$report | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $PSScriptRoot 'source-verification.json') -Encoding utf8
Write-Output "Archive members verified: $passed/$($results.Count); unexpected files: $($extras.Count)"
if ($passed -ne $results.Count -or $extras.Count -ne 0) { exit 1 }
