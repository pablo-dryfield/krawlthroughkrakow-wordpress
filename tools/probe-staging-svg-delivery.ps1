[CmdletBinding()]
param([Parameter(ValueFromRemainingArguments = $true)][string[]] $ProbeArguments)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'invoke-ktk-native.ps1')
if ($ProbeArguments -notcontains '--run-staging-probe') {
    Invoke-KtkNativeCommand -Command 'python' -Arguments (@((Join-Path $PSScriptRoot 'probe-staging-svg-delivery.py')) + $ProbeArguments)
    exit $KtkNativeExitCode
}
$credentialPath = Join-Path $env:USERPROFILE '.ktk\storefront-ftps-password.xml'
$securePassword = Import-Clixml -LiteralPath $credentialPath
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try {
    $env:KTK_FTP_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
    Invoke-KtkNativeCommand -Command 'python' -Arguments (@((Join-Path $PSScriptRoot 'probe-staging-svg-delivery.py')) + $ProbeArguments)
    exit $KtkNativeExitCode
} finally {
    Remove-Item Env:KTK_FTP_PASSWORD -ErrorAction SilentlyContinue
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
}
