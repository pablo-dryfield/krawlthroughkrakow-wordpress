[CmdletBinding()]
param([Parameter(ValueFromRemainingArguments = $true)][string[]] $RehearsalArguments)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'invoke-ktk-native.ps1')
if ($RehearsalArguments -notcontains '--rehearse-staging') {
    Invoke-KtkNativeCommand -Command 'python' -Arguments (@((Join-Path $PSScriptRoot 'rehearse-staging-content-controller.py')) + $RehearsalArguments)
    exit $KtkNativeExitCode
}
$credentialPath = Join-Path $env:USERPROFILE '.ktk\storefront-ftps-password.xml'
$securePassword = Import-Clixml -LiteralPath $credentialPath
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try {
    $env:KTK_FTP_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
    Invoke-KtkNativeCommand -Command 'python' -Arguments (@((Join-Path $PSScriptRoot 'rehearse-staging-content-controller.py')) + $RehearsalArguments)
    exit $KtkNativeExitCode
} finally {
    Remove-Item Env:KTK_FTP_PASSWORD -ErrorAction SilentlyContinue
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
}
