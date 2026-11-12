$ErrorActionPreference = 'Stop'
$scriptPath = Join-Path $PSScriptRoot 'verify-booking-fee-delivery.ps1'
$reportDir = Join-Path $PSScriptRoot '../docs/commission-stripe-fees'
$global:BookingFeeFixtureCase = 'complete'

# No credentials or network are used by these verifier-contract fixtures.
function Get-Content { param($LiteralPath, [switch]$Raw) return 'mock-private-value' }
function Invoke-WebRequest {
    param([switch]$UseBasicParsing, $Uri, $UserAgent)
    $content = 'Commission eligibility rules commissionRules'
    if ($global:BookingFeeFixtureCase -eq 'tampered') { $content += ' tampered' }
    return @{ RawContentStream = [IO.MemoryStream]::new([Text.Encoding]::UTF8.GetBytes($content)) }
}
function node {
    param($Tool, $Build, $ExpectedSha, $ExpectedRelease)
    $sha = [Security.Cryptography.SHA256]::Create()
    try { $hash = [BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes('Commission eligibility rules commissionRules'))).Replace('-', '').ToLowerInvariant() }
    finally { $sha.Dispose() }
    $global:LASTEXITCODE = 0
    return (@{ metadata = @{ gitSha = $ExpectedSha; releaseId = $ExpectedRelease }
        assets = @(@{ path = '/static/js/2770.fixture.js'; sha256 = $hash; isPage = $true; isControl = $true; sources = @('pages/AffiliatesPage.tsx', 'components/affiliates/AffiliateCommissionRules.tsx') }) } | ConvertTo-Json -Depth 6)
}
function Invoke-RestMethod {
    param($Uri, $Headers, $UserAgent, $Method, $ContentType, $Body)
    if ($Uri -eq 'mock-private-value/health') { return @{ database = @{ transaction_read_only = 'on' } } }
    if ($Uri -like '*/api/health/ready') { return @{ ready = $true; release = @{ id = 'fixture-release'; gitSha = 'fixture-sha'; runtimeMode = 'primary' } } }
    if ($Uri -like '*/release-metadata.json') { return @{ releaseId = 'fixture-release'; gitSha = 'fixture-sha' } }
    if ($Uri -like '*/asset-manifest.json') { return ('{"files":{"static/js/2770.fixture.js":"/static/js/2770.fixture.js"}}' | ConvertFrom-Json) }
    if ($Uri -eq 'mock-private-value/tables/read') {
        $q = $Body | ConvertFrom-Json
        if ($q.table -eq 'audit_logs') {
            return @{ rows = @(@{ id = 1; created_at = 'fixture'; meta_json = @{ updated = 5; scanned = 5
                remainingMissing = $(if ($global:BookingFeeFixtureCase -eq 'gap') { 1 } else { 0 })
                nextCursor = 0; cycleCompleted = $true; unresolved = @() } }) }
        }
        if ($q.filters.id -eq 12081) {
            return @{ rows = @(@{ id = 12081; discount_amount = '20.00'; discount_code = 'NOMADTABLE'; processing_fee = '3.40'; processing_fee_currency = 'PLN' }) }
        }
        if ($q.filters.platform -eq 'direct' -and $q.filters.payment_status -eq 'paid' -and $global:BookingFeeFixtureCase -eq 'gap') {
            return @{ rows = @(@{ id = 2; platform = 'direct'; payment_status = 'paid'; payment_method = 'card'; processing_fee = $null; processing_fee_currency = $null }) }
        }
        return @{ rows = @() }
    }
    throw "Unexpected mock URL: $Uri"
}

$path = Join-Path $reportDir 'verification-fixture-complete.json'
$null = & $scriptPath -ExpectedGitSha 'fixture-sha' -ExpectedReleaseId 'fixture-release' -UiBuildPath 'fixture-ui' -ReportPath $path
$r = [IO.File]::ReadAllText($path) | ConvertFrom-Json
if (!$r.complete -or $r.independentGapCount -ne 0 -or !$r.rulesControlPresent) { throw 'Complete fixture failed.' }

$global:BookingFeeFixtureCase = 'gap'
$path = Join-Path $reportDir 'verification-fixture-gap.json'
$null = & $scriptPath -ExpectedGitSha 'fixture-sha' -ExpectedReleaseId 'fixture-release' -UiBuildPath 'fixture-ui' -ReportPath $path
$r = [IO.File]::ReadAllText($path) | ConvertFrom-Json
if ($r.complete -or $r.independentGapCount -ne 1 -or $r.latestAuditedMissing -ne 1) { throw 'Gap detection fixture failed.' }

$path = Join-Path $reportDir 'verification-fixture-approved-exception.json'
$null = & $scriptPath -ExpectedGitSha 'fixture-sha' -ExpectedReleaseId 'fixture-release' -UiBuildPath 'fixture-ui' -ApprovedExceptionBookingIds @(2) -ReportPath $path
$r = [IO.File]::ReadAllText($path) | ConvertFrom-Json
if ($r.complete -or !$r.deliveryCompleteWithApprovedExceptions -or $r.independentGapCount -ne 1 -or $r.unapprovedGapCount -ne 0) { throw 'Approved exception fixture failed.' }

$path = Join-Path $reportDir 'verification-fixture-wrong-exception.json'
$null = & $scriptPath -ExpectedGitSha 'fixture-sha' -ExpectedReleaseId 'fixture-release' -UiBuildPath 'fixture-ui' -ApprovedExceptionBookingIds @(3) -ReportPath $path
$r = [IO.File]::ReadAllText($path) | ConvertFrom-Json
if ($r.complete -or $r.deliveryCompleteWithApprovedExceptions -or $r.unapprovedGapCount -ne 1) { throw 'Unapproved gap fixture failed.' }

$global:BookingFeeFixtureCase = 'complete'
$path = Join-Path $reportDir 'verification-fixture-wrong-release.json'
$null = & $scriptPath -ExpectedGitSha 'wrong-sha' -ExpectedReleaseId 'fixture-release' -UiBuildPath 'fixture-ui' -ReportPath $path
$r = [IO.File]::ReadAllText($path) | ConvertFrom-Json
if ($r.complete -or $r.releaseIdentityOk) { throw 'Release mismatch fixture failed.' }

$global:BookingFeeFixtureCase = 'tampered'
$path = Join-Path $reportDir 'verification-fixture-tampered.json'
$null = & $scriptPath -ExpectedGitSha 'fixture-sha' -ExpectedReleaseId 'fixture-release' -UiBuildPath 'fixture-ui' -ReportPath $path
$r = [IO.File]::ReadAllText($path) | ConvertFrom-Json
if ($r.complete -or $r.rulesControlPresent -or $r.assets[0].exact) { throw 'Tampered asset fixture failed.' }

Remove-Variable -Name BookingFeeFixtureCase -Scope Global
Write-Output 'PASS: delivery verifier complete, missing-fee, approved/wrong exceptions, wrong-release and tampered-asset fixtures (6/6).'
