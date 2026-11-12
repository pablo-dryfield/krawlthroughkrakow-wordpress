param([string]$Label = 'before-readiness-fixes', [switch]$IncludeHomepage)
$ErrorActionPreference = 'Stop'
if ($Label -notmatch '^[a-z0-9-]+$') { throw 'Use a lowercase checkpoint label.' }
$root = Split-Path $PSScriptRoot -Parent
$assets = Join-Path $root 'staging/wp-content/mu-plugins/ktk-code-pages-assets'
$files = @((Get-Item -LiteralPath (Join-Path $root 'AGENTS.md')),
    (Get-Item -LiteralPath (Join-Path $root 'staging/wp-content/mu-plugins/ktk-code-pages.php')))
$files += @(Get-ChildItem -LiteralPath $assets -File -Recurse -Force)
$files += @(Get-ChildItem -LiteralPath $PSScriptRoot -File | Where-Object { $_.Name -match 'code.pages|code_pages' })
$files += @(Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot 'tests') -File | Where-Object { $_.Name -match 'code_pages' })
$files += @(Get-ChildItem -LiteralPath (Join-Path $root 'docs/code-pages/full-migration') -File | Where-Object { $_.Extension -in '.md', '.json', '.txt' })
$files += @(Get-Item -LiteralPath (Join-Path $root 'docs/code-pages/MIGRATION-PROCESS.md'))
if ($IncludeHomepage) {
    $files += @(Get-ChildItem -LiteralPath (Join-Path $root 'staging/wp-content/mu-plugins/ktk-homepage-assets') -File -Recurse -Force)
    $files += @(Get-Item -LiteralPath (Join-Path $root 'staging/wp-content/mu-plugins/ktk-homepage-shortcode.php'))
    $files += @(Get-ChildItem -LiteralPath $PSScriptRoot -File | Where-Object { $_.Name -match 'homepage|booking-destinations' })
}
$files = @($files | Sort-Object FullName -Unique)
$destination = Join-Path $root ('deploy-backups/code-pages-' + $Label + '-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.zip')
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::Open($destination, [System.IO.Compression.ZipArchiveMode]::Create)
$manifest = @()
try {
    foreach ($file in $files) {
        $relative = $file.FullName.Substring($root.Length + 1).Replace('\', '/')
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $file.FullName, $relative, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
        $manifest += [ordered]@{ path = $relative; sha256 = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant(); bytes = $file.Length }
    }
    $entry = $archive.CreateEntry('CHECKPOINT-MANIFEST.json')
    $writer = [System.IO.StreamWriter]::new($entry.Open())
    try { $writer.Write((ConvertTo-Json -InputObject $manifest -Depth 5)) } finally { $writer.Dispose() }
} finally { $archive.Dispose() }
$archive = [System.IO.Compression.ZipFile]::OpenRead($destination)
try {
    foreach ($item in $manifest) {
        $stream = $archive.GetEntry($item.path).Open()
        $sha = [System.Security.Cryptography.SHA256]::Create()
        try { $actual = [BitConverter]::ToString($sha.ComputeHash($stream)).Replace('-', '').ToLowerInvariant() }
        finally { $stream.Dispose(); $sha.Dispose() }
        if ($actual -ne $item.sha256) { throw ('Checkpoint mismatch: ' + $item.path) }
    }
} finally { $archive.Dispose() }
[ordered]@{ archive = $destination; files = $manifest.Count; allEntriesVerified = $true; sha256 = (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash.ToLowerInvariant() } | ConvertTo-Json
