[CmdletBinding()]
param([Parameter(ValueFromRemainingArguments = $true)][string[]] $PublisherArguments)
$ErrorActionPreference = 'Stop'
if ($PublisherArguments -contains '--dry-run') {
    & python (Join-Path $PSScriptRoot 'publish-code-pages.py') @PublisherArguments
    exit $LASTEXITCODE
}
$credentialPath = Join-Path $env:USERPROFILE '.ktk\storefront-ftps-password.xml'
$securePassword = Import-Clixml -LiteralPath $credentialPath
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try {
    $env:KTK_FTP_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
    & python (Join-Path $PSScriptRoot 'publish-code-pages.py') @PublisherArguments
    exit $LASTEXITCODE
} finally {
    Remove-Item Env:KTK_FTP_PASSWORD -ErrorAction SilentlyContinue
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
}
