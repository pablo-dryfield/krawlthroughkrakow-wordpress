[CmdletBinding()]
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]] $PublisherArguments
)

$ErrorActionPreference = 'Stop'

$credentialPath = Join-Path $env:USERPROFILE '.ktk\storefront-ftps-password.xml'
if (-not (Test-Path -LiteralPath $credentialPath)) {
    throw "The encrypted storefront deployment credential was not found at $credentialPath."
}

$securePassword = Import-Clixml -LiteralPath $credentialPath
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)

try {
    $env:KTK_FTP_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
    & python (Join-Path $PSScriptRoot 'publish-store2.py') @PublisherArguments
    exit $LASTEXITCODE
}
finally {
    Remove-Item Env:KTK_FTP_PASSWORD -ErrorAction SilentlyContinue
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
}
