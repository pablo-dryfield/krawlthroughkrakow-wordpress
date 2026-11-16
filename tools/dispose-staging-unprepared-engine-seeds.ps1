[CmdletBinding()]
param([Parameter(ValueFromRemainingArguments = $true)][string[]] $DisposalArguments)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'invoke-ktk-native.ps1')
if (($DisposalArguments -notcontains '--dispose-staging') -and ($DisposalArguments -notcontains '--resume-disposal') -and ($DisposalArguments -notcontains '--continue-abandoned')) {
    Invoke-KtkNativeCommand -Command 'python' -Arguments (@((Join-Path $PSScriptRoot 'dispose-staging-unprepared-engine-seeds.py')) + $DisposalArguments)
    exit $KtkNativeExitCode
}
$disposalCredentialPath = Join-Path $env:USERPROFILE '.ktk\storefront-ftps-password.xml'
$disposalSecurePassword = Import-Clixml -LiteralPath $disposalCredentialPath
$disposalPasswordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($disposalSecurePassword)
try {
    $env:KTK_FTP_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($disposalPasswordPointer)
    Invoke-KtkNativeCommand -Command 'python' -Arguments (@((Join-Path $PSScriptRoot 'dispose-staging-unprepared-engine-seeds.py')) + $DisposalArguments)
    exit $KtkNativeExitCode
} finally {
    Remove-Item Env:KTK_FTP_PASSWORD -ErrorAction SilentlyContinue
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($disposalPasswordPointer)
}
