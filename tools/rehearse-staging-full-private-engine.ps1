[CmdletBinding()]
param([Parameter(ValueFromRemainingArguments = $true)][string[]] $FullEngineArguments)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'invoke-ktk-native.ps1')
if (($FullEngineArguments -notcontains '--rehearse-staging') -and ($FullEngineArguments -notcontains '--inspect-recovery') -and ($FullEngineArguments -notcontains '--resume-engine-recovery')) {
    Invoke-KtkNativeCommand -Command 'python' -Arguments (@((Join-Path $PSScriptRoot 'rehearse-staging-full-private-engine.py')) + $FullEngineArguments)
    exit $KtkNativeExitCode
}
$fullEngineCredentialPath = Join-Path $env:USERPROFILE '.ktk\storefront-ftps-password.xml'
$fullEngineSecurePassword = Import-Clixml -LiteralPath $fullEngineCredentialPath
$fullEnginePasswordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($fullEngineSecurePassword)
try {
    $env:KTK_FTP_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($fullEnginePasswordPointer)
    Invoke-KtkNativeCommand -Command 'python' -Arguments (@((Join-Path $PSScriptRoot 'rehearse-staging-full-private-engine.py')) + $FullEngineArguments)
    exit $KtkNativeExitCode
} finally {
    Remove-Item Env:KTK_FTP_PASSWORD -ErrorAction SilentlyContinue
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($fullEnginePasswordPointer)
}
