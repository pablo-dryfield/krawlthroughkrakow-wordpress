[CmdletBinding()]
param([Parameter(ValueFromRemainingArguments = $true)][string[]] $Arguments)
$ErrorActionPreference = 'Stop'
$securePassword = Import-Clixml -LiteralPath (Join-Path $env:USERPROFILE '.ktk/storefront-ftps-password.xml')
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try {
    $env:KTK_FTP_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    & python (Join-Path $PSScriptRoot 'promote-code-pages-production.py') @Arguments
    exit $LASTEXITCODE
} finally {
    Remove-Item Env:KTK_FTP_PASSWORD -ErrorAction SilentlyContinue
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
}
