[CmdletBinding()]
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]] $PublisherArguments
)

$ErrorActionPreference = 'Stop'

& node (Join-Path $PSScriptRoot 'build-homepage-font-resilience.mjs')
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

if ($PublisherArguments -contains '--build-only' -or ($PublisherArguments -contains '--local-source' -and $PublisherArguments -contains '--dry-run')) {
    & python (Join-Path $PSScriptRoot 'publish-homepage-shortcode.py') @PublisherArguments
    exit $LASTEXITCODE
}

$credentialPath = Join-Path $env:USERPROFILE '.ktk\storefront-ftps-password.xml'
if (-not (Test-Path -LiteralPath $credentialPath)) {
    throw "The encrypted storefront deployment credential was not found at $credentialPath."
}

$securePassword = Import-Clixml -LiteralPath $credentialPath
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)

try {
    $env:KTK_FTP_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
    & python (Join-Path $PSScriptRoot 'publish-homepage-shortcode.py') @PublisherArguments
    exit $LASTEXITCODE
}
finally {
    Remove-Item Env:KTK_FTP_PASSWORD -ErrorAction SilentlyContinue
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
}
