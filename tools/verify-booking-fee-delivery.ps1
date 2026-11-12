param(
    [Parameter(Mandatory = $true)][string]$ExpectedGitSha,
    [Parameter(Mandatory = $true)][string]$ExpectedReleaseId,
    [Parameter(Mandatory = $true)][string]$UiBuildPath,
    [int[]]$ApprovedExceptionBookingIds = @(),
    [Parameter(Mandatory = $true)][string]$ReportPath
)
$ErrorActionPreference = 'Stop'
$secretRoot = Join-Path $HOME '.omnilodge-codex-cloud'
$base = (Get-Content -LiteralPath (Join-Path $secretRoot 'prod-read-api-url') -Raw).Trim().TrimEnd('/')
$headers = @{
    Authorization = 'Bearer ' + (Get-Content -LiteralPath (Join-Path $secretRoot 'prod-read-api-token') -Raw).Trim()
    'CF-Access-Client-Id' = (Get-Content -LiteralPath (Join-Path $secretRoot 'cloudflare-access-client-id') -Raw).Trim()
    'CF-Access-Client-Secret' = (Get-Content -LiteralPath (Join-Path $secretRoot 'cloudflare-access-client-secret') -Raw).Trim()
}
function Read-Table($table, $columns, $filters, $limit = 100) {
    $body = @{ schema = 'public'; table = $table; columns = $columns; filters = $filters; limit = $limit
        orderBy = @{ column = 'id'; direction = 'desc' } } | ConvertTo-Json -Depth 8
    $response = Invoke-RestMethod -Method Post -Uri ($base + '/tables/read') -Headers $headers -UserAgent 'curl/8.0' -ContentType 'application/json' -Body $body
    return @($response.rows)
}
$connector = Invoke-RestMethod -Uri ($base + '/health') -Headers $headers -UserAgent 'curl/8.0'
if ($connector.database.transaction_read_only -ne 'on') { throw 'Production connector is not read-only.' }
$ready = Invoke-RestMethod -Uri 'https://omni-lodge.com/api/health/ready' -UserAgent 'curl/8.0'
$metadata = Invoke-RestMethod -Uri 'https://omni-lodge.com/release-metadata.json' -UserAgent 'curl/8.0'
$manifest = Invoke-RestMethod -Uri 'https://omni-lodge.com/asset-manifest.json' -UserAgent 'curl/8.0'
$expectedJson = & node (Join-Path $PSScriptRoot 'discover-commission-ui-assets.mjs') $UiBuildPath $ExpectedGitSha $ExpectedReleaseId
if ($LASTEXITCODE -ne 0) { throw 'Failed to discover commission UI assets from the trusted release.' }
$expectedUi = ($expectedJson -join "`n") | ConvertFrom-Json
$assetEvidence = @()
foreach ($asset in $expectedUi.assets) {
    if (@($manifest.files.PSObject.Properties.Value) -notcontains $asset.path) { throw 'Expected commission asset is absent from the public manifest.' }
    $response = Invoke-WebRequest -UseBasicParsing -Uri ('https://omni-lodge.com' + $asset.path) -UserAgent 'curl/8.0'
    $bytes = $response.RawContentStream.ToArray()
    $content = [Text.Encoding]::UTF8.GetString($bytes)
    $sha = [Security.Cryptography.SHA256]::Create()
    try { $hash = [BitConverter]::ToString($sha.ComputeHash($bytes)).Replace('-', '').ToLowerInvariant() }
    finally { $sha.Dispose() }
    $assetEvidence += [pscustomobject]@{ path = $asset.path; sha256 = $hash; expectedSha256 = $asset.sha256; exact = $hash -eq $asset.sha256
        isPage = $asset.isPage; isControl = $asset.isControl; sources = $asset.sources
        hasRulesTitle = $content.Contains('Commission eligibility rules'); hasApiBinding = $content.Contains('commissionRules') }
}
$rulesOk = $assetEvidence.Count -gt 0 -and @($assetEvidence | Where-Object { !$_.exact }).Count -eq 0 -and @($assetEvidence | Where-Object { $_.isControl -and $_.hasRulesTitle }).Count -gt 0 -and @($assetEvidence | Where-Object { $_.isPage -and $_.hasApiBinding }).Count -gt 0
$gaps = @{}
$truncated = @()
$excluded = @{}
$nonStripe = @('cash', 'bank_transfer', 'bank transfer', 'bank-transfer', 'banktransfer', 'paypal', 'free', 'free order', 'free_order')
foreach ($platform in @('omnilodge', 'direct', 'ecwid')) {
    foreach ($status in @('paid', 'partial', 'deposit', 'refunded')) {
        foreach ($gap in @(@{ processing_fee = $null }, @{ processing_fee_currency = $null }, @{ processing_fee_currency = '' })) {
            $filters = @{ platform = $platform; payment_status = $status }
            foreach ($key in $gap.Keys) { $filters[$key] = $gap[$key] }
            $rows = @(Read-Table 'bookings' @('id', 'platform', 'payment_status', 'payment_method', 'processing_fee', 'processing_fee_currency') $filters)
            if ($rows.Count -eq 100) { $truncated += "$platform/$status/$($gap.Keys)" }
            foreach ($row in $rows) {
                if ($nonStripe -contains ([string]$row.payment_method).Trim().ToLowerInvariant()) { $excluded[[string]$row.id] = $row.payment_method }
                else { $gaps[[string]$row.id] = $row }
            }
        }
    }
}
$batches = @(Read-Table 'audit_logs' @('id', 'meta_json', 'created_at') @{ action = 'booking.stripe_fee_sync_batch' })
$progress = @($batches | ForEach-Object { [pscustomobject]@{ id = $_.id; at = $_.created_at; scanned = $_.meta_json.scanned
    updated = $_.meta_json.updated; remainingMissing = $_.meta_json.remainingMissing; nextCursor = $_.meta_json.nextCursor
    cycleCompleted = $_.meta_json.cycleCompleted; unresolved = $_.meta_json.unresolved } })
