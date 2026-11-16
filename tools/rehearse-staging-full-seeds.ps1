[CmdletBinding()]
param([Parameter(ValueFromRemainingArguments = $true)][string[]] $FullSeedArguments)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'invoke-ktk-native.ps1')
if (($FullSeedArguments -notcontains '--rehearse-staging') -and ($FullSeedArguments -notcontains '--resume')) {
    Invoke-KtkNativeCommand -Command 'python' -Arguments (@((Join-Path $PSScriptRoot 'rehearse-staging-full-seeds.py')) + $FullSeedArguments)
    exit $KtkNativeExitCode
}
$fullSeedCredentialPath = Join-Path $env:USERPROFILE '.ktk\storefront-ftps-password.xml'
$fullSeedSecurePassword = Import-Clixml -LiteralPath $fullSeedCredentialPath
$fullSeedPasswordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($fullSeedSecurePassword)
try {
    $env:KTK_FTP_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($fullSeedPasswordPointer)
    Invoke-KtkNativeCommand -Command 'python' -Arguments (@((Join-Path $PSScriptRoot 'rehearse-staging-full-seeds.py')) + $FullSeedArguments)
    exit $KtkNativeExitCode
} finally {
    Remove-Item Env:KTK_FTP_PASSWORD -ErrorAction SilentlyContinue
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($fullSeedPasswordPointer)
}
