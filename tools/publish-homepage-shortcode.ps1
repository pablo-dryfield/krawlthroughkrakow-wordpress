[CmdletBinding()]
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]] $PublisherArguments
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'invoke-ktk-native.ps1')

Invoke-KtkNativeCommand -Command 'node' -Arguments @((Join-Path $PSScriptRoot 'build-homepage-font-resilience.mjs'))
if ($KtkNativeExitCode -ne 0) {
    exit $KtkNativeExitCode
}

if ($PublisherArguments -contains '--build-only' -or ($PublisherArguments -contains '--local-source' -and $PublisherArguments -contains '--dry-run')) {
    Invoke-KtkNativeCommand -Command 'python' -Arguments (@((Join-Path $PSScriptRoot 'publish-homepage-shortcode.py')) + $PublisherArguments)
    exit $KtkNativeExitCode
}

$credentialPath = Join-Path $env:USERPROFILE '.ktk\storefront-ftps-password.xml'
if (-not (Test-Path -LiteralPath $credentialPath)) {
    throw "The encrypted storefront deployment credential was not found at $credentialPath."
}

$securePassword = Import-Clixml -LiteralPath $credentialPath
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)

try {
    $env:KTK_FTP_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
    Invoke-KtkNativeCommand -Command 'python' -Arguments (@((Join-Path $PSScriptRoot 'publish-homepage-shortcode.py')) + $PublisherArguments)
    exit $KtkNativeExitCode
}
finally {
    Remove-Item Env:KTK_FTP_PASSWORD -ErrorAction SilentlyContinue
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
}