$target = @(Read-Table 'bookings' @('id', 'discount_amount', 'discount_code', 'processing_fee', 'processing_fee_currency') @{ id = 12081 } 1)
$identityOk = $ready.ready -eq $true -and $ready.release.runtimeMode -eq 'primary' -and $ready.release.id -eq $ExpectedReleaseId -and $ready.release.gitSha -eq $ExpectedGitSha -and $metadata.releaseId -eq $ExpectedReleaseId -and $metadata.gitSha -eq $ExpectedGitSha
$latestMissing = if ($progress.Count) { $progress[0].remainingMissing } else { $null }
$approvedIds = @($ApprovedExceptionBookingIds | Sort-Object -Unique)
if (@($approvedIds | Where-Object { $_ -le 0 }).Count) { throw 'Invalid approved exception booking ID.' }
$acceptedExceptions = @($gaps.Values | Where-Object { $approvedIds -contains [int]$_.id })
$unapprovedGaps = @($gaps.Values | Where-Object { $approvedIds -notcontains [int]$_.id })
$acceptedScopeComplete = $identityOk -and $rulesOk -and $truncated.Count -eq 0 -and $unapprovedGaps.Count -eq 0 -and $progress.Count -gt 0 -and $latestMissing -eq $gaps.Count
$report = [ordered]@{
    at = [DateTime]::UtcNow.ToString('o'); expectedGitSha = $ExpectedGitSha; expectedReleaseId = $ExpectedReleaseId
    releaseIdentityOk = $identityOk; readiness = $ready; uiMetadata = $metadata; assets = $assetEvidence
    rulesControlPresent = $rulesOk; uiArtifactMetadata = $expectedUi.metadata
    independentQueries = 36; truncatedQueries = $truncated; excludedNonStripeCount = $excluded.Count
    remainingGaps = @($gaps.Values | Sort-Object id); independentGapCount = $gaps.Count
    approvedExceptionBookingIds = $approvedIds; acceptedExceptions = $acceptedExceptions; unapprovedGapCount = $unapprovedGaps.Count
    auditBatchCount = $progress.Count; auditHistoryTruncated = $batches.Count -eq 100
    totalAuditedUpdates = ($progress | Measure-Object -Property updated -Sum).Sum
    latestAuditedMissing = $latestMissing; batches = $progress; targetBooking = $target
    complete = ($identityOk -and $rulesOk -and $truncated.Count -eq 0 -and $gaps.Count -eq 0 -and $progress.Count -gt 0 -and $latestMissing -eq 0)
    deliveryCompleteWithApprovedExceptions = $acceptedScopeComplete
}
[IO.File]::WriteAllText($ReportPath, ($report | ConvertTo-Json -Depth 12), [Text.UTF8Encoding]::new($false))
$report | ConvertTo-Json -Depth 12
